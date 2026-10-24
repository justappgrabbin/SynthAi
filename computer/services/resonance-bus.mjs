/**
 * SYNTH AI Resonance Bus — a JS-native adaptation of OpenSwarm's neural-bus
 * concepts, not a copy of its Python runtime.
 *
 * Reference: https://github.com/openswarm-os/openswarm (MIT, 2026).
 * See LICENSE attribution in docs/openswarm-resonance-bus.md.
 *
 * A signal is compared once against each independent subscriber (O(N)).
 * Matching is observational by default; executable work requires an explicit
 * owner-authorized dispatch. No agent-to-agent dependencies or cloud service.
 */
const TYPES = new Set(['signal', 'request', 'result', 'status', 'error', 'crisis']);
const finite = n => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function secureToken() {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random source required to issue agent tokens');
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
}

/** Offline *lexical* feature hashing; this is NOT a learned semantic model. */
export function lexicalVector(text, dimension = 384) {
  if (!Number.isInteger(dimension) || dimension < 2) throw new RangeError('Invalid embedding dimension');
  const words = String(text ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = new Float64Array(dimension);
  for (let i = 0; i < words.length; i++) {
    for (const feature of [words[i], ...(i ? [words[i - 1] + ' ' + words[i]] : [])]) {
      let h = 2166136261;
      for (const ch of feature) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
      out[h % dimension] += (h & 0x10000) ? 1 : -1;
    }
  }
  const mag = Math.hypot(...out);
  return mag ? Float32Array.from(out, n => n / mag) : new Float32Array(dimension);
}

function normalizeSlots(raw, dimension) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Signal/mission vectors must be named slots');
  const slots = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key || !Array.isArray(value) && !ArrayBuffer.isView(value)) throw new TypeError('Slot requires an array vector');
    if (value.length !== dimension) throw new RangeError('Vector dimension mismatch');
    if (![...value].every(finite)) throw new TypeError('Vector contains non-finite values');
    const norm = Math.hypot(...value);
    if (!(norm > 0)) throw new RangeError('Zero vectors cannot establish resonance');
    slots[key] = Float32Array.from(value, n => n / norm);
  }
  if (!Object.keys(slots).length) throw new Error('At least one vector slot required');
  return slots;
}

function scoreSlots(agent, signal) {
  let weighted = 0, weights = 0;
  for (const [slot, av] of Object.entries(agent.vectors)) {
    const bv = signal.vectors[slot];
    if (!bv) continue;
    let cosine = 0;
    for (let i = 0; i < av.length; i++) cosine += av[i] * bv[i];
    const w = agent.slotWeights[slot] ?? 1;
    if (!finite(w) || w <= 0) continue;
    weighted += clamp(cosine, -1, 1) * w;
    weights += w;
  }
  return weights ? weighted / weights : null;
}

export class ResonanceBus {
  #agents = new Map();
  #sequence = 0;
  #signals = [];
  constructor({ bus = null, dimension = 384, maxWakes = 26, maxSignals = 256,
                clock = () => Date.now(), embedder = null, embeddingSpace = null } = {}) {
    if (!Number.isInteger(dimension) || dimension < 2 || dimension > 4096) throw new RangeError('dimension out of range');
    if (!Number.isInteger(maxWakes) || maxWakes < 1 || maxWakes > 26) throw new RangeError('maxWakes must be 1..26');
    if (!Number.isInteger(maxSignals) || maxSignals < 1) throw new RangeError('maxSignals must be positive');
    if (embedder !== null && typeof embedder !== 'function') throw new TypeError('embedder must be callable');
    this.bus = bus;
    this.dimension = dimension;
    this.maxWakes = maxWakes;
    this.maxSignals = maxSignals;
    this.clock = clock;
    this.embedder = embedder;
    this.embeddingSpace = embeddingSpace ?? (embedder ? 'custom' : 'lexical-fnv1a-v1');
  }

  async #slots(vectors, text) {
    if (vectors) return normalizeSlots(vectors, this.dimension);
    if (!text?.trim()) throw new Error('Text or numeric vectors required');
    const vector = this.embedder
      ? await this.embedder(text, { dimension: this.dimension, space: this.embeddingSpace })
      : lexicalVector(text, this.dimension);
    return normalizeSlots({ mission: vector }, this.dimension);
  }

  /** Register a participant with an independent mission; keep the token private. */
  async registerAgent({ id, missionText = null, vectors = null, threshold = 0.6,
                        slotWeights = {}, domain = null, handle = null,
                        permissions = ['bus:subscribe'], embeddingSpace = this.embeddingSpace } = {}) {
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('Agent id required');
    if (this.#agents.has(id)) throw new Error('Agent already registered: ' + id);
    if (!finite(threshold) || threshold < -1 || threshold > 1) throw new RangeError('Invalid wake threshold');
    if (handle !== null && typeof handle !== 'function') throw new TypeError('handle must be a function');
    const mission = await this.#slots(vectors, missionText);
    const token = secureToken();
    this.#agents.set(id, { id, vectors: mission, threshold, slotWeights: { ...slotWeights },
      domain, handle, embeddingSpace, token, permissions: new Set(permissions) });
    this.bus?.emit('resonance:registered', { id, embeddingSpace, threshold, domain });
    return { id, token };
  }

  revokeAgent(id) {
    const removed = this.#agents.delete(id);
    if (removed) this.bus?.emit('resonance:revoked', { id });
    return removed;
  }

  /** Only trusted Computer code may call publishOwner; never expose over HTTP. */
  publishOwner(signal, options = {}) { return this.#send(signal, { ...options, trustedOwner: true }); }

  /** An external agent must present its own token and bus:write permission. */
  publish(signal, options = {}) { return this.#send(signal, { ...options, trustedOwner: false }); }

  async #send(signal = {}, { trustedOwner = false, execute = false, ownerApproved = false } = {}) {
    const source = trustedOwner ? 'owner' : signal.source;
    if (!trustedOwner) {
      const agent = this.#agents.get(source);
      if (!agent || agent.token !== signal.token || !agent.permissions.has('bus:write'))
        throw new Error('Agent bus write denied');
      if (execute || ownerApproved) throw new Error('Only the owner can authorize executable dispatch');
    }
    if (execute && !ownerApproved) throw new Error('Owner approval required for execution');
    const type = signal.type ?? 'signal';
    if (!TYPES.has(type)) throw new Error('Unknown signal type: ' + type);
    const embeddingSpace = signal.embeddingSpace ?? this.embeddingSpace;
    const vectors = await this.#slots(signal.vectors, signal.text);
    const ttlMs = signal.ttlMs ?? 60_000;
    if (!finite(ttlMs) || ttlMs <= 0 || ttlMs > 3_600_000) throw new RangeError('Invalid signal TTL');
    const at = this.clock();
    const correlationId = signal.correlationId ?? 'corr-' + (++this.#sequence);
    const event = {
      id: 'signal-' + this.#sequence + '-' + at,
      source, type, domain: signal.domain ?? null, text: signal.text ?? '',
      address: signal.address ?? null, correlationId, embeddingSpace,
      at, expiresAt: at + ttlMs, vectors,
    };
    this.#signals = this.#signals.filter(s => s.expiresAt > at);
    this.#signals.push(event);
    if (this.#signals.length > this.maxSignals) this.#signals.splice(0, this.#signals.length - this.maxSignals);
    const matches = [];
    for (const agent of this.#agents.values()) {
      if (agent.id === source || !agent.permissions.has('bus:subscribe') || agent.embeddingSpace !== embeddingSpace) continue;
      if (agent.domain && agent.domain !== event.domain) continue;
      const score = scoreSlots(agent, event);
      if (score !== null && score >= agent.threshold) matches.push({ id: agent.id, score, threshold: agent.threshold });
    }
    matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const woke = matches.slice(0, this.maxWakes);
    const receipt = { signalId: event.id, correlationId, source, type,
      matched: woke, suppressedByCap: Math.max(0, matches.length - woke.length), executions: [] };
    this.bus?.emit('resonance:signal', { signalId: event.id, correlationId, source, type, domain: event.domain, address: event.address, matches: woke });
    if (execute) {
      for (const match of woke) {
        const target = this.#agents.get(match.id);
        if (!target?.permissions.has('bus:execute') || !target.handle) continue;
        try {
          const output = await target.handle({ source, type, text: event.text, domain: event.domain,
            address: event.address, correlationId, signalId: event.id, score: match.score });
          receipt.executions.push({ id: match.id, status: 'completed', output });
          this.bus?.emit('resonance:executed', { signalId: event.id, id: match.id, correlationId });
        } catch (error) {
          receipt.executions.push({ id: match.id, status: 'failed', error: String(error?.message ?? error) });
          this.bus?.emit('resonance:failed', { signalId: event.id, id: match.id, error: String(error?.message ?? error) });
        }
      }
    }
    return receipt;
  }

  /** Threshold tuning ONLY from observed, explicitly verified outcomes. */
  recordOutcome(agentId, { success, verified = false, evidence = null } = {}) {
    const agent = this.#agents.get(agentId);
    if (!agent) throw new Error('Unknown agent: ' + agentId);
    if (!verified || !evidence) throw new Error('Verified outcome and evidence required');
    const previous = agent.threshold;
    agent.threshold = clamp(previous + (success ? -0.02 : 0.02), 0.1, 0.95);
    this.bus?.emit('resonance:outcome', { agentId, success: !!success, evidence, previous, threshold: agent.threshold });
    return { agentId, previous, threshold: agent.threshold };
  }

  snapshot() {
    const now = this.clock();
    this.#signals = this.#signals.filter(s => s.expiresAt > now);
    return { dimension: this.dimension, embeddingSpace: this.embeddingSpace, activeSignals: this.#signals.length,
      maxWakes: this.maxWakes, agents: [...this.#agents.values()].map(({ id, threshold, domain, embeddingSpace }) =>
        ({ id, threshold, domain, embeddingSpace })) };
  }
}
