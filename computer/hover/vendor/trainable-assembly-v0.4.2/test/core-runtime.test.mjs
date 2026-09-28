import assert from 'node:assert/strict';
import SynthiaCoreRuntime from '../src/core/runtime.mjs';
const core = new SynthiaCoreRuntime();
const caps = core.capabilities();
assert.ok(caps.stateSpace.length > 0, 'state space exports missing');
assert.ok(caps.ato.length > 0, 'ATO exports missing');
assert.ok(caps.klein.length > 0, 'Klein exports missing');
console.log('PASS core runtime:', {stateSpace:caps.stateSpace.length, ato:caps.ato.length, klein:caps.klein.length});
