import { RelationalMesh } from '../mesh/relational-mesh.mjs';
import {
  CENTERS as SOURCE_CENTERS,
  CENTER_NAMES,
  channelPartners,
} from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import {
  centerSlug,
} from './sovereign-state-space-runtime.mjs';
import { DIMENSIONS } from './agent-address.mjs';
import { DimensionPerspectiveRegistry } from './dimension-perspective-registry.mjs';
import { safe } from '../util.mjs';

// Every canonical center/gate set is observable from all five dimensions.
// This replaces the earlier provisional one-center -> one-dimension table,
// which was not supported by the supplied Black Book views. The exported old
// name remains as a compatibility alias, but its values are now five-view
// coverage arrays rather than invented exclusive assignments.
export const CENTER_DIMENSION_COVERAGE = Object.freeze(Object.fromEntries(
  CENTER_NAMES.map((center) => [center, Object.freeze([...DIMENSIONS])]),
));
const CENTER_DIMENSION = CENTER_DIMENSION_COVERAGE;

// These anchors are the join of two supplied source views, not an inferred
// assignment of all nine centers:
//   Movement view: crystal/monopole location and grouped dimensions.
//   Evolution view: each dimension's microcosmic/human expression.
// The other six centers retain canonical gate ownership without an invented
// crystal anchor until the user supplies an attested rule.
export const DIMENSION_CENTER_ANCHORS = Object.freeze({
  Movement: Object.freeze({ center: 'G', microExpression: 'Individuality', component: 'Magnetic Monopole', movementRole: 'Attractor' }),
  Evolution: Object.freeze({ center: 'Head', microExpression: 'The Mind', component: 'Personality Crystal', movementRole: 'Witness' }),
  Being: Object.freeze({ center: 'Ajna', microExpression: 'The Body', component: 'Design Crystal', movementRole: 'Vehicle' }),
  Design: Object.freeze({ center: 'Ajna', microExpression: 'The Ego', component: 'Design Crystal', movementRole: 'Vehicle' }),
  Space: Object.freeze({ center: 'Head', microExpression: 'Personality', component: 'Personality Crystal', movementRole: 'Witness' }),
});

export const CENTER_DIMENSION_RELATION = Object.freeze({
  model: 'canonical-nine-center-gate-ownership-observed-through-five-macro/micro-dimension-views',
  centerDimensionCoverage: CENTER_DIMENSION_COVERAGE,
  sourceDerivedAnchors: DIMENSION_CENTER_ANCHORS,
  centerGateAuthority: 'GateArchitectureProvider/AUTHORITATIVE_GATE_CENTERS',
  movementViewContribution: 'component-location + dimension grouping',
  evolutionViewContribution: 'macro-chain + microcosmic expression + keynote',
  exclusiveCenterDimensionMapping: false,
  unattestedCenterAnchorsInvented: false,
  configurableAtomicGrammar: true,
  differentiationStatus: 'SOURCE_ANCHORS_PRESERVED; FULL_GATE_OWNERSHIP_FROM_CANONICAL_64-GATE_MAP',
});

function meshId(center) {
  return `center:${centerSlug(center)}`;
}

function firstGate(value, fallback = 1) {
  const candidates = [
    value?.gate,
    value?.address?.gate,
    value?.canonicalAddress?.gate,
    value?.state?.ben,
    value?.output?.gate,
    value?.output?.address?.gate,
    value?.result?.gate,
  ];
  const gate = candidates.map(Number).find((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 64);
  return gate ?? fallback;
}

function runnable(id, capabilities, run, address = null) {
  return { id, capabilities, address, run };
}

/**
 * Nine real local meshes. Each center has a context-consuming field plus the
 * Kimi automata and package-module instruments placed there. Center-to-center
 * information follows canonical channel partners and carries all five level
 * projections with it.
 */
export class NineCenterBody {
  constructor({
    runtime,
    resolver,
    federation,
    semanticGenome = null,
    dimensionPerspectives = new DimensionPerspectiveRegistry(),
  } = {}) {
    if (!runtime?.catalog) throw new TypeError('NineCenterBody requires SovereignStateSpaceRuntime');
    if (!resolver?.projectFiveLevels) throw new TypeError('NineCenterBody requires the five-level resolver');
    if (!federation?.transfer) throw new TypeError('NineCenterBody requires MeshFederation');
    if (semanticGenome && typeof semanticGenome.activate !== 'function') throw new TypeError('NineCenterBody semanticGenome must be live');
    if (!dimensionPerspectives?.readFrom || !dimensionPerspectives?.project) {
      throw new TypeError('NineCenterBody requires DimensionPerspectiveRegistry');
    }
    this.runtime = runtime;
    this.centerGates = runtime.centerGates;
    this.resolver = resolver;
    this.federation = federation;
    this.semanticGenome = semanticGenome;
    this.dimensionPerspectives = dimensionPerspectives;
    this.meshes = new Map();
    this.memory = new Map(CENTER_NAMES.map((center) => [center, []]));
    this.activations = [];
    this.emergentTools = new Map();
    this.emergenceHistory = [];
    this.packageCatalog = runtime.catalog();
  }

  createMeshes() {
    if (this.meshes.size) return this.meshes;
    for (const center of CENTER_NAMES) {
      const mesh = new RelationalMesh({
        id: meshId(center),
        dimension: null,
        address: {
          center,
          gates: [...this.centerGates[center]],
          sourceGateClaims: [...SOURCE_CENTERS[center]],
          status: 'canonical-human-design-center',
          macroMicroRelation: Object.freeze({
            microCenter: center,
            observableFromDimensions: CENTER_DIMENSION_COVERAGE[center],
            model: CENTER_DIMENSION_RELATION.model,
            sourceDerivedAnchorDimensions: Object.freeze(Object.entries(DIMENSION_CENTER_ANCHORS)
              .filter(([, anchor]) => anchor.center === center)
              .map(([dimension]) => dimension)),
            exclusiveDimensionAssignment: false,
          }),
        },
      });
      mesh.register(runnable('center-field', ['consume-context', 'hold-five-level-state', 'coordinate-tools'],
        (payload, context) => this.consume(center, payload, context), {
          center,
          gates: [...this.centerGates[center]],
          sourceGateClaims: [...SOURCE_CENTERS[center]],
        }), { defaultNode: true });

      for (const instrument of this.packageCatalog) {
        const placements = instrument.centers ?? [instrument.center];
        if (!placements.includes(center)) continue;
        mesh.register(runnable(
          instrument.id,
          instrument.capabilities,
          (input, context) => this.runtime.runInstrument(instrument.id, input, context),
          instrument.gate ? { center, gate: instrument.gate, dimension: instrument.dimension ?? null } : { center },
        ));
      }
      if (this.semanticGenome) {
        for (const codon of this.semanticGenome.catalog().filter((entry) => entry.center === center)) {
          mesh.register(runnable(
            codon.id,
            codon.capabilities,
            (input = {}, context = {}) => this.semanticGenome.run({
              ...input,
              operation: input.operation ?? 'activate',
              task: input.task ?? input,
              address: { ...(context.address ?? {}), ...(input.address ?? {}), gate: codon.gate },
            }, {
              ...context,
              personId: input.personId ?? context.personId,
            }),
            { center, gate: codon.gate, scale: 'hexagram-codon', aspects: 12, dyads: 6 },
          ));
          mesh.connect('center-field', codon.id, 'coordinates-hexagram-codon', { center, gate: codon.gate });
          mesh.connect(codon.id, 'center-field', 'returns-embodied-aspect-state', { center, gate: codon.gate });
        }
      }
      this.meshes.set(center, mesh);
    }
    return this.meshes;
  }

  consume(center, payload, context = {}) {
    if (!this.memory.has(center)) throw new Error(`unknown center: ${center}`);
    const gate = firstGate(payload, firstGate(context.address, this.centerGates[center][0]));
    const requestedDimension = payload?.dimension
      ?? payload?.address?.dimension
      ?? context.address?.dimension
      ?? context.relationalContext?.dimension
      ?? 'Being';
    const activeDimension = DIMENSIONS.includes(requestedDimension) ? requestedDimension : 'Being';
    const requestedReferencePoint = payload?.referencePoint
      ?? context.referencePoint
      ?? context.relationalContext?.referencePoint
      ?? activeDimension;
    const referencePoint = DIMENSIONS.includes(requestedReferencePoint) ? requestedReferencePoint : activeDimension;
    const requestedScale = payload?.scale ?? context.scale ?? context.relationalContext?.scale ?? 'micro';
    const scale = ['macro', 'micro'].includes(requestedScale) ? requestedScale : 'micro';
    const dimensionReading = this.dimensionPerspectives.readFrom(activeDimension, { referencePoint, scale });
    const dimensionAnchor = DIMENSION_CENTER_ANCHORS[referencePoint] ?? null;
    const genomeTask = payload?.utterance ?? payload?.message ?? payload?.task ?? {
      type: context.federatedEnvelope?.type ?? context.type ?? 'center-context',
      gate,
      ok: payload?.ok ?? payload?.result?.ok ?? null,
      strategy: payload?.strategy ?? null,
      operation: payload?.operation ?? null,
    };
    const semanticGenomeActivation = this.semanticGenome?.activate(genomeTask, {
      ...context,
      agentId: context.relationalContext?.agentId ?? context.agentId ?? 'synthia',
      personId: context.relationalContext?.personId ?? context.personId ?? 'default-person',
      observerFrame: context.relationalContext?.observerFrame ?? context.observerFrame ?? null,
      address: { ...(context.address ?? {}), gate },
    }) ?? null;
    const semanticGenome = this.semanticGenome?.summarize(semanticGenomeActivation) ?? null;
    const record = Object.freeze({
      id: `center-activation-${this.activations.length + 1}`,
      sequence: this.activations.length + 1,
      center,
      gate,
      sourceMesh: context.federatedEnvelope?.from?.mesh ?? context.sourceMesh ?? null,
      envelopeId: context.federatedEnvelope?.id ?? null,
      type: context.federatedEnvelope?.type ?? context.type ?? 'local-context',
      observerDimension: activeDimension,
      referencePoint,
      dimensionReading: safe(dimensionReading),
      sourceDerivedCenterAnchor: dimensionAnchor?.center === center ? safe(dimensionAnchor) : null,
      fiveLevels: this.resolver.projectFiveLevels(gate),
      scaleLadder: safe(context.relationalContext?.scaleLadder ?? payload?.scaleLadder ?? null),
      semanticGenome: safe(semanticGenome),
      payload: safe(payload),
    });
    this.memory.get(center).push(record);
    this.activations.push(record);
    return Object.freeze({
      integrated: true,
      center,
      gate,
      activationId: record.id,
      observerDimension: activeDimension,
      referencePoint,
      dimensionReading: record.dimensionReading,
      sourceDerivedCenterAnchor: record.sourceDerivedCenterAnchor,
      fiveLevels: record.fiveLevels,
      semanticGenome: record.semanticGenome,
      localMemorySize: this.memory.get(center).length,
    });
  }

  centerForGate(gate) {
    return this.runtime.centersForGate(gate);
  }

  /**
   * Place a validated, governed grown automaton into every applicable center.
   * The placement retains the complete bit-to-automaton scale claim and the
   * five live state-space levels; rollback removes live nodes but not history.
   */
  mountEmergentTool({ id, automaton, spec = {} } = {}) {
    if (!id || typeof automaton?.run !== 'function') throw new TypeError('emergent center tool requires a runnable automaton');
    if (this.emergentTools.has(id)) throw new Error(`emergent tool already mounted in body: ${id}`);
    this.createMeshes();
    const gate = firstGate(spec, 1);
    const centers = this.runtime.centersForGate(gate);
    const nodeId = `grown:${id}`;
    const capabilities = [...new Set(['emergent-tool', ...(spec.capabilities ?? automaton.capabilities ?? [])])];
    const scalePath = Object.freeze(['bit', 'byte', 'structure', 'artifact', 'automaton']);
    for (const center of centers) {
      const mesh = this.meshes.get(center);
      mesh.register(runnable(
        nodeId,
        capabilities,
        (input, context) => automaton.run(input, context),
        {
          center,
          gate,
          dimensions: CENTER_DIMENSION_COVERAGE[center],
          activeDimension: DIMENSIONS.includes(spec.dimension) ? spec.dimension : null,
          exclusiveDimensionAssignment: false,
          scale: 'automaton',
          scalePath,
        },
      ));
      mesh.connect('center-field', nodeId, 'cultivates-emergent-tool', { gate, scalePath });
      mesh.connect(nodeId, 'center-field', 'returns-relational-context', { gate, scalePath });
    }
    const placement = Object.freeze({
      id,
      nodeId,
      gate,
      centers: Object.freeze([...centers]),
      capabilities: Object.freeze(capabilities),
      dimension: spec.dimension ?? null,
      fiveLevels: this.resolver.projectFiveLevels(gate),
      scalePath,
      provenance: Object.freeze({
        origin: 'ToolSynthesizer',
        evidence: Object.freeze([...(spec.evidence ?? [])]),
        primitivePattern: safe(spec.primitivePattern ?? null),
      }),
      status: 'mounted',
      sequence: this.emergenceHistory.length + 1,
    });
    this.emergentTools.set(id, placement);
    this.emergenceHistory.push(placement);
    let undone = false;
    return {
      ...placement,
      undo: () => {
        if (undone) return { unmounted: false, id, reason: 'already_unmounted' };
        for (const center of centers) {
          const mesh = this.meshes.get(center);
          mesh.nodes.delete(nodeId);
          mesh.edges = mesh.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
        }
        this.emergentTools.delete(id);
        const record = Object.freeze({
          ...placement,
          status: 'unmounted',
          sequence: this.emergenceHistory.length + 1,
        });
        this.emergenceHistory.push(record);
        undone = true;
        return { unmounted: true, id, nodeId, centers: [...centers], historySequence: record.sequence };
      },
    };
  }

  targetFor(input = {}, fallbackGate = 1) {
    const explicitId = input.instrumentId
      ?? (input.toolId ? `kimi-tool:${input.toolId}` : null);
    let instrument = explicitId ? this.packageCatalog.find((entry) => entry.id === explicitId) : null;
    if (!instrument) {
      const operationMap = {
        chart: 'human-design-chart',
        predict: 'lawful-prediction',
        lattice: 'lawful-prediction',
        grid: 'lawful-prediction',
        'reading-path': 'lawful-prediction',
        tick: 'state-space-living-loop',
        'living-state': 'state-space-living-loop',
        'verify-episodes': 'state-space-living-loop',
        'five-levels': 'five-level-state-space',
        'knowledge-search': 'state-space-knowledge',
        'knowledge-document': 'state-space-knowledge',
      };
      const id = operationMap[input.operation] ?? 'state-space-browser';
      instrument = this.packageCatalog.find((entry) => entry.id === id);
    }
    const gate = firstGate(input, fallbackGate);
    const center = instrument?.center ?? this.runtime.centersForGate(gate)[0];
    return Object.freeze({
      center,
      mesh: meshId(center),
      node: instrument?.id ?? 'center-field',
      gate,
      instrument: safe(instrument),
    });
  }

  async propagate({ fromCenter, gate, payload, address = null, parentId = null, relationalContext = {} } = {}) {
    const normalizedGate = firstGate({ gate }, 1);
    const sourceMesh = meshId(fromCenter);
    const targetCenters = new Set(this.runtime.centersForGate(normalizedGate));
    for (const partnerGate of channelPartners(normalizedGate)) {
      for (const center of this.runtime.centersForGate(partnerGate)) targetCenters.add(center);
    }
    targetCenters.delete(fromCenter);
    const transfers = [];
    for (const center of targetCenters) {
      transfers.push(await this.federation.transfer({
        from: { mesh: sourceMesh, node: 'center-field' },
        to: { mesh: meshId(center), node: 'center-field' },
        type: 'center-channel-context',
        payload,
        relationalContext: {
          ...relationalContext,
          sourceCenter: fromCenter,
          sourceGate: normalizedGate,
          channelPartners: channelPartners(normalizedGate),
          fiveLevels: this.resolver.projectFiveLevels(normalizedGate),
        },
        address: address ?? { gate: normalizedGate },
        provenance: { source: 'NineCenterBody.propagate', canonicalChannelData: true },
        parentId,
      }));
    }
    return Object.freeze(transfers);
  }

  snapshot() {
    return Object.freeze({
      centers: CENTER_NAMES.length,
      names: CENTER_NAMES,
      macroMicroDimensionRelation: CENTER_DIMENSION_RELATION,
      dimensionPerspectives: this.dimensionPerspectives.snapshot(),
      gates: safe(this.centerGates),
      sourceGateClaims: safe(SOURCE_CENTERS),
      activations: this.activations.length,
      packageInstruments: this.packageCatalog.length,
      semanticGenomeMounted: Boolean(this.semanticGenome),
      semanticGenomeCodonNodes: [...this.meshes.values()].reduce(
        (total, mesh) => total + [...mesh.nodes.keys()].filter((id) => id.startsWith('genome:gate-')).length,
        0,
      ),
      persistentAspectPrimitives: this.semanticGenome?.aspects?.size ?? 0,
      emergentTools: Object.freeze([...this.emergentTools.values()].map((entry) => safe(entry))),
      emergenceHistory: this.emergenceHistory.length,
      centerMeshes: Object.freeze([...this.meshes.entries()].map(([center, mesh]) => Object.freeze({
        center,
        mesh: mesh.id,
        dimensions: CENTER_DIMENSION_COVERAGE[center],
        sourceDerivedAnchorDimensions: Object.freeze(Object.entries(DIMENSION_CENTER_ANCHORS)
          .filter(([, anchor]) => anchor.center === center)
          .map(([dimension]) => dimension)),
        gates: Object.freeze([...this.centerGates[center]]),
        instruments: mesh.nodes.size - 1,
        memories: this.memory.get(center).length,
      }))),
    });
  }
}

export { CENTER_DIMENSION, meshId as centerMeshId };
export default NineCenterBody;
