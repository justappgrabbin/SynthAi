/**
 * ACCEPTANCE TEST 3 — REALITY/WORLD EVENT (handoff §33)
 * A REAL event enters -> grammar-v1 event record -> addressed (resolveAddress)
 * -> routed to the world process (recovered glowing-winner EmbodiedWorldEngine
 * via the Computer gateway) -> agent/world state changes (moved, memory
 * consolidated — real donor execution) -> observable via Computer observe
 * contract -> persisted -> restart recovered -> traced BACKWARD via parents.
 * BONUS: Synthai2 penta ephemeris (real PyEphem) resolves a 5-person group
 * into penta roles (placeholder position formula flagged, not hidden).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('ACCEPTANCE 3: reality/world event through the mounted world process', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc3-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const traj = 'traj-acc3-world';

  try {
    // ── 1. REAL event enters: grammar-v1 event record, ADDRESSED first ──────
    const addressed = await runtime.resolveAddress({ birthDate: '1990-01-01', birthTime: '12:00' });
    assert.equal(addressed.address.gate, 64);
    const origin = await runtime.emitEvent({
      actor_id: 'user:traveler', actor_type: 'user', event_type: 'user_action',
      input: { action: 'enter-world', spawn: { name: 'traveler', element: 'fire' } },
      actor_address: addressed.address, address_provider: addressed.provider,
      result_status: 'success', trajectory_id: traj,
      observable_effect: 'traveler enters the embodied world',
    });
    assert.ok(origin.event_id);
    t.diagnostic(`origin event ${origin.event_id} addressed gate ${addressed.address.gate}`);

    // ── 2. Routed to the world process: REAL donor execution ────────────────
    const spawnRec = await runtime.worldEvent({ input: { spawn: { name: 'traveler', element: 'fire' } } });
    assert.equal(spawnRec.provider, 'recovered:glowing-winner-world-engine');
    const agentId = spawnRec.agent_id;
    assert.ok(agentId);

    const mateRec = await runtime.worldEvent({ input: { spawn: { name: 'companion', element: 'water' } } });
    const actRec = await runtime.worldEvent({ input: {
      intent: { agent: agentId, text: 'store "arrival memory"' },        // donor executeStore -> shortTerm memory (quoted target)
      move: { agent: agentId, x: 42, z: -7 },                            // donor moveAgent -> target + walking
    } });
    const storeAction = actRec.actions.find((a) => a.action === 'processIntent');
    assert.equal(storeAction.mode, 'store');
    const preTick = runtime.observeWorld().agents.find((a) => a.id === agentId);
    assert.equal(preTick.memory.shortTerm, 1, 'donor stored a short-term memory');
    assert.equal(preTick.animationState, 'walking');
    const startPos = { ...preTick.position };

    // real simulation ticks: agent MOVES toward target inside the donor engine
    await runtime.worldEvent({ input: { tick_ms: 600 } });
    const postTick = runtime.observeWorld().agents.find((a) => a.id === agentId);
    const distBefore = Math.hypot(startPos.x - 42, startPos.z - (-7));
    const distAfter = Math.hypot(postTick.position.x - 42, postTick.position.z - (-7));
    assert.ok(distAfter < distBefore, `agent moved toward target (${distBefore.toFixed(1)} -> ${distAfter.toFixed(1)})`);

    // memory consolidated by the donor's own consolidateMemory
    const consRec = await runtime.worldEvent({ input: { consolidate: { agent: agentId } } });
    assert.deepEqual(consRec.actions[0], { action: 'consolidateMemory', longTerm: 1, shortTerm: 0 });

    // 5W substrate grew (emergence x2 + store + move + ...)
    const worldSnap = runtime.observeWorld();
    assert.ok(worldSnap.fiveW_history >= 4, `5W history ${worldSnap.fiveW_history}`);
    t.diagnostic(`world: agent moved ${distBefore.toFixed(1)}->${distAfter.toFixed(1)}; memory consolidated (longTerm=1); 5W events=${worldSnap.fiveW_history}`);

    // ── 3. Observable via Computer observe contract + persisted ─────────────
    await runtime.state.set('acc3.world-receipt', {
      consumer: 'observe-contract', agent_id: agentId,
      position: postTick.position, memory: postTick.memory, fiveW_history: worldSnap.fiveW_history,
    }, { source: 'acc3' });
    const consequence = await runtime.emitEvent({
      actor_id: 'user:traveler', actor_type: 'user', event_type: 'observation',
      parents: [origin.event_id], // backward traceability
      input: { action: 'world-observation' },
      pre_state: { position: startPos }, post_state: { position: postTick.position, memory: postTick.memory },
      result: { receipt: runtime.state.get('acc3.world-receipt') },
      result_status: 'success', trajectory_id: traj,
      observable_effect: 'agent moved and memory consolidated inside the donor world engine',
      evidence: { kind: 'test_run', ref: 'computer/tests/acceptance-3-world-event.test.mjs', summary: 'acceptance 3 world event' },
    });

    // ── 4. restart recovered + traced BACKWARD from consequence to origin ───
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const history = await restarted.eventEmitter.history(traj);
    assert.equal(history.length, 2);
    const replayedConsequence = history.find((e) => e.event_id === consequence.event_id);
    assert.ok(replayedConsequence, 'consequence persisted + recovered');
    // backward trace: consequence.parents -> origin event
    assert.deepEqual(replayedConsequence.parents, [origin.event_id]);
    const tracedOrigin = history.find((e) => e.event_id === replayedConsequence.parents[0]);
    assert.equal(tracedOrigin.event_id, origin.event_id);
    assert.equal(tracedOrigin.actor_address.gate, 64);
    t.diagnostic(`backward trace: ${consequence.event_id} -> parents -> ${origin.event_id} (restart replay intact)`);

    // ── 5. BONUS: penta ephemeris on a 5-person group (real PyEphem) ────────
    const group = await runtime.groupPenta([
      { label: 'A', birth_date: '1990-01-01', birth_time: '12:00' },
      { label: 'B', birth_date: '1985-06-15', birth_time: '08:30' },
      { label: 'C', birth_date: '1977-11-23', birth_time: '23:45' },
      { label: 'D', birth_date: '2001-03-09', birth_time: '04:15' },
      { label: 'E', birth_date: '1995-09-30', birth_time: '17:00' },
    ]);
    assert.equal(group.provider, 'recovered:synthai2-penta-ephemeris');
    assert.equal(group.members.length, 5);
    for (const m of group.members) {
      assert.ok(m.body_gate >= 1 && m.body_gate <= 64, 'real PyEphem gate');
      assert.ok(['Foundation', 'Connector', 'Provider', 'Director', 'Transmitter'].includes(m.penta.name));
    }
    assert.match(group.position_formula, /PLACEHOLDER/); // flagged, not hidden
    assert.ok(group.needed_positions.every((p) => p >= 1 && p <= 5));
    t.diagnostic(`penta roles: ${group.members.map((m) => `${m.label}=${m.penta.name}(G${m.body_gate})`).join(' ')}; needed=${group.needed_names.join(',') || 'none'} [position formula: PLACEHOLDER — flagged]`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
