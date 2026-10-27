/**
 * Synthia Resident: an online neural-inference graph beside the existing
 * Klein / Semantic Spacetime graph. NOT a language model.
 *
 * Only the resident/orchestrator is new. All linguistic automata are imported
 * unchanged from this computer's versioned pure-Synthia execution spine.
 * No network calls or automatic external effects.
 */
import { AutolingEngine } from '../engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-14-autoling.js';
import { DiseminerEngine } from '../engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-15-diseminer.js';
import { AutonovelAutomaton } from '../engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-07-autonovel.js';
import { validateSavedSynthiaInference } from './synthia-weight-guard.mjs';

const STORAGE_KEY = 'computer.synthia.resident.v1';
const FEATURES = 96;
const HIDDEN = 16;
const tokenize = text => String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const finite = x => Number.isFinite(x) ? x : 0;
const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
const freezeCopy = x => JSON.parse(JSON.stringify(x));

// Feature hashes select numeric training indices, never semantic identities.
function featureIndex(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function vectorize(text, previous = '') {
  const words = tokenize(text).slice(0, 160);
  const prior = tokenize(previous).slice(-12);
  const features = [];
  for (const w of words) features.push('word:' + w);
  for (let i = 0; i + 1 < words.length; i++) features.push('pair:' + words[i] + '/' + words[i + 1]);
  for (const w of prior) features.push('context:' + w);
  const out = Array(FEATURES).fill(0);
  for (const f of features) out[featureIndex(f) % FEATURES] += 1;
  const norm = Math.hypot(...out) || 1;
  return out.map(v => v / norm);
}

class NeuralInferenceGraph {
  constructor(saved = null) {
    // Deterministic small neural network, not pretrained.
    this.weights = Array.from({ length: HIDDEN }, (_, i) =>
      Array.from({ length: FEATURES }, (_, j) => Math.sin((i + 1) * 31 + j * 17) * 0.035));
    this.bias = Array(HIDDEN).fill(0);
    this.heads = {};
    this.examples = 0;
    if (saved && Array.isArray(saved.weights) && saved.weights.length === HIDDEN) {
      this.weights = saved.weights;
      this.bias = saved.bias ?? this.bias;
      this.heads = saved.heads ?? {};
      this.examples = saved.examples ?? 0;
    }
  }
  activate(x) {
    return this.weights.map((row, i) => Math.tanh(this.bias[i] + row.reduce((sum, w, j) => sum + w * x[j], 0)));
  }
  predict(text, previous = '') {
    if (!this.examples || !Object.keys(this.heads).length)
      return { trained: false, candidates: [], chosen: null };
    const h = this.activate(vectorize(text, previous));
    const candidates = Object.entries(this.heads).map(([label, head]) => ({
      label, score: sigmoid(head.bias + h.reduce((sum, value, j) => sum + value * head.weights[j], 0)),
      examples: head.examples
    })).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return { trained: true, candidates: candidates.slice(0, 8),
      chosen: best && best.score >= 0.60 ? best : null };
  }
  learn(text, label, { accepted = true, previous = '' } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > 12000)
      throw new TypeError('A nonempty bounded training message is required.');
    if (typeof label !== 'string' || !/^[\w./ -]{1,64}$/.test(label))
      throw new TypeError('A named capability/goal label is required.');
    if (!this.heads[label]) this.heads[label] = { weights: Array(HIDDEN).fill(0), bias: 0, examples: 0 };
    const x = vectorize(text, previous);
    const rate = 0.16;
    for (let epoch = 0; epoch < 24; epoch++) {
      const h = this.activate(x);
      const derivatives = Array(HIDDEN).fill(0);
      for (const [name, head] of Object.entries(this.heads)) {
        const target = name === label ? Number(accepted) : 0;
        const score = sigmoid(head.bias + h.reduce((s, v, j) => s + v * head.weights[j], 0));
        const error = score - target;
        for (let j = 0; j < HIDDEN; j++) derivatives[j] += error * head.weights[j] * (1 - h[j] ** 2);
        for (let j = 0; j < HIDDEN; j++) head.weights[j] -= rate * error * h[j];
        head.bias -= rate * error;
      }
      for (let j = 0; j < HIDDEN; j++) {
        const gradient = rate * derivatives[j];
        for (let k = 0; k < FEATURES; k++) this.weights[j][k] -= gradient * x[k];
        this.bias[j] -= gradient;
      }
    }
    this.examples++;
    this.heads[label].examples++;
    return this.predict(text, previous);
  }
  export() { return { weights: this.weights, bias: this.bias, heads: this.heads, examples: this.examples }; }
}

class SemanticSpacetimeGraph {
  constructor(saved = null) {
    this.nodes = saved?.nodes ?? [];
    this.edges = saved?.edges ?? [];
    this.sequence = saved?.sequence ?? 0;
  }
  say(text, actor = 'user:local', context = {}, claims = []) {
    const id = 'utterance:' + (++this.sequence);
    // User messages are assertions by a speaker, NOT verified world facts.
    this.nodes.push({ id, type: 'utterance', text, actor, scope: context.scope ?? 'local',
      epistemic: 'reported', sequence: this.sequence });
    this.edges.push({ from: actor, to: id, type: 'says', verified: true, sequence: this.sequence });
    for (const claim of claims.slice(0, 8)) {
      this.edges.push({ from: id, to: 'claim:' + claim.id, type: 'proposes',
        subject: claim.subject, predicate: claim.predicate, object: claim.object,
        modality: claim.modality, verified: false, sequence: this.sequence });
    }
    return id;
  }
  respond(utteranceId, text, provider) {
    const id = 'response:' + (++this.sequence);
    this.nodes.push({ id, type: 'response', text, provider, sequence: this.sequence });
    this.edges.push({ from: utteranceId, to: id, type: 'responds-to', verified: true,
      sequence: this.sequence });
    return id;
  }
  promise({ from, to, behavior, scope, authorized = false }) {
    // An offer/commitment is not evidence of delivery; capability != permission.
    if (!from || !to || !behavior || !scope) throw new TypeError('Typed scoped promise required.');
    const id = 'promise:' + (++this.sequence);
    this.edges.push({ id, from, to, type: 'promise', behavior, scope,
      authorized: authorized === true, fulfilled: false, sequence: this.sequence });
    return id;
  }
  export() { return { nodes: this.nodes, edges: this.edges, sequence: this.sequence }; }
}

export class SynthiaResident {
  constructor({ state, bus = null } = {}) {
    if (!state || typeof state.get !== 'function' || typeof state.set !== 'function')
      throw new TypeError('Synthia requires the Computer state store.');
    this.state = state;
    this.bus = bus;
    this.autoling = new AutolingEngine();
    this.diseminer = new DiseminerEngine();
    this.autonovel = new AutonovelAutomaton();
    this.inference = new NeuralInferenceGraph();
    this.spacetime = new SemanticSpacetimeGraph();
    this.workspace = { episodes: [], feedback: [], observations: [] };
    this.started = false;
  }
  async boot() {
    if (this.started) return this;
    const saved = this.state.get(STORAGE_KEY, null);
    if (saved) {
      // Reject an incompatible/corrupt checkpoint *before* installing defaults
      // or saving new observations. Never silently overwrite special weights.
      try {
        validateSavedSynthiaInference(saved.inference);
      } catch (error) {
        this.bus?.emit('synthia:weights-rejected', { reason: 'invalid-saved-inference', recoverFromBackup: true });
        throw error;
      }
      this.inference = new NeuralInferenceGraph(saved.inference);
      this.spacetime = new SemanticSpacetimeGraph(saved.spacetime);
      this.workspace = saved.workspace ?? this.workspace;
      for (const item of this.workspace.observations ?? []) {
        // Reconstruct donor distributional and grammar spaces from local examples.
        this.diseminer.observe(item.text);
        this.autoling.runPipeline(item.text);
      }
    }
    this.started = true;
    this.bus?.emit('synthia:resident-ready', this.status());
    return this;
  }
  async save() {
    await this.state.set(STORAGE_KEY, {
      format: 'synthia-resident-v1', inference: this.inference.export(),
      spacetime: this.spacetime.export(), workspace: this.workspace,
    }, { source: 'synthia-resident' });
  }
  async observe(text, { actor = 'user:local', context = {} } = {}) {
    if (!this.started) throw new Error('Boot resident before using it.');
    if (typeof text !== 'string' || !text.trim() || text.length > 12000)
      throw new TypeError('A nonempty message of at most 12000 characters is required.');
    const prior = this.workspace.observations.at(-1)?.text ?? '';
    const language = this.autoling.runPipeline(text);
    const distribution = this.diseminer.observe(text);
    const claims = this.diseminer.extractClaims(text, 'speaker-report');
    const intent = this.inference.predict(text, prior);
    const id = this.spacetime.say(text, actor, context, claims);
    this.workspace.observations.push({ id, text });
    const reading = { id, intent, grammarConfidence: finite(language.confidence),
      grammarFrame: language.frame, distribution: distribution.sense,
      candidateClaims: claims.map(x => ({ id: x.id, text: x.text, modality: x.modality,
        status: 'unverified-speaker-report' })),
      toolEvidence: { autoling: 'executed', diseminer: 'executed', autonovel: 'mounted' } };
    this.workspace.episodes.push({ id, type: 'observation', intent: intent.chosen?.label ?? null,
      claims: reading.candidateClaims.map(x => x.id), source: 'speaker-report' });
    await this.save();
    return reading;
  }
  async recordReply(reading, { text, provider = 'existing-klein-morph-chat', outcome = 'delivered' } = {}) {
    if (!reading?.id || typeof text !== 'string') throw new TypeError('A grounded reading and text are required.');
    const id = this.spacetime.respond(reading.id, text, provider);
    this.workspace.episodes.push({ id, type: 'response', for: reading.id, provider, outcome });
    await this.save();
    return { id, observationId: reading.id, outcome };
  }
  async teach({ text, capability, accepted, source = 'owner-feedback' } = {}) {
    // Only call this from an authenticated owner-mediated action, never a public endpoint.
    if (!this.started) throw new Error('Synthia is not booted.');
    if (accepted !== true && accepted !== false) throw new TypeError('Explicit acceptance/rejection required.');
    const result = this.inference.learn(text, capability, { accepted });
    this.workspace.feedback.push({ sequence: this.workspace.feedback.length + 1,
      capability, accepted, source, evidence: text });
    await this.save();
    return result;
  }
  async runTool(tool, input) {
    if (!this.started) throw new Error('Synthia is not booted.');
    if (tool === 'autoling') return this.autoling.runPipeline(String(input?.text ?? input ?? ''));
    if (tool === 'diseminer') {
      const mode = input?.operation ?? 'observe';
      if (mode === 'observe') return this.diseminer.observe(String(input?.text ?? ''));
      if (mode === 'extract') return this.diseminer.extractClaims(String(input?.text ?? ''), 'candidate');
      if (mode === 'narrate') return this.diseminer.generateNarrative(input?.query ?? '', input?.context ?? {});
      throw new TypeError('Unknown DISEMINER operation.');
    }
    if (tool === 'autonovel') return this.autonovel.run(input).output;
    throw new TypeError('Tool not registered: ' + tool);
  }
  graph() {
    return freezeCopy({
      neural: { architecture: '96 input / 16 tanh hidden / trainable sigmoid heads',
        pretrained: false, trainingExamples: this.inference.examples,
        heads: Object.entries(this.inference.heads).map(([label, h]) => ({ label, examples: h.examples })) },
      semanticSpacetime: this.spacetime.export(),
      shared: { episodes: this.workspace.episodes.length, feedback: this.workspace.feedback.length,
        observations: this.workspace.observations.length },
    });
  }
  status() {
    return { id: 'synthia-resident', role: 'computer-resident', model: 'small-online-neural-graph',
      llm: false, graphs: ['learned-inference', 'klein-semantic-spacetime'],
      tools: ['autoling', 'diseminer', 'autonovel'],
      trainingExamples: this.inference.examples };
  }
}
export default SynthiaResident;
