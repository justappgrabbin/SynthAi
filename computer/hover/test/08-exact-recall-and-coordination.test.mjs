import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaAutomata } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/engine/synthia.js';
import {
  IntegratedSynthiaSystem,
  computationalAddress,
} from '../src/index.mjs';

test('exact address recall commits real tools/apps, proves SHA-256, and fails closed', () => {
  const system = new IntegratedSynthiaSystem({ engine: new SynthiaAutomata() });
  const toolAddress = computationalAddress('exact-tool-address', 'Design');
  const committedTool = system.exactAddress('commit-tool', {
    address: toolAddress,
    toolId: 'conversation',
    options: { provenance: [{ type: 'test', value: 'live-tool' }] },
  });
  assert.equal(committedTool.kind, 'tool');
  assert.equal(committedTool.contentHash.length, 64);
  const recalled = system.exactAddress('recall', { address: toolAddress, kind: 'tool' });
  assert.equal(recalled.exact, true);
  assert.equal(recalled.contentHash, committedTool.contentHash);
  assert.equal(recalled.value.id, 'conversation');

  const appAddress = computationalAddress('exact-app-address', 'Being');
  const committedApp = system.exactAddress('commit-app', {
    address: appAddress,
    files: [{ path: 'index.html', content: '<h1>Synthia</h1>' }],
  });
  assert.equal(committedApp.representation, 'canonical-file-set');
  assert.throws(() => system.exactAddress('commit-app', {
    address: appAddress,
    files: [{ path: 'index.html', content: '<h1>Different</h1>' }],
  }), { code: 'ADDRESS_CONFLICT' });

  system.exactRecall.content.set(committedApp.contentHash, new Uint8Array([0]));
  assert.throws(() => system.exactAddress('recall', { address: appAddress, kind: 'app' }), { code: 'HASH_MISMATCH' });
  assert.equal(system.exactAddress('recognize', { candidate: 'vq-only' }).recallPermitted, false);
  assert.throws(() => system.exactAddress('recall', { address: { gate: 1 }, kind: 'tool' }), /missing canonical address field/);
});

test('the supplied MeshCoordinator participates in live chat rather than observing afterward', async () => {
  const system = new IntegratedSynthiaSystem({ engine: new SynthiaAutomata() });
  const chat = await system.chat('Coordinate this message across the semantic population.');
  assert.ok(chat.coordination.participants.includes('iching-grammar'));
  assert.ok(chat.coordination.participants.includes('morph-mir'));
  assert.ok(chat.coordination.result.traces.length >= 2);
  assert.ok(chat.coordination.result.packetCount > 0);
  assert.equal(system.wiringAudit().meshCoordinatorRuns, 1);
  const repeated = await system.chat('Coordinate this message across the semantic population.');
  assert.ok(repeated.anticipatoryMemory.recalled > 0);
  const publicContribution = system.anticipatoryMemory.contribute(computationalAddress('private-memory-test'), {
    rawText: 'must not leave the private boundary',
    minute: 42,
    safeSignal: 'retained',
  });
  assert.equal(publicContribution.data.rawText, undefined);
  assert.equal(publicContribution.data.minute, undefined);
  assert.equal(publicContribution.data.safeSignal, 'retained');
});
