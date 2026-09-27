import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaSwarmBody } from '../src/synthia/swarm/swarmBody.mjs';
import { MemoryCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';
import { attachFoundryProcesses } from '../foundry/foundryProcesses.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('swarm executes independent workers concurrently and keeps one visible identity', async () => {
  const swarm = new SynthiaSwarmBody({ store: new MemoryCheckpointStore() });
  let active = 0, maxActive = 0;
  const make = (id) => swarm.registerExternal({
    id, capabilities: ['test.work'], group: 'hands', maxConcurrency: 1,
    execute: async (input) => { active++; maxActive = Math.max(maxActive, active); await sleep(30); active--; return { id, input }; },
  });
  make('hand-a'); make('hand-b');
  const result = await swarm.submit([
    { id: 'a', capability: 'test.work', input: 1 },
    { id: 'b', capability: 'test.work', input: 2 },
  ]);
  assert.equal(result.executions.filter((x) => x.status === 'complete').length, 2);
  assert.ok(maxActive >= 2, `expected concurrent execution, maxActive=${maxActive}`);
  assert.equal(swarm.snapshot().apparentBodies, 1);
  assert.equal(swarm.snapshot().processCount, 2);
});

test('per-process checkpoint restores owned state independently', async () => {
  const store = new MemoryCheckpointStore();
  const target = { id: 'stateful', metadata: { capabilities: ['state.bump'] }, ownedState: { n: 0 }, async run() { this.ownedState.n++; return this.ownedState.n; } };
  const first = new SynthiaSwarmBody({ store }); first.registerTarget(target); await first.wake();
  await first.submit([{ capability: 'state.bump', input: {} }]);
  assert.equal(target.ownedState.n, 1);
  target.ownedState.n = 999;
  const second = new SynthiaSwarmBody({ store }); second.registerTarget(target); const wake = await second.wake();
  assert.equal(target.ownedState.n, 1);
  assert.ok(wake.restored.some((x) => x.id === 'stateful' && x.restored));
});

test('actual Foundry donor remains four attachable processes, not one blob', async () => {
  const swarm = new SynthiaSwarmBody();
  const attached = attachFoundryProcesses(swarm);
  assert.equal(attached.registered.length, 4);
  assert.deepEqual([...attached.registered].sort(), [
    'foundry-builder', 'foundry-core', 'foundry-selector', 'foundry-vault',
  ]);
  assert.deepEqual(attached.missingLegacy, ['foundry-overseer']);
  assert.equal(swarm.snapshot().groups.foundry, 4);
  assert.equal(swarm.find('foundry.build').length, 1);
  assert.equal(swarm.find('foundry.glyph').length, 1);
});
