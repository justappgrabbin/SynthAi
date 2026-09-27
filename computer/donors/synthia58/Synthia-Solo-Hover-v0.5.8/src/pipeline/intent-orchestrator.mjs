import { safe } from '../util.mjs';

export const INTENT_PIPELINES = Object.freeze({
  communicate: Object.freeze(['autoling', 'diseminer', 'klein-analogy', 'success', 'language-contact', 'conversation', 'scientist-loop']),
  compute: Object.freeze(['primitive-descent', 'scale-ladder', 'cross-scale', 'klein-analogy', 'execution-strategy']),
  compose_structure: Object.freeze(['autonovel', 'klein-analogy', 'conversation']),
  reframe: Object.freeze(['klein-analogy', 'diseminer', 'conversation']),
  modify: Object.freeze(['autoling', 'self-editor-or-language-contact', 'conversation']),
  resolve_error: Object.freeze(['intent-gap-lookup', 'historical-monte-carlo', 'retry']),
});

const OPERATORS = Object.freeze({
  communicate: ['o_discourse'],
  compute: ['o_automaton'],
  compose_structure: ['o_bundle', 'o_sequence'],
  reframe: ['o_project'],
  modify: ['o_transform'],
  resolve_error: [],
});

/** Intent inference and selection are explicit, tested hypotheses. */
export class IntentOrchestrator {
  constructor({ engine, scientist, chatPipeline = null, executionPipeline = null, observation = null } = {}) {
    this.engine = engine;
    this.scientist = scientist;
    this.chatPipeline = chatPipeline;
    this.executionPipeline = executionPipeline;
    this.observation = observation;
    this.routingWeights = new Map();
    this.history = [];
  }

  bind({ chatPipeline, executionPipeline, observation } = {}) {
    if (chatPipeline) this.chatPipeline = chatPipeline;
    if (executionPipeline) this.executionPipeline = executionPipeline;
    if (observation) this.observation = observation;
    return this;
  }

  inferIntent(task, context = {}) {
    if (context.intentType && INTENT_PIPELINES[context.intentType]) return context.intentType;
    const text = String(typeof task === 'string' ? task : task?.name ?? task?.content ?? '').toLowerCase();
    if (context.previousError || /\b(error|failed|failure|recover|retry|resolve error)\b/.test(text)) return 'resolve_error';
    if (context.artifact || (task && typeof task === 'object' && ('content' in task || 'bytes' in task))
      || /\b(execute|run|compute|calculate|evaluate code)\b/.test(text)) return 'compute';
    if (/\b(modify|edit|change|adapt|update|rewrite)\b/.test(text)) return 'modify';
    if (/\b(reframe|analogy|analogous|perspective|another way)\b/.test(text)) return 'reframe';
    if (/\b(compose|assemble|bundle|sequence|build structure)\b/.test(text)) return 'compose_structure';
    if (context.ambiguous === true) {
      const weights = this.routingWeights.get(context.personId ?? 'default-person');
      const dominant = weights && Object.entries(weights)
        .filter(([intent]) => INTENT_PIPELINES[intent])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
      if (dominant) return dominant;
    }
    return 'communicate';
  }

  #observeIntent(intentType, task, context) {
    const text = String(typeof task === 'string' ? task : task?.name ?? task?.content ?? '');
    const vocabulary = text.toLowerCase().split(/\W+/).filter(Boolean);
    const surfaceFeatures = {
      length: text.length,
      vocabularySize: new Set(vocabulary).size,
      hasQuestion: /\?/.test(text),
      hasCodeMarker: /```|\b(function|class|const|let|import|def)\b/.test(text),
      hasFileMarker: Boolean(task && typeof task === 'object' && ('name' in task || 'bytes' in task || 'content' in task)),
      hasErrorMarker: /\b(error|failed|failure|exception|retry)\b/i.test(text),
      ...safe(context.surfaceFeatures ?? {}),
    };
    const derivation = {
      id: `intent-route-${this.history.length + 1}`,
      primitives: vocabulary,
      operators: OPERATORS[intentType],
      output: intentType === 'resolve_error' ? { ok: false } : { ok: true, planned: INTENT_PIPELINES[intentType] },
      evaluation: { accepted: intentType !== 'resolve_error' },
    };
    return this.engine.intent.observe(derivation, { source: 'task-arrival', surfaceFeatures });
  }

  #question(intentType) {
    return this.scientist.question(`Is this task ${intentType}, and should it use the mapped local mesh pipeline?`, {
      hypothesis: `The task is ${intentType} and should route through ${INTENT_PIPELINES[intentType].join(' -> ')}.`,
      method: 'surface features -> synthetic derivation -> IntentEngine observation',
      source: ['intent-orchestrator'],
    });
  }

  #runConversation(text, contributions, context) {
    const tool = this.engine.mesh.get('conversation');
    return tool.run({ text, contributions }, { ...context, contributions }).output;
  }

  #features(text) {
    const words = String(text).toLowerCase().split(/\W+/).filter(Boolean);
    return [...new Set(words.slice(0, 12).map((word) => `lex:${word}`))];
  }

  async #compose(task, context) {
    const text = String(task);
    const autonovel = this.engine.mesh.get('autonovel');
    const domainId = 'intent-compose-domain';
    if (!autonovel.ownedState.domains[domainId]) {
      autonovel.run({ operation: 'register', domain: {
        id: domainId,
        primitives: [{ id: 'element', type: 'element' }],
        combinators: [{ id: 'sequence-elements', type: 'sequence', inputs: ['element', 'element'], output: 'structure' }],
      } });
    }
    const words = text.split(/\s+/).filter(Boolean);
    const generated = autonovel.run({ operation: 'generate', spec: {
      domain: domainId,
      seeds: (words.length > 1 ? words : [text, 'structure']).map((word) => ({ type: 'element', value: word })),
    } }).output;
    const klein = this.engine.mesh.get('klein-analogy').run({
      vocab: ['element', 'sequence', 'structure'], A: ['element'], B: ['sequence'], C: ['element'], mode: 'xor',
    }).output;
    const utterance = this.#runConversation(text, [`Structure: ${generated.id}`, `Relation: ${(klein.result ?? []).join(', ')}`], context);
    return { ok: generated.ok, utterance: utterance.utterance, pipeline: INTENT_PIPELINES.compose_structure, generated, analogy: klein };
  }

  async #reframe(task, context) {
    const text = String(task);
    const features = this.#features(text);
    const vocab = [...new Set([...features, 'perspective:source', 'perspective:target'])];
    const analogy = this.engine.mesh.get('klein-analogy').run({
      vocab, A: features.slice(0, 2), B: ['perspective:source'], C: features.slice(2, 4), mode: 'xor',
    }).output;
    const reframedText = `${text}. ${analogy.result?.join(' ') ?? ''}`;
    const claims = this.engine.mesh.get('diseminer').run({ operation: 'extract', text: reframedText, source: 'intent:reframe' }).output;
    const conversation = this.#runConversation(text, [`Reframed relation: ${(analogy.result ?? []).join(', ')}`, `Claims: ${claims.claims?.length ?? 0}`], context);
    return { ok: true, utterance: conversation.utterance, pipeline: INTENT_PIPELINES.reframe, analogy, claims };
  }

  async #modify(task, context) {
    const text = String(task);
    const grammar = this.engine.mesh.get('autoling').run({ operation: 'pipeline', text }).output;
    let change = null;
    if (context.target === 'synthia' || /\bsynthia\b/i.test(text)) {
      change = await this.observation?.watch({
        targetScope: 'self',
        proposedChange: {
          kind: 'pipeline',
          description: text,
          target: context.component ?? 'synthia-routing',
          editType: 'add_rule',
          spec: { pattern: { request: text }, transform: { action: 'proposed-modification' }, evidence: ['intent:modify'] },
        },
        confidence: context.confidence ?? 0.7,
      });
    } else {
      change = this.engine.mesh.get('language-contact').run({
        grammarA: context.grammarA ?? { register: 'synthia' },
        grammarB: context.grammarB ?? { register: 'adapted' },
        seed: context.seed ?? 1,
        contactRate: 0.5,
        generations: 3,
      }).output;
    }
    const conversation = this.#runConversation(text, [`Modification route: ${context.target === 'synthia' ? 'self outbox' : 'language contact'}`], context);
    return { ok: true, utterance: conversation.utterance, pipeline: INTENT_PIPELINES.modify, grammar, change };
  }

  async #resolveError(task, context) {
    const gaps = this.engine.intent.gaps.slice(-10);
    const strategies = { retry_internal: 1, retry_hybrid: 0.8, request_runtime: 0.5 };
    const monteCarlo = this.engine.mesh.get('historical-monte-carlo').run({
      variants: strategies,
      seed: context.seed ?? 7,
      generations: 20,
      mutationScale: 0.1,
    }).output;
    const retry = typeof context.retry === 'function' ? await context.retry(monteCarlo.dominantVariant) : null;
    return { ok: retry?.ok ?? true, pipeline: INTENT_PIPELINES.resolve_error, gaps, recovery: monteCarlo, retry };
  }

  async route(task, context = {}) {
    const intentType = this.inferIntent(task, context);
    const intentObservation = this.#observeIntent(intentType, task, context);
    const question = this.#question(intentType);
    let outcome;
    if (intentType === 'communicate') outcome = await this.chatPipeline.run(String(task), context);
    else if (intentType === 'compute') outcome = await this.executionPipeline.run(typeof task === 'object' ? task : context.artifact, context);
    else if (intentType === 'compose_structure') outcome = await this.#compose(task, context);
    else if (intentType === 'reframe') outcome = await this.#reframe(task, context);
    else if (intentType === 'modify') outcome = await this.#modify(task, context);
    else outcome = await this.#resolveError(task, context);

    const successful = outcome?.ok !== false;
    const experiment = this.scientist.experiment(question.id, {
      action: `intent-route:${intentType}`,
      predicted: intentType,
      actual: successful ? intentType : 'route-failed',
      toolPath: [...INTENT_PIPELINES[intentType]],
    });
    const personId = context.personId ?? 'default-person';
    const previousWeights = this.routingWeights.get(personId)
      ?? Object.fromEntries(Object.keys(INTENT_PIPELINES).map((intent) => [intent, 1]));
    const variants = { ...previousWeights };
    variants[intentType] = Math.max(0.05, variants[intentType] * (successful ? 1.1 : 0.5));
    const routingUpdate = this.engine.mesh.get('historical-monte-carlo').run({
      variants,
      seed: this.history.length + personId.length + 1,
      generations: 8,
      mutationScale: 0.06,
    }).output;
    this.updateRoutingWeights(personId, routingUpdate.finalWeights);
    const record = Object.freeze({
      id: `intent-task-${this.history.length + 1}`,
      intentType,
      pipeline: INTENT_PIPELINES[intentType],
      intentObservation: safe(intentObservation),
      outcome,
      experiment: safe(experiment),
      routingUpdate: safe(routingUpdate),
    });
    this.history.push(record);
    return record;
  }

  updateRoutingWeights(personId, weights) {
    this.routingWeights.set(personId, Object.freeze({ ...weights }));
    return this.routingWeights.get(personId);
  }
}

export default IntentOrchestrator;
