// Reproduce the supplied block construction. This is an audit, not a proposed coupling rule.
import assert from 'node:assert/strict';
const zeros = () => Array.from({ length: 9 }, () => Array(9).fill(0));
const expand = (plane, block) => {
  const result = zeros();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) result[block * 3 + i][block * 3 + j] = plane[i][j];
  return result;
};
const multiply = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const C = expand([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 0);
const E = expand([[2, 3, 4], [5, 6, 7], [8, 9, 10]], 1);
const D = expand([[3, 4, 5], [6, 7, 8], [9, 10, 11]], 2);
const products = { CE: multiply(C, E), DE: multiply(D, E), CD: multiply(C, D), CDE: multiply(multiply(C, D), E) };
for (const [name, matrix] of Object.entries(products)) {
  assert.deepEqual(matrix, zeros(), `${name} must vanish for disjoint block support`);
}
const x = Array.from({ length: 9 }, (_, i) => (i + 1) / 10);
const apply = matrix => matrix.map(row => row.reduce((sum, value, j) => sum + value * x[j], 0));
const R = x.map((_, i) => .5 * apply(products.CE)[i] + .5 * apply(products.DE)[i] + .5 * apply(products.CD)[i]);
assert.deepEqual(R, Array(9).fill(0));
// Global phase does not change |amplitude|^2.
for (const phase of [0, Math.PI / 3, Math.PI]) {
  const magnitude = .5;
  const probability = (magnitude * Math.cos(phase)) ** 2 + (magnitude * Math.sin(phase)) ** 2;
  assert.ok(Math.abs(probability - .25) < 1e-12);
}
console.log(JSON.stringify({ experiment: 'supplied-triadic-block-audit', CE: 'zero', DE: 'zero', CD: 'zero', CDE: 'zero', resonanceField: R, conclusion: 'supplied disjoint blocks cannot produce the described cross-plane products; global phase alone does not change collapse probabilities' }, null, 2));
