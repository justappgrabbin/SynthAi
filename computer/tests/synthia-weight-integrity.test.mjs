import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSavedSynthiaInference } from '../services/synthia-weight-guard.mjs';
import { SynthiaResident } from '../services/synthia-resident.mjs';

const validInference = () => ({
  weights: Array.from({ length: 16 }, () => Array(96).fill(0.25)),
  bias: Array(16).fill(0),
  heads: { 'intent-routing': { weights: Array(16).fill(0.1), bias: 0, examples: 4 } },
  examples: 4,
});

function mockState(saved) {
  let current = saved == null ? null : structuredClone(saved);
  let writes = 0;
  return {
    state: { get: () => structuredClone(current),
      set: async (_key, value) => { writes++; current = structuredClone(value); } },
    checkpoint: () => structuredClone(current),
    writes: () => writes,
  };
}
const residentState = inference => ({
  format: 'synthia-resident-v1', inference,
  spacetime: { nodes: [], edges: [], sequence: 0 },
  workspace: { observations: [], feedback: [], episodes: [] },
});

test('valid prior neural weights and learned heads are preserved through boot', async () => {
  const before = residentState(validInference());
  const store = mockState(before);
  const resident = await new SynthiaResident({ state: store.state }).boot();
  assert.equal(resident.graph().neural.trainingExamples, 4);
  assert.equal(resident.graph().neural.heads.length, 1);
  assert.deepEqual(resident.inference.export(), before.inference);
  assert.equal(store.writes(), 0);
  assert.deepEqual(store.checkpoint(), before);
});

test('malformed hidden matrix is refused without overwriting the stored checkpoint', async () => {
  const saved = residentState(validInference());
  saved.inference.weights[0] = [0.2];
  const store = mockState(saved);
  await assert.rejects(new SynthiaResident({ state: store.state }).boot(), /invalid/);
  assert.deepEqual(store.checkpoint(), saved);
  assert.equal(store.writes(), 0);
});

test('nonfinite and malformed head weights cannot be silently reinitialized', async () => {
  const values = [
    { key: 'matrix', change: x => { x.weights[1][0] = Infinity; } },
    { key: 'bias', change: x => { x.bias[1] = NaN; } },
    { key: 'head', change: x => { x.heads['intent-routing'].weights.pop(); } },
    { key: 'examples', change: x => { x.examples = -1; } },
    { key: 'missing', change: x => { delete x.weights; } },
  ];
  for (const c of values) {
    const inference = validInference();
    c.change(inference);
    assert.throws(() => validateSavedSynthiaInference(inference), /invalid/, c.key);
  }
});

test('untrained first boot still works without generating a save before feedback', async () => {
  const store = mockState(null);
  const resident = await new SynthiaResident({ state: store.state }).boot();
  assert.equal(resident.graph().neural.trainingExamples, 0);
  assert.equal(store.writes(), 0);
});
