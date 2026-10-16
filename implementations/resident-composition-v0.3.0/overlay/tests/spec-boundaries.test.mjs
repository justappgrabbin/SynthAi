import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChain } from '../components/state-math/src/grammar/parser.js';
import { validateFullOrganismAddress } from '../src/address-interop.mjs';

test('multiline continuation preserves calls and exposes grammar failure provenance', () => {
  const result = parseChain('messy "first"\nthen\nautoling "second"');
  assert.equal(result.chainLength, 2);
  assert.equal(result.calls[1].raw, 'autoling "second"');
  assert.throws(() => parseChain('messy "first"\nthen\n42', { address: { gate: 6 }, transformation: 'sequence' }), e => {
    assert.equal(e.code, 'GRAMMAR_UNEXPECTED_TOKEN');
    assert.equal(e.position.line, 3); assert.equal(e.position.column, 1);
    assert.deepEqual(e.token, { value: 42, type: 'number' });
    assert.equal(e.rule, 'discourse.call');
    assert.equal(e.previousProduction.node, 'call');
    assert.deepEqual(e.context.address, { gate: 6 });
    return true;
  });
});

test('full-address admission rejects invalid DMSA with originating calculation details', () => {
  const address = { degree: 10, minute: 0, second: 67, arc: 0 };
  const report = validateFullOrganismAddress(address, { originatingInput: 'birth data', transformation: 'chart' });
  assert.equal(report.ok, false);
  assert.equal(report.diagnostics[0].field, 'second');
  assert.deepEqual(report.diagnostics[0].coordinate, address);
  assert.equal(report.diagnostics[0].originatingInput, 'birth data');
  assert.equal(report.diagnostics[0].transformation, 'chart');
});
