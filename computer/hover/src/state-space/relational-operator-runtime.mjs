import { CANONICAL_CHANNELS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';
import { gateBits } from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';

const pairKey = (a, b) => `${Math.min(Number(a), Number(b))}-${Math.max(Number(a), Number(b))}`;
const canonicalChannelKeys = new Set(CANONICAL_CHANNELS.map(([a, b]) => pairKey(a, b)));

export const BOOLEAN_RELATION_OPERATORS = Object.freeze([
  Object.freeze({ id: 0, key: 'FALSE', expression: '0', directional: false, truth: Object.freeze([0, 0, 0, 0]) }),
  Object.freeze({ id: 1, key: 'AND', expression: 'A & B', directional: false, truth: Object.freeze([0, 0, 0, 1]) }),
  Object.freeze({ id: 2, key: 'A_AND_NOT_B', expression: 'A & !B', directional: true, truth: Object.freeze([0, 0, 1, 0]) }),
  Object.freeze({ id: 3, key: 'A', expression: 'A', directional: true, truth: Object.freeze([0, 0, 1, 1]) }),
  Object.freeze({ id: 4, key: 'NOT_A_AND_B', expression: '!A & B', directional: true, truth: Object.freeze([0, 1, 0, 0]) }),
  Object.freeze({ id: 5, key: 'B', expression: 'B', directional: true, truth: Object.freeze([0, 1, 0, 1]) }),
  Object.freeze({ id: 6, key: 'XOR', expression: 'A ^ B', directional: false, truth: Object.freeze([0, 1, 1, 0]) }),
  Object.freeze({ id: 7, key: 'OR', expression: 'A | B', directional: false, truth: Object.freeze([0, 1, 1, 1]) }),
  Object.freeze({ id: 8, key: 'NOR', expression: '!(A | B)', directional: false, truth: Object.freeze([1, 0, 0, 0]) }),
  Object.freeze({ id: 9, key: 'XNOR', expression: 'A === B', directional: false, truth: Object.freeze([1, 0, 0, 1]) }),
  Object.freeze({ id: 10, key: 'NOT_B', expression: '!B', directional: true, truth: Object.freeze([1, 0, 1, 0]) }),
  Object.freeze({ id: 11, key: 'A_OR_NOT_B', expression: 'A | !B', directional: true, truth: Object.freeze([1, 0, 1, 1]) }),
  Object.freeze({ id: 12, key: 'NOT_A', expression: '!A', directional: true, truth: Object.freeze([1, 1, 0, 0]) }),
  Object.freeze({ id: 13, key: 'NOT_A_OR_B', expression: '!A | B', directional: true, truth: Object.freeze([1, 1, 0, 1]) }),
  Object.freeze({ id: 14, key: 'NAND', expression: '!(A & B)', directional: false, truth: Object.freeze([1, 1, 1, 0]) }),
  Object.freeze({ id: 15, key: 'TRUE', expression: '1', directional: false, truth: Object.freeze([1, 1, 1, 1]) }),
]);

export const RELATIONAL_ALGEBRA_CANON = Object.freeze({
  version: '16-boolean-operator-relational-algebra-v1',
  operatorCount: 16,
  gateVectorWidth: 6,
  endpointsRemainDistinct: true,
  relationshipCreatesThirdState: true,
  intensityCoefficientAssigned: false,
  directionCollapsedToScalar: false,
  canonicalChannelOperator: 'AND',
  channelRule: 'canonical endpoint pair + both endpoint states present',
  neuralInputRule: 'structural bits only; no developer-chosen relational weights',
});

function relationId(prefix, value) {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

function bit(value) {
  return Number(value) ? 1 : 0;
}

export function applyBooleanRelationOperator(operatorId, a, b) {
  const A = bit(a);
  const B = bit(b);
  switch (Number(operatorId)) {
    case 0: return 0;
    case 1: return A & B;
    case 2: return A & (1 - B);
    case 3: return A;
    case 4: return (1 - A) & B;
    case 5: return B;
    case 6: return A ^ B;
    case 7: return A | B;
    case 8: return 1 - (A | B);
    case 9: return Number(A === B);
    case 10: return 1 - B;
    case 11: return A | (1 - B);
    case 12: return 1 - A;
    case 13: return (1 - A) | B;
    case 14: return 1 - (A & B);
    case 15: return 1;
    default: throw new RangeError(`unknown Boolean relation operator: ${operatorId}`);
  }
}

function oneHot(value, count) {
  const target = Number(value);
  return Object.freeze(Array.from({ length: count }, (_unused, index) => index + 1 === target ? 1 : 0));
}

function operatorResult(spec, leftBits, rightBits) {
  const bits = Object.freeze(leftBits.map((left, index) => applyBooleanRelationOperator(spec.id, left, rightBits[index])));
  return Object.freeze({
    id: spec.id,
    key: spec.key,
    expression: spec.expression,
    directional: spec.directional,
    truthTable00_01_10_11: spec.truth,
    bits,
    bitString: bits.join(''),
    activePositions: Object.freeze(bits.flatMap((value, index) => value ? [index + 1] : [])),
    activeCount: bits.reduce((sum, value) => sum + value, 0),
  });
}

function endpointStateId(endpoint) {
  return endpoint?.resolvedState?.stateId ?? endpoint?.stateId ?? endpoint?.id ?? null;
}

function endpointPerceptualState(endpoint) {
  return Object.freeze({
    stateId: endpointStateId(endpoint),
    address: safe(endpoint?.address ?? null),
    color: safe(endpoint?.resolvedState?.color ?? endpoint?.sensoryExpression?.color ?? null),
    sound: safe(endpoint?.resolvedState?.tone ?? endpoint?.sensoryExpression?.sound ?? null),
    form: safe(endpoint?.resolvedState?.base ?? endpoint?.sensoryExpression?.shape ?? null),
    phenotype: safe(endpoint?.phenotype ?? endpoint?.translation?.phenotype ?? null),
  });
}

export function evaluateRelationalAlgebra({ left, right, context = {} } = {}) {
  if (!left?.address || !right?.address) throw new TypeError('left and right resolved states required');
  const leftTopology = Object.freeze({ gate: Number(left.address.gate), bits: Object.freeze(gateBits(Number(left.address.gate)).map(Number)) });
  const rightTopology = Object.freeze({ gate: Number(right.address.gate), bits: Object.freeze(gateBits(Number(right.address.gate)).map(Number)) });
  const operatorAlphabet = Object.freeze(BOOLEAN_RELATION_OPERATORS.map((spec) => operatorResult(spec, leftTopology.bits, rightTopology.bits)));
  const byId = Object.freeze(Object.fromEntries(operatorAlphabet.map((entry) => [entry.id, entry])));
  const byKey = Object.freeze(Object.fromEntries(operatorAlphabet.map((entry) => [entry.key, entry])));
  const channelId = pairKey(left.address.gate, right.address.gate);
  const canonicalChannel = canonicalChannelKeys.has(channelId);

  const identitySeed = Object.freeze({
    leftStateId: endpointStateId(left),
    rightStateId: endpointStateId(right),
    leftAddress: safe(left.address),
    rightAddress: safe(right.address),
    operatorBitStrings: Object.freeze(operatorAlphabet.map((entry) => entry.bitString)),
    context: safe(context),
  });
  const relationshipId = relationId('relational-state', identitySeed);

  const relationshipNeuralVector = Object.freeze([
    ...leftTopology.bits,
    ...rightTopology.bits,
    ...operatorAlphabet.flatMap((entry) => entry.bits),
    ...oneHot(left.address.line, 6),
    ...oneHot(right.address.line, 6),
    canonicalChannel ? 1 : 0,
  ]);

  const directionalStructure = Object.freeze({
    leftWithoutRight: byId[2].bits,
    rightWithoutLeft: byId[4].bits,
    leftProjection: byId[3].bits,
    rightProjection: byId[5].bits,
    notRight: byId[10].bits,
    notLeft: byId[12].bits,
    collapsedDirection: null,
    status: 'DIRECTIONAL_OPERATORS_PRESERVED; NO_SCALAR_DIRECTION_INVENTED',
  });

  const perceptualField = Object.freeze({
    machineNative: true,
    relationId: relationshipId,
    left: endpointPerceptualState(left),
    right: endpointPerceptualState(right),
    chromatic: Object.freeze({
      mode: 'juxtaposed-endpoint-color-conditions',
      leftPosition: Number(left.address.color),
      rightPosition: Number(right.address.color),
      renderedValue: null,
    }),
    acoustic: Object.freeze({
      mode: 'juxtaposed-endpoint-tone-conditions',
      leftPosition: Number(left.address.tone),
      rightPosition: Number(right.address.tone),
      renderedValue: null,
    }),
    form: Object.freeze({
      mode: 'juxtaposed-endpoint-base-form-conditions',
      leftPosition: Number(left.address.base),
      rightPosition: Number(right.address.base),
      exactGeometry: null,
    }),
    operatorFingerprint: Object.freeze(operatorAlphabet.map((entry) => entry.bitString)),
  });

  return Object.freeze({
    relationshipId,
    canon: RELATIONAL_ALGEBRA_CANON,
    type: 'emergent-relational-condition',
    endpointsPreserved: true,
    leftStateId: identitySeed.leftStateId,
    rightStateId: identitySeed.rightStateId,
    endpoints: Object.freeze({
      left: Object.freeze({ stateId: identitySeed.leftStateId, address: safe(left.address) }),
      right: Object.freeze({ stateId: identitySeed.rightStateId, address: safe(right.address) }),
    }),
    gates: Object.freeze([Number(left.address.gate), Number(right.address.gate)]),
    operatorAlphabet,
    byId,
    byKey,
    xorTopology: byId[6].bits,
    channel: Object.freeze({
      channelId,
      canonical: canonicalChannel,
      operatorId: 1,
      operator: 'AND',
      endpointPresence: Object.freeze([1, 1]),
      endpointPresenceAND: 1,
      gateVectorAND: byId[1].bits,
      active: canonicalChannel,
    }),
    klein: Object.freeze({
      relation: Object.freeze({
        identity: relationId('klein-relation', identitySeed),
        operatorSignature: Object.freeze(operatorAlphabet.map((entry) => Object.freeze({ id: entry.id, key: entry.key, bits: entry.bits }))),
      }),
      intensity: Object.freeze({ value: null, status: 'NO_EXECUTABLE_INTENSITY_RULE_SUPPLIED' }),
      direction: directionalStructure,
      context: safe(context),
    }),
    perceptualField,
    structuralVector: Object.freeze([...leftTopology.bits, ...byId[6].bits]),
    relationshipNeuralVector,
    context: safe(context),
  });
}

export class RelationalOperatorRuntime {
  constructor({ maxHistory = 1024 } = {}) {
    this.maxHistory = maxHistory;
    this.history = [];
  }

  evaluate(left, right, context = {}) {
    const relationship = evaluateRelationalAlgebra({ left, right, context });
    const event = Object.freeze({
      eventId: `relational-operator-event:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      relationship,
    });
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    return relationship;
  }

  latest() {
    return this.history.at(-1)?.relationship ?? null;
  }

  snapshot() {
    return Object.freeze({
      canon: RELATIONAL_ALGEBRA_CANON,
      operatorCount: BOOLEAN_RELATION_OPERATORS.length,
      evaluations: this.history.length,
      latest: safe(this.latest()),
    });
  }
}

export default RelationalOperatorRuntime;
