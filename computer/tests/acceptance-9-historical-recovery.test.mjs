/**
 * ACCEPTANCE TEST 9 — HISTORICAL RECOVERY (Amendment A §14)
 * Formal proof of the recovery loop for every recovered donor:
 *   located -> lineage -> documented (PROVENANCE.md incl. archive SHA-256 /
 *   commit SHA) -> preserved (vendored) -> mounted -> EXECUTED through the
 *   Computer contract -> verified -> registered (registry lineage + status).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('ACCEPTANCE 9: historical recovery proof for all recovered donors', async (t) => {
  // ── documented + preserved: provenance records with source hashes ─────────
  const prov = {
    yniv: await readFile(join(ROOT, 'donors/recovered/you-n-i-verse-corrected/PROVENANCE.md'), 'utf8'),
    foundry: await readFile(join(ROOT, 'donors/recovered/foundry-glyphs/PROVENANCE.md'), 'utf8'),
    gw: await readFile(join(ROOT, 'donors/recovered/glowing-winner/PROVENANCE.md'), 'utf8'),
    s2: await readFile(join(ROOT, 'donors/recovered/synthai2-ephemeris/PROVENANCE.md'), 'utf8'),
  };
  assert.match(prov.yniv, /f913997b787f15ac825446ad93c4664d006e51cabff6361d1d426e2cc2645197/, 'YNIV archive SHA-256 documented');
  assert.match(prov.foundry, /9d8a894b95fdf7ad42d1bf2f5d9b9b6521c31d567edb7b6dc807dbb8835d84e5/, 'Foundry archive SHA-256 documented');
  assert.match(prov.gw, /a9afc57a455e0c6070b8107c0a32ea299c591414/, 'glowing-winner commit SHA documented');
  assert.match(prov.s2, /cfbe3ee3018c41fc8abe6e1734eee5b630595a3f/, 'Synthai2 commit SHA documented');
  // vendored originals preserved on disk
  for (const f of ['donors/recovered/you-n-i-verse-corrected/synthia-bridge.ts',
    'donors/recovered/foundry-glyphs/server/resonance-engine.ts',
    'donors/recovered/glowing-winner/EmbodiedWorldEngine.ts',
    'donors/recovered/synthai2-ephemeris/ephemeris.py']) {
    assert.ok((await readFile(join(ROOT, f), 'utf8')).length > 1000, `preserved: ${f}`);
  }

  const dir = await mkdtemp(join(tmpdir(), 'computer-acc9-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  try {
    // ── registered with lineage + status ────────────────────────────────────
    const yniv = runtime.queryCapability('resolve_address').providers.find((p) => p.provider_id === 'recovered:yniv-addressing-engine');
    const edge = runtime.queryCapability('resolve_relationship').providers[0];
    const foundry = runtime.queryCapability('calculate_human_design').providers[0];
    const world = runtime.queryCapability('world_simulation').providers[0];
    const penta = runtime.queryCapability('penta_group_state').providers.find((p) => p.provider_id === 'recovered:synthai2-penta-ephemeris');
    for (const p of [yniv, edge, foundry, world, penta]) {
      assert.ok(p.lineage.derived_from.length >= 1, `lineage registered: ${p.provider_id}`);
      assert.ok(['WIRED', 'VERIFIED'].includes(p.status), `status ${p.provider_id} = ${p.status}`);
    }

    // ── one REAL execution through each recovered provider via contracts ────
    const e1 = await runtime.resolveAddress({ micro: { gate: 41, line: 4, color: 2, tone: 5, base: 3 } });
    assert.equal(e1.provider_metadata.yniv.micro.index, 45088, 'YNIV addressing executed');
    const g10 = (await runtime.resolveAddress({ micro: { gate: 9, line: 0, color: 0, tone: 0, base: 0 } })).address;
    const g20 = (await runtime.resolveAddress({ micro: { gate: 19, line: 0, color: 0, tone: 0, base: 0 } })).address;
    assert.equal((await runtime.resolveRelationship(g10, g20)).edge.edge_type, 'AWAKENING', 'YNIV edge resolver executed');
    const e3 = await runtime.resolveAddress({ ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } });
    assert.equal(e3.address.gate, 38, 'Foundry-Glyphs ephemeris executed');
    const e4 = await runtime.worldEvent({ input: { spawn: { name: 'recovery-probe', element: 'void' } } });
    assert.ok(e4.agent_id, 'glowing-winner world engine executed');
    const e5 = await runtime.groupPenta([{ label: 'A', birth_date: '1990-01-01', birth_time: '12:00' }]);
    assert.equal(e5.members[0].body_gate, 44, 'Synthai2 penta ephemeris executed (real PyEphem)');

    // verified: evidence entries exist for each
    for (const p of [yniv, edge, foundry, world, penta]) {
      assert.ok(p.verification_evidence.length >= 1, `verification evidence: ${p.provider_id}`);
    }
    t.diagnostic(`recovery proof: 4 provenance records w/ SHA, 5 providers registered+executed (YNIV 45088, AWAKENING, gate 38, world spawn, penta G44)`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
