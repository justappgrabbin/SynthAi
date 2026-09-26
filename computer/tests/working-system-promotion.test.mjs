import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

const SHA = 'a'.repeat(64);
const manifest = (id, target, promotion = undefined) => ({
  id,
  version: '1.2.3',
  capability: 'promotion.probe',
  automata: [{ id: id + ':probe', runner: { kind: 'mesh', target, operation: 'run' } }],
  provenance: { source: 'recovery-test', lineage: 'computer-cartridge' },
  promotion,
});

test('only a successfully executed cartridge enters the durable promotion queue', async () => {
  const persistence = new MemoryPersistence();
  const options = { persistence, namespace: 'working-system-promotion' };
  const runtime = await new NativeSeedRuntime(options).boot();
  await runtime.meshKernel.registerParticipant('worker:working', {
    kind: 'test', residency: 'active', capabilities: ['promotion.probe'],
  });
  runtime.meshKernel.bindHandler('worker:working', async () => ({ working: true }));

  const installed = await runtime.installAutomataCartridge(manifest('working-system', 'worker:working', {
    enabled: true,
    destination: 'github-release-uploader',
    artifact: { storageRef: 'cas://sha256/' + SHA, sha256: SHA },
  }));
  assert.equal(installed.verification.state, 'unverified');
  assert.equal(installed.promotion.state, 'not-requested');
  assert.deepEqual(runtime.automataCartridges.snapshot().promotionQueue, []);

  await runtime.executeAutomataCapability('promotion.probe', {});
  const promoted = runtime.automataCartridges.list().find(item => item.id === 'working-system');
  assert.equal(promoted.verification.state, 'runtime-passed');
  assert.equal(promoted.promotion.state, 'ready-for-uploader');

  const queue = runtime.automataCartridges.snapshot().promotionQueue;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].artifact.sha256, SHA);
  assert.equal(queue[0].destination, 'github-release-uploader');
  assert.equal(queue[0].verification.state, 'runtime-passed');
  assert.deepEqual(queue[0].provenance, { source: 'recovery-test', lineage: 'computer-cartridge' });

  await runtime.executeAutomataCapability('promotion.probe', {});
  assert.equal(runtime.automataCartridges.snapshot().promotionQueue.length, 1);

  const restarted = await new NativeSeedRuntime(options).boot();
  assert.equal(restarted.automataCartridges.snapshot().promotionQueue.length, 1);
});

test('failed and malformed candidates never enter the promotion queue', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(), namespace: 'promotion-rejections',
  }).boot();

  await assert.rejects(
    runtime.installAutomataCartridge(manifest('bad-identity', 'worker:none', {
      enabled: true,
      destination: 'github-release-uploader',
      artifact: { storageRef: 'cas://missing-hash', sha256: 'not-a-sha' },
    })),
    /promotion artifact sha256 required/,
  );

  await runtime.meshKernel.registerParticipant('worker:failing', {
    kind: 'test', residency: 'active', capabilities: ['promotion.probe'],
  });
  runtime.meshKernel.bindHandler('worker:failing', async () => { throw new Error('system did not work'); });
  await runtime.installAutomataCartridge(manifest('failed-system', 'worker:failing', {
    enabled: true,
    destination: 'github-release-uploader',
    artifact: { storageRef: 'cas://sha256/' + SHA, sha256: SHA },
  }));

  await assert.rejects(runtime.executeAutomataCapability('promotion.probe', {}), /auto assembly exhausted/);
  assert.deepEqual(runtime.automataCartridges.snapshot().promotionQueue, []);
  const failed = runtime.automataCartridges.list().find(item => item.id === 'failed-system');
  assert.equal(failed.status, 'sidelined');
  assert.equal(failed.verifiedForPromotion, false);
});
