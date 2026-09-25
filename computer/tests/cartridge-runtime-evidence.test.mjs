import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

const manifest = (id, target) => ({
  id,
  capability: 'recovery.probe',
  automata: [{ id: id + ':probe', runner: { kind: 'mesh', target, operation: 'run' } }],
  provenance: { source: 'recovery-test' },
});

test('intake remains unverified until an observed successful execution, including after restart', async () => {
  const persistence = new MemoryPersistence();
  const options = { persistence, namespace: 'cartridge-evidence-persistence' };
  const runtime = await new NativeSeedRuntime(options).boot();
  await runtime.meshKernel.registerParticipant('worker:probe', { kind: 'test', residency: 'active', capabilities: ['recovery.probe'] });
  runtime.meshKernel.bindHandler('worker:probe', async () => ({ observed: true }));

  const installed = await runtime.installAutomataCartridge(manifest('candidate', 'worker:probe'));
  assert.equal(installed.verification.state, 'unverified');
  assert.equal(installed.verifiedForPromotion, false);
  assert.deepEqual(installed.provenance, { source: 'recovery-test' });

  const result = await runtime.executeAutomataCapability('recovery.probe', { sample: 1 });
  assert.equal(result.output.observed, true);
  const passed = runtime.automataCartridges.list().find(item => item.id === 'candidate');
  assert.equal(passed.verification.state, 'runtime-passed');
  assert.equal(passed.verifiedForPromotion, true);
  assert.ok(passed.verification.lastPassedAt);

  const restarted = await new NativeSeedRuntime(options).boot();
  const restored = restarted.automataCartridges.list().find(item => item.id === 'candidate');
  assert.equal(restored.verification.state, 'runtime-passed');
  assert.equal(restored.verifiedForPromotion, true);

  const replacement = await restarted.installAutomataCartridge(manifest('candidate', 'worker:replacement'));
  assert.equal(replacement.verification.state, 'unverified');
  assert.equal(replacement.verifiedForPromotion, false);
  assert.equal(replacement.historyCount, 1);
});

test('failed candidate is retained but cannot be promoted', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(), namespace: 'cartridge-evidence-failure',
  }).boot();
  await runtime.meshKernel.registerParticipant('worker:fail', { kind: 'test', residency: 'active', capabilities: ['recovery.probe'] });
  runtime.meshKernel.bindHandler('worker:fail', async () => { throw new Error('probe failed'); });
  await runtime.installAutomataCartridge(manifest('failing-candidate', 'worker:fail'));
  await assert.rejects(runtime.executeAutomataCapability('recovery.probe', {}), /auto assembly exhausted/);
  const record = runtime.automataCartridges.list().find(item => item.id === 'failing-candidate');
  assert.equal(record.status, 'sidelined');
  assert.equal(record.verification.state, 'unverified');
  assert.equal(record.verifiedForPromotion, false);
});
