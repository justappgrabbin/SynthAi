import { fnv1a32, stableStringify } from '../primitives/index.mjs';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
const unitHash = (value) => (Number.parseInt(fnv1a32(stableStringify(value)), 16) >>> 0) / 0xffffffff;

/**
 * The thirteen filter names follow the preserved coordinate-engine ordering.
 * Qualitative modulation roles come from the preserved state-space corpus.
 * Punctuation names and numeric transforms are explicit integration choices:
 * they make the user's filter/"quantum stopper" ontology executable without
 * presenting it as a physics result or silently inventing canonical HD data.
 */
export const PLANETARY_FILTER_SPECS = Object.freeze([
  Object.freeze({ id: 1, name: 'Sun', punctuation: 'emphasis', role: 'identity and amplitude ceiling', operator: 'ceiling' }),
  Object.freeze({ id: 2, name: 'Moon', punctuation: 'inflection', role: 'reflection and emotional phase', operator: 'phase' }),
  Object.freeze({ id: 3, name: 'Mercury', punctuation: 'translation', role: 'cognitive translation and harmonic offset', operator: 'offset' }),
  Object.freeze({ id: 4, name: 'Venus', punctuation: 'qualification', role: 'value and saturation filter', operator: 'saturate' }),
  Object.freeze({ id: 5, name: 'Mars', punctuation: 'acceleration', role: 'instinctive dynamic drive', operator: 'drive' }),
  Object.freeze({ id: 6, name: 'Jupiter', punctuation: 'expansion', role: 'expansion and frequency spread', operator: 'spread' }),
  Object.freeze({ id: 7, name: 'Saturn', punctuation: 'boundary', role: 'boundary, structure, and damping', operator: 'damp' }),
  Object.freeze({ id: 8, name: 'Uranus', punctuation: 'break', role: 'innovation and mutation', operator: 'mutate' }),
  Object.freeze({ id: 9, name: 'Neptune', punctuation: 'ellipsis', role: 'dissolution, reverb, and blur', operator: 'blur' }),
  Object.freeze({ id: 10, name: 'Pluto', punctuation: 'transformation', role: 'deep transformation and base-depth shift', operator: 'depth' }),
  Object.freeze({ id: 11, name: 'North Node', punctuation: 'forward-marker', role: 'forward directional context', operator: 'forward' }),
  Object.freeze({ id: 12, name: 'South Node', punctuation: 'backward-marker', role: 'prior directional context', operator: 'backward' }),
  Object.freeze({ id: 13, name: 'Earth', punctuation: 'grounding-stop', role: 'grounding and subharmonic stabilization', operator: 'ground' }),
]);

function rotate(values, amount) {
  if (!values.length) return [];
  const shift = ((amount % values.length) + values.length) % values.length;
  return values.map((_value, index) => values[(index - shift + values.length) % values.length]);
}

function applyOperator(spec, input, condition) {
  const values = [...input].map((value) => clamp(Number(value) || 0));
  switch (spec.operator) {
    case 'ceiling':
      return values.map((value) => Math.min(0.9 + condition * 0.08, value * 1.08));
    case 'phase': {
      const phased = rotate(values, 1);
      return phased.map((value, index) => clamp(value * 0.82 + values[index] * 0.18 + (condition - 0.5) * 0.04));
    }
    case 'offset': {
      const shifted = rotate(values, 2);
      return shifted.map((value, index) => clamp(value * 0.68 + values[index] * 0.32 + 0.025));
    }
    case 'saturate':
      return values.map((value) => clamp(0.5 + (value - 0.5) * (1.08 + condition * 0.18)));
    case 'drive':
      return values.map((value) => clamp(value * (1.1 + condition * 0.18)));
    case 'spread':
      return values.map((value, index) => clamp(value * 0.62 + values[(index + 1) % values.length] * 0.19 + values[(index + values.length - 1) % values.length] * 0.19));
    case 'damp':
      return values.map((value) => clamp(value * (0.68 + condition * 0.08)));
    case 'mutate':
      return values.map((value, index) => clamp(index % 2 === 0 ? value * (0.82 + condition * 0.3) : value * (1.12 - condition * 0.18)));
    case 'blur':
      return values.map((value, index) => clamp(value * 0.45 + values[(index + 1) % values.length] * 0.275 + values[(index + values.length - 1) % values.length] * 0.275));
    case 'depth':
      return values.map((value) => clamp(Math.sqrt(value) * (0.82 + condition * 0.12)));
    case 'forward':
      return rotate(values, 1).map((value, index) => clamp(value * 0.76 + values[index] * 0.24));
    case 'backward':
      return rotate(values, -1).map((value, index) => clamp(value * 0.76 + values[index] * 0.24));
    case 'ground':
      return values.map((value, index) => clamp(value * 0.58 + values[index % 2 === 0 ? 0 : 6] * 0.22 + 0.1));
    default:
      throw new RangeError(`unknown planetary filter operator: ${spec.operator}`);
  }
}

export class PlanetaryFilterRegistry {
  constructor(specs = PLANETARY_FILTER_SPECS) {
    this.filters = new Map(specs.map((spec) => [spec.id, spec]));
    if (this.filters.size !== 13) throw new Error(`planetary filter invariant failed: expected 13, got ${this.filters.size}`);
  }

  get(id) {
    const filter = this.filters.get(Number(id));
    if (!filter) throw new RangeError(`planetary filter must be 1..13, got ${id}`);
    return filter;
  }

  apply(id, vector, context = {}) {
    const filter = this.get(id);
    const input = Object.freeze([...vector].map((value) => Number(value) || 0));
    const condition = unitHash({
      filter: filter.id,
      task: context.task ?? null,
      dimension: context.dimension ?? null,
      gate: context.gate ?? null,
      fine: context.fine ?? null,
    });
    const output = Object.freeze(applyOperator(filter, input, condition).map((value) => Number(value.toFixed(6))));
    const inputEnergy = input.reduce((sum, value) => sum + Math.abs(value), 0);
    const outputEnergy = output.reduce((sum, value) => sum + Math.abs(value), 0);
    return Object.freeze({
      id: `planetary-filter:${filter.id}`,
      filter,
      ontology: 'PROJECT_MODEL_QUANTUM_STOPPER',
      behavior: 'punctuation-like phase/filter control',
      condition: Number(condition.toFixed(6)),
      input,
      output,
      changed: output.some((value, index) => value !== input[index]),
      energyRatio: Number((outputEnergy / Math.max(inputEnergy, Number.EPSILON)).toFixed(6)),
      identityMutation: false,
      sourceStatus: Object.freeze({
        qualitativeRoles: 'PRESERVED_STATE_SPACE_CORPUS',
        numericTransform: 'INTEGRATION_CHOICE',
        scientificClaim: false,
      }),
    });
  }

  snapshot() {
    return Object.freeze({
      count: this.filters.size,
      ontology: 'planetary filters / punctuation-like quantum stoppers',
      filters: Object.freeze([...this.filters.values()]),
    });
  }
}

export default PlanetaryFilterRegistry;
