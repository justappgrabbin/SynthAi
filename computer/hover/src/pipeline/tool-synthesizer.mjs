import { safe } from '../util.mjs';

function intersection(lists) {
  if (!lists.length) return [];
  return [...new Set(lists[0])].filter((item) => lists.slice(1).every((list) => list.includes(item)));
}

function flattenValues(value, output = []) {
  if (Array.isArray(value)) for (const member of value) flattenValues(member, output);
  else if (value != null && typeof value !== 'object') output.push(String(value));
  return output;
}

/** Execute structural acceptance checks against an actual Autonovel result. */
export function validateSynthesizedCandidate(generated, gap, missing) {
  const nodes = Array.isArray(generated?.nodes) ? generated.nodes : [];
  const relations = Array.isArray(generated?.relations) ? generated.relations : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const values = new Set(nodes.flatMap((node) => flattenValues(node.value)));
  const capabilityCoverage = missing.filter((capability) => values.has(String(capability)));
  const requestEvidence = values.has(String(gap.request ?? gap.id));
  const connected = relations.length > 0 && relations.every((relation) =>
    nodeIds.has(relation.target) && (relation.source ?? []).every((id) => nodeIds.has(id)));
  const executable = generated?.ok === true
    && capabilityCoverage.length === missing.length
    && requestEvidence
    && connected;
  const signature = [
    executable ? 'candidate-valid' : 'candidate-invalid',
    `gap:${gap.id}`,
    ...capabilityCoverage.map((capability) => `capability:${capability}`),
    requestEvidence ? `request:${gap.request ?? gap.id}` : 'request:missing',
    connected ? 'relations:connected' : 'relations:disconnected',
  ].join(' ');
  return Object.freeze({
    executed: true,
    executable,
    structureId: generated?.id ?? null,
    capabilityCoverage: Object.freeze(capabilityCoverage),
    requestEvidence,
    connected,
    signature,
  });
}

export class ToolSynthesizer {
  constructor({ system, engine, scientist, proposalLedger = null, adapters = {}, threshold = 3 } = {}) {
    this.system = system;
    this.engine = engine;
    this.scientist = scientist;
    this.proposalLedger = proposalLedger;
    this.adapters = adapters;
    this.threshold = threshold;
    this.history = [];
    this.retryQueue = [];
  }

  async checkTrigger({ intentType = null } = {}) {
    const groups = new Map();
    for (const gap of this.engine.intent.gaps) {
      if (intentType && gap.intentType !== intentType) continue;
      const key = gap.intentType ?? 'unknown';
      const list = groups.get(key) ?? [];
      list.push(gap);
      groups.set(key, list);
    }
    const selected = [...groups.entries()].find(([, gaps]) => gaps.length >= this.threshold);
    if (!selected) return { triggered: false, reason: 'recurrence_threshold_not_met' };
    const [type, gaps] = selected;
    const triggering = gaps.slice(-this.threshold);
    const missing = intersection(triggering.map((gap) => gap.missing ?? []));
    if (!missing.length) return { triggered: false, reason: 'no_overlapping_missing_capability' };
    const alreadyCovered = [...this.engine.mesh.automata.values()].some((tool) =>
      missing.every((capability) => tool.id === capability || tool.capabilities?.includes(capability)));
    if (alreadyCovered) return { triggered: false, reason: 'existing_automaton_covers_gap', missing };

    const autonovel = this.engine.mesh.get('autonovel');
    const domainId = `tool-synthesis:${type}:${missing.join('+')}`;
    if (!autonovel.ownedState.domains[domainId]) {
      const combinators = Object.keys(this.adapters).map((id) => ({
        id: `adapter:${id}`,
        type: 'translation',
        inputs: ['capability', 'capability'],
        output: 'tool',
      }));
      if (!combinators.length) combinators.push({ id: 'adapter:sequence', type: 'sequence', inputs: ['capability', 'capability'], output: 'tool' });
      autonovel.run({ operation: 'register', domain: {
        id: domainId,
        primitives: missing.map((id) => ({ id, type: 'capability' })),
        combinators,
      } });
    }
    const seeds = [
      ...missing.map((value) => ({ type: 'capability', value, features: { missing: true } })),
      ...triggering.map((gap) => ({ type: 'capability', value: gap.request ?? gap.id, features: { request: true } })),
    ];
    const generated = autonovel.run({ operation: 'generate', spec: { domain: domainId, seeds, maxDepth: 8 } }).output;
    const question = this.scientist.question('Does this synthesized automaton handle the recurring capability gap?', {
      hypothesis: `Composing ${missing.join(', ')} through registered adapters handles ${type}.`,
      method: 'Autonovel candidate tested against three triggering tasks',
      source: triggering.map((gap) => gap.id),
    });
    const validationRuns = triggering.map((gap) => validateSynthesizedCandidate(generated, gap, missing));
    const tests = triggering.map((gap, index) => {
      const requiredSignature = [
        'candidate-valid',
        `gap:${gap.id}`,
        ...missing.map((capability) => `capability:${capability}`),
        `request:${gap.request ?? gap.id}`,
        'relations:connected',
      ].join(' ');
      return this.scientist.experiment(question.id, {
        action: `synthesized-tool-test:${gap.id}`,
        predicted: requiredSignature,
        actual: validationRuns[index].signature,
        toolPath: ['autonovel', ...Object.keys(this.adapters)],
      });
    });
    const passed = tests.filter((test) => test.score > 0.7).length;
    let mounted = null;
    let outboxProposal = null;
    if (generated.ok && passed >= 2) {
      const forcedId = `synthesized-${type}-${this.history.length + 1}`;
      const growthSpec = {
        purpose: `Resolve recurring ${type} gap for ${missing.join(', ')}`,
        input: triggering.map((gap) => gap.request).filter(Boolean).join(' '),
        dimension: 'Design',
        gate: 16,
        capabilities: [...missing],
        hints: [type, ...missing],
        forcedId,
        learnedFrom: triggering[0].id,
        implementationKind: 'validated-gap-response',
        candidateStructure: safe(generated),
        validationRuns: safe(validationRuns),
        evidence: triggering.map((gap) => gap.id),
        operations: Object.keys(this.adapters),
        primitivePattern: {
          identity: forcedId,
          contrast: 'recurring-gap',
          position: 'mesh-mounted',
          operations: Object.keys(this.adapters),
          dependencies: triggering.map((gap) => gap.id),
        },
      };
      if (!this.proposalLedger) throw new Error('ToolSynthesizer requires the governed self-modification outbox');
      outboxProposal = this.proposalLedger.append({
        flow: 'self',
        kind: 'tool_synthesis',
        observation: {
          source: 'gap',
          chartContext: null,
          successSignal: null,
          gapRecord: { gapType: 'recurring_capability_gap', missing, recurrenceCount: triggering.length },
        },
        proposedChange: {
          description: `Mount validated synthesized tool ${forcedId}`,
          target: forcedId,
          editType: 'mount_tool',
          spec: growthSpec,
        },
        reasoning: `Autonovel composition passed ${passed} of ${tests.length} ScientistLoop test cases.`,
        confidence: passed / tests.length,
        chartTiming: { appropriate: true, heldUntil: null, context: 'validated tool synthesis; no conflicting chart state supplied' },
      });
      const accepted = this.proposalLedger.accept(outboxProposal.id, { actor: 'self', execute: true });
      mounted = accepted.output;
      outboxProposal = accepted.proposal;
    } else {
      this.retryQueue.push({ type, missing, gapIds: triggering.map((gap) => gap.id), seedAdjustment: this.retryQueue.length + 1 });
    }
    const record = Object.freeze({
      triggered: true,
      intentType: type,
      missing: Object.freeze(missing),
      gapIds: Object.freeze(triggering.map((gap) => gap.id)),
      generated: safe(generated),
      questionId: question.id,
      tests: safe(tests),
      validationRuns: safe(validationRuns),
      passed,
      mounted: safe(mounted),
      outboxProposal: safe(outboxProposal),
      validated: Boolean(mounted),
    });
    this.history.push(record);
    return record;
  }
}

export default ToolSynthesizer;
