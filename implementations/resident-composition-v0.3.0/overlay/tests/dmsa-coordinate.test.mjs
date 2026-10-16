import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDMSA, transformDMSA } from '../src/dmsa-coordinate.mjs';

test('DMSA boundary preserves extrema and stops invalid coordinates before transformation', () => {
  assert.deepEqual(assertDMSA({ degree: 0, minute: 0, second: 0, arc: 0 }), { degree: 0, minute: 0, second: 0, arc: 0 });
  const valid = { degree: 29, minute: 59, second: 59, arc: 99 };
  assert.deepEqual(assertDMSA(valid), valid);
  let executed = false;
  for (const [field, values] of Object.entries({ degree: [-1, 30], minute: [-1, 60], second: [-1, 60, 67], arc: [-1, 100] })) {
    for (const value of [...values, NaN, Infinity, 1.5, '1', null, undefined]) {
      const coordinate = { ...valid, [field]: value };
      assert.throws(() => transformDMSA(coordinate, () => { executed = true; }, {
        originatingInput: { source: 'signup' }, calculation: 'arc-placement', dimensionalFrame: 'Movement', parentOperation: 'origin:1'
      }), error => {
        assert.equal(error.code, 'DMSA_RANGE_ERROR');
        assert.equal(error.details.field, field);
        assert.deepEqual(error.details.coordinate, coordinate);
        assert.equal(error.details.calculation, 'arc-placement');
        assert.equal(error.details.parentOperation, 'origin:1');
        return true;
      });
    }
  }
  assert.equal(executed, false);
  assert.throws(() => assertDMSA(null), { code: 'DMSA_RANGE_ERROR' });
  assert.equal(transformDMSA(valid, value => value.arc), 99);
});
