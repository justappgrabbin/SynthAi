import { deterministicId, safe } from '../util.mjs';

/** Observes chart, success, gap, and scientist signals and routes proposals. */
export class ObservationEngine {
  constructor({ intent, scientist, success, chartTiming, proposals, deletionGuard, cooldown = 7 } = {}) {
    this.intent = intent;
    this.scientist = scientist;
    this.success = success;
    this.chartTiming = chartTiming;
    this.proposals = proposals;
    this.deletionGuard = deletionGuard;
    this.cooldown = cooldown;
    this.sequence = 0;
    this.observations = [];
    this.staging = [];
  }

  #dismissedRecently(key) {
    return this.proposals.records.some((record) => record.observationKey === key
      && record.status === 'dismissed'
      && this.sequence - Number(record.decidedAt ?? 0) < this.cooldown);
  }

  async watch({ chartState = null, personId = null, targetScope = null, successSignal = null, gapRecord = null, scientistQuestion = null, proposedChange = null, confidence = null } = {}) {
    const source = [chartState && 'chart', successSignal && 'success', gapRecord && 'gap'].filter(Boolean);
    const observationSource = source.length > 1 ? 'combined' : (source[0] ?? 'gap');
    const chartContext = chartState ? {
      gate: chartState.transit?.gate ?? chartState.gate ?? null,
      line: chartState.transit?.line ?? chartState.line ?? null,
      transit: safe(chartState.transit ?? null),
      channel: safe(chartState.channel ?? null),
    } : null;
    const observation = {
      source: observationSource,
      chartContext,
      successSignal: successSignal ? safe(successSignal) : null,
      gapRecord: gapRecord ? {
        gapType: gapRecord.gapType,
        missing: safe(gapRecord.missing ?? []),
        recurrenceCount: gapRecord.recurrenceCount ?? 1,
      } : null,
    };
    const key = deterministicId('observation', observation);
    if (this.#dismissedRecently(key)) return { generated: false, reason: 'dismissal_cooldown', observationKey: key };
    const sequence = ++this.sequence;
    this.observations.push(Object.freeze({ id: `observation-${sequence}`, sequence, key, ...safe(observation) }));
    let flow = targetScope === 'self' || personId == null ? 'self' : 'user';
    const resolvedConfidence = Number(confidence ?? scientistQuestion?.confidence ?? (gapRecord ? 0.7 : 0.65));
    const change = proposedChange ?? {
      description: gapRecord
        ? `Address recurring ${gapRecord.gapType} gap`
        : successSignal
          ? `Adjust routing for ${successSignal.indicatorId}`
          : 'Record the observed chart relationship as a reversible rule',
      target: gapRecord?.missing?.[0] ?? successSignal?.indicatorId ?? 'relational-routing',
      editType: gapRecord ? 'add_primitive' : 'add_rule',
      spec: gapRecord
        ? { identity: `gap_${gapRecord.gapType}`, dependencies: gapRecord.missing ?? [], evidence: [gapRecord.id] }
        : { pattern: observation, transform: { action: 'consider-observation' }, evidence: [key] },
    };
    let deletionReview = null;
    if (change.editType === 'delete') {
      deletionReview = this.deletionGuard.check({
        ...change.spec,
        target: change.target,
        flow,
        currentSequence: this.proposals.sequence,
      });
      if (deletionReview.rule === 1) {
        return { generated: false, reason: 'canonical_deletion_rejected', guard: deletionReview, observationKey: key };
      }
      if (!deletionReview.permitted && deletionReview.requiredFlow === 'user') {
        if (!personId) return { generated: false, reason: 'explicit_user_target_required', guard: deletionReview, observationKey: key };
        flow = 'user';
      } else if (!deletionReview.permitted && deletionReview.requiredFlow === 'self') {
        flow = 'self';
      }
    }
    const draft = {
      flow,
      personId: flow === 'user' ? personId : null,
      kind: proposedChange?.kind ?? (gapRecord ? 'tool_synthesis' : successSignal ? 'routing' : 'pipeline'),
      observation,
    };
    const timing = this.chartTiming.evaluate(draft, chartState);
    const proposal = {
      ...draft,
      proposedChange: change,
      reasoning: gapRecord
        ? 'Repeated missing capability evidence supports a bounded, testable extension.'
        : 'The observed relational context may improve local coordination if accepted.',
      confidence: resolvedConfidence,
      chartTiming: timing,
      createdAt: sequence,
      observationKey: key,
      deletionReview,
    };

    if (!timing.appropriate && resolvedConfidence < 0.85) {
      const staged = Object.freeze({ ...safe(proposal), stagingId: `staged-${this.staging.length + 1}` });
      this.staging.push(staged);
      return { generated: true, staged: true, proposal: staged };
    }

    const record = this.proposals.append(proposal);
    if (flow === 'self') {
      const review = this.proposals.accept(record.id, { actor: 'self', execute: true });
      return { generated: true, staged: false, proposal: this.proposals.get(record.id), review };
    }
    return { generated: true, staged: false, proposal: record };
  }

  async flushStaging(chartState = null) {
    const moved = [];
    const held = [];
    for (const proposal of this.staging) {
      const timing = this.chartTiming.evaluate(proposal, chartState);
      if (!timing.appropriate && proposal.confidence < 0.85) {
        held.push(proposal);
        continue;
      }
      const { stagingId, ...rest } = proposal;
      const record = this.proposals.append({ ...rest, chartTiming: timing });
      moved.push(record);
    }
    this.staging = held;
    return { moved: Object.freeze(moved), held: Object.freeze(held) };
  }
}

export default ObservationEngine;
