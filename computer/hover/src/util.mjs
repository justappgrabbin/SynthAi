import { stableStringify, fnv1a32 } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/engine/derivation.js';

export { stableStringify, fnv1a32 };

export const safe = (value) => {
  try { return structuredClone(value); }
  catch {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return String(value); }
  }
};

export function deterministicId(prefix, value, sequence = null) {
  const hash = fnv1a32(stableStringify(value));
  return `${prefix}:${hash}${sequence == null ? '' : `:${sequence}`}`;
}

export function lexicalSimilarity(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return 1 / (1 + Math.abs(a - b));
  const words = (value) => new Set(String(value ?? '').toLowerCase().split(/\W+/).filter(Boolean));
  const left = words(a);
  const right = words(b);
  if (!left.size && !right.size) return 1;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / new Set([...left, ...right]).size;
}

export function publicContext(value = {}) {
  const blocked = new Set(['rawText', 'conversation', 'document', 'privateCoordinates', 'credentials']);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !blocked.has(key)));
}
