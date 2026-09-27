import { DIMENSIONS } from '../../vendor/execution-spine-v0.4.0/src/canonical-address.mjs';
import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';
import { atomicCoordinateSemantics } from './atomic-coordinate-semantics.mjs';

export const AGENT_ADDRESS_LAYER_ORDER = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
]);

// Base completes the current semantic tier. Degree, minute, and second then
// resolve that tier through the same relational grammar at a finer scale. They
// are simultaneous recursive coordinates rather than ordinary fields appended
// below Base in one flat parent/child chain.
export const AGENT_SEMANTIC_SPINE_ORDER = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
]);

export const AGENT_ATOMIC_COORDINATE_ORDER = Object.freeze([
  'degree', 'minute', 'second', 'arc',
]);

export const AGENT_REFERENCE_FRAME_ORDER = Object.freeze(['zodiac', 'house']);

export const AGENT_FINE_NODE_SCHEMA = Object.freeze([
  'line', 'color', 'tone', 'base', 'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
]);

export const AGENT_ADDRESS_RANGES = Object.freeze({
  planetary: Object.freeze([1, 13]),
  gate: Object.freeze([1, 64]),
  line: Object.freeze([1, 6]),
  color: Object.freeze([1, 6]),
  tone: Object.freeze([1, 6]),
  base: Object.freeze([1, 5]),
  degree: Object.freeze([0, 31]),
  minute: Object.freeze([0, 59]),
  second: Object.freeze([0, 59]),
  arc: Object.freeze([0, 99]),
  zodiac: Object.freeze([1, 12]),
  house: Object.freeze([1, 12]),
});

const numericHash = (value) => Number.parseInt(fnv1a32(stableStringify(value)), 16) >>> 0;

function boundedInteger(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  const selected = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(selected)));
}

function legacyDegreeToExact(value, fallback) {
  if (Number.isFinite(Number(value))) return { value: Number(value), compatibility: null };
  if (!value || typeof value !== 'object') return { value: fallback, compatibility: null };
  if (Number.isFinite(Number(value.value))) {
    return {
      value: Number(value.value),
      compatibility: Object.freeze({ field: 'degree', source: safe(value), conversion: 'object.value-to-agent-degree', lossless: true }),
    };
  }
  if (Number.isFinite(Number(value.band)) && Number.isFinite(Number(value.subdivision))) {
    const band = boundedInteger(value.band, 1, 1, 5);
    const subdivision = boundedInteger(value.subdivision, 1, 1, 29);
    const ordinal = (band - 1) * 29 + (subdivision - 1);
    return {
      value: Math.round((ordinal / 144) * 31),
      compatibility: Object.freeze({
        field: 'degree',
        source: safe(value),
        conversion: 'legacy-5-of-29-projection-to-agent-degree-0-through-31',
        lossless: false,
      }),
    };
  }
  return {
    value: fallback,
    compatibility: Object.freeze({ field: 'degree', source: safe(value), conversion: 'unrecognized-object-fell-back', lossless: false }),
  };
}

function legacyArcToExact(address, fallback) {
  if (Number.isFinite(Number(address.arc))) return { value: Number(address.arc), compatibility: null };
  if (Number.isFinite(Number(address.arcsecond))) {
    return {
      value: Number(address.arcsecond),
      compatibility: Object.freeze({ field: 'arc', source: address.arcsecond, conversion: 'legacy-arcsecond-to-agent-arc', lossless: true }),
    };
  }
  if (Number.isFinite(Number(address.arcAxis?.arcUnit))) {
    return {
      value: Number(address.arcAxis.arcUnit),
      compatibility: Object.freeze({ field: 'arc', source: safe(address.arcAxis), conversion: 'legacy-arcAxis.arcUnit-to-agent-arc', lossless: true }),
    };
  }
  return { value: fallback, compatibility: null };
}

export function validateAgentAddress(address) {
  if (!address || typeof address !== 'object') throw new TypeError('agent address must be an object');
  if (!DIMENSIONS.includes(address.dimension)) throw new RangeError(`dimension must be one of ${DIMENSIONS.join(', ')}`);
  for (const [field, [minimum, maximum]] of Object.entries(AGENT_ADDRESS_RANGES)) {
    const value = address[field];
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new RangeError(`${field} must be an integer ${minimum}..${maximum}, got ${value}`);
    }
  }
  return true;
}

export function normalizeAgentAddressRecord(address = {}, seedSource = null) {
  const seed = numericHash(seedSource ?? address);
  const dimension = DIMENSIONS.includes(address.dimension)
    ? address.dimension
    : DIMENSIONS[(seed >>> 4) % DIMENSIONS.length];
  const degree = legacyDegreeToExact(address.degree, (seed >>> 8) % 32);
  const arc = legacyArcToExact(address, (seed >>> 14) % 100);
  const normalized = Object.freeze({
    planetary: boundedInteger(address.planetary, (seed % 13) + 1, 1, 13),
    dimension,
    gate: boundedInteger(address.gate, ((seed >>> 2) % 64) + 1, 1, 64),
    line: boundedInteger(address.line, ((seed >>> 5) % 6) + 1, 1, 6),
    color: boundedInteger(address.color, ((seed >>> 7) % 6) + 1, 1, 6),
    tone: boundedInteger(address.tone, ((seed >>> 9) % 6) + 1, 1, 6),
    base: boundedInteger(address.base, ((seed >>> 12) % 5) + 1, 1, 5),
    degree: boundedInteger(degree.value, (seed >>> 8) % 32, 0, 31),
    minute: boundedInteger(address.minute, (seed >>> 15) % 60, 0, 59),
    second: boundedInteger(address.second, (seed >>> 18) % 60, 0, 59),
    arc: boundedInteger(arc.value, (seed >>> 14) % 100, 0, 99),
    zodiac: boundedInteger(address.zodiac, ((seed >>> 20) % 12) + 1, 1, 12),
    house: boundedInteger(address.house, ((seed >>> 24) % 12) + 1, 1, 12),
  });
  validateAgentAddress(normalized);
  const conversions = Object.freeze([degree.compatibility, arc.compatibility].filter(Boolean));
  return Object.freeze({
    address: normalized,
    compatibility: Object.freeze({
      convertedLegacyFields: conversions,
      lossless: conversions.every((entry) => entry.lossless !== false),
      authoritativeSchema: 'agent-address-v2',
      preservedOriginal: conversions.length ? safe(address) : null,
    }),
  });
}

export function normalizeAgentAddress(address = {}, seedSource = null) {
  return normalizeAgentAddressRecord(address, seedSource).address;
}

export function mergeAgentAddress(identityAddress = {}, interactionAddress = {}) {
  const merged = { ...identityAddress };
  for (const [field, [minimum, maximum]] of Object.entries(AGENT_ADDRESS_RANGES)) {
    const value = Number(interactionAddress?.[field]);
    if (Number.isFinite(value) && value >= minimum && value <= maximum) merged[field] = Math.trunc(value);
  }
  if (DIMENSIONS.includes(interactionAddress?.dimension)) merged.dimension = interactionAddress.dimension;
  if (!Number.isFinite(Number(interactionAddress?.degree)) && interactionAddress?.degree && typeof interactionAddress.degree === 'object') {
    merged.degree = interactionAddress.degree;
  }
  if (!Number.isFinite(Number(interactionAddress?.arc)) && interactionAddress?.arcAxis && typeof interactionAddress.arcAxis === 'object') {
    merged.arcAxis = interactionAddress.arcAxis;
    delete merged.arc;
  } else if (!Number.isFinite(Number(interactionAddress?.arc)) && Number.isFinite(Number(interactionAddress?.arcsecond))) {
    merged.arcsecond = interactionAddress.arcsecond;
    delete merged.arc;
  }
  return merged;
}

export function agentAddressModulation(address) {
  validateAgentAddress(address);
  return Object.freeze({
    planetary: address.planetary / 13,
    dimension: DIMENSIONS.indexOf(address.dimension) / 4,
    gate: address.gate / 64,
    line: address.line / 6,
    color: address.color / 6,
    tone: address.tone / 6,
    base: address.base / 5,
    degree: address.degree / 31,
    minute: address.minute / 59,
    second: address.second / 59,
    arc: address.arc / 99,
    zodiac: address.zodiac / 12,
    house: address.house / 12,
  });
}

export function agentNestedAddressView(address, { dimensionRules = {} } = {}) {
  validateAgentAddress(address);
  const atomicSemantics = atomicCoordinateSemantics(address, { dimensionRules });
  const semanticSpine = AGENT_SEMANTIC_SPINE_ORDER.map((level, index) => Object.freeze({
    level,
    value: safe(address[level]),
    depth: index,
    parent: index ? AGENT_SEMANTIC_SPINE_ORDER[index - 1] : null,
    semanticTerminal: level === 'base',
  }));
  const lineContext = atomicSemantics.lineContext;
  const atomicCoordinates = AGENT_ATOMIC_COORDINATE_ORDER.map((level, index) => Object.freeze({
    level,
    value: address[level],
    precisionDepth: index,
    recursiveRole: atomicSemantics[level].semanticRole,
    qualitativeSemantics: atomicSemantics[level],
    conditionedBy: level === 'arc' ? 'degree/minute/second-resolved-state' : lineContext,
    relationToBase: 'simultaneous-recursive-resolution-not-flat-semantic-child',
  }));
  const referenceFrames = AGENT_REFERENCE_FRAME_ORDER.map((level) => Object.freeze({
    level,
    value: address[level],
    relationToAddress: 'reference-frame',
  }));
  const coordinateSignature = agentCoordinateSignature(address);
  return Object.freeze({
    order: AGENT_ADDRESS_LAYER_ORDER,
    semanticSpine: Object.freeze(semanticSpine),
    semanticTerminal: 'base',
    atomicLineContext: lineContext,
    atomicSemantics,
    atomicCoordinates: Object.freeze(atomicCoordinates),
    referenceFrames: Object.freeze(referenceFrames),
    coordinateSignature,
    recursion: Object.freeze({
      grammar: 'same-64-gate-relational-grammar-at-every-scale',
      regression: 'degree/minute/second occupy gate roles in a local gate subset; color/tone/base supply their line context',
      progression: 'completed-local-relations-promote-as-a-unit-at-the-next-scale',
      eagerlyMaterializedInfiniteNodes: false,
    }),
    // Compatibility view for callers written before the three-part model was
    // made explicit. It contains the same values and adds no identity layer.
    layers: Object.freeze([...semanticSpine, ...atomicCoordinates, ...referenceFrames]),
    promotedFineNodes: Object.freeze(atomicCoordinates.map((entry) => Object.freeze({
      level: entry.level,
      value: entry.value,
      promotedAs: 'recursively-addressable-coordinate',
      virtual: true,
      childSchema: AGENT_FINE_NODE_SCHEMA,
    }))),
    arc: address.arc,
  });
}

export function agentCoordinateSignature(address) {
  validateAgentAddress(address);
  return [
    `planetary:${address.planetary}`,
    `dimension:${address.dimension}`,
    `gate:${address.gate}`,
    `line:${address.line}`,
    `color:${address.color}`,
    `tone:${address.tone}`,
    `base:${address.base}`,
    `degree:${address.degree}`,
    `minute:${address.minute}`,
    `second:${address.second}`,
    `arc:${address.arc}`,
    `zodiac:${address.zodiac}`,
    `house:${address.house}`,
  ].join('/');
}

export function agentAddressCapacity() {
  const rangeSize = ([minimum, maximum]) => BigInt(maximum - minimum + 1);
  const numericCapacity = Object.values(AGENT_ADDRESS_RANGES)
    .reduce((total, range) => total * rangeSize(range), 1n);
  return Object.freeze({
    finiteSingleLevelCoordinates: numericCapacity.toString(),
    dimensions: DIMENSIONS.length,
    completeSingleLevelAddresses: (numericCapacity * BigInt(DIMENSIONS.length)).toString(),
    recursiveScaleDepth: 'unbounded-by-schema; materialized-on-demand',
    cryptographicHashAdded: false,
  });
}

export function agentFineCoordinates(address) {
  validateAgentAddress(address);
  return Object.freeze({
    degree: address.degree,
    minute: address.minute,
    second: address.second,
    arc: address.arc,
    zodiac: address.zodiac,
    house: address.house,
  });
}

export function executionCompatibilityAddress(address) {
  validateAgentAddress(address);
  const arcUnit = Math.max(1, address.arc);
  return Object.freeze({
    address: Object.freeze({
      ...address,
      arcAxis: Object.freeze({
        arcUnit,
        axis: ['Vertical', 'Horizontal', 'Diagonal'][(arcUnit - 1) % 3],
      }),
    }),
    compatibility: Object.freeze({
      source: 'agent-address-v2',
      target: 'execution-spine-canonical-address-v0.4',
      exactAgentArc: address.arc,
      lossless: address.arc !== 0,
      note: address.arc === 0
        ? 'Execution Spine arcAxis is 1..99; authoritative agent arc 0 is preserved here while the compatibility view uses 1.'
        : null,
    }),
  });
}

export { DIMENSIONS };
