import {
  KING_WEN_TO_FUXI_DECIMAL,
  gateBits,
} from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';
import { safe } from '../util.mjs';

export const MOVEMENT_REPRESENTATIONS = Object.freeze(['binary', 'decimal', 'hex']);

export const MOVEMENT_TRANSPORT_CANON = Object.freeze({
  model: 'reversible-representation-transport-v1',
  order: MOVEMENT_REPRESENTATIONS,
  binaryBitOrder: 'most-significant-bit-first',
  gateBitOrder: 'line-1-first-least-significant-bit',
  preservesNumericIdentity: true,
  directSkipConversion: false,
  appendOnlyHistory: true,
});

function assertRepresentation(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (!MOVEMENT_REPRESENTATIONS.includes(normalized)) {
    throw new RangeError(`unknown movement representation: ${value}`);
  }
  return normalized;
}

function assertUnsignedInteger(value) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new RangeError(`movement transport requires a non-negative safe integer, got ${value}`);
  }
  return numeric;
}

function normalizeBinaryString(value) {
  const text = String(value).replace(/^0b/i, '').replaceAll('_', '').trim();
  if (!/^[01]+$/.test(text)) throw new RangeError(`invalid binary value: ${value}`);
  return text;
}

function normalizeHexString(value) {
  const text = String(value).replace(/^0x/i, '').replaceAll('_', '').trim();
  if (!/^[0-9a-f]+$/i.test(text)) throw new RangeError(`invalid hexadecimal value: ${value}`);
  return text.toUpperCase();
}

export function decodeMovementValue(value, representation) {
  const from = assertRepresentation(representation);
  if (from === 'decimal') return assertUnsignedInteger(value);
  if (from === 'binary') return Number.parseInt(normalizeBinaryString(value), 2);
  return Number.parseInt(normalizeHexString(value), 16);
}

export function encodeMovementValue(value, representation, { binaryWidth = 1, hexWidth = 1 } = {}) {
  const numeric = assertUnsignedInteger(value);
  const to = assertRepresentation(representation);
  if (to === 'decimal') return numeric;
  if (to === 'binary') return numeric.toString(2).padStart(Math.max(1, Number(binaryWidth) || 1), '0');
  return numeric.toString(16).toUpperCase().padStart(Math.max(1, Number(hexWidth) || 1), '0');
}

export function movementPath(from, to) {
  const start = assertRepresentation(from);
  const finish = assertRepresentation(to);
  const startIndex = MOVEMENT_REPRESENTATIONS.indexOf(start);
  const endIndex = MOVEMENT_REPRESENTATIONS.indexOf(finish);
  if (startIndex === endIndex) return Object.freeze([start]);
  const step = startIndex < endIndex ? 1 : -1;
  const path = [];
  for (let index = startIndex; ; index += step) {
    path.push(MOVEMENT_REPRESENTATIONS[index]);
    if (index === endIndex) break;
  }
  return Object.freeze(path);
}

function representationWidths(numeric, binaryWidth = null, hexWidth = null) {
  const bits = Math.max(1, numeric.toString(2).length, Number(binaryWidth) || 0);
  const hex = Math.max(1, Math.ceil(bits / 4), Number(hexWidth) || 0);
  return Object.freeze({ binaryWidth: bits, hexWidth: hex });
}

function representationRecord(numeric, representation, widths) {
  return Object.freeze({
    representation,
    value: encodeMovementValue(numeric, representation, widths),
    numericIdentity: numeric,
  });
}

export function transportMovementValue({
  value,
  from = 'binary',
  to = 'hex',
  binaryWidth = null,
  hexWidth = null,
  sourceStateId = null,
  context = {},
} = {}) {
  const start = assertRepresentation(from);
  const finish = assertRepresentation(to);
  const numeric = decodeMovementValue(value, start);
  const widths = representationWidths(numeric, binaryWidth, hexWidth);
  const path = movementPath(start, finish);
  const states = path.map((representation) => representationRecord(numeric, representation, widths));
  const steps = states.slice(1).map((state, index) => Object.freeze({
    from: states[index],
    to: state,
    function: `${states[index].representation}->${state.representation}`,
    numericIdentityPreserved: states[index].numericIdentity === state.numericIdentity,
  }));
  const roundTrip = decodeMovementValue(states.at(-1).value, finish);
  return Object.freeze({
    sourceStateId,
    from: start,
    to: finish,
    direction: MOVEMENT_REPRESENTATIONS.indexOf(start) <= MOVEMENT_REPRESENTATIONS.indexOf(finish) ? 'up' : 'down',
    path,
    states: Object.freeze(states),
    steps: Object.freeze(steps),
    input: states[0],
    output: states.at(-1),
    numericIdentity: numeric,
    identityPreserved: states.every((state) => state.numericIdentity === numeric),
    roundTripPreserved: roundTrip === numeric,
    context: safe(context),
  });
}

export function gateMovementTopology(gate) {
  const normalizedGate = Number(gate);
  if (!Number.isInteger(normalizedGate) || normalizedGate < 1 || normalizedGate > 64) {
    throw new RangeError(`gate must be 1-64, got ${gate}`);
  }
  const bitsLine1First = Object.freeze(gateBits(normalizedGate).map(Number));
  const decimal = Number(KING_WEN_TO_FUXI_DECIMAL[normalizedGate]);
  const binary = bitsLine1First.slice().reverse().join('');
  const lineOrderBinary = bitsLine1First.join('');
  const hex = decimal.toString(16).toUpperCase().padStart(2, '0');
  return Object.freeze({
    gate: normalizedGate,
    numericIdentity: decimal,
    bitsLine1First,
    binary,
    lineOrderBinary,
    decimal,
    hex,
  });
}

export function transportGateMovement(gate, {
  direction = 'up',
  from = null,
  to = null,
  sourceStateId = null,
  context = {},
} = {}) {
  const topology = gateMovementTopology(gate);
  const resolvedFrom = from ?? (direction === 'down' ? 'hex' : 'binary');
  const resolvedTo = to ?? (direction === 'down' ? 'binary' : 'hex');
  const sourceValue = resolvedFrom === 'binary'
    ? topology.binary
    : resolvedFrom === 'decimal'
      ? topology.decimal
      : topology.hex;
  const transport = transportMovementValue({
    value: sourceValue,
    from: resolvedFrom,
    to: resolvedTo,
    binaryWidth: 6,
    hexWidth: 2,
    sourceStateId,
    context,
  });
  return Object.freeze({
    ...transport,
    gate: topology.gate,
    topology,
    gateIdentityPreserved: transport.numericIdentity === topology.numericIdentity,
  });
}

export class MovementTransportRuntime {
  constructor({ maxHistory = 1024 } = {}) {
    this.maxHistory = maxHistory;
    this.history = [];
  }

  transportGate(gate, options = {}) {
    const result = transportGateMovement(gate, options);
    const event = Object.freeze({
      id: `movement-transport:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      ...result,
    });
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    return event;
  }

  transport(value, options = {}) {
    const result = transportMovementValue({ value, ...options });
    const event = Object.freeze({
      id: `movement-transport:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      ...result,
    });
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    return event;
  }

  latest() {
    return this.history.at(-1) ?? null;
  }

  snapshot() {
    return Object.freeze({
      canon: MOVEMENT_TRANSPORT_CANON,
      events: this.history.length,
      latest: safe(this.latest()),
    });
  }
}

export default MovementTransportRuntime;
