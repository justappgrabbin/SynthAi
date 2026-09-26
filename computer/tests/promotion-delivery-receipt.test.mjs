import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

const SHA = 'b'.repeat(64);
const manifest = (id, target, destination = 'test-release') => ({
  id,
  version: '2.0.0',
  capability: 'delivery.probe',
  automata: [{ id: id + ':probe', runner: { kind: 'mesh', target, operation: 'run' } }],
  provenance: { source: 'delivery-receipt-test' },
  promotion: {
    enabled: true,
    destination,
    artifact: { storageRef: 'cas://sha256/' + SHA, sha256: SHA },
  },
});

async function workingRuntime(persistence, namespace = 'promotion-delivery') {
  const runtime = await new NativeSeedRuntime({ persistence, namespace }).boot();
  await runtime.meshKernel.registerParticipant('worker:delivery', {
    kind: 'test', residency: 'active', capabilities: ['delivery.probe'],
  });
  runtime.meshKernel.bindHandler('worker:delivery', async () => ({ working: true }));
  return runtime;
}

test('destination adapter creates one durable immutable delivery receipt', async () => {
  const persistence = new MemoryPersistence();
  const runtime = await workingRuntime(persistence);
  let uploads = 0;
  runtime.registerPromotionDestination('test-release', {
    upload: async candidate => {
      uploads += 1;
      assert.equal(candidate.verification.state, 'runtime-passed');
      return {
        receiptId: 'release-42',
        location: 'https://example.invalid/releases/42',
        sha256: candidate.artifact.sha256,
      };
    },
  });

  await runtime.installAutomataCartridge(manifest('delivered-system', 'worker:delivery'));
  await runtime.executeAutomataCapability('delivery.probe', {});
  const queued = runtime.automataCartridges.snapshot().promotionQueue[0];
  const receipt = await runtime.deliverAutomataPromotion(queued.cartridgeId + ':' + queued.version + ':' + queued.artifact.sha256);

  assert.equal(receipt.state, 'delivered');
  assert.equal(receipt.receiptId, 'release-42');
  assert.equal(receipt.artifact.sha256, SHA);
  assert.equal(uploads, 1);

  const repeated = await runtime.deliverAutomataPromotion(receipt.queueKey);
  assert.deepEqual(repeated, receipt);
  assert.equal(uploads, 1);

  const restarted = await new NativeSeedRuntime({ persistence, namespace: 'promotion-delivery' }).boot();
  const durable = await restarted.deliverAutomataPromotion(receipt.queueKey);
  assert.deepEqual(durable, receipt);
  assert.equal(restarted.automataCartridges.snapshot().deliveryReceipts.length, 1);
});

test('hash-mismatched destination response records no delivery', async () => {
  const runtime = await workingRuntime(new MemoryPersistence(), 'promotion-hash-rejection');
  runtime.registerPromotionDestination('test-release', {
    upload: async () => ({
      receiptId: 'wrong-release',
      location: 'https://example.invalid/releases/wrong',
      sha256: 'c'.repeat(64),
    }),
  });
  await runtime.installAutomataCartridge(manifest('hash-rejected-system', 'worker:delivery'));
  await runtime.executeAutomataCapability('delivery.probe', {});
  const queued = runtime.automataCartridges.snapshot().promotionQueue[0];
  const key = queued.cartridgeId + ':' + queued.version + ':' + queued.artifact.sha256;

  await assert.rejects(runtime.deliverAutomataPromotion(key), /artifact hash mismatch/);
  const snapshot = runtime.automataCartridges.snapshot();
  assert.equal(snapshot.deliveryReceipts.length, 0);
  assert.equal(snapshot.promotionQueue[0].state, 'ready-for-uploader');
});
