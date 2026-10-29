import crypto from 'node:crypto';

export const now = () => Date.now();
export const id = (prefix='id') => `${prefix}_${now()}_${crypto.randomBytes(5).toString('hex')}`;
export const clamp01 = n => Math.max(0, Math.min(1, Number(n) || 0));
export const deepClone = obj => obj == null ? obj : structuredClone(obj);
export const stableHash = obj => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
export function assert(condition, message) { if (!condition) throw new Error(message); }
