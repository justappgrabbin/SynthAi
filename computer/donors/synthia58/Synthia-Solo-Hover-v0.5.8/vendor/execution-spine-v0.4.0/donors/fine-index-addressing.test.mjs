import assert from 'node:assert/strict';
import { fineIndexForAddress, addressForFineIndex, TOTAL_FINE_UNITS } from '../src/state-space/addressing.js';

assert.equal(TOTAL_FINE_UNITS, 64 * 6 * 6 * 6 * 5 * 99);
assert.equal(TOTAL_FINE_UNITS, 6842880);

// Boundaries
assert.equal(fineIndexForAddress({ gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 }), 0);
assert.equal(fineIndexForAddress({ gate: 64, line: 6, color: 6, tone: 6, base: 5, arcUnit: 99 }), TOTAL_FINE_UNITS - 1);
assert.deepEqual(addressForFineIndex(0), { gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 });
assert.deepEqual(addressForFineIndex(TOTAL_FINE_UNITS - 1), { gate: 64, line: 6, color: 6, tone: 6, base: 5, arcUnit: 99 });

// Round-trip: edge cases + 5000 random points
const cases = [
  { gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 },
  { gate: 64, line: 6, color: 6, tone: 6, base: 5, arcUnit: 99 },
  { gate: 12, line: 3, color: 4, tone: 2, base: 5, arcUnit: 45 },
  { gate: 2, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 }, // first tick of gate 2
];
for (let i = 0; i < 5000; i++) {
  cases.push({
    gate: 1 + Math.floor(Math.random() * 64), line: 1 + Math.floor(Math.random() * 6),
    color: 1 + Math.floor(Math.random() * 6), tone: 1 + Math.floor(Math.random() * 6),
    base: 1 + Math.floor(Math.random() * 5), arcUnit: 1 + Math.floor(Math.random() * 99),
  });
}
for (const c of cases) {
  const idx = fineIndexForAddress(c);
  assert.deepEqual(addressForFineIndex(idx), c, `round-trip failed for ${JSON.stringify(c)}`);
}

// Full carry-chain odometer: every real "next tick" (with cascading carries
// through arcUnit -> base -> tone -> color -> line -> gate) must land exactly
// +1 on the linear index. Proves the encoding behaves like a real odometer,
// not just that isolated points happen to round-trip.
function nextTick(a) {
  const n = { ...a };
  n.arcUnit++;
  if (n.arcUnit > 99) { n.arcUnit = 1; n.base++;
    if (n.base > 5) { n.base = 1; n.tone++;
      if (n.tone > 6) { n.tone = 1; n.color++;
        if (n.color > 6) { n.color = 1; n.line++;
          if (n.line > 6) { n.line = 1; n.gate++; } } } } }
  return n;
}
let addr = { gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 };
let idx = fineIndexForAddress(addr);
for (let i = 0; i < 50000; i++) {
  const nxt = nextTick(addr);
  const nxtIdx = fineIndexForAddress(nxt);
  assert.equal(nxtIdx, idx + 1, `carry chain broke at tick ${i}: ${JSON.stringify(addr)} -> ${JSON.stringify(nxt)}`);
  addr = nxt; idx = nxtIdx;
}

// Range validation
assert.throws(() => fineIndexForAddress({ gate: 65, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 }), /out of range/);
assert.throws(() => fineIndexForAddress({ gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 100 }), /out of range/);
assert.throws(() => addressForFineIndex(-1), /out of range/);
assert.throws(() => addressForFineIndex(TOTAL_FINE_UNITS), /out of range/);

console.log('fine-index-addressing: PASS — 5004 round-trips + 50,000-tick carry chain + boundaries + range checks, all exact');
