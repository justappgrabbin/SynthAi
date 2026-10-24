import test from 'node:test';
import assert from 'node:assert/strict';
import { ResonanceBus, lexicalVector } from '../services/resonance-bus.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('offline lexical vectors are deterministic and nonempty for text', () => {
  const a = lexicalVector('compile Android application');
  const b = lexicalVector('compile Android application');
  assert.equal(a.length, 384);
  assert.deepEqual([...a], [...b]);
  assert.ok([...a].some(n => n !== 0));
});

test('resonance matches independent agents without pairwise routes and never executes by default', async () => {
  const b = new ResonanceBus({ dimension: 3 });
  let called = 0;
  await b.registerAgent({ id: 'compiler', vectors: { mission: [1, 0, 0] },
    threshold: .7, permissions: ['bus:subscribe', 'bus:execute'],
    handle: async () => { called++; return 'built'; } });
  await b.registerAgent({ id: 'designer', vectors: { mission: [0, 1, 0] },
    threshold: .7, permissions: ['bus:subscribe', 'bus:execute'] });
  const receipt = await b.publishOwner({ vectors: { mission: [1, 0, 0] }, type: 'request' });
  assert.deepEqual(receipt.matched.map(m => m.id), ['compiler']);
  assert.equal(receipt.executions.length, 0);
  assert.equal(called, 0);
  await assert.rejects(() => b.publishOwner({ vectors: { mission: [1, 0, 0] } }, { execute: true }), /approval/i);
  const approved = await b.publishOwner({ vectors: { mission: [1, 0, 0] } }, { execute: true, ownerApproved: true });
  assert.equal(approved.executions[0].output, 'built');
  assert.equal(called, 1);
});

test('agent writes require private token and explicit permission', async () => {
  const b = new ResonanceBus({ dimension: 3 });
  const sender = await b.registerAgent({ id: 'sender', vectors: { mission: [1, 0, 0] },
    permissions: ['bus:subscribe', 'bus:write'] });
  await b.registerAgent({ id: 'listener', vectors: { mission: [1, 0, 0] } });
  await assert.rejects(() => b.publish({ source: 'sender', token: 'wrong', vectors: { mission: [1, 0, 0] } }), /denied/);
  const sent = await b.publish({ source: 'sender', token: sender.token, vectors: { mission: [1, 0, 0] },
    type: 'result', correlationId: 'task-123' });
  assert.equal(sent.correlationId, 'task-123');
  assert.deepEqual(sent.matched.map(m => m.id), ['listener']);
  await assert.rejects(() => b.publish({ source: 'sender', token: sender.token, vectors: { mission: [1, 0, 0] } }, { execute: true, ownerApproved: true }), /Only the owner/);
  assert.equal(b.revokeAgent('sender'), true);
  await assert.rejects(() => b.publish({ source: 'sender', token: sender.token, vectors: { mission: [1, 0, 0] } }), /denied/);
});

test('no hidden semantic-model substitutions, vector mismatch or cross-space wake', async () => {
  const b = new ResonanceBus({ dimension: 3 });
  await b.registerAgent({ id: 'another-space', vectors: { mission: [1, 0, 0] }, embeddingSpace: 'model-A' });
  assert.equal((await b.publishOwner({ vectors: { mission: [1, 0, 0] }, embeddingSpace: 'model-B' })).matched.length, 0);
  await assert.rejects(() => b.publishOwner({ vectors: { mission: [1, 0] } }), /dimension/);
  await assert.rejects(() => b.publishOwner({ vectors: { mission: [0, 0, 0] } }), /Zero vectors/);
});

test('bounded wake, TTL expiration and verified threshold adjustment', async () => {
  let now = 100;
  const b = new ResonanceBus({ dimension: 3, maxWakes: 1, clock: () => now });
  for (const id of ['a', 'b']) await b.registerAgent({ id, vectors: { mission: [1, 0, 0] }, threshold: .6 });
  const first = await b.publishOwner({ vectors: { mission: [1, 0, 0] }, ttlMs: 100 });
  assert.equal(first.matched.length, 1);
  assert.equal(first.suppressedByCap, 1);
  assert.equal(b.snapshot().activeSignals, 1);
  now = 201;
  assert.equal(b.snapshot().activeSignals, 0);
  assert.throws(() => b.recordOutcome('a', { success: false }), /Verified outcome/);
  assert.equal(b.recordOutcome('a', { success: false, verified: true, evidence: 'test-run-abc' }).threshold, .62);
});

test('ComputerRuntime executes an existing automaton only after owner-approved resonance dispatch', async () => {
  const c = await new ComputerRuntime().boot();
  assert.equal(c.services.get('resonance-bus').provider, c.resonance);
  let count = 0;
  c.automata.register({ id: 'real-compiler', execute: async ({ input, state }) => {
    count++;
    await state.set('resonance.test', input.text, { source: 'resonance-test' });
    return { compiled: input.text };
  } });
  await c.registerResonantAutomaton({ id: 'real-compiler', missionText: 'compile Android application' });
  const request = { text: 'compile Android application', type: 'request' };
  const proposal = await c.publishResonanceSignal(request);
  assert.deepEqual(proposal.matched.map(m => m.id), ['resonant:real-compiler']);
  assert.equal(count, 0);
  const executed = await c.publishResonanceSignal(request, { execute: true, ownerApproved: true });
  assert.equal(executed.executions[0].status, 'completed');
  assert.equal(c.state.get('resonance.test'), request.text);
  assert.equal(count, 1);
  assert.equal(c.snapshot().resonance.agents[0].id, 'resonant:real-compiler');
});


test('Computer lazily discovers the existing donor swarm capabilities without auto-execution', async () => {
  const computer = await new ComputerRuntime().boot();
  let executions = 0;
  computer.automataGateway.snapshot = async () => ({
    workers: [{ id: 'donor:worker1', capabilities: ['compile.android', 'read.address'] }],
  });
  computer.automataGateway.execute = async (capability, input) => {
    executions++;
    return { status: 'complete', capability, input };
  };
  const first = await computer.discoverResonantSwarmCapabilities();
  assert.equal(first.available, 2);
  assert.equal(first.registered.length, 2);
  assert.equal((await computer.discoverResonantSwarmCapabilities()).registered.length, 0);
  const probe = await computer.publishResonanceSignal({ text: 'compile android', type: 'request' });
  assert.equal(probe.matched[0].id, 'swarm-capability:compile.android');
  assert.equal(executions, 0);
  const approval = await computer.publishResonanceSignal({ text: 'compile android', type: 'request' },
    { execute: true, ownerApproved: true });
  assert.equal(approval.executions[0].status, 'completed');
  assert.equal(approval.executions[0].output.capability, 'compile.android');
  assert.equal(executions, 1);
});
