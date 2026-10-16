import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDRESS_FIELDS, ADDRESS_STRUCTURE, validateCanonicalAddress } from '../src/canonical-address.mjs';

test('canonical spine remains 13 fields and 12 houses', () => {
  assert.deepEqual(ADDRESS_FIELDS, [
    'planetary','dimension','gate','line','color','tone','base','degree','minute','second','arcAxis','zodiac','house',
  ]);
  assert.equal(ADDRESS_STRUCTURE.planetary, 13);
  assert.equal(ADDRESS_STRUCTURE.dimension, 5);
  assert.equal(ADDRESS_STRUCTURE.gate, 64);
  assert.equal(ADDRESS_STRUCTURE.house, 12);
});

test('valid canonical address passes without collapsing degree', () => {
  assert.equal(validateCanonicalAddress({
    planetary: 1, dimension: 'Movement', gate: 1, line: 1, color: 1, tone: 1, base: 1,
    degree: { degrees: 0, fraction: 0 }, minute: 0, second: 0,
    arcAxis: { arcUnit: 1, axis: 'Vertical' }, zodiac: 1, house: 1,
  }), true);
});
