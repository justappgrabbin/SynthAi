import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

test('Three Kimi donor event formats join the real resident without becoming facts or actions', async () => {
  const persistence = new MemoryPersistence();
  const eventLogPath = join(tmpdir(), 'synthia-kimi-' + randomUUID() + '.jsonl');
  const options = { persistence, namespace: 'synthia-donor-evidence', eventLogPath };
  try {
    const computer = await new ComputerRuntime(options).boot();
    const bridge = computer.donorIntegration;
    assert.equal(computer.services.get('kimi-donor-evidence').provider, bridge);
    assert.equal(bridge.status().executesDonorApps, false);
    const baseline = computer.synthia.graph().neural.trainingExamples;

    const language = await bridge.receive({
      donor: 'spacetime-workbench', kind: 'interpretation', eventId: 'lang-1',
      payload: { text: 'In the workshop, an arbor is a tool.', path: 'klein', verified: false },
    });
    const world = await bridge.receive({
      donor: 'adaptive-swarm-3d', kind: 'relation', eventId: 'world-1',
      payload: { from: 'participant', to: 'agent-07', predicate: 'CONTACTS', resonance: null },
    });
    const film = await bridge.receive({
      donor: 'remorph-video', kind: 'story-choice', eventId: 'film-1',
      payload: { scene: 'platform', choice: 'follow signal', next: 'follow' },
    });
    for (const item of [language, world, film]) {
      assert.equal(item.evidenceStatus, 'unverified-provider-report');
      assert.ok(item.residentReadingId);
      assert.ok(item.computerEventId);
    }
    assert.equal(bridge.events().length, 3);
    assert.equal(computer.synthia.graph().neural.trainingExamples, baseline);
    assert.equal(computer.observeWorld().agents.length, 0);
    assert.equal(computer.synthia.graph().shared.observations, 3);
    const log = await computer.eventEmitter.readAll();
    assert.equal(log.filter(e => e.evidence?.trust === 'donor-self-report').length, 3);
    assert.ok(log.every(e => !e.evidence || e.evidence.independentlyVerified === false));
    const duplicate = await bridge.receive({
      donor: 'remorph-video', kind: 'story-choice', eventId: 'film-1',
      payload: { scene: 'platform', choice: 'follow signal' },
    });
    assert.equal(duplicate.duplicate, true);
    assert.equal(bridge.events().length, 3);

    const restored = await new ComputerRuntime(options).boot();
    assert.equal(restored.donorIntegration.events().length, 3);
    assert.equal(restored.synthia.graph().shared.observations, 3);
    assert.equal(restored.donorIntegration.status().byDonor['remorph-video'], 1);
  } finally {
    await rm(eventLogPath, { force: true });
  }
});

test('No source may self-promote a UI relationship or reported execution into authorized action', async () => {
  const computer = await new ComputerRuntime({ eventLogPath: join(tmpdir(), 'synthia-kimi-' + randomUUID() + '.jsonl') }).boot();
  const bridge = computer.donorIntegration;
  await assert.rejects(() => bridge.receive({
    donor: 'unlisted', kind: 'dispatch', eventId: 'x-1', payload: { status: 'executed' },
  }), /Unrecognized donor/);
  await assert.rejects(() => bridge.receive({
    donor: 'adaptive-swarm-3d', kind: 'dispatch', eventId: 'x-2',
    payload: { status: 'successful', approved: true },
  }), /explicit executed/);
  await assert.rejects(() => bridge.receive({
    donor: 'adaptive-swarm-3d', kind: 'contact', eventId: 'x-3',
    payload: { from: 'participant' },
  }), /from and to/);
  const claimed = await bridge.receive({
    donor: 'adaptive-swarm-3d', kind: 'dispatch', eventId: 'x-4',
    payload: { status: 'executed', result: { mutated: true } },
  });
  assert.equal(claimed.evidenceStatus, 'unverified-provider-report');
  assert.equal(bridge.status().executesDonorApps, false);
  assert.equal(computer.observeWorld().agents.length, 0);
});
