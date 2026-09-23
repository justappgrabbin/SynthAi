/**
 * ACCEPTANCE TEST 6 — RESONANCE/PROJECT LOOP (handoff §36)
 * project node created -> capability/need identified (queryCapability) ->
 * participant/tool discovered (registry lookup) -> relationship/assignment
 * recorded (resolveRelationship + real YNIV edge resolver) -> REAL work
 * (foundry-glyphs resonance-engine executes real ephemeris) -> result observed
 * -> project state changes -> outcome persisted -> participant state updates
 * -> Computer explains via trajectory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('ACCEPTANCE 6: resonance/project loop with real providers', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc6-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const traj = 'traj-acc6-resonance';
  try {
    // 1. user/agent creates project node
    const project = await runtime.projects.create({ name: 'resonance-map', description: 'resolve ephemeris resonances for two participants' });
    assert.ok(project.id);

    // 2. capability/need identified
    const need = runtime.queryCapability('calculate_human_design');
    assert.equal(need.providers[0].provider_id, 'recovered:foundry-glyphs-ephemeris');

    // 3. participant/tool discovered via registry lookup
    const tool = runtime.services.get('address-service');
    assert.ok(tool && tool.provider, 'address-service discovered in services registry');

    // 4. relationship recorded via the REAL edge resolver (assignment evidence)
    const g10 = (await runtime.resolveAddress({ micro: { gate: 9, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const g20 = (await runtime.resolveAddress({ micro: { gate: 19, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const rel = await runtime.resolveRelationship(g10, g20);
    assert.equal(rel.edge.edge_type, 'AWAKENING');
    await runtime.state.set(`projects.${project.id}.assignment`, {
      participants: ['user:ada(g10)', 'agent:skynth(g20)'], channel: rel.edge.edge_type, score: rel.edge.score,
    }, { source: 'acc6' });

    // 5. REAL work: foundry-glyphs resonance-engine executes real ephemeris
    const work = await runtime.resolveAddress({ ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } });
    assert.equal(work.provider, 'recovered:foundry-glyphs-ephemeris');
    assert.equal(work.address.gate, 38);

    // 6. result observed + 7. project state changes
    await runtime.projects.writeFile(project.id, 'result.json', JSON.stringify({ gate: work.address.gate, engine: work.provider_metadata.engine }), { type: 'application/json' });
    const readBack = runtime.projects.readFile(project.id, 'result.json');
    assert.ok(readBack.content.includes('"gate":38'), 'project artifact observed');

    // 8. outcome persisted + 9. participating entity state updates
    await runtime.state.set('identities.user:ada.state', { last_project: project.id, resolved_gate: work.address.gate }, { source: 'acc6' });
    const outcome = await runtime.emitEvent({
      actor_id: 'user:ada', actor_type: 'user', event_type: 'observation',
      input: { project: project.id }, event_address: work.address, provider: work.provider,
      pre_state: null, post_state: { project_gate: work.address.gate, assignment: rel.edge.edge_type },
      result: { readBack: readBack.content }, result_status: 'success', trajectory_id: traj,
      observable_effect: 'resonance loop completed: project artifact written and participant state updated',
      evidence: { kind: 'test_run', ref: 'computer/tests/acceptance-6-resonance-loop.test.mjs', summary: 'acceptance 6 resonance/project loop' },
    });

    // 10. Computer explains via trajectory
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const explanation = (await restarted.eventEmitter.history(traj)).map((e) => ({
      event_id: e.event_id, actor: e.actor_id, provider: e.provider, post_state: e.post_state, effect: e.observable_effect,
    }));
    assert.equal(explanation.length, 1);
    assert.equal(explanation[0].post_state.project_gate, 38);
    t.diagnostic(`loop: project=${project.id} channel=${rel.edge.edge_type} gate=${work.address.gate} artifact+participant state persisted; trajectory explanation assembled`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
