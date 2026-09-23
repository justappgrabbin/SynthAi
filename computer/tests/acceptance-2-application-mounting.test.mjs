/**
 * ACCEPTANCE TEST 2 — APPLICATION MOUNTING (handoff §32)
 * Mounts a REAL app artifact (repo's own public/computer.html diagnostic shell)
 * through the existing intake -> mutation -> shell-manager pipeline. The app
 * consumes shared Computer services through the mount contract (NOT a separate
 * Computer): files/state, events, addressing. Restart recovery via
 * JsonFilePersistence (existing persistence pattern, file-backed).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';

const APP_HTML = fileURLToPath(new URL('../../public/computer.html', import.meta.url));

test('ACCEPTANCE 2: application mounting with shared services + restart recovery', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc2-'));
  const logPath = join(dir, 'events.jsonl');
  const statePath = join(dir, 'state.json');
  const persistence = new JsonFilePersistence(statePath);
  const runtime = await new ComputerRuntime({ eventLogPath: logPath, persistence, namespace: 'acc2' }).boot();

  try {
    // ── mount a REAL artifact through the existing pipeline ─────────────────
    const html = await readFile(APP_HTML, 'utf8');
    assert.ok(html.includes('SynthAI Computer'), 'real artifact read from disk');
    const artifact = await runtime.intake.ingest({ name: 'computer.html', text: html, type: 'text/html', source: 'test', tags: ['diagnostic-shell'] });
    assert.equal(artifact.status, 'ingested');

    const contract = await runtime.mountApplication('diagnostic-shell', { artifactId: artifact.id });
    assert.ok(contract.mountId && contract.artifactId === artifact.id);
    assert.ok(runtime.shellManager.listMounted().some((m) => m.appId === 'diagnostic-shell'));
    t.diagnostic(`mounted appId=diagnostic-shell mountId=${contract.mountId} artifact=${artifact.id}`);

    // ── app reads its own artifact through the shared VFS (files service) ───
    const self = contract.services.readArtifact();
    assert.ok(self.content.includes('Artifact → mount verification'), 'app reads itself via shared VFS');

    // ── app emits an event through the SHARED emitter ───────────────────────
    const appEvent = await contract.services.emitEvent({
      event_type: 'application_launch',
      input: { artifact: artifact.id },
      result_status: 'success',
      observable_effect: 'diagnostic shell mounted and launched via mount contract',
      trajectory_id: 'traj-acc2',
    });
    assert.equal(appEvent.actor_id, 'app:diagnostic-shell');
    assert.equal(appEvent.actor_type, 'application');

    // ── Computer resolves an address on the app's behalf (shared service) ───
    const resolved = await contract.services.resolveAddress({ birthDate: '1990-01-01', birthTime: '12:00' });
    assert.equal(resolved.address.gate, 64);
    assert.equal(resolved.provider, 'back-up-:kimi-human-design');

    // ── app state persists through the shared StateStore (namespaced) ───────
    await contract.services.setState('session', { resolved_gate: resolved.address.gate, launched: true });
    assert.equal(contract.services.getState('session').resolved_gate, 64);
    // app is NOT a separate Computer: no access to runtime internals, namespaced state only
    assert.equal(contract.services.getState('boot'), undefined, 'namespace isolates app state');

    // consumption receipt: Computer observes the app's persisted state + event
    const receipt = {
      app_state: runtime.state.get('apps.diagnostic-shell.session'),
      app_event_id: appEvent.event_id,
    };
    assert.equal(receipt.app_state.resolved_gate, 64);
    t.diagnostic(`app emitted ${appEvent.event_id}; address gate 64 resolved on app's behalf; state persisted`);

    // ── restart: fresh runtime over the same persistence + event log ────────
    const restarted = await new ComputerRuntime({
      eventLogPath: logPath,
      persistence: new JsonFilePersistence(statePath),
      namespace: 'acc2',
    }).boot();
    const recoveredState = restarted.state.get('apps.diagnostic-shell.session');
    assert.equal(recoveredState?.resolved_gate, 64, 'app state recovered after restart');
    assert.ok(restarted.state.get('mounts.' + contract.mountId), 'mount record recovered');
    const replay = await restarted.eventEmitter.history('traj-acc2');
    assert.equal(replay.length, 1);
    assert.equal(replay[0].event_id, appEvent.event_id);
    assert.equal(replay[0].actor_id, 'app:diagnostic-shell');
    t.diagnostic(`restart recovery: app state + mount record + event all recovered`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
