/**
 * ACCEPTANCE TEST 4 — DIGITAL SKYNTHIA EFFECT (handoff §34)
 * Honest limited demonstration: movement originates from a REAL system process
 * (glowing-winner world-engine agent move over real ticks) -> morph-expression
 * state (real MorphEngine.express) -> observable output record (state diff +
 * bus event) -> persisted. RENDERER: investigated — no real render component
 * exists in computer/ (morph targets are state-only; public/*.mjs shells are
 * DOM demos not wired to a runtime) -> renderer labeled NOT FOUND with the
 * path forward recorded in the registry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('ACCEPTANCE 4: digital skynthia effect (morph-expression, honest contract)', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc4-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const morphEvents = [];
  runtime.bus.on('morph:expressed', (d) => morphEvents.push(d.payload ?? d));
  const traj = 'traj-acc4-skynthia';
  try {
    // morph-expression capability is registered (delivery-branch capability)
    assert.ok(runtime.capabilityRegistry.has('morph-expression'), 'morph-expression capability present');

    // 1. REAL system process originates the movement: world-engine agent move
    const spawn = await runtime.worldEvent({ input: { spawn: { name: 'skynthia-avatar', element: 'void' } } });
    const agentId = spawn.agent_id;
    const before = runtime.observeWorld().agents.find((a) => a.id === agentId).position;
    await runtime.worldEvent({ input: { move: { agent: agentId, x: 100, z: 0 }, tick_ms: 500 } });
    const after = runtime.observeWorld().agents.find((a) => a.id === agentId).position;
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    assert.ok(moved > 0, `real movement occurred (${moved.toFixed(2)} units)`);

    // 2. Digital Skynthia representation: morph-expression state from the REAL movement
    const expression = await runtime.morph.express('skynthia-avatar', {
      kind: 'embodiment',
      position: after,
      velocity_hint: { dx: after.x - before.x, dz: after.z - before.z },
      source_process: 'recovered:glowing-winner-world-engine',
    });
    assert.equal(expression.position.x, after.x);
    assert.ok(morphEvents.length >= 1, 'observable morph:expressed event');

    // 3. observable effect: state diff + output record persisted
    const morphState = runtime.state.get('morph.targets.skynthia-avatar');
    assert.ok(morphState?.position, 'morph-expression state observable via StateStore');
    const event = await runtime.emitEvent({
      actor_id: 'system:morph-engine', actor_type: 'system', event_type: 'observation',
      input: { target: 'skynthia-avatar' },
      pre_state: { position: before }, post_state: { position: after, morph: morphState.kind },
      result: { moved_units: Number(moved.toFixed(3)), morph_expression: morphState },
      result_status: 'success', trajectory_id: traj,
      observable_effect: `skynthia avatar moved ${moved.toFixed(2)} units in world; morph-expression updated`,
      evidence: { kind: 'test_run', ref: 'computer/tests/acceptance-4-skynthia-effect.test.mjs', summary: 'acceptance 4 skynthia effect (morph-expression; renderer NOT FOUND)' },
    });
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    assert.equal((await restarted.eventEmitter.history(traj))[0].result.moved_units, event.result.moved_units);

    // 4. renderer honesty: NOT FOUND, path forward recorded
    const renderers = runtime.services.list().filter((s) => /render/i.test(s.id));
    assert.equal(renderers.length, 0, 'no renderer service exists — honestly NOT FOUND');
    t.diagnostic(`effect: world move ${moved.toFixed(2)} -> morph.express -> StateStore morph.targets + event persisted+replayed; renderer NOT FOUND (path: wire morph.targets to a public/ shell or a canvas renderer service)`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
