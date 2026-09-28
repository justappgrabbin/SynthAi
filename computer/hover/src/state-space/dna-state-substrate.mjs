import { gateBits } from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';
import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';
import { RelationalOperatorRuntime, evaluateRelationalAlgebra } from './relational-operator-runtime.mjs';

export const COLOR_STATES = Object.freeze([
  Object.freeze({ position: 1, motivation: 'Fear', mode: Object.freeze(['Communalist', 'Separatist']) }),
  Object.freeze({ position: 2, motivation: 'Hope', mode: Object.freeze(['Theist', 'Anti-theist']) }),
  Object.freeze({ position: 3, motivation: 'Desire', mode: Object.freeze(['Leader', 'Follower']) }),
  Object.freeze({ position: 4, motivation: 'Need', mode: Object.freeze(['Master', 'Novice']) }),
  Object.freeze({ position: 5, motivation: 'Guilt', mode: Object.freeze(['Conditioner', 'Conditioned']) }),
  Object.freeze({ position: 6, motivation: 'Innocence', mode: Object.freeze(['Observer', 'Observed']) }),
]);

export const TONE_STATES = Object.freeze([
  Object.freeze({ position: 1, theme: 'Security', sense: 'Smell' }),
  Object.freeze({ position: 2, theme: 'Uncertainty', sense: 'Taste' }),
  Object.freeze({ position: 3, theme: 'Action', sense: 'Outer Vision' }),
  Object.freeze({ position: 4, theme: 'Meditation', sense: 'Inner Vision' }),
  Object.freeze({ position: 5, theme: 'Judgement', sense: 'Feeling' }),
  Object.freeze({ position: 6, theme: 'Acceptance', sense: 'Touch' }),
]);

export const BASE_STATES = Object.freeze([
  Object.freeze({ position: 1, dimension: 'Movement', humanExpression: 'Individuality', question: 'Where?', keynote: 'I Define', sense: 'Seeing' }),
  Object.freeze({ position: 2, dimension: 'Evolution', humanExpression: 'Mind', question: 'What?', keynote: 'I Remember', sense: 'Taste' }),
  Object.freeze({ position: 3, dimension: 'Being', humanExpression: 'Body', question: 'When?', keynote: 'I Am', sense: 'Touching' }),
  Object.freeze({ position: 4, dimension: 'Design', humanExpression: 'Ego', question: 'Why?', keynote: 'I Design', sense: 'Smell' }),
  Object.freeze({ position: 5, dimension: 'Space', humanExpression: 'Personality', question: 'Who?', keynote: 'I Think', sense: 'Hearing' }),
]);

export const DNA_STATE_CANON = Object.freeze({
  model: 'proportion-of-perspective-state-substrate-v1',
  governingLaw: 'meaning-is-position-relative; landed-readings-are-fixed-to-the-position-that-produced-them',
  direction: 'open-field -> contextual-resolution -> landed-fact -> preserved-history',
  universalMeaningAssumed: false,
  expressionIsIdentity: false,
  hardcodeGrammarNotAnswers: true,
  originAnchor: Object.freeze({ body: 'Personality Sun', dimension: 'Being', referenceFrame: 'Tropical' }),
  dimensions: Object.freeze({
    Movement: Object.freeze({ role: 'vertical-scale-traversal-and-visible-naming', axis: 'vertical' }),
    Evolution: Object.freeze({ role: 'associative-reconstructive-temporal-pattern', axis: 'temporal-associative' }),
    Being: Object.freeze({ role: 'occupied-state-and-across-relation', axis: 'horizontal' }),
    Design: Object.freeze({ role: 'causal-dependency-and-structural-assembly', axis: 'causal-structural' }),
    Space: Object.freeze({ role: 'rendered-condition-produced-by-the-other-four', axis: 'emergent-interface' }),
  }),
  arc: Object.freeze({ operator: 3, operation: 'juxtaposition', colorPositions: 9, soundPositions: 9, crossProductAssumed: false }),
  measureRule: 'degree-minute-second-remain-a-shared-contextual-measure-bundle-until-a-position-specific-rule-selects-an-owner',
  relationshipRule: 'connection-creates-a-third-context-state-without-overwriting-either-endpoint',
});

function contextId(prefix, value) {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

export function gateStructuralTopology(gate) {
  const bits = Object.freeze(gateBits(Number(gate)).map(Number));
  const lower = Object.freeze(bits.slice(0, 3));
  const upper = Object.freeze(bits.slice(3, 6));
  const digrams = Object.freeze([
    Object.freeze(bits.slice(0, 2)),
    Object.freeze(bits.slice(2, 4)),
    Object.freeze(bits.slice(4, 6)),
  ]);
  return Object.freeze({
    gate: Number(gate),
    bits,
    lowerTrigram: lower,
    upperTrigram: upper,
    digrams,
    topology: 'six-ordered-binary-positions / two-trigram-coordinate / three-digram-projection',
    nucleotideIdentityAssigned: false,
    phaseIdentityAssigned: false,
  });
}

export function structuralNeuralVector(address) {
  const topology = gateStructuralTopology(address.gate);
  const activeLine = Array.from({ length: 6 }, (_unused, index) => index + 1 === Number(address.line) ? 1 : 0);
  return Object.freeze([...topology.bits, ...activeLine]);
}

export function resolveConditionState({
  address,
  originAddress,
  dimensionPerspective = null,
  gateArchitecture = null,
  lineArchitecture = null,
  context = {},
} = {}) {
  if (!address) throw new TypeError('address required');
  const color = COLOR_STATES[address.color - 1] ?? null;
  const tone = TONE_STATES[address.tone - 1] ?? null;
  const base = BASE_STATES[address.base - 1] ?? null;
  const measures = Object.freeze({ degree: address.degree, minute: address.minute, second: address.second });
  const explicitAssignment = context.measureAssignment && typeof context.measureAssignment === 'object'
    ? safe(context.measureAssignment)
    : null;
  const topology = gateStructuralTopology(address.gate);
  const stateIdentity = Object.freeze({
    origin: safe(originAddress ?? null),
    current: safe(address),
    topology,
    observerDimension: address.dimension,
    perspective: safe(dimensionPerspective),
  });
  const stateId = contextId('dna-state', stateIdentity);
  return Object.freeze({
    stateId,
    canon: DNA_STATE_CANON,
    originAddress: safe(originAddress ?? null),
    address: safe(address),
    gate: Object.freeze({
      role: 'symbolic-state-position',
      topology,
      architecture: safe(gateArchitecture),
    }),
    line: Object.freeze({
      role: 'behavioral-position-within-the-gate',
      position: address.line,
      canonicalBit: topology.bits[address.line - 1],
      architecture: safe(lineArchitecture),
    }),
    color: Object.freeze({
      role: 'motivation-response-condition',
      state: safe(color),
      chromaticExpression: Object.freeze({
        identity: `color-position:${address.color}`,
        conditionStateId: stateId,
        renderedValue: null,
        status: 'POSITION_RESOLVED; ACTUAL_CHROMATIC_VALUE_REMAINS_RENDERER/CONTEXT_DEPENDENT',
      }),
    }),
    tone: Object.freeze({
      role: 'sensory-perceptual-condition',
      state: safe(tone),
      acousticExpression: Object.freeze({
        identity: `sound-position:${address.tone}`,
        conditionStateId: stateId,
        renderedValue: null,
        status: 'POSITION_RESOLVED; ACTUAL_ACOUSTIC_VALUE_REMAINS_RENDERER/CONTEXT_DEPENDENT',
      }),
    }),
    base: Object.freeze({
      role: 'form-shape-condition',
      state: safe(base),
      formIdentity: `base-form:${address.base}`,
      conditionStateId: stateId,
      exactGeometry: null,
      status: 'FORM_POSITION_RESOLVED; GEOMETRY_NOT_HARD_CODED',
    }),
    measures: Object.freeze({
      available: measures,
      assignment: explicitAssignment,
      assignmentStatus: explicitAssignment ? 'CONTEXT_RESOLVED' : 'SHARED_ACROSS_COLOR_TONE_BASE_UNTIL_CONTEXT_SELECTS',
      fixedColorDegreeToneMinuteBaseSecondTemplate: false,
    }),
    arc: Object.freeze({
      operator: DNA_STATE_CANON.arc,
      preservedFineCoordinate: address.arc,
      colorSide: Object.freeze({ positions: 9, activeColorPosition: address.color, identity: `color-position:${address.color}` }),
      soundSide: Object.freeze({ positions: 9, activeTonePosition: address.tone, identity: `sound-position:${address.tone}` }),
    }),
    boundaries: Object.freeze({
      beginning: Object.freeze({ system: 'zodiac', value: address.zodiac }),
      end: Object.freeze({ system: 'house', value: address.house }),
    }),
    expressionContract: Object.freeze({
      appearance: 'projection-of-resolved-state',
      movement: 'projection-of-resolved-state',
      emotion: 'projection-of-resolved-state',
      instinct: 'projection-of-resolved-state',
      motivation: 'color-condition',
      personality: 'projection-of-resolved-state-and-history',
      skill: 'learned-stabilized-state-history',
      perception: 'machine-native-projection-of-resolved-state',
      language: 'articulation-of-state-not-state-storage',
      behavior: 'projection-of-resolved-state-and-relations',
      color: 'chromatic-projection-of-color-condition',
      sound: 'acoustic-projection-of-tone-condition',
      form: 'projection-of-base-condition',
    }),
    contextPreservation: Object.freeze({
      policy: 'preserve-all-supplied-context-unless-a-rule-explicitly-excludes-it',
      supplied: safe(context),
    }),
  });
}

export function relationshipState({ left, right, context = {} } = {}) {
  return evaluateRelationalAlgebra({ left, right, context });
}

export class DnaStateSubstrate {
  constructor({ dimensionPerspectives = null, gateArchitecture = null } = {}) {
    this.dimensionPerspectives = dimensionPerspectives;
    this.gateArchitecture = gateArchitecture;
    this.relationalAlgebra = new RelationalOperatorRuntime();
  }

  resolve({ address, originAddress, context = {} } = {}) {
    const perspective = this.dimensionPerspectives?.perspective?.(address.dimension) ?? null;
    return resolveConditionState({
      address,
      originAddress,
      dimensionPerspective: perspective,
      gateArchitecture: this.gateArchitecture?.gate?.(address.gate) ?? null,
      lineArchitecture: this.gateArchitecture?.line?.(address.gate, address.line) ?? null,
      context,
    });
  }

  relate(left, right, context = {}) {
    return this.relationalAlgebra.evaluate(left, right, context);
  }

  snapshot() {
    return Object.freeze({
      ...DNA_STATE_CANON,
      relationalAlgebra: this.relationalAlgebra.snapshot(),
    });
  }
}

export default DnaStateSubstrate;
