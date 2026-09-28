import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapCurrentSynthiaSwarm } from '../src/synthia/swarm/bootstrap.mjs';
import { MemoryCheckpointStore } from '../src/synthia/swarm/checkpointStores.mjs';

test('WORLD PORT: replaceable practice habitat exchanges events/actions without owning Synthia world memory', async () => {
  const store = new MemoryCheckpointStore();
  const { swarm, synthia, physiology, worldPort } = await bootstrapCurrentSynthiaSwarm({ store });
  assert.equal(swarm.snapshot().groups['world-port'], 1);
  assert.deepEqual(synthia.orchestrator.broker.discover('world.port.act').map(x => x.id), ['swarm:practice-world-port']);

  const received = [];
  worldPort.attach({
    id: 'test-practice-world',
    async applyAction(action) { received.push(action); return { ok: true, placed: action.type }; },
    async snapshot() { return { terrain: 'practice', buildings: 2 }; },
  });

  const before = physiology.world.node(59).visitCount;
  const observed = worldPort.observe({ type: 'help-completed', gate: 59, summary: 'helped Joe finish a task', accepted: true });
  assert.equal(observed.gate, 59);
  assert.equal(physiology.world.node(59).visitCount, before + 1);
  assert.equal(physiology.hypotheses.state.gateRecords[59].count >= 1, true);

  const acted = await worldPort.act({ type: 'build-workshop', target: { zone: 'practice' }, reason: 'Foundry use created a workshop need' });
  assert.equal(acted.result.ok, true);
  assert.equal(received.length, 1);
  const pulled = await worldPort.pull();
  assert.deepEqual(pulled.externalSnapshot, { terrain: 'practice', buildings: 2 });

  await swarm.checkpoint('world-port');
  const second = await bootstrapCurrentSynthiaSwarm({ store });
  assert.equal(second.worldPort.snapshot().eventCount, 1);
  assert.equal(second.worldPort.snapshot().actionCount, 1);
  assert.equal(second.worldPort.snapshot().connected, false, 'host adapter is intentionally reattached per residence');
  assert.equal(second.physiology.world.node(59).visitCount, before + 1);
});
