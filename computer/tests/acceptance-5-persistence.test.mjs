/**
 * ACCEPTANCE TEST 5 — PERSISTENCE/RESTART (handoff §35)
 * Consolidated proof: a populated session, then a FRESH runtime over the SAME
 * data dir recovers every category and operation continues:
 *   identity records, system model (registry), StateStore state, memory
 *   (events.jsonl), lineage, capability registry, mounted applications,
 *   trajectory, verification history. No new architecture — consolidation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';

test('ACCEPTANCE 5: restart recovery of all persistence categories', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc5-'));
  const logPath = join(dir, 'events.jsonl');
  const statePath = join(dir, 'state.json');
  const boot = () => new ComputerRuntime({ eventLogPath: logPath, persistence: new JsonFilePersistence(statePath), namespace: 'acc5' }).boot();

  try {
    // ── populated session ───────────────────────────────────────────────────
    const r1 = await boot();
    const addr = await r1.resolveAddress({ birthDate: '1990-01-01', birthTime: '12:00' });
    await r1.state.set('identities.user:ada', { identity: 'user:ada', address: addr.address, provider: addr.provider }, { source: 'acc5' }); // identity record
    const artifact = await r1.intake.ingest({ name: 'app.html', text: '<html><body>acc5 app</body></html>', type: 'text/html', source: 'test' });
    const contract = await r1.mountApplication('acc5-app', { artifactId: artifact.id }); // mounted application
    await contract.services.setState('session', { launched: true });
    const ev1 = await r1.emitEvent({ actor_id: 'user:ada', actor_type: 'user', event_type: 'user_action', input: { action: 'seed' }, actor_address: addr.address, result_status: 'success', trajectory_id: 'traj-acc5', observable_effect: 'session seeded' });
    const ev2 = await r1.emitEvent({ actor_id: 'user:ada', actor_type: 'user', event_type: 'observation', parents: [ev1.event_id], input: { action: 'observe' }, pre_state: null, post_state: { seeded: true }, result_status: 'success', trajectory_id: 'traj-acc5', observable_effect: 'seed observed' }); // lineage via parents

    // ── fresh runtime over the SAME data dir ────────────────────────────────
    const r2 = await boot();

    // identity records
    const identity = r2.state.get('identities.user:ada');
    assert.equal(identity?.address?.gate, 64, 'identity record recovered');
    // StateStore state (incl. app state + mount record)
    assert.equal(r2.state.get('apps.acc5-app.session')?.launched, true, 'app state recovered');
    assert.ok(r2.state.get(`mounts.${contract.mountId}`), 'mounted application recovered');
    // memory (events.jsonl) + trajectory
    const history = await r2.eventEmitter.history('traj-acc5');
    assert.equal(history.length, 2, 'trajectory recovered from events.jsonl');
    assert.deepEqual(history[1].parents, [ev1.event_id], 'lineage (parents) intact');
    // system model (registry): all services registered after fresh boot
    for (const svc of ['event-emitter', 'address-service', 'state-resolver', 'capability-registry', 'automata-engine', 'world-engine', 'penta-ephemeris']) {
      assert.ok(r2.services.has(svc), `service registered: ${svc}`);
    }
    // capability registry + verification history
    const q = r2.queryCapability('resolve_address');
    assert.equal(q.providers.length, 4);
    const spine = q.providers.find((p) => p.provider_id === 'back-up-:execution-spine-canonical-address');
    assert.equal(spine.status, 'WIRED');
    assert.ok(spine.verification_evidence.length >= 1, 'verification history recovered');
    assert.ok(spine.lineage.derived_from.length >= 1, 'lineage recovered');
    const world = r2.queryCapability('world_simulation');
    assert.equal(world.providers[0].status, 'VERIFIED');
    // operation continues after restart
    const addr2 = await r2.resolveAddress({ arc: 123456 });
    assert.equal(addr2.address.gate, 7, 'operation continues: real resolution after restart');
    const ev3 = await r2.emitEvent({ actor_id: 'user:ada', actor_type: 'user', event_type: 'observation', parents: [ev2.event_id], input: { action: 'post-restart' }, post_state: { gate: addr2.address.gate }, result_status: 'success', trajectory_id: 'traj-acc5', observable_effect: 'operation continued after restart' });
    const history3 = (await r2.eventEmitter.history('traj-acc5')).map((e) => e.event_id);
    assert.deepEqual(history3, [ev1.event_id, ev2.event_id, ev3.event_id], 'append-only trajectory extended after restart');
    t.diagnostic('recovered: identity, state, app mount, events+trajectory+lineage, services, capability registry+verification history; operation continued (gate 7)');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
