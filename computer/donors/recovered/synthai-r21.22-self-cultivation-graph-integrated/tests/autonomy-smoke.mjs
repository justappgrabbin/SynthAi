import assert from 'node:assert/strict';
import { SynthiaUnit } from '../core/SynthiaUnit.mjs';

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k,v) => store.set(k,String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
}

const unit = new SynthiaUnit({ profile:{ id:'adaya-recovery-test' } });
const out = await unit.autonomousCycle({ jobs:2 });
assert.equal(out.ok, true);
assert.equal(out.autonomous, true);
assert.ok(out.graphSteps >= 1);
assert.ok(Array.isArray(out.activeTools));
console.log(JSON.stringify({ok:true,autonomous:true,graphSteps:out.graphSteps,tools:out.activeTools.length},null,2));
