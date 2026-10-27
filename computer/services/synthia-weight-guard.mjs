/**
 * Fail-closed validation of the EXISTING 96x16 online inference weights.
 * Pure JS: usable on both the Linux/Node host and browser Computer build.
 *
 * Never reinitialize, reshape, normalize, truncate or repair saved weights.
 * A mismatched checkpoint is a recovery incident, not an invitation to reset.
 * This does not inspect any independently trained model such as Simlish's NPZ.
 */
const finite = value => typeof value === 'number' && Number.isFinite(value);
const whole = value => Number.isSafeInteger(value) && value >= 0;
function vector(value, n, label) {
  if (!Array.isArray(value) || value.length !== n || !value.every(finite))
    throw new TypeError('Synthia saved weights invalid: ' + label);
}
export function validateSavedSynthiaInference(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved))
    throw new TypeError('Synthia saved weights invalid: inference missing');
  const w = saved.weights;
  if (!Array.isArray(w) || w.length !== 16)
    throw new TypeError('Synthia saved weights invalid: expected 16 hidden rows');
  for (const row of w) vector(row, 96, '96 input weights');
  vector(saved.bias, 16, 'hidden bias');
  if (!whole(saved.examples))
    throw new TypeError('Synthia saved weights invalid: example count');
  if (!saved.heads || typeof saved.heads !== 'object' || Array.isArray(saved.heads))
    throw new TypeError('Synthia saved weights invalid: task heads');
  for (const [name, head] of Object.entries(saved.heads)) {
    if (!name || !head || typeof head !== 'object' || Array.isArray(head))
      throw new TypeError('Synthia saved weights invalid: head structure');
    vector(head.weights, 16, 'capability head weights');
    if (!finite(head.bias) || !whole(head.examples))
      throw new TypeError('Synthia saved weights invalid: head bias/examples');
  }
  return Object.freeze({ valid: true, dimensions: Object.freeze([96, 16]),
    examples: saved.examples, taskHeads: Object.keys(saved.heads).length });
}
