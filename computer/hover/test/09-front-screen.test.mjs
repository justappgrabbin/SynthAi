import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSynthiaFrontScreen } from '../src/index.mjs';
import { testBirthRecord } from './helpers.mjs';

test('front screen serves live status, chat, and the independently callable execution tray', async (t) => {
  const persistenceDir = await mkdtemp(join(tmpdir(), 'synthia-front-test-'));
  const started = await startSynthiaFrontScreen({ port: 0, persistenceDir });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));
  t.after(() => rm(persistenceDir, { recursive: true, force: true }));

  const page = await fetch(started.url);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Synthia · Living Execution Field/);
  assert.match(html, /Private birth mirror/);
  assert.match(html, /Configure the agent genome/);

  let status = await fetch(`${started.url}/api/status`).then((response) => response.json());
  assert.equal(status.ok, true);
  assert.equal(status.ready, false);
  assert.equal(status.identity.configured, false);
  assert.equal(status.counts.meshes, 52);
  assert.equal(status.counts.channels, 36);
  assert.equal(status.counts.centers, 9);
  assert.equal(status.counts.codons, 64);
  assert.equal(status.counts.aspects, 768);

  const blockedChat = await fetch(`${started.url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Do not run generically.' }),
  });
  assert.equal(blockedChat.status, 409);
  assert.equal((await blockedChat.json()).code, 'BIRTH_CONFIGURATION_REQUIRED');

  const configured = await fetch(`${started.url}/api/identity/configure`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(testBirthRecord('front-screen')),
  }).then((response) => response.json());
  assert.equal(configured.ok, true);
  assert.equal(configured.identity.configured, true);
  assert.equal(configured.identity.exactSecondsPreserved, true);
  assert.equal(configured.identity.fiveDimensionIntersections, 65);
  assert.equal(configured.persistence.birthMirrorPersisted, true);
  status = await fetch(`${started.url}/api/status`).then((response) => response.json());
  assert.equal(status.ready, true);

  const realm = await fetch(`${started.url}/api/realm`).then(response => response.json());
  assert.equal(realm.places.length, 9);
  assert.equal(realm.residents[0].projectionOf, 'synthia');
  const moved = await fetch(`${started.url}/api/realm/action`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'travel', target: { placeId: 'garden' } }),
  }).then(response => response.json());
  assert.equal(moved.ok, true);
  assert.equal(moved.world.residents[0].location.placeId, 'garden');

  const tray = await fetch(`${started.url}/api/tray`).then((response) => response.json());
  assert.ok(tray.instruments.some((entry) => entry.kind === 'registered-app' && entry.id === 'gamegan-single-player'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'state-space' && entry.id === 'state-space-browser'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'channel' && entry.id === '16-48'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'hand' && entry.id === 'exact-address-recall'));
  assert.ok(tray.instruments.some((entry) => entry.kind === 'genome' && entry.id === 'genome:gate-25'));

  const genome = await fetch(`${started.url}/api/genome`).then((response) => response.json());
  assert.equal(genome.snapshot.hexagramCodons, 64);
  assert.equal(genome.snapshot.persistentAspectPrimitives, 768);
  assert.equal(genome.snapshot.addressOrder.length, 13);

  const agentChart = await fetch(`${started.url}/api/genome`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: {
      operation: 'register-agent-chart', agentId: 'front-screen-agent', replace: true,
      address: {
        planetary: 2, dimension: 'Space', gate: 25, line: 4, color: 2, tone: 3, base: 4,
        degree: 17, minute: 22, second: 39,
        arc: 55, zodiac: 7, house: 8,
      },
    } }),
  }).then((response) => response.json());
  assert.equal(agentChart.result.address.second, 39);
  assert.equal(agentChart.result.address.arc, 55);

  const execution = await fetch(`${started.url}/api/tray`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'hand', id: 'five-level-state-space', input: { gate: 16 } }),
  }).then((response) => response.json());
  assert.equal(execution.ok, true);
  assert.deepEqual(execution.output.map((entry) => entry.level), ['Movement', 'Evolution', 'Being', 'Design', 'Space']);

  const chat = await fetch(`${started.url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Show me the connected field.', context: { personId: 'front-screen' } }),
  }).then((response) => response.json());
  assert.equal(chat.ok, true);
  assert.equal(chat.pipelineTrace.length, 7);
  assert.ok(chat.atoObservation?.response);
  const transfers = started.synthia.federation.transfers;
  assert.ok(transfers.some((entry) => entry.envelope.to.mesh === 'ato17' && entry.receipt.consumed));
  assert.ok(transfers.some((entry) => entry.envelope.from.mesh === 'ato17' && entry.envelope.to.mesh === 'semantic' && entry.receipt.consumed));
  assert.ok(started.resident17.status().sources >= 1);
  assert.equal(chat.coordination.participants.length, 2);
  assert.equal(chat.swarmExecution.executions[0].workerId, 'birth-mirror-expression-organ');
  assert.equal(chat.semanticGenome.address.gate, chat.swarmExpression.address.gate);
});
