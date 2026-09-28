import { deterministicId, safe } from '../util.mjs';

const TRANSITIONS = Object.freeze({
  pending: new Set(['accepted', 'dismissed']),
  accepted: new Set(['executed']),
  executed: new Set(['rolled_back']),
  dismissed: new Set(),
  rolled_back: new Set(),
});

/** Append-only proposal ledger. Records are replaced only for valid status transitions. */
export class ProposalLedger {
  constructor({ editor, intent = null, deletionGuard, mountHandler = null, deletionHandler = null, evolutionHandler = null } = {}) {
    if (!editor?.revert) throw new TypeError('ProposalLedger requires SelfEditor');
    this.editor = editor;
    this.intent = intent;
    this.deletionGuard = deletionGuard;
    this.mountHandler = mountHandler;
    this.deletionHandler = deletionHandler;
    this.evolutionHandler = evolutionHandler;
    this.records = [];
    this.liveUndo = new Map();
    this.sequence = 0;
  }

  append(proposal = {}) {
    const sequence = ++this.sequence;
    const base = {
      flow: proposal.flow ?? 'self',
      personId: proposal.personId ?? null,
      kind: proposal.kind ?? 'architecture',
      observation: safe(proposal.observation ?? { source: 'gap', chartContext: null, successSignal: null, gapRecord: null }),
      proposedChange: safe(proposal.proposedChange ?? {}),
      reasoning: String(proposal.reasoning ?? ''),
      confidence: Number(proposal.confidence ?? 0),
      chartTiming: safe(proposal.chartTiming ?? { appropriate: true, heldUntil: null, context: 'no chart timing supplied' }),
      createdAt: proposal.createdAt ?? sequence,
      status: 'pending',
      editId: null,
      rollbackAvailable: false,
      observationKey: proposal.observationKey ?? null,
      decisionReason: null,
      decidedAt: null,
    };
    const id = proposal.id ?? deterministicId('outbox', { ...base, sequence }, sequence);
    const record = Object.freeze({ id, ...base });
    this.records.push(record);
    return record;
  }

  pending(flow = null, personId = null) {
    return Object.freeze(this.records.filter((record) => record.status === 'pending'
      && (flow == null || record.flow === flow)
      && (personId == null || record.personId === personId)));
  }

  get(id) { return this.records.find((record) => record.id === id) ?? null; }

  #transition(id, next, patch = {}) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error(`unknown proposal: ${id}`);
    const current = this.records[index];
    if (!TRANSITIONS[current.status]?.has(next)) throw new Error(`invalid proposal transition: ${current.status} -> ${next}`);
    const updated = Object.freeze({ ...current, ...safe(patch), status: next });
    this.records[index] = updated;
    return updated;
  }

  accept(id, { actor = 'self', execute = true } = {}) {
    const proposal = this.get(id);
    if (!proposal) throw new Error(`unknown proposal: ${id}`);
    if (proposal.flow === 'user' && actor !== 'user') return { accepted: false, reason: 'explicit_user_acceptance_required', proposal };
    if (proposal.flow === 'self') {
      if (proposal.confidence < 0.7) return { accepted: false, reason: 'scientist_confidence_below_threshold', proposal };
      if (!proposal.chartTiming?.appropriate && proposal.confidence < 0.85) return { accepted: false, reason: 'chart_timing_hold', proposal };
    }
    if (proposal.proposedChange?.editType === 'delete') {
      const guard = this.deletionGuard?.check({
        ...proposal.proposedChange.spec,
        target: proposal.proposedChange.target,
        flow: proposal.flow,
        currentSequence: this.sequence,
      });
      if (!guard?.permitted) return { accepted: false, reason: guard?.reason ?? 'deletion_rejected', guard, proposal };
    }
    const accepted = this.#transition(id, 'accepted', { decidedAt: ++this.sequence });
    return execute ? this.execute(id) : { accepted: true, proposal: accepted };
  }

  dismiss(id, reason = null, { actor = 'user' } = {}) {
    const proposal = this.get(id);
    if (!proposal) throw new Error(`unknown proposal: ${id}`);
    if (proposal.flow === 'self' && actor !== 'self') return { dismissed: false, reason: 'self_review_required', proposal };
    const dismissed = this.#transition(id, 'dismissed', { decisionReason: reason, decidedAt: ++this.sequence });
    return { dismissed: true, proposal: dismissed };
  }

  execute(id) {
    const proposal = this.get(id);
    if (!proposal || proposal.status !== 'accepted') throw new Error('proposal must be accepted before execution');
    const change = proposal.proposedChange ?? {};
    const spec = change.spec ?? {};
    const editCountBefore = this.editor.edits.length;
    let output;
    switch (change.editType) {
      case 'add_primitive':
        output = spec.intentProposalId && typeof this.intent?.applyProposal === 'function'
          ? this.intent.applyProposal(spec.intentProposalId)
          : this.editor.addPrimitiveFromPattern(spec, spec.scale ?? 'auto');
        if (spec.intentProposalId && output?.applied !== true) {
          throw new Error(`intent proposal application failed: ${output?.reason ?? 'unknown reason'}`);
        }
        if (spec.intentProposalId) {
          const ruleId = this.editor.addRule(
            { intentProposalId: spec.intentProposalId, target: change.target },
            { action: 'apply-gap-proposal', created: output.created },
            spec.dependencies ?? spec.evidence ?? [],
          );
          output = { ...output, ruleId };
        }
        break;
      case 'evolve_operator':
        output = {
          edit: this.editor.evolveOperatorAcceptance(spec.operatorId ?? change.target, spec.successPatterns ?? [], spec.failurePatterns ?? []),
          live: typeof this.evolutionHandler === 'function' ? this.evolutionHandler(spec) : null,
        };
        if (typeof output.live?.undo === 'function') output.undo = output.live.undo;
        break;
      case 'add_rule':
        output = this.editor.addRule(spec.pattern ?? { target: change.target }, spec.transform ?? { action: spec.action ?? 'observe' }, spec.evidence ?? []);
        break;
      case 'mount_tool':
        if (typeof this.mountHandler !== 'function') throw new Error('mount handler is not wired');
        output = this.mountHandler(spec);
        this.editor.addRule({ mountedTool: output?.automaton?.id ?? output?.id ?? change.target }, { action: 'mount' }, spec.evidence ?? []);
        this.editor.addPrimitiveFromPattern(spec.primitivePattern ?? {
          identity: output?.automaton?.id ?? output?.id ?? change.target,
          contrast: 'recurring-gap',
          position: 'mesh-mounted',
          operations: spec.operations ?? [],
          dependencies: spec.evidence ?? [],
        }, 'automaton');
        break;
      case 'delete':
        output = typeof this.deletionHandler === 'function'
          ? this.deletionHandler(change.target, spec)
          : { deactivated: true, target: change.target };
        this.editor.addRule({ target: change.target }, { action: 'deactivate', reversible: true }, spec.evidence ?? []);
        break;
      default:
        throw new Error(`unsupported proposal edit type: ${change.editType}`);
    }
    if (typeof output?.undo === 'function') this.liveUndo.set(id, output.undo);
    // The first edit snapshots the whole pre-change state. Reverting it also
    // cascades over every later edit produced by this one governed proposal.
    const editId = this.editor.edits[editCountBefore]?.id ?? null;
    const executed = this.#transition(id, 'executed', {
      editId,
      rollbackAvailable: Boolean(editId),
      executionResult: safe(output),
      decidedAt: ++this.sequence,
    });
    return { accepted: true, executed: true, proposal: executed, output: safe(output), editId };
  }

  rollback(id) {
    const proposal = this.get(id);
    if (!proposal || proposal.status !== 'executed') return { rolledBack: false, reason: 'proposal_not_executed', proposal };
    if (!proposal.editId) return { rolledBack: false, reason: 'rollback_path_missing', proposal };
    const result = this.editor.revert(proposal.editId);
    if (!result.reverted) return { rolledBack: false, reason: result.reason, proposal, result };
    const undo = this.liveUndo.get(id);
    let liveUndoResult = null;
    if (undo) {
      liveUndoResult = undo();
      this.liveUndo.delete(id);
    }
    const rolledBack = this.#transition(id, 'rolled_back', {
      rollbackAvailable: false,
      rollbackResult: safe(result),
      liveUndoResult: safe(liveUndoResult),
      decidedAt: ++this.sequence,
    });
    return { rolledBack: true, proposal: rolledBack, result, liveUndoResult };
  }

  audit() {
    return Object.freeze({
      appendOnly: true,
      total: this.records.length,
      pending: this.records.filter((record) => record.status === 'pending').length,
      dismissed: this.records.filter((record) => record.status === 'dismissed').length,
      executed: this.records.filter((record) => record.status === 'executed').length,
      rolledBack: this.records.filter((record) => record.status === 'rolled_back').length,
      deletedEntries: 0,
    });
  }
}

export default ProposalLedger;
