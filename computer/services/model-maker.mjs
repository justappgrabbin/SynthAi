/**
 * Model Maker: constructs persistent dual-interface local language models.
 *
 * semantic interface -> existing canonical AutoLing/DISEMINER neural inference
 * language interface -> learned, prompt-conditioned word transition decoder.
 *
 * A small online statistical decoder is not a pretrained LLM. It never
 * supplies invented factual knowledge or treats speaker claims as verified.
 * Only owner-approved examples teach response language. Tool results have
 * provenance. No network service, hidden model provider or external effects.
 */
const TOKENS = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[.!?,;:]/gu;
const END = '<end>';
const START = '<start>';
const MAX_RECORDS = 256;
const MAX_RESPONSE_TOKENS = 180;
const MAX_PAIRS = 40000;
const safeCopy = value => JSON.parse(JSON.stringify(value));
const tokens = text => String(text ?? '').match(TOKENS) ?? [];
const words = text => tokens(text.toLowerCase()).filter(t => /[\p{L}\p{N}]/u.test(t));
const key = arr => JSON.stringify(arr);
function render(parts) {
  return parts.join(' ').replace(/\s+([.!?,;:])/g, '$1').replace(/([.!?])([^\s])/g, '$1 $2').trim();
}
function overlap(left, right) {
  const a = new Set(words(left));
  const b = new Set(words(right));
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const word of a) if (b.has(word)) common++;
  return common / Math.sqrt(a.size * b.size);
}
function hash(value) {
  let n = 2166136261;
  for (const c of value) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); }
  return n >>> 0;
}

export class DualInterfaceModel {
  constructor({ id, state, resident } = {}) {
    if (!/^[a-z0-9_-]{1,48}$/.test(id ?? '')) throw new TypeError('Invalid model id');
    if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') throw new TypeError('Persistent state required');
    if (!resident || typeof resident.runTool !== 'function' || !resident.inference) throw new TypeError('A real Synthia resident with Klein tools is required');
    Object.assign(this, { id, state, resident });
    this.storageKey = 'computer.synthia.models.' + id + '.v1';
    const saved = state.get(this.storageKey, null);
    // The owner record ledger is append-only; only the active decoder window is bounded.
    this.records = Array.isArray(saved?.records) ? saved.records : [];
    this.revision = saved?.revision ?? 0;
    this.transitions = new Map();
    this.starts = new Map();
    this.capabilityStarts = new Map();
    this.#rebuild();
    this.semantic = Object.freeze({ read: (text, options) => this.read(text, options) });
    this.language = Object.freeze({
      generate: (text, options) => this.generate(text, options),
      teach: example => this.teach(example),
    });
    this.memory = Object.freeze({ recall: (query, options) => this.recall(query, options) });
  }
  #increment(table, context, next, weight = 1) {
    if (!table.has(context)) table.set(context, new Map());
    const counts = table.get(context);
    counts.set(next, (counts.get(next) ?? 0) + weight);
  }
  activeRecords() {
    const latest = new Map();
    for (const r of this.records) latest.set(key([r.prompt, r.response]), r);
    return [...latest.values()].filter(r => r.accepted);
  }
  #rebuild() {
    this.transitions.clear();
    this.starts.clear();
    this.capabilityStarts.clear();
    let pairs = 0;
    for (const r of this.activeRecords().slice(-MAX_RECORDS)) {
      const out = tokens(r.response).slice(0, MAX_RESPONSE_TOKENS);
      if (!out.length) continue;
      const first = out[0];
      for (const w of new Set(words(r.prompt))) this.#increment(this.starts, w, first);
      this.#increment(this.capabilityStarts, r.capability, first);
      let p2 = START, p1 = START;
      for (const w of [...out, END]) {
        this.#increment(this.transitions, key([p2, p1]), w);
        this.#increment(this.transitions, key([p1]), w);
        p2 = p1;
        p1 = w;
        if (++pairs >= MAX_PAIRS) return;
      }
    }
  }
  get examples() { return this.activeRecords().length; }
  status() {
    return { id: this.id, type: 'dual-interface-language-model',
      pretrained: false, llm: false, languageArchitecture: 'learned conditional 2-gram + 3-gram decoder',
      neuralArchitecture: 'resident shared online 96x16 inference network',
      semanticTools: ['autoling', 'diseminer'], examples: this.examples,
      revisions: this.revision, retainedRecords: this.records.length,
      distinctContexts: this.transitions.size, persistent: true };
  }
  recall(query, { limit = 5 } = {}) {
    if (typeof query !== 'string' || query.length > 12000) throw new TypeError('Bounded recall query required');
    const take = Math.min(20, Math.max(1, Math.trunc(limit)));
    const results = this.records
      .map(r => ({ entry: r, similarity: overlap(query, r.prompt) }))
      .filter(x => query.trim() === '' || x.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity || b.entry.id.localeCompare(a.entry.id))
      .slice(0, take)
      .map(x => ({ ...safeCopy(x.entry), similarity: x.similarity }));
    return { modelId: this.id, revision: this.revision, total: this.records.length,
      provenance: 'owner-training-ledger', records: results };
  }
  async read(text, { reading = null } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > 12000)
      throw new TypeError('Nonempty bounded text required');
    if (reading) {
      // The caller must provide a resident-generated reading, not untrusted
      // model tool outputs from an arbitrary network request.
      if (!reading.id || reading.toolEvidence?.autoling !== 'executed' ||
          reading.toolEvidence?.diseminer !== 'executed')
        throw new TypeError('Unrecognized semantic reading');
      return { source: 'resident', readingId: reading.id,
        grammar: reading.grammarFrame, claims: reading.candidateClaims,
        inference: reading.intent, toolEvidence: reading.toolEvidence };
    }
    const [grammar, claims] = await Promise.all([
      this.resident.runTool('autoling', { text }),
      this.resident.runTool('diseminer', { operation: 'extract', text }),
    ]);
    return { source: 'canonical-klein-tools', grammar: grammar.frame,
      grammarConfidence: grammar.confidence ?? null,
      claims: claims.map(x => ({ ...x, status: 'unverified-speaker-report' })),
      inference: this.resident.inference.predict(text),
      toolEvidence: { autoling: 'executed', diseminer: 'executed' } };
  }
  async teach({ prompt, response, accepted = true, capability = 'language-response', source = 'owner-feedback' } = {}) {
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000)
      throw new TypeError('Nonempty bounded prompt required');
    if (typeof response !== 'string' || !response.trim() || response.length > 4000)
      throw new TypeError('Nonempty bounded response required');
    if (typeof accepted !== 'boolean') throw new TypeError('Boolean feedback required');
    // Do not use arbitrary network clients for owner approval: only call via
    // an authenticated local owner action, as with resident.teach().
    await this.read(prompt);
    await this.resident.teach({ text: prompt, capability, accepted, source });
    const entry = { id: this.id + ':' + (this.revision + 1), prompt, response, accepted,
      capability, source, epistemic: 'owner-training-example',
      learnedAt: new Date().toISOString() };
    this.records.push(entry);
    this.revision++;
    this.#rebuild();
    await this.state.set(this.storageKey, { version: 1, revision: this.revision,
      records: safeCopy(this.records) }, { source: 'model-maker' });
    return { exampleId: entry.id, accepted, model: this.status() };
  }
  async generate(text, { reading = null, maxTokens = 72 } = {}) {
    const semantic = await this.read(text, { reading });
    const learnedCapability = semantic.inference?.chosen?.label ?? null;
    const matching = this.activeRecords().slice(-MAX_RECORDS)
      .map(r => ({ r, relevance: overlap(text, r.prompt),
        neuralMatch: learnedCapability != null && r.capability === learnedCapability }))
      .sort((a, b) => b.relevance - a.relevance);
    if (!matching.length || matching[0].relevance === 0 || this.examples < 3)
      return { ready: false, reason: 'insufficient-approved-relevant-language-examples',
        semantic, model: this.status(), text: null };
    const best = matching[0];
    // The prompt conditions the starting distribution, and the rest is
    // sampled deterministically from owner-learned conditional transitions.
    const promptWords = [...new Set(words(text))];
    const starts = new Map();
    for (const w of promptWords) {
      for (const [t, count] of this.starts.get(w) ?? [])
        starts.set(t, (starts.get(t) ?? 0) + count);
    }
    // The neural task head alters the decoder distribution; it does not
    // fabricate factual meaning or grant a capability execution permission.
    if (learnedCapability) for (const [t, count] of this.capabilityStarts.get(learnedCapability) ?? [])
      starts.set(t, (starts.get(t) ?? 0) + 2 * count);
    if (!starts.size) return { ready: false, reason: 'no-conditioned-decode-start',
      semantic, model: this.status(), text: null };
    const choose = (distribution, salt) => {
      if (!distribution?.size) return null;
      const sorted = [...distribution].sort((a, b) => a[0].localeCompare(b[0]));
      const total = sorted.reduce((n, [, weight]) => n + weight, 0);
      let point = (hash(text + '|' + this.revision + '|' + salt) / 4294967296) * total;
      for (const [token, weight] of sorted) { point -= weight; if (point < 0) return token; }
      return sorted.at(-1)[0];
    };
    const first = choose(starts, 'start');
    const result = [first];
    let p2 = START, p1 = first;
    const budget = Math.max(1, Math.min(120, Math.trunc(maxTokens)));
    for (let i = 1; i < budget; i++) {
      const dist = this.transitions.get(key([p2, p1])) ??
        this.transitions.get(key([p1])) ?? this.transitions.get(key([START]));
      const next = choose(dist, String(i) + ':' + p1);
      if (!next || next === END) break;
      result.push(next);
      p2 = p1; p1 = next;
    }
    const output = render(result);
    return { ready: Boolean(output), text: output || null, semantic,
      model: this.status(), relevantExampleId: best.r.id,
      relevance: best.relevance, neuralCapability: learnedCapability,
      generatedBy: 'learned-conditional-decoder',
      provider: 'synthia:model-maker-dual' };
  }
}

export class ModelMaker {
  constructor({ state, resident } = {}) {
    if (!state || !resident) throw new TypeError('Model Maker requires persistent state and canonical resident');
    Object.assign(this, { state, resident });
    this.models = new Map();
  }
  create({ id = 'synthia-language' } = {}) {
    if (!this.models.has(id)) this.models.set(id, new DualInterfaceModel({
      id, state: this.state, resident: this.resident,
    }));
    return this.models.get(id);
  }
}
export default ModelMaker;
