/**
 * Stage 4d wave-1: recovered donors behind Computer contracts.
 * (a) YNIV encodeMicro/encodeMacro round-trip via resolveAddress contract
 * (b) EmergentEdgeResolver gates 10+20 -> AWAKENING edge via resolveRelationship
 * (c) Foundry-Glyphs real ephemeris -> gate/line/color/tone/base, consumed by resolveState
 * (d) routing_decision records BOTH addressing providers as candidates with rationale
 * Events emitted per grammar-v1. Real donor code only (ported = esbuild type-erasure).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('stage4d: recovered YNIV addressing + Foundry-Glyphs ephemeris', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-stage4d-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const routingDecisions = [];
  runtime.bus.on('routing:decision', (d) => routingDecisions.push(d.payload ?? d));

  try {
    // ── (a) YNIV micro/macro round-trip through the Computer contract ───────
    const microRes = await runtime.resolveAddress({ micro: { gate: 41, line: 4, color: 2, tone: 5, base: 3 } }); // exact recovery-probe input
    assert.equal(microRes.provider, 'recovered:yniv-addressing-engine');
    assert.equal(microRes.provider_metadata.yniv.micro.index, 45088, 'donor encodeMicro matches recovery probe (45088)');
    assert.equal(microRes.provider_metadata.yniv.micro.size, 69120);
    assert.deepEqual(
      [microRes.address.gate, microRes.address.line, microRes.address.color, microRes.address.tone, microRes.address.base],
      [42, 5, 3, 6, 4],
      'donor decode echoes probe input; contract fields are donor+1 (donor is 0-based)',
    );
    const macroRes = await runtime.resolveAddress({ macro: { planet: 3, dimension: 2, zodiac: 5, house: 7 } });
    assert.equal(macroRes.provider_metadata.yniv.macro.index, 2515);
    assert.equal(macroRes.provider_metadata.yniv.macro.size, 9360);
    assert.equal(macroRes.address.house, 8); // 0-based 7 -> contract 1-based 8
    t.diagnostic(`(a) YNIV micro index=${microRes.provider_metadata.yniv.micro.index} -> G${microRes.address.gate}.L${microRes.address.line}.C${microRes.address.color}.T${microRes.address.tone}.B${microRes.address.base}; macro index=${macroRes.provider_metadata.yniv.macro.index}`);

    // ── (b) EmergentEdgeResolver gates 10+20 via resolveRelationship ────────
    const g10 = (await runtime.resolveAddress({ micro: { gate: 9, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const g20 = (await runtime.resolveAddress({ micro: { gate: 19, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const rel = await runtime.resolveRelationship(g10, g20);
    assert.equal(rel.edge.provider, 'recovered:yniv-emergent-edge-resolver');
    assert.equal(rel.edge.edge_type, 'AWAKENING');
    assert.equal(rel.edge.compatible, true);
    assert.ok(Math.abs(rel.edge.emergent.resonance - 14.094) < 1e-9, 'recovery probe resonance 14.094 reproduced');
    assert.ok(rel.structural_relations.includes('channel:AWAKENING'));
    t.diagnostic(`(b) resolveRelationship(g10,g20) edge=${rel.edge.edge_type} score=${rel.edge.score} trace="${rel.edge.emergent.trace}"`);

    // ── (c) Foundry-Glyphs ephemeris -> GLCTB consumed by resolveState ──────
    const ephRes = await runtime.resolveAddress({ ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } });
    assert.equal(ephRes.provider, 'recovered:foundry-glyphs-ephemeris');
    assert.equal(ephRes.address.gate, 38); // mandala wheel (gate 25 at 0° Aries) — DIFFERENT engine from kimi HD (which gives 64); both retained
    assert.equal(ephRes.address.line, 2);
    assert.equal(ephRes.address.zodiac, 'Capricorn');
    const state = await runtime.resolveState(
      { identity: 'user:ephemeris', ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } },
      null,
      { stage: '4d' },
    );
    assert.equal(state.address.gate, 38, 'ephemeris-derived address consumed by resolveState');
    assert.equal(state.active_structures.ephemeris.provider, 'recovered:foundry-glyphs-ephemeris');
    assert.equal(state.active_structures.five_level_state_space.gate, 38, 'state-space cross at ephemeris gate');
    assert.equal(state.active_structures.human_design, null, 'no kimi chart fabricated for an ephemeris-only input');
    t.diagnostic(`(c) ephemeris Capricorn 11°19'15" -> G${ephRes.address.gate}.L${ephRes.address.line}.C${ephRes.address.color}.T${ephRes.address.tone}.B${ephRes.address.base}; resolveState source=${state.source_provider}`);

    // ── (d) routing_decision shows BOTH addressing providers as candidates ──
    const addrDecision = routingDecisions.find((d) => d.required_capability === 'resolve_address');
    assert.ok(addrDecision, 'routing decision recorded');
    assert.ok(addrDecision.candidate_providers.includes('back-up-:kimi-dms-codec'), 'kimi DMS codec among candidates');
    assert.ok(addrDecision.candidate_providers.includes('recovered:yniv-addressing-engine'), 'YNIV among candidates');
    assert.ok(addrDecision.candidate_providers.includes('back-up-:execution-spine-canonical-address'), 'authority among candidates');
    assert.equal(addrDecision.selected_provider, 'recovered:yniv-addressing-engine');
    assert.match(addrDecision.selection_rationale, /YNIV coordinate object/);
    t.diagnostic(`(d) routing_decision candidates=${addrDecision.candidate_providers.join(', ')} -> selected=${addrDecision.selected_provider}`);

    // ── grammar-v1 events for the chain, persisted + restart-replayed ───────
    const traj = 'traj-stage4d-recovered';
    const event = await runtime.emitEvent({
      actor_id: 'user:ephemeris',
      actor_type: 'user',
      event_type: 'user_action',
      input: { ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } },
      actor_address: state.address,
      event_address: microRes.address,
      provider: 'recovered:foundry-glyphs-ephemeris',
      address_provider: 'recovered:yniv-addressing-engine',
      state_provider: state.source_provider,
      result: { yniv_micro_index: 45088, edge: rel.edge.edge_type, ephemeris_gate: 38 },
      result_status: 'success',
      post_state: { resolved_gate: state.address.gate },
      observable_effect: 'recovered donors executed: YNIV round-trip + AWAKENING edge + mandala ephemeris consumed by resolveState',
      trajectory_id: traj,
      evidence: { kind: 'test_run', ref: 'computer/tests/recovered-donors.test.mjs', summary: 'stage4d recovered donors mounted behind contracts' },
    });
    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const replay = await restarted.eventEmitter.history(traj);
    assert.equal(replay.length, 1);
    assert.equal(replay[0].event_id, event.event_id);
    assert.equal(replay[0].result.edge, 'AWAKENING');
    t.diagnostic(`(e) event ${event.event_id} persisted; fresh-runtime replay intact`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
