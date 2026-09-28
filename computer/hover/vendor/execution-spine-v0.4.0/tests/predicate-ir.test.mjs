import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateIR, evaluateWithTrace } from '../src/predicate-ir.mjs';

test('boolean operator family', () => {
  const T = { op: 'literal', value: true };
  const F = { op: 'literal', value: false };
  assert.equal(evaluateIR({ op: 'and', args: [T, T] }), true);
  assert.equal(evaluateIR({ op: 'or', args: [F, T] }), true);
  assert.equal(evaluateIR({ op: 'xor', args: [T, F] }), true);
  assert.equal(evaluateIR({ op: 'xnor', args: [T, T] }), true);
  assert.equal(evaluateIR({ op: 'nand', args: [T, T] }), false);
  assert.equal(evaluateIR({ op: 'nor', args: [F, F] }), true);
  assert.equal(evaluateIR({ op: 'implies', left: T, right: F }), false);
  assert.equal(evaluateIR({ op: 'equiv', left: T, right: T }), true);
});

test('BUT remains a directional IR node', () => {
  const ir = { op: 'but', left: true, right: true, relation: 'contrast', metadata: { direction: 'left-to-right' } };
  const result = evaluateWithTrace(ir);
  assert.equal(result.value, true);
  assert.equal(result.trace.at(-1).op, 'but');
  assert.equal(result.trace.at(-1).relation, 'contrast');
});

test('hamming works for binary strings, arrays, and ints', () => {
  assert.equal(evaluateIR({ op: 'hamming', left: '1010', right: '1111' }), 2);
  assert.equal(evaluateIR({ op: 'hamming', left: [1,0,1], right: [1,1,0] }), 2);
  assert.equal(evaluateIR({ op: 'hamming', left: 0b1010, right: 0b1111 }), 2);
});
