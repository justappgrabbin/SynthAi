import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

test('MESH CORE: state-space activation is delivered through the relational mesh', async () => {
  const computer = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'mesh-core-state-space',
  }).boot();

  const requests = [];
  computer.bus.on('mesh:request', event => requests.push(event.payload));

  const result = await computer.activateAddress({
    planetary: 'Sun',
    dimension: 'Movement',
    gate: 25,
    line: 2,
    color: 4,
    tone: 4,
    base: 2,
    degree: 25,
    minute: 59,
    second: 31,
    arc: 93571,
    zodiac: 'Virgo',
    house: 5,
  });

  assert.equal(result.state.node.gate, 25);
  assert.equal(result.state.node.dimension, 'Space');
  assert.ok(requests.some(r => r.targetId === 'system:state-space' && r.operation === 'activate'));
  assert.equal(computer.meshKernel.participant('system:state-space').residency, 'active');
  assert.ok(
    computer.meshKernel.relationshipsFor('system:execution')
      .some(edge => edge.type === 'contextualized-by' && edge.to === 'system:state-space')
  );
});

test('MESH CORE: automata execution is delivered through the same mesh', async () => {
  const computer = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'mesh-core-execution',
  }).boot();

  const requests = [];
  computer.bus.on('mesh:request', event => requests.push(event.payload));
  computer.automata.register({
    id: 'test:echo',
    execute: async ({ input }) => ({ echoed: input.value }),
  });

  const result = await computer.runAutomaton('test:echo', { value: 42 });
  assert.deepEqual(result, { echoed: 42 });
  assert.ok(requests.some(r => r.targetId === 'system:execution' && r.operation === 'automata.run'));
  assert.equal(computer.meshKernel.participant('system:execution').residency, 'active');
});
