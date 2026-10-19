// Added 2026-10-19 (fill/synthai-20261019). Synthetic longitudes only, no birth data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolveFromLongitude, wheelActivation, compareWithDonor, WHEEL_FROM_41 } from '../services/verified-wheel-provider.mjs';
import { ADDRESS_FIELDS } from '../services/address-service.mjs';

test('13 contract fields, unknowns null', () => {
  const { address, provider_metadata } = resolveFromLongitude(302.0, { planet: 'Sun', ayanamsaDeg: 24.7403 });
  assert.deepEqual(Object.keys(address), [...ADDRESS_FIELDS]);
  assert.equal(address.gate, 41); assert.equal(address.line, 1);
  assert.equal(address.zodiac, 'Aquarius'); assert.equal(address.degree, 2); assert.equal(address.minute, 0);
  assert.equal(address.dimension, null); assert.equal(address.arc, null); assert.equal(address.house, null);
  assert.equal(provider_metadata.fagan_bradley.zodiac, 'Capricorn');
});

test('anchors', () => {
  assert.equal(wheelActivation(358.25).gate, 25);
  assert.equal(wheelActivation(10).gate, 21);
  assert.equal(wheelActivation(301.9999).gate, 60);
});

const TABLE = '/workspace/research/calc/gate_table.md';
test('all 64 starts match the verified table', { skip: !existsSync(TABLE) }, () => {
  const rows = readFileSync(TABLE, 'utf8').split('\n').filter((l) => /^\| \d+ \| \*\*/.test(l));
  assert.equal(rows.length, 64);
  for (const r of rows) {
    const c = r.split('|').map((s) => s.trim());
    assert.equal(wheelActivation(Number(c[3]) + 1e-6).gate, Number(c[2].replace(/\*/g, '')));
  }
});

test('same order as donor GATE_WHEEL (rotation only)', async () => {
  const donor = await import('../donors/Back-up-/vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js');
  const w = [...donor.GATE_WHEEL]; const k = w.indexOf(41);
  assert.deepEqual([...w.slice(k), ...w.slice(0, k)], [...WHEEL_FROM_41]);
});

test('records the donor anchor disagreement (flag, not fixed)', async () => {
  let differ = 0;
  for (let i = 0; i < 64; i++) if (!(await compareWithDonor((302 + i * 5.625 + 2.8) % 360)).agree) differ++;
  console.log(`  donor longitudeToHD (58.0 anchor) vs verified (302.0): ${differ}/64 gate midpoints differ`);
  assert.ok(differ > 0);
});
