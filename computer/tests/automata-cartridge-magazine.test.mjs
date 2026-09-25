import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

function cartridge({ id, capability, target, priority = 0, dependencies = [], maxFailures = 1, operation = 'run', payload = {} }) {
  return {
    id,
    name: id,
    version: 'test',
    capability,
    priority,
    dependencies,
    health: { maxConsecutiveFailures: maxFailures },
    provenance: { test: true },
    automata: [{
      id: id + ':automaton',
      runner: { kind: 'mesh', target, operation, payload },
    }],
  };
}

test('AUTOMATA CARTRIDGE MAGAZINE: auto-assembles dependency automata and pipelines their results', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'cartridge-dependency-test',
  }).boot();

  await runtime.meshKernel.registerParticipant('worker:prepare', { kind: 'test', residency: 'active', capabilities: ['prepare'] });
  await runtime.meshKernel.registerParticipant('worker:solve', { kind: 'test', residency: 'active', capabilities: ['solve'] });
  runtime.meshKernel.bindHandler('worker:prepare', async envelope => ({
    prepared: true,
    original: envelope.payload.input,
  }));
  runtime.meshKernel.bindHandler('worker:solve', async envelope => ({
    solved: true,
    received: envelope.payload.input,
    dependencies: envelope.payload.context.dependencyResults,
  }));

  await runtime.installAutomataCartridge(cartridge({
    id: 'prepare-cell',
    capability: 'prepare',
    target: 'worker:prepare',
    priority: 10,
  }));
  await runtime.installAutomataCartridge(cartridge({
    id: 'solve-cell',
    capability: 'solve',
    target: 'worker:solve',
    dependencies: ['prepare'],
    priority: 10,
  }));

  const assembly = runtime.assembleAutomataCartridges('solve');
  assert.deepEqual(assembly.plan.map(item => item.id), ['prepare-cell', 'solve-cell']);
  assert.deepEqual(assembly.automata, ['prepare-cell:automaton', 'solve-cell:automaton']);

  const result = await runtime.executeAutomataCapability('solve', { value: 7 });
  assert.equal(result.ok, true);
  assert.equal(result.output.solved, true);
  assert.equal(result.output.received.value, 7);
  assert.equal(result.output.dependencies.prepare.prepared, true);
});

test('AUTOMATA CARTRIDGE MAGAZINE: failed automaton is auto-dislodged and next cartridge feeds without deletion', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'cartridge-fallback-test',
  }).boot();

  await runtime.meshKernel.registerParticipant('worker:bad', { kind: 'test', residency: 'active', capabilities: ['solve'] });
  await runtime.meshKernel.registerParticipant('worker:good', { kind: 'test', residency: 'active', capabilities: ['solve'] });
  runtime.meshKernel.bindHandler('worker:bad', async () => { throw new Error('corroded-cell'); });
  runtime.meshKernel.bindHandler('worker:good', async envelope => ({ ok: true, value: envelope.payload.input.value * 2 }));

  await runtime.installAutomataCartridge(cartridge({
    id: 'solve-bad',
    capability: 'solve',
    target: 'worker:bad',
    priority: 100,
  }));
  await runtime.installAutomataCartridge(cartridge({
    id: 'solve-good',
    capability: 'solve',
    target: 'worker:good',
    priority: 10,
  }));

  const result = await runtime.executeAutomataCapability('solve', { value: 9 });
  assert.equal(result.output.value, 18);
  assert.equal(result.attempts, 2);
  assert.equal(result.failures[0].id, 'solve-bad');

  const bad = runtime.automataCartridges.list().find(item => item.id === 'solve-bad');
  const good = runtime.automataCartridges.list().find(item => item.id === 'solve-good');
  assert.equal(bad.status, 'sidelined');
  assert.match(bad.sidelinedReason, /AUTO_DISLODGE_AFTER_FAILURE/);
  assert.equal(bad.health.failures, 1);
  assert.equal(good.status, 'active');

  const preserved = runtime.automataCartridges.snapshot();
  assert.equal(preserved.cartridges.some(item => item.id === 'solve-bad'), true);
  assert.equal(runtime.assembleAutomataCartridges('solve').plan.at(-1).id, 'solve-good');

  const restored = await runtime.restoreAutomataCartridge('solve-bad');
  assert.equal(restored.status, 'active');
});

test('AUTOMATA CARTRIDGE MAGAZINE: Prime 5.8 resident can be the execution socket for a cartridge automaton', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'cartridge-prime-test',
  }).boot();

  await runtime.meshKernel.registerParticipant('synthia-prime', {
    kind: 'resident',
    residency: 'active',
    capabilities: ['resident.synthia58', 'artifact.execute'],
  });
  runtime.meshKernel.bindHandler('synthia-prime', async envelope => {
    assert.equal(envelope.operation, 'execute');
    assert.equal(envelope.payload.runtime, 'python');
    assert.equal(envelope.payload.cartridge.capability, 'artifact.solve');
    return { executedBy: 'synthia58', received: envelope.payload.input };
  });

  await runtime.installAutomataCartridge(cartridge({
    id: 'prime-python-cell',
    capability: 'artifact.solve',
    target: 'synthia-prime',
    operation: 'execute',
    payload: { runtime: 'python' },
  }));

  const result = await runtime.executeAutomataCapability('artifact.solve', { code: 'print(2 + 2)' });
  assert.equal(result.output.executedBy, 'synthia58');
  assert.equal(result.output.received.code, 'print(2 + 2)');
  assert.equal(result.assembly.plan[0].automata[0], 'prime-python-cell:automaton');
});
