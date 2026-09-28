import { makeCommitment, commitmentKey } from './CanonicalArtifactCommitment.mjs';

const STORAGE_KEY = 'synthia.exact-recall.commitments.v1';

function loadPersisted() {
  if (typeof localStorage === 'undefined') return [];
  try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function persist(values) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

export class ExactRecallRegistry {
  constructor({ seed = [] } = {}) {
    this.commitments = new Map();
    this.history = [];
    for (const raw of [...loadPersisted(), ...seed]) {
      try { const c = makeCommitment(raw); this.commitments.set(c.key, c); } catch {}
    }
  }

  register(spec, { supersede = false } = {}) {
    const next = makeCommitment(spec);
    const existing = this.commitments.get(next.key);
    if (existing && existing.expectedSha256 !== next.expectedSha256) {
      if (!supersede) throw new Error(`EXACT_ADDRESS_CONFLICT: ${next.key} already commits to ${existing.expectedSha256}`);
      this.history.push(Object.freeze({ type: 'supersede', key: next.key, previous: existing, next, at: Date.now() }));
    }
    this.commitments.set(next.key, next);
    persist([...this.commitments.values()]);
    return next;
  }

  get(kind, address) { return this.commitments.get(commitmentKey(kind, address)) || null; }
  has(kind, address) { return this.commitments.has(commitmentKey(kind, address)); }
  snapshot() { return Object.freeze({ schema: 'synthia.exact-recall-registry.v1', commitments: Object.freeze([...this.commitments.values()]), history: Object.freeze([...this.history]) }); }
}
export default ExactRecallRegistry;
