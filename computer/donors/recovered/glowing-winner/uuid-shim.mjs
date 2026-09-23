/**
 * ENV ADAPTER (not donor logic): the 'uuid' npm package is not installed in
 * this repo (rule: no new npm deps). Node's crypto.randomUUID() is a faithful
 * RFC4122 v4 UUID generator — identical contract to uuid.v4. Documented in
 * PROVENANCE.md; used only via esbuild --alias:uuid=./uuid-shim.mjs.
 */
import { randomUUID } from 'node:crypto';
export function v4() { return randomUUID(); }
export default { v4 };
