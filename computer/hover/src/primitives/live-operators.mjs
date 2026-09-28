import { ScaleOperator, fnv1a32, stableStringify } from './core.js';

export const LIVE_SCALE_ORDER = Object.freeze(['bit', 'byte', 'structure', 'artifact', 'automaton']);

function representation(operator, operands, context = {}) {
  return Object.freeze({
    operator,
    members: Object.freeze(operands.map((operand) => operand.id)),
    identity: fnv1a32(stableStringify(operands.map((operand) => operand.identity ?? operand.id))),
    sourceScale: context.sourceScale ?? operands[0]?.scale ?? null,
    targetScale: context.targetScale ?? null,
    artifactKind: context.artifactKind ?? null,
  });
}

const acceptsAddressable = (operands) => operands.length > 0
  && operands.every((operand) => operand && typeof operand.id === 'string');

export function createLiveScaleOperators() {
  const operators = new Map();
  operators.set('live_bundle', new ScaleOperator({
    id: 'live_bundle',
    arity: 'variadic',
    accepts: acceptsAddressable,
    transform: (operands, context) => representation('live_bundle', operands, context),
    inverseId: 'live_unbundle',
    scales: LIVE_SCALE_ORDER,
    invariants: ['identity', 'order', 'provenance'],
    evidence: ['promoted from verified ScaleOperator implementation'],
  }));
  operators.set('live_sequence', new ScaleOperator({
    id: 'live_sequence',
    arity: 1,
    accepts: (operands, context) => acceptsAddressable(operands) && context.transferEligible !== false,
    transform: (operands, context) => representation('live_sequence', operands, context),
    positionalRule: 'preserve-source-order',
    inverseId: 'live_desequence',
    scales: LIVE_SCALE_ORDER,
    invariants: ['identity', 'sequence', 'provenance'],
    evidence: ['live scale-ladder operator'],
  }));
  return operators;
}
