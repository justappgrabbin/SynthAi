export const CANONICAL_COMPONENTS = Object.freeze(new Set([
  'autoling-lite', 'diseminer-lite', 'klein-analogy', 'iching-grammar',
  'language-contact', 'historical-monte-carlo', 'autonovel', 'messy',
  'success', 'conversation', 'browser-form', 'research-browser',
  'computational-grammar-coder', 'autoling', 'diseminer', 'morph-mir',
  'canonical-address-schema', 'five-dimensional-constants',
  'sealed-d1-fixtures', 'sealed-d2-fixtures', 'sealed-d3-fixtures',
]));

export class DeletionGuard {
  constructor({ ageThreshold = 7, canonicalComponents = CANONICAL_COMPONENTS } = {}) {
    this.canonicalComponents = new Set(canonicalComponents);
    this.setAgeThreshold(ageThreshold);
    this.history = [];
  }

  setAgeThreshold(value) {
    const threshold = Number(value);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 90) {
      throw new RangeError('age threshold must be an integer from 1 to 90 sequence-days');
    }
    this.ageThreshold = threshold;
    return this;
  }

  check({
    target,
    origin = null,
    createdAt = 0,
    currentSequence = 0,
    flow = 'self',
    requestedThreshold = null,
    scientistStatus = null,
  } = {}) {
    let result;
    if (this.canonicalComponents.has(target)) {
      result = { permitted: false, rule: 1, reason: 'canonical components are never deletable', requiredFlow: null };
    } else if (requestedThreshold != null && Number(requestedThreshold) < this.ageThreshold) {
      result = { permitted: false, rule: 4, reason: `a lower threshold remains subject to the current ${this.ageThreshold}-sequence review period`, requiredFlow: 'self' };
    } else {
      const age = Math.max(0, Number(currentSequence) - Number(createdAt));
      const selfSynthesized = origin === 'ToolSynthesizer' || origin === 'tool_synthesis';
      if (selfSynthesized && age < this.ageThreshold) {
        const refuted = scientistStatus === 'refuted';
        result = {
          permitted: flow === 'self' && refuted,
          rule: 2,
          reason: refuted
            ? 'young self-synthesized component was refuted and is autonomously manageable'
            : 'young self-synthesized deletion requires a refuted ScientistLoop validation',
          requiredFlow: 'self',
          scientistStatus,
          age,
        };
      } else {
        result = { permitted: flow === 'user', rule: 3, reason: 'component at or beyond the threshold requires explicit human acceptance', requiredFlow: 'user', age };
      }
    }
    const frozen = Object.freeze({ target, ...result });
    this.history.push(frozen);
    return frozen;
  }
}

export default DeletionGuard;
