import { SynthiaCore } from '../../vendor/synthia-core-v1.0.0/src/SynthiaCore.mjs';
import { safe } from '../util.mjs';

function coreAddress(address = {}) {
  return {
    planetary: address.planetary ?? null,
    dimension: address.dimension ?? null,
    gate: address.gate ?? null,
    line: address.line ?? null,
    color: address.color ?? null,
    tone: address.tone ?? null,
    base: address.base ?? null,
    degree: address.degree ?? null,
    minute: address.minute ?? null,
    second: address.second ?? null,
    arc: address.arc ?? (address.arcAxis ? `${address.arcAxis.arcUnit}:${address.arcAxis.axis}` : null),
    zodiac: address.zodiac ?? null,
    house: address.house ?? null,
  };
}

function tokenVariants(text) {
  const tokens = [...new Set(String(text).toLowerCase().split(/\W+/).filter(Boolean))].slice(0, 12);
  return Object.fromEntries((tokens.length ? tokens : ['empty']).map((token, index) => [token, 1 + index / 100]));
}

function cultivationText(type, payload) {
  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.utterance === 'string') return payload.utterance;
  if (typeof payload?.text === 'string') return payload.text;
  const summary = {
    type,
    ok: payload?.ok ?? null,
    strategy: payload?.strategy ?? null,
    operation: payload?.operation ?? null,
    path: payload?.path ?? null,
    role: payload?.roleResolution?.primary ?? null,
  };
  return JSON.stringify(summary);
}

/**
 * Mounts the supplied SynthiaCore as one cultivation/learning organ—not as a
 * competing top-level Synthia. Its registry, watering, sentences, books, and
 * journal stay intact while its ScientistLoop and extractors join the live
 * organism's shared cognitive surfaces.
 */
export class CultivationPipeline {
  constructor({ engine, resolver, scientist } = {}) {
    if (!engine?.mesh) throw new TypeError('CultivationPipeline requires the live semantic engine');
    if (!resolver?.resolve) throw new TypeError('CultivationPipeline requires the live address resolver');
    if (!scientist?.experiment) throw new TypeError('CultivationPipeline requires the shared ScientistLoop');
    this.engine = engine;
    this.resolver = resolver;
    this.scientist = scientist;
    this.core = new SynthiaCore();
    this.core.learning.scientist = scientist;
    this.core.learning.books.extractors = {
      autoling: (chunk) => this.#tool('autoling').run({ operation: 'pipeline', text: chunk }, { source: 'cultivation-book' }).output,
      diseminer: (chunk) => this.#tool('diseminer').run({ operation: 'extract', text: chunk, source: 'cultivation-book' }, { source: 'cultivation-book' }).output,
      monteCarlo: (chunk) => this.#tool('historical-monte-carlo').run({
        variants: tokenVariants(chunk), seed: String(chunk).length + 1, generations: 8, mutationScale: 0.05,
      }, { source: 'cultivation-book' }).output,
    };
    this.core.boot();
    this.history = [];
  }

  #tool(id) {
    const tool = this.engine.mesh.get(id);
    if (!tool) throw new Error(`cultivation instrument is not mounted: ${id}`);
    return tool;
  }

  #resolve(text, name = 'cultivation.txt') {
    const artifact = { name, content: String(text ?? '') };
    const primitives = this.resolver.descend(artifact);
    return this.resolver.resolve({ artifact, decomposition: primitives });
  }

  #science(action, predicted, actual, address, toolPath) {
    const question = this.scientist.question(`Will ${action} place and retain this input coherently?`, {
      hypothesis: `${action} will agree across the cultivation core and canonical scale resolver.`,
      method: toolPath.join(' -> '),
      address,
      source: ['synthia-core', 'cultivation-pipeline'],
    });
    return this.scientist.experiment(question.id, { action, predicted, actual, afterAddress: address, toolPath });
  }

  water(text, context = {}) {
    const value = String(text ?? '');
    const coreResult = this.core.water(value);
    const grammar = this.#tool('autoling').run({ operation: 'pipeline', text: value }, { ...context, source: 'watering' });
    const claims = this.#tool('diseminer').run({ operation: 'extract', text: value, source: 'watering' }, { ...context, source: 'watering' });
    const resolution = this.#resolve(value, `water-${coreResult.source}.txt`);
    const experiment = this.#science('watering', coreResult.topGate, resolution.address.gate, resolution.address, [
      'synthia-core.water', 'autoling', 'diseminer', 'scale-resolver',
    ]);
    return this.#record('water', {
      ok: true,
      text: value,
      waterCount: this.core.snapshot().waterCount,
      core: coreResult,
      grammar: safe(grammar.output),
      claims: safe(claims.output),
      canonicalAddress: resolution.address,
      canonicalAddressKey: resolution.key,
      scaleLadder: resolution.scaleLadder,
      experiment,
      trace: [
        { stage: 'synthia-core.water', consumed: true },
        { stage: 'autoling', consumed: true, accepted: grammar.accepted },
        { stage: 'diseminer', consumed: true, accepted: claims.accepted },
        { stage: 'scale-resolver', consumed: true },
        { stage: 'scientist-loop', consumed: true },
      ],
    });
  }

  admit(piece, context = {}) {
    const coreResult = this.core.admit(piece);
    const resolution = this.#resolve(piece.text, `${piece.id}.txt`);
    const transitioned = this.core.learning.registry.transition(piece.id, {
      toAddress: coreAddress(resolution.address),
      cause: 'canonical-scale-resolution',
      statePatch: { canonicalAddressKey: resolution.key },
      actor: 'cultivation-pipeline',
      relation: 'promoted-to-full-coordinate',
    });
    const experiment = this.#science('admission', coreResult.gate, resolution.address.gate, resolution.address, [
      'synthia-core.admit', 'state-registry', 'scale-resolver',
    ]);
    return this.#record('admit', {
      ok: true,
      id: piece.id,
      core: coreResult,
      registryTransition: transitioned,
      entity: this.core.learning.registry.get(piece.id),
      waterCount: this.core.snapshot().waterCount,
      canonicalAddress: resolution.address,
      canonicalAddressKey: resolution.key,
      scaleLadder: resolution.scaleLadder,
      experiment,
    });
  }

  contact(entityIdA, entityIdB, options = {}) {
    const contact = this.core.contact(entityIdA, entityIdB, options);
    const text = contact.sentence.sentence;
    const conversation = this.#tool('conversation').run({
      text,
      contributions: [`Cultivation contact: ${contact.sentence.relation}`],
    }, { source: 'cultivation-contact', contact: safe(contact.event) });
    const experiment = this.#science('sentence-contact', text, conversation.output.utterance, null, [
      'state-registry.contact', 'sentence-mesh', 'conversation',
    ]);
    return this.#record('contact', {
      ok: true,
      ...contact,
      utterance: conversation.output.utterance,
      experiment,
    });
  }

  ingestBook(spec = {}) {
    const fragments = this.core.learning.books.ingest({
      ...spec,
      addressResolver: ({ chunk, index, sourceId }) => coreAddress(
        this.#resolve(chunk, `${sourceId}-${index}.txt`).address,
      ),
    });
    const experiment = this.#science('book-ingestion', fragments.length, fragments.length, null, [
      'book-ingest-bridge', 'autoling', 'diseminer', 'historical-monte-carlo', 'state-registry',
    ]);
    return this.#record('book-ingest', {
      ok: true,
      sourceId: spec.sourceId,
      fragmentCount: fragments.length,
      fragments,
      experiment,
    });
  }

  /**
   * The general cultivation path. Chat, execution, state-space navigation,
   * routing, and governance outcomes all arrive here so cultivation is the
   * organism-wide purpose rather than one optional mode.
   */
  observe(type, payload, context = {}) {
    const text = cultivationText(type, payload);
    const source = `cultivation-observation-${this.history.length + 1}`;
    this.core.diseminer.ingest(text, { source, kind: type });
    const resolution = this.#resolve(text, `${type}-${this.history.length + 1}.state`);
    const successful = payload?.ok !== false;
    this.core.learning.training.record({
      task: `cultivate:${type}`,
      stateBefore: { observations: this.history.length },
      toolPath: context.toolPath ?? [type, 'five-level-state-space', 'training-journal'],
      interaction: { source, personId: context.personId ?? 'default-person', text: text.slice(0, 512) },
      stateAfter: { observations: this.history.length + 1 },
      observedExpression: resolution.key,
      success: successful,
    });
    const experiment = context.scienceAlreadyRecorded === true ? null : this.#science(
      `universal-cultivation:${type}`,
      successful ? 'integrated' : 'gap-observed',
      successful ? 'integrated' : 'gap-observed',
      resolution.address,
      context.toolPath ?? [type, 'five-level-state-space', 'training-journal'],
    );
    return this.#record('observe', {
      ok: true,
      cultivatedTask: type,
      source,
      successful,
      canonicalAddress: resolution.address,
      canonicalAddressKey: resolution.key,
      fiveLevelProjection: resolution.fiveLevelProjection,
      experiment,
    });
  }

  trainingSnapshot() {
    return Object.freeze({
      core: this.core.snapshot(),
      entities: this.core.learning.registry.snapshot(),
      routes: this.core.learning.training.rankRoutes(),
      records: safe(this.core.learning.training.records),
      fragments: safe(this.core.learning.books.fragments),
      history: safe(this.history),
      universalObservations: this.history.filter((entry) => entry.type === 'observe').length,
    });
  }

  #record(type, payload) {
    const record = Object.freeze({ id: `cultivation-${this.history.length + 1}`, sequence: this.history.length + 1, type, ...safe(payload) });
    this.history.push(record);
    return record;
  }
}

export default CultivationPipeline;
