import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';
import { GitHubPromotionDestination } from '../adapters/github-promotion-destination.mjs';

const bytes = new TextEncoder().encode('verified working system bytes');
const sha256 = createHash('sha256').update(bytes).digest('hex');

const manifest = {
  id: 'github-delivery-system',
  version: '3.1.4',
  capability: 'github.delivery.probe',
  automata: [{
    id: 'github-delivery-system:probe',
    runner: { kind: 'mesh', target: 'worker:github-delivery', operation: 'run' },
  }],
  provenance: { source: 'github-destination-test' },
  promotion: {
    enabled: true,
    destination: 'github-release',
    artifact: { storageRef: 'cas://verified-system', sha256 },
  },
};

test('GitHub destination verifies bytes and produces a durable creator-facing receipt', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(), namespace: 'github-promotion-destination',
  }).boot();
  await runtime.meshKernel.registerParticipant('worker:github-delivery', {
    kind: 'test', residency: 'active', capabilities: ['github.delivery.probe'],
  });
  runtime.meshKernel.bindHandler('worker:github-delivery', async () => ({ working: true }));

  let request;
  const adapter = new GitHubPromotionDestination({
    repository: 'justappgrabbin/SynthAi',
    artifactSource: { read: async ref => {
      assert.equal(ref, 'cas://verified-system');
      return bytes;
    } },
    client: { uploadImmutable: async input => {
      request = input;
      return {
        receiptId: 'github-release-314',
        location: 'https://github.com/justappgrabbin/SynthAi/releases/tag/' + encodeURIComponent(input.tag),
      };
    } },
  });
  runtime.registerPromotionDestination('github-release', adapter);

  await runtime.installAutomataCartridge(manifest);
  await runtime.executeAutomataCapability('github.delivery.probe', {});
  const queued = runtime.automataCartridges.snapshot().promotionQueue[0];
  const key = [queued.cartridgeId, queued.version, queued.artifact.sha256].join(':');
  const receipt = await runtime.deliverAutomataPromotion(key);

  assert.equal(request.repository, 'justappgrabbin/SynthAi');
  assert.equal(request.sha256, sha256);
  assert.equal(request.bytes, bytes);
  assert.match(request.name, /^github-delivery-system-3.1.4-[a-f0-9]{12}\.bin$/);
  assert.equal(request.metadata.verification.state, 'runtime-passed');
  assert.equal(receipt.state, 'delivered');
  assert.equal(receipt.artifact.sha256, sha256);
  assert.match(receipt.location, /^https:\/\/github\.com\/justappgrabbin\/SynthAi\/releases\/tag\//);
});

test('GitHub destination refuses changed source bytes before any upload call', async () => {
  let uploads = 0;
  const adapter = new GitHubPromotionDestination({
    repository: 'justappgrabbin/SynthAi',
    artifactSource: { read: async () => new TextEncoder().encode('different bytes') },
    client: { uploadImmutable: async () => { uploads += 1; } },
  });

  await assert.rejects(adapter.upload({
    schema: 'synthia.working-system-promotion/v1',
    state: 'ready-for-uploader',
    cartridgeId: 'changed',
    version: '1',
    capability: 'probe',
    artifact: { storageRef: 'cas://changed', sha256 },
    verification: { state: 'runtime-passed' },
    provenance: {},
    queuedAt: 1,
  }), /source artifact hash mismatch/);
  assert.equal(uploads, 0);
});
