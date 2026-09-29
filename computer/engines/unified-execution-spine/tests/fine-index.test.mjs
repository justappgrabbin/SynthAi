import test from 'node:test';
import assert from 'node:assert/strict';
import { fineIndexForAddress, addressForFineIndex, TOTAL_FINE_UNITS } from '../src/fine-index.mjs';

test('fine index cardinality and boundaries', () => {
  assert.equal(TOTAL_FINE_UNITS, 64 * 6 * 6 * 6 * 5 * 99);
  assert.equal(TOTAL_FINE_UNITS, 6842880);
  assert.equal(fineIndexForAddress({ gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 }), 0);
  assert.equal(fineIndexForAddress({ gate: 64, line: 6, color: 6, tone: 6, base: 5, arcUnit: 99 }), TOTAL_FINE_UNITS - 1);
  assert.deepEqual(addressForFineIndex(0), { gate: 1, line: 1, color: 1, tone: 1, base: 1, arcUnit: 1 });
  assert.deepEqual(addressForFineIndex(TOTAL_FINE_UNITS - 1), { gate: 64, line: 6, color: 6, tone: 6, base: 5, arcUnit: 99 });
});

test('5000 random fine-index round trips', () => {
  for (let i = 0; i < 5000; i++) {
    const a = {
      gate: 1 + Math.floor(Math.random() * 64),
      line: 1 + Math.floor(Math.random() * 6),
      color: 1 + Math.floor(Math.random() * 6),
      tone: 1 + Math.floor(Math.random() * 6),
      base: 1 + Math.floor(Math.random() * 5),
      arcUnit: 1 + Math.floor(Math.random() * 99),
    };
    assert.deepEqual(addressForFineIndex(fineIndexForAddress(a)), a);
  }
});
