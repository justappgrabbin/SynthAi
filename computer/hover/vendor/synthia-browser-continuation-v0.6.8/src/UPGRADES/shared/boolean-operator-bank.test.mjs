import test from 'node:test';
import assert from 'node:assert/strict';
import { BINARY_BOOLEAN_FUNCTIONS, applyBinary, truthTable, completeAnalogy, toBitString } from './boolean-operator-bank.mjs';

test('contains all 16 binary Boolean functions', () => {
  assert.equal(BINARY_BOOLEAN_FUNCTIONS.length, 16);
  assert.equal(new Set(BINARY_BOOLEAN_FUNCTIONS).size, 16);
});

test('XOR means different; XNOR/equivalence means same', () => {
  assert.equal(toBitString(applyBinary('xor', '1010', '1100')), '0110');
  assert.equal(toBitString(applyBinary('xnor', '1010', '1100')), '1001');
  assert.equal(toBitString(applyBinary('equivalence', '1010', '1100')), '1001');
});

test('AND OR NAND NOR and implications have correct truth tables', () => {
  const compact = name => truthTable(name).map(r => r.out).join('');
  assert.equal(compact('and'), '0001');
  assert.equal(compact('or'), '0111');
  assert.equal(compact('nand'), '1110');
  assert.equal(compact('nor'), '1000');
  assert.equal(compact('a_implies_b'), '1101');
  assert.equal(compact('b_implies_a'), '1011');
});

test('Klein Table-4 relation remains available through XNOR/equivalence', () => {
  const relation = applyBinary('xnor', '10101010', '01100110');
  assert.equal(toBitString(relation), '00110011');
  const solved = completeAnalogy('10101010', '01100110', '01010101', 'xnor');
  assert.equal(toBitString(solved.result), '10011001');
});
