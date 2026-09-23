/**
 * ACCEPTANCE TEST 8 — STATE-SPACE RESOLUTION E2E (Amendment A)
 * real entity/event -> identity resolved -> address resolved by a REAL named
 * provider -> current state resolved -> context attached -> relationship/
 * network info (real edge resolver) -> real provider selected (routing
 * decision recorded) -> execution -> observable result -> state recorded ->
 * trajectory updated -> full-path explanation assembled from events.
 * Composition of mounted pieces only; no mocks.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('ACCEPTANCE 8: state-space resolution end-to-end', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc8-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const traj = 'traj-acc8-e2e';
  const decisions = [];
  runtime.bus.on('routing:decision', (d) => decisions.push(d.payload ?? d));
  try {
    // real entity event -> identity + address + current state (REAL named providers)
    const state = await runtime.resolveState(
      { identity: 'user:traveler', birthDate: '1990-01-01', birthTime: '12:00' },
      { actor_id: 'user:traveler', trajectory_id: traj },
      { location: 'temple', phase: 'approach' }, // context attached
    );
    assert.equal(state.identity, 'user:traveler');
    assert.equal(state.address.gate, 64);
    assert.match(state.source_provider, /back-up-:kimi-mesh-state-space/);
    assert.match(state.source_provider, /back-up-:kimi-human-design/);
    assert.ok(state.active_structures.five_level_state_space, 'current state resolved (five-level structures)');
    assert.equal(state.context.location, 'temple', 'context attached');

    // relationship/network info via the REAL recovered edge resolver
    const other = (await runtime.resolveAddress({ micro: { gate: 19, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const rel = await runtime.resolveRelationship(state.address, other);
    assert.equal(rel.edge.provider, 'recovered:yniv-emergent-edge-resolver');
    assert.ok(rel.edge.edge_type, 'network/relationship info resolved');

    // real provider selected with RECORDED routing decision -> execution
    const before = decisions.length;
    const exec = await runtime.resolveAddress({ ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } });
    const decision = decisions.at(-1);
    assert.equal(decisions.length, before + 1);
    assert.equal(decision.selected_provider, 'recovered:foundry-glyphs-ephemeris');
    assert.ok(decision.candidate_providers.length >= 1);
    assert.equal(exec.address.gate, 38, 'observable execution result');

    // resulting state recorded
    await runtime.state.set('acc8.resolved', { identity: state.identity, gate: exec.address.gate, edge: rel.edge.edge_type, routed_by: decision.request_id }, { source: 'acc8' });

    // trajectory updated (chained events)
    const e1 = await runtime.emitEvent({ actor_id: 'user:traveler', actor_type: 'user', event_type: 'user_action', input: { intent: 'resolve-self' }, actor_address: state.address, address_provider: 'back-up-:kimi-human-design', state_provider: state.source_provider, result_status: 'success', trajectory_id: traj, observable_effect: 'identity+address+state resolved' });
    const e2 = await runtime.emitEvent({ actor_id: 'user:traveler', actor_type: 'user', event_type: 'observation', parents: [e1.event_id], input: { intent: 'execute' }, event_address: exec.address, provider: exec.provider, pre_state: { gate: state.address.gate }, post_state: { gate: exec.address.gate }, result: runtime.state.get('acc8.resolved'), result_status: 'success', trajectory_id: traj, observable_effect: 'routed execution observed', evidence: { kind: 'test_run', ref: 'computer/tests/acceptance-8-state-space-e2e.test.mjs', summary: 'acceptance 8 E2E' } });

    // full-path explanation assembled from events (fresh runtime)
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const path = await restarted.eventEmitter.history(traj);
    assert.equal(path.length, 2);
    const explanation = path.map((e) => `${e.event_type} by ${e.actor_id} via ${e.provider ?? e.address_provider ?? 'computer'} -> ${e.observable_effect}`);
    assert.ok(explanation[0].includes('identity+address+state resolved'));
    assert.ok(explanation[1].includes('routed execution observed'));
    assert.deepEqual(path[1].parents, [e1.event_id]);
    t.diagnostic(`E2E: ${state.identity} G${state.address.gate} -> edge ${rel.edge.edge_type} -> routed to ${decision.selected_provider} (G${exec.address.gate}); explanation: ${explanation.length} events chained`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
