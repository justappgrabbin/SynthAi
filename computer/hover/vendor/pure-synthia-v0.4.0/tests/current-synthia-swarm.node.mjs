import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';
import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { bindYNIToSwarm } from '../host/yniSwarmHands.mjs';

test('verified current Synthia mounts as many independent processes', async () => {
  const { swarm, synthia } = await bootstrapCurrentSynthiaSwarm({ store: new MemoryCheckpointStore() });
  const snap = swarm.snapshot();
  assert.equal(snap.identity.id, 'synthia');
  assert.equal(snap.apparentBodies, 1);
  assert.ok(snap.processCount >= 20, `expected >=20 processes, got ${snap.processCount}`);
  assert.ok(swarm.find('tool.synthesize').length >= 1);
  assert.ok(swarm.find('grammar.generate').length >= 1);
  assert.ok(swarm.find('organism.pulse').length >= 1);
  assert.ok(swarm.find('artifact.morph').length >= 1);
  assert.equal(synthia.snapshot().version, 'synthia.runtime.v4');
});

test('YOU-N-I-VERSE hands register as separate swarm workers', async () => {
  const { swarm } = await bootstrapCurrentSynthiaSwarm({ store: new MemoryCheckpointStore() });
  const host = { open: (url) => ({ opened: url }), fill: (selector, value) => ({ selector, value }), request: async () => ({ status: 200 }), save: () => true, read: () => 'x' };
  const bound = bindYNIToSwarm(swarm, { host, permissions: { allowExecution: true, allowNetwork: true, allowFiles: true }, document: null, fetchImpl: null });
  assert.equal(bound.registered.length, 4);
  const result = await swarm.submit([{ id: 'open', capability: 'browser.open', input: { op: 'open', url: 'https://example.com' } }]);
  assert.equal(result.executions[0].status, 'complete');
  assert.equal(result.executions[0].output.opened, 'https://example.com/');
});
