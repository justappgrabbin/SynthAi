import {
  Primitive,
  Composite,
  ScaleDerivation,
  AddressEvaluator,
  DimensionalEvaluator,
  createLiveScaleOperators,
  fnv1a32,
  stableStringify,
} from '../primitives/index.mjs';
import {
  DIMENSIONS,
  AXES,
  canonicalAddressKey,
  validateCanonicalAddress,
} from '../../vendor/execution-spine-v0.4.0/src/canonical-address.mjs';
import { letterAttribution } from '../../vendor/execution-spine-v0.4.0/src/pure-synthia/state-space/primitive-dimensions.js';
import { StateSpace } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/mesh-state-space.js';
import { safe } from '../util.mjs';

const encoder = new TextEncoder();
const SCALE_OPERATOR_PATH = Object.freeze(['live_bundle', 'live_sequence', 'live_sequence']);

function artifactBytes(artifact = {}) {
  if (artifact?.bytes instanceof Uint8Array) return artifact.bytes;
  if (artifact?.content instanceof Uint8Array) return artifact.content;
  if (typeof artifact?.content === 'string') return encoder.encode(artifact.content);
  if (typeof artifact?.originalContent === 'string') return encoder.encode(artifact.originalContent);
  return encoder.encode(stableStringify(artifact ?? null));
}

function popcount8(value) {
  let v = value & 0xff;
  v -= (v >>> 1) & 0x55;
  v = (v & 0x33) + ((v >>> 2) & 0x33);
  return (v + (v >>> 4)) & 0x0f;
}

function hash128(value) {
  const h = (salt) => BigInt(`0x${fnv1a32(stableStringify([salt, value]))}`);
  return (h('A') << 96n) | (h('B') << 64n) | (h('C') << 32n) | h('D');
}

function take(value, radix) {
  const base = BigInt(radix);
  return { digit: Number(value % base), rest: value / base };
}

export function computationalAddress(value, preferredDimension = null) {
  let n = hash128(value);
  let part;
  part = take(n, 12); const house = part.digit + 1; n = part.rest;
  part = take(n, 12); const zodiac = part.digit + 1; n = part.rest;
  part = take(n, 99); const arcUnit = part.digit + 1; n = part.rest;
  part = take(n, 60); const second = part.digit; n = part.rest;
  part = take(n, 60); const minute = part.digit; n = part.rest;
  part = take(n, 29); const subdivision = part.digit + 1; n = part.rest;
  part = take(n, 5); const band = part.digit + 1; n = part.rest;
  part = take(n, 5); const base = part.digit + 1; n = part.rest;
  part = take(n, 6); const tone = part.digit + 1; n = part.rest;
  part = take(n, 6); const color = part.digit + 1; n = part.rest;
  part = take(n, 6); const line = part.digit + 1; n = part.rest;
  part = take(n, 64); const gate = part.digit + 1; n = part.rest;
  part = take(n, 5); const projectedDimension = DIMENSIONS[part.digit]; n = part.rest;
  part = take(n, 13); const planetary = part.digit + 1;
  const address = {
    planetary,
    dimension: DIMENSIONS.includes(preferredDimension) ? preferredDimension : projectedDimension,
    gate,
    line,
    color,
    tone,
    base,
    degree: { band, subdivision, structure: '5-of-29' },
    minute,
    second,
    arcAxis: { arcUnit, axis: AXES[(arcUnit - 1) % AXES.length] },
    zodiac,
    house,
  };
  validateCanonicalAddress(address);
  return Object.freeze(address);
}

function inferDimension(byte, index, previousByte = null) {
  const character = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : null;
  const attributed = character ? letterAttribution(character) : null;
  if (attributed?.primary) {
    return { dimension: attributed.primary, basis: 'letter-attribution', confidence: 0.8, attribution: attributed };
  }
  const transitions = previousByte == null ? 0 : popcount8(byte ^ previousByte);
  if (byte === 0 || byte === 32 || byte === 9 || byte === 10 || byte === 13) {
    return { dimension: 'Space', basis: 'computational-candidate', confidence: 0.65, transitions };
  }
  if ('{}[]():;,'.includes(character ?? '')) {
    return { dimension: 'Design', basis: 'syntax-candidate', confidence: 0.7, transitions };
  }
  if (transitions >= 5) return { dimension: 'Movement', basis: 'transition-density-candidate', confidence: 0.6, transitions };
  if ((byte & 1) === 1) return { dimension: 'Evolution', basis: 'change-parity-candidate', confidence: 0.55, transitions };
  return { dimension: 'Being', basis: 'stable-state-candidate', confidence: 0.5, transitions };
}

function evaluationScore(report) {
  const values = Object.values(report?.candidate ?? {}).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function summaryOf(primitives) {
  return primitives?.summary ?? {};
}

function ledgerFor({ operands, depth }) {
  return {
    primitivesActivated: operands,
    statesGenerated: 1,
    edgesTraversed: Math.max(1, operands - 1),
    operationsExecuted: 1,
    recursionDepth: depth,
    activeAutomata: 1,
    transitionCount: 1,
  };
}

/** Live descendant of the verified primitive/evaluator implementations. */
export class IntegratedExecutionAddressResolver {
  constructor({ maxMaterializedBytes = 65536, operators = createLiveScaleOperators(), stateSpace = null } = {}) {
    this.maxMaterializedBytes = maxMaterializedBytes;
    this.operators = operators;
    // The actual five-layer x 64-gate state space supplied in the Kimi merge.
    // Every primitive and promoted composite is projected through it.
    this.stateSpace = stateSpace ?? new StateSpace();
    this.addressEvaluator = new AddressEvaluator();
    this.dimensionalEvaluator = new DimensionalEvaluator();
    for (const dimension of DIMENSIONS) {
      this.dimensionalEvaluator.registerCandidate({
        id: dimension,
        macroName: dimension,
        keynote: dimension,
        status: 'candidate-dimension',
      });
    }
    this.sequence = 0;
    this.lastDescent = null;
    this.lastResolution = null;
  }

  projectFiveLevels(gate) {
    const normalizedGate = Number(gate);
    if (!Number.isInteger(normalizedGate) || normalizedGate < 1 || normalizedGate > 64) {
      throw new RangeError('five-level state-space projection requires gate 1..64');
    }
    return Object.freeze(DIMENSIONS.map((level) => {
      const layer = this.stateSpace.dimensions[level];
      const node = this.stateSpace.node(level, normalizedGate);
      return Object.freeze({
        level,
        layerRole: layer.layerRole,
        sequence: layer.sequenceName,
        chart: layer.chart,
        claim: safe(layer.claim),
        gate: node.gate,
        binary: Object.freeze([...node.binary]),
        trigrams: Object.freeze({ ...node.trigrams }),
        content: Object.freeze({
          words: node.content.words.length,
          letters: layer.letterCount(normalizedGate),
          rules: node.content.rules.length,
          sourceIds: Object.freeze(node.content.words.map((word) => word.id)),
        }),
      });
    }));
  }

  inversePath() {
    return Object.freeze([...SCALE_OPERATOR_PATH].reverse().map((operatorId) => {
      const operator = this.operators.get(operatorId);
      if (!operator?.inverseId) throw new Error(`scale operator ${operatorId} has no inverseId`);
      return operator.inverseId;
    }));
  }

  /** Return an Array whose every member is a real, evaluated Primitive. */
  descend(artifact = {}) {
    const bytes = artifactBytes(artifact);
    const materialized = bytes.slice(0, this.maxMaterializedBytes);
    const raw = [];
    const bitIdsByByte = [];
    let ones = 0;
    let xor = 0;
    let sum = 0;
    const sixBitStates = [];
    let buffer = 0;
    let buffered = 0;

    for (let index = 0; index < bytes.length; index++) {
      const byte = bytes[index];
      ones += popcount8(byte);
      xor ^= byte;
      sum = (sum + byte) >>> 0;
      buffer = (buffer << 8) | byte;
      buffered += 8;
      while (buffered >= 6) {
        const shift = buffered - 6;
        if (sixBitStates.length < 4096) sixBitStates.push((buffer >>> shift) & 0x3f);
        buffered -= 6;
        buffer &= buffered ? ((1 << buffered) - 1) : 0;
      }
    }
    if (buffered && sixBitStates.length < 4096) sixBitStates.push((buffer << (6 - buffered)) & 0x3f);

    for (let byteIndex = 0; byteIndex < materialized.length; byteIndex++) {
      const byte = materialized[byteIndex];
      const bitIds = [];
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        const value = (byte >>> (7 - bitIndex)) & 1;
        const id = `bit:${fnv1a32(`${byteIndex}:${bitIndex}:${value}`)}`;
        bitIds.push(id);
        raw.push(new Primitive({
          id,
          identity: `bit:${value}`,
          position: { byteIndex, bitIndex },
          scale: 'bit',
          operations: ['read-bit'],
          evidence: [{ kind: 'bit-observation', value, byteIndex, bitIndex }],
        }));
      }
      bitIdsByByte.push(bitIds);
      raw.push(new Primitive({
        id: `byte:${fnv1a32(`${byteIndex}:${byte}`)}`,
        identity: `byte:${byte}`,
        position: byteIndex,
        dependencies: bitIds,
        scale: 'byte',
        operations: ['read-byte', 'compose-bits'],
        evidence: [{ kind: 'byte-statistics', value: byte, ones: popcount8(byte), xor, runningSum: sum }],
      }));
    }

    if (bytes.length > materialized.length) {
      raw.push(new Primitive({
        id: `byte-window:${fnv1a32(Array.from(bytes).join(','))}`,
        identity: `byte-window:${bytes.length - materialized.length}`,
        position: { from: materialized.length, to: bytes.length - 1 },
        scale: 'byte',
        operations: ['summarize-byte-window'],
        evidence: [{ kind: 'bounded-materialization', omittedBytes: bytes.length - materialized.length }],
      }));
    }
    if (raw.length === 0) {
      const bitId = `bit:${fnv1a32('empty:bit')}`;
      raw.push(new Primitive({
        id: bitId,
        identity: 'bit:empty',
        position: { byteIndex: 0, bitIndex: null },
        scale: 'bit',
        operations: ['observe-empty-input'],
        evidence: [{ kind: 'empty-artifact-sentinel', bitLength: 0 }],
      }));
      raw.push(new Primitive({
        id: `byte:${fnv1a32('empty:byte')}`,
        identity: 'byte:empty',
        position: 0,
        dependencies: [bitId],
        scale: 'byte',
        operations: ['compose-empty-input'],
        evidence: [{ kind: 'empty-artifact-sentinel', byteLength: 0 }],
      }));
    }

    const dimensionDataset = raw.map((primitive, index) => {
      const byteIndex = primitive.scale === 'byte' && Number.isInteger(primitive.position) ? primitive.position : Math.floor(index / 9);
      const byte = materialized[byteIndex] ?? 0;
      const inferred = inferDimension(byte, byteIndex, byteIndex ? materialized[byteIndex - 1] : null);
      return { index: DIMENSIONS.indexOf(inferred.dimension), expectedDimension: inferred.dimension };
    });
    const dimensionEvaluation = this.dimensionalEvaluator.evaluateH4(dimensionDataset, [], []);

    const candidateAddressFn = (primitive) => {
      const byteIndex = primitive.scale === 'byte' && Number.isInteger(primitive.position)
        ? primitive.position
        : Number(primitive.position?.byteIndex ?? 0);
      const inferred = inferDimension(materialized[byteIndex] ?? 0, byteIndex, byteIndex ? materialized[byteIndex - 1] : null);
      return computationalAddress({ id: primitive.id, identity: primitive.identity, position: primitive.position }, inferred.dimension);
    };
    const queries = raw.map((primitive) => ({ ...primitive, expected: [primitive.id] }));
    const compositions = raw.length ? [{ inputs: raw.slice(0, Math.min(8, raw.length)), expected: { kind: 'addressed-bundle' } }] : [];
    const addressEvaluation = this.addressEvaluator.evaluateH3(raw, candidateAddressFn, queries, compositions);
    const addressScore = evaluationScore(addressEvaluation);

    const evaluated = raw.map((primitive) => {
      const byteIndex = primitive.scale === 'byte' && Number.isInteger(primitive.position)
        ? primitive.position
        : Number(primitive.position?.byteIndex ?? 0);
      const inferred = inferDimension(materialized[byteIndex] ?? 0, byteIndex, byteIndex ? materialized[byteIndex - 1] : null);
      const address = candidateAddressFn(primitive);
      return new Primitive({
        id: primitive.id,
        identity: primitive.identity,
        contrast: primitive.contrast,
        position: primitive.position,
        operations: primitive.operations,
        dependencies: primitive.dependencies,
        scale: primitive.scale,
        candidateDimension: inferred.dimension,
        candidateAddress: Object.freeze({
          address,
          fiveLevelProjection: this.projectFiveLevels(address.gate),
          score: addressScore,
          status: 'computational-coordinate-candidate',
          intrinsicSemanticClaim: false,
        }),
        evidence: [
          ...primitive.evidence,
          { kind: 'dimension-evaluation', inferred, evaluation: dimensionEvaluation.candidate },
          { kind: 'address-evaluation', score: addressScore, candidate: addressEvaluation.candidate },
        ],
      });
    });

    const bitLength = bytes.length * 8;
    const summary = Object.freeze({
      byteLength: bytes.length,
      bitLength,
      ones,
      zeros: bitLength - ones,
      parity: ones & 1,
      byteXor: xor >>> 0,
      byteSum: sum >>> 0,
      sixBitStateCount: Math.ceil(bitLength / 6),
      sixBitStates: Object.freeze(sixBitStates),
      primitiveHash: fnv1a32(bytes.length ? Array.from(bytes).join(',') : ''),
      materializedBytes: materialized.length,
      truncated: materialized.length !== bytes.length,
      inversePath: this.inversePath(),
      evaluation: Object.freeze({ address: addressEvaluation, dimension: dimensionEvaluation }),
    });
    Object.defineProperty(evaluated, 'summary', { value: summary, enumerable: false });
    Object.freeze(evaluated);
    this.lastDescent = evaluated;
    return evaluated;
  }

  resolve({ artifact = {}, execution = null, decomposition = null } = {}) {
    const primitives = decomposition ?? this.descend(artifact);
    if (!Array.isArray(primitives) || !primitives.every((primitive) => primitive instanceof Primitive)) {
      throw new TypeError('resolve requires the Primitive[] returned by descend()');
    }
    const bytePrimitives = primitives.filter((primitive) => primitive.scale === 'byte');
    const bitPrimitives = primitives.filter((primitive) => primitive.scale === 'bit');
    let operands = bytePrimitives.length ? bytePrimitives : bitPrimitives;
    const ladder = [Object.freeze({
      scale: 'bit',
      primitives: Object.freeze(bitPrimitives),
      derivation: null,
    }), Object.freeze({
      scale: 'byte',
      primitives: Object.freeze(bytePrimitives),
      derivation: null,
      dependencies: Object.freeze(bitPrimitives.map((primitive) => primitive.id)),
    })];

    const targets = ['structure', 'artifact', 'automaton'];
    const operatorIds = SCALE_OPERATOR_PATH;
    let top = null;
    for (let depth = 0; depth < targets.length; depth++) {
      const scale = targets[depth];
      const operator = this.operators.get(operatorIds[depth]);
      const context = {
        sourceScale: operands[0]?.scale ?? targets[Math.max(0, depth - 1)],
        targetScale: scale,
        artifactKind: artifact?.type ?? artifact?.kind ?? null,
        inverseId: operator.inverseId,
      };
      const representation = operator.apply(operands, context);
      const compositeId = `${scale}:${fnv1a32(stableStringify({ representation, operands: operands.map((operand) => operand.id) }))}`;
      const derivationId = `scale-derivation:${++this.sequence}`;
      const composite = new Composite({
        id: compositeId,
        scale,
        children: operands.map((operand) => operand.id),
        operatorId: operator.id,
        representation,
        context: { ...context, inversePath: summaryOf(primitives).inversePath },
        derivationId,
      });
      const derivation = new ScaleDerivation({
        id: derivationId,
        engineVersion: 'synthia-integrated.0.5.1',
        grammarVersion: 'scale-ladder.1',
        operatorVersion: 'live-operators.1',
        input: { scale: context.sourceScale, operandIds: operands.map((operand) => operand.id) },
        context,
        steps: [{ operatorId: operator.id, inverseId: operator.inverseId, from: context.sourceScale, to: scale }],
        output: { compositeId, scale, representation },
        ledger: ledgerFor({ operands: operands.length, depth: depth + 1 }),
      });
      const dominantDimension = operands.reduce((counts, operand) => {
        const dimension = operand.candidateDimension ?? 'Being';
        counts[dimension] = (counts[dimension] ?? 0) + 1;
        return counts;
      }, {});
      const candidateDimension = Object.entries(dominantDimension).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'Being';
      const promotedAddress = computationalAddress({ compositeId, derivationHash: derivation.hash }, candidateDimension);
      const promotedPrimitive = new Primitive({
        id: `promoted:${composite.id}`,
        identity: `composite:${composite.id}`,
        position: depth,
        operations: [operator.id],
        dependencies: [...composite.children],
        scale,
        candidateDimension,
        candidateAddress: Object.freeze({
          address: promotedAddress,
          fiveLevelProjection: this.projectFiveLevels(promotedAddress.gate),
          score: 1,
          status: 'derived-composite-coordinate',
          intrinsicSemanticClaim: false,
        }),
        evidence: [{ kind: 'scale-derivation', derivationId, derivationHash: derivation.hash, inverseId: operator.inverseId }],
      });
      ladder.push(Object.freeze({
        scale,
        composite,
        primitive: promotedPrimitive,
        derivation,
        fiveLevelProjection: promotedPrimitive.candidateAddress.fiveLevelProjection,
      }));
      top = composite;
      operands = [promotedPrimitive];
    }

    const executionEvidence = execution ? {
      ok: Boolean(execution.ok),
      path: execution.path ?? null,
      strategy: execution.strategy ?? null,
      kind: execution.kind ?? artifact?.type ?? null,
      error: execution.error ?? execution.result?.error ?? null,
    } : null;
    const topPrimitive = ladder.at(-1).primitive;
    const address = computationalAddress({
      top: top.id,
      derivationHash: ladder.at(-1).derivation.hash,
      primitiveHash: summaryOf(primitives).primitiveHash,
      execution: executionEvidence,
    }, topPrimitive.candidateDimension);
    const result = Object.freeze({
      address,
      key: canonicalAddressKey(address),
      fiveLevelProjection: this.projectFiveLevels(address.gate),
      scaleLadder: Object.freeze(ladder),
      top,
      topPrimitive,
      derivation: Object.freeze({
        basis: execution ? 'scale-ladder-and-execution-evidence' : 'scale-ladder-pre-execution',
        status: 'computational-coordinate',
        intrinsicSemanticClaim: false,
        primitiveHash: summaryOf(primitives).primitiveHash,
        inversePath: summaryOf(primitives).inversePath,
        topDerivationHash: ladder.at(-1).derivation.hash,
        execution: safe(executionEvidence),
      }),
    });
    this.lastResolution = result;
    return result;
  }

  featureVector(resolution) {
    const top = resolution?.topPrimitive;
    const summary = summaryOf(this.lastDescent);
    const text = `${top?.identity ?? ''}:${resolution?.top?.representation?.artifactKind ?? ''}`;
    const levels = resolution?.fiveLevelProjection ?? this.projectFiveLevels(resolution?.address?.gate ?? 1);
    return Object.freeze([
      `dimension:${top?.candidateDimension ?? 'Being'}`,
      `scale:${top?.scale ?? 'automaton'}`,
      `parity:${summary.parity ?? 0}`,
      `density:${summary.bitLength ? Math.round((summary.ones / summary.bitLength) * 4) : 0}`,
      `signature:${fnv1a32(text) % 16}`,
      ...levels.map((level) => `level:${level.level}:${level.layerRole}`),
    ]);
  }
}

export default IntegratedExecutionAddressResolver;
