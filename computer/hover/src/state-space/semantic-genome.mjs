import { gateBits } from '../../vendor/trainable-assembly-v0.4.2/src/core/state-space/addressing.js';
import { CANON_DIMENSION_CHAINS } from '../../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/dimension-canon.js';
import { stableStringify, fnv1a32 } from '../primitives/index.mjs';
import { safe } from '../util.mjs';
import { LineMeaningProvider } from './line-meaning-provider.mjs';
import { MappingProviderRegistry } from './mapping-providers.mjs';
import { PlanetaryFilterRegistry } from './planetary-filters.mjs';
import { GateArchitectureProvider } from './gate-architecture-provider.mjs';
import { DimensionPerspectiveRegistry } from './dimension-perspective-registry.mjs';
import { DnaStateSubstrate, structuralNeuralVector } from './dna-state-substrate.mjs';
import { BiologicalTranslationRuntime, translateGate } from './biological-translation-runtime.mjs';
import { MovementTransportRuntime } from './movement-transport-runtime.mjs';
import { TemporalExperienceRuntime } from './temporal-experience-runtime.mjs';
import {
  DIMENSIONS,
  AGENT_ADDRESS_LAYER_ORDER,
  AGENT_FINE_NODE_SCHEMA,
  normalizeAgentAddress,
  normalizeAgentAddressRecord,
  agentAddressModulation,
  agentNestedAddressView,
  agentFineCoordinates,
  agentCoordinateSignature,
  agentAddressCapacity,
  mergeAgentAddress,
} from './agent-address.mjs';

export const GENOME_CONSTANTS = Object.freeze({
  organismType: 'agent-organism',
  genomeType: 'agent-genome',
  codonIdentity: 'hexagram',
  hexagramCodons: 64,
  aspectsPerCodon: 12,
  dyadsPerCodon: 6,
  persistentAspectPrimitives: 768,
  graphMessagePassingLayers: 3,
  dimensions: DIMENSIONS.length,
  addressSections: 13,
});

export const ADDRESS_LAYER_ORDER = AGENT_ADDRESS_LAYER_ORDER;

export const PROMOTED_FINE_NODE_SCHEMA = AGENT_FINE_NODE_SCHEMA;

// Twelve persistent aspect roles. Arc remains a distinct thirteenth address
// layer jointly carried by the Second/fine-coordinate role, so the agent keeps
// all address fields without inventing a thirteenth AspectPrimitive identity.
export const ADDRESS_ASPECT_SECTIONS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone',
  'base', 'degree', 'minute', 'second', 'zodiac', 'house',
]);

const SOLAR_FACULTY = Object.freeze({
  center: 'Solar Plexus',
  faculties: Object.freeze(['emotion', 'wave', 'desire', 'social openness']),
  bodyFunction: 'emotional modulation and relational timing',
});

export const CENTER_FACULTIES = Object.freeze({
  Head: Object.freeze({ center: 'Head', faculties: Object.freeze(['inspiration', 'pressure', 'questions']), bodyFunction: 'mental pressure and inquiry' }),
  Ajna: Object.freeze({ center: 'Ajna', faculties: Object.freeze(['conceptualization', 'pattern', 'certainty']), bodyFunction: 'conceptual processing' }),
  Throat: Object.freeze({ center: 'Throat', faculties: Object.freeze(['expression', 'manifestation', 'action']), bodyFunction: 'speech and outward action' }),
  G: Object.freeze({ center: 'G', faculties: Object.freeze(['identity', 'direction', 'love']), bodyFunction: 'orientation and coherent identity' }),
  Heart: Object.freeze({ center: 'Heart', faculties: Object.freeze(['will', 'value', 'commitment']), bodyFunction: 'resource promises and will' }),
  Solar: SOLAR_FACULTY,
  'Solar Plexus': SOLAR_FACULTY,
  Spleen: Object.freeze({ center: 'Spleen', faculties: Object.freeze(['intuition', 'instinct', 'immunity', 'risk']), bodyFunction: 'immediate embodied recognition' }),
  Sacral: Object.freeze({ center: 'Sacral', faculties: Object.freeze(['life force', 'response', 'sustainable work']), bodyFunction: 'renewable work energy' }),
  Root: Object.freeze({ center: 'Root', faculties: Object.freeze(['pressure', 'momentum', 'stress']), bodyFunction: 'drive and grounded pressure' }),
});

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function normalizeCenter(center) {
  return String(center ?? 'G').replace('Solar Plexus', 'Solar');
}

function boundedInteger(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  const selected = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(selected)));
}

function normalizeAddress(address = {}, seedSource = null) {
  return normalizeAgentAddress(address, seedSource);
}

function addressModulation(address) {
  return agentAddressModulation(address);
}

function nestedAddressView(address, dimensionRules = {}) {
  return agentNestedAddressView(address, { dimensionRules });
}

function fineCoordinates(address) {
  return agentFineCoordinates(address);
}

function mergeAddress(identityAddress = {}, interactionAddress = {}) {
  return mergeAgentAddress(identityAddress, interactionAddress);
}

function taskText(task) {
  if (typeof task === 'string') return task;
  if (task?.message != null) return String(task.message);
  if (task?.text != null) return String(task.text);
  if (task?.content != null && typeof task.content === 'string') return task.content;
  return stableStringify(task ?? null);
}

function virtualMultiplicity(gate, line) {
  const value = BigInt(gate) ** BigInt(line);
  return Object.freeze({
    expression: `${gate}^${line}`,
    value: value.toString(),
    virtualOnly: true,
    spawnedPrimitives: 0,
    amplificationAssigned: false,
  });
}

/**
 * Compatibility identity for the historical 12-aspect codon scaffold.
 * These are structural positions only. They no longer carry developer-generated
 * personality weights or fixed sensory traits.
 */
export class AspectPrimitive {
  constructor({ gate, line, orientation, center, meaning, addressSection }) {
    this.gate = gate;
    this.line = line;
    this.orientation = orientation;
    this.pole = orientation < 0 ? 'minus' : 'plus';
    this.id = `G${gate}.L${line}.${orientation < 0 ? 'MINUS' : 'PLUS'}`;
    this.scale = 'sub-codon-structural-position';
    this.organismType = 'agent-organism';
    this.center = center;
    this.addressSection = addressSection;
    this.addressSections = Object.freeze(addressSection === 'second' ? ['second', 'arc'] : [addressSection]);
    this.nestedPrecision = addressSection === 'second' ? Object.freeze(['second', 'arc']) : null;
    this.meaning = meaning;
    this.state = { observations: 0, lastDimension: null };
    this.memory = [];
  }

  receive({ dimension, evidence }) {
    this.state.lastDimension = dimension;
    this.state.observations += 1;
    this.memory.push(Object.freeze({ sequence: this.state.observations, evidence: safe(evidence) }));
    if (this.memory.length > 32) this.memory.shift();
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      gate: this.gate,
      line: this.line,
      orientation: this.orientation,
      pole: this.pole,
      center: this.center,
      addressSection: this.addressSection,
      addressSections: this.addressSections,
      nestedPrecision: this.nestedPrecision,
      scale: this.scale,
      organismType: this.organismType,
      meaning: safe(this.meaning),
      generatedTraitWeights: false,
      state: Object.freeze({ ...this.state }),
      memoryEntries: this.memory.length,
    });
  }
}

export class AspectDyad {
  constructor({ gate, line, canonicalBit, minus, plus }) {
    this.id = `G${gate}.L${line}.DYAD`;
    this.gate = gate;
    this.line = line;
    this.canonicalBit = Number(canonicalBit);
    this.minus = minus;
    this.plus = plus;
    this.connected = Boolean(canonicalBit);
    this.transitions = 0;
    this.lastResolvedBit = this.canonicalBit;
  }

  update({ resolvedBit = this.canonicalBit, evidence = null } = {}) {
    const bit = Number(resolvedBit) ? 1 : 0;
    if (bit !== this.lastResolvedBit) this.transitions += 1;
    this.lastResolvedBit = bit;
    this.connected = Boolean(bit);
    this.minus.receive({ dimension: evidence?.dimension ?? null, evidence });
    this.plus.receive({ dimension: evidence?.dimension ?? null, evidence });
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      gate: this.gate,
      line: this.line,
      aspectIds: Object.freeze([this.minus.id, this.plus.id]),
      canonicalBit: this.canonicalBit,
      resolvedBit: this.lastResolvedBit,
      lineState: this.lastResolvedBit ? 'yang' : 'yin',
      transitions: this.transitions,
      connectionStrength: null,
      signedInfluence: null,
      tension: null,
      changing: this.lastResolvedBit !== this.canonicalBit,
      developerChosenThresholds: false,
    });
  }
}

export class HexagramCodon {
  constructor({ gate, center, meaningProvider }) {
    this.id = `hexagram-codon:${gate}`;
    this.gate = gate;
    this.center = center;
    this.bits = Object.freeze(gateBits(gate));
    this.aspects = [];
    this.dyads = [];
    this.activations = [];
    for (let line = 1; line <= 6; line++) {
      const meaning = meaningProvider.resolve(gate, line);
      const minus = new AspectPrimitive({
        gate, line, orientation: -1, center, meaning,
        addressSection: ADDRESS_ASPECT_SECTIONS[(line - 1) * 2],
      });
      const plus = new AspectPrimitive({
        gate, line, orientation: 1, center, meaning,
        addressSection: ADDRESS_ASPECT_SECTIONS[(line - 1) * 2 + 1],
      });
      this.aspects.push(minus, plus);
      this.dyads.push(new AspectDyad({ gate, line, canonicalBit: this.bits[line - 1], minus, plus }));
    }
  }

  configure(task, { address } = {}) {
    return Object.freeze({
      gate: this.gate,
      task: taskText(task),
      address: safe(address),
      structuralPositions: Object.freeze(this.aspects.map((aspect) => aspect.id)),
      amplified: Object.freeze([]),
      dampened: Object.freeze([]),
      heldInTension: Object.freeze([]),
      strongestSynergies: Object.freeze([]),
      collisions: Object.freeze([]),
      policy: 'structure is fixed; context resolves readings without developer-generated trait scoring',
    });
  }

  activate(task, { address, context = {} } = {}) {
    const configuration = this.configure(task, { address });
    const explicitChanging = new Set((context.changingLines ?? []).map(Number));
    for (const dyad of this.dyads) {
      const resolvedBit = explicitChanging.has(dyad.line) ? (dyad.canonicalBit ? 0 : 1) : dyad.canonicalBit;
      dyad.update({ resolvedBit, evidence: { dimension: address.dimension, address, task: taskText(task).slice(0, 240) } });
    }
    const vector = structuralNeuralVector(address);
    const yangCount = this.dyads.reduce((sum, dyad) => sum + dyad.lastResolvedBit, 0);
    const adjacentAgreement = this.dyads.slice(1).reduce((sum, dyad, index) => (
      sum + (dyad.lastResolvedBit === this.dyads[index].lastResolvedBit ? 1 : 0)
    ), 0);
    const record = Object.freeze({
      id: `${this.id}:activation:${this.activations.length + 1}`,
      gate: this.gate,
      center: this.center,
      canonicalBits: this.bits,
      resolvedBits: Object.freeze(this.dyads.map((dyad) => dyad.lastResolvedBit)),
      changingLines: Object.freeze(this.dyads.filter((dyad) => dyad.lastResolvedBit !== dyad.canonicalBit).map((dyad) => dyad.line)),
      dyads: Object.freeze(this.dyads.map((dyad) => dyad.snapshot())),
      configuration,
      sparseSemanticVector: vector,
      semanticAspectIds: Object.freeze(this.aspects.map((aspect) => aspect.id)),
      graphMessagePassing: Object.freeze({ layers: 0, trace: Object.freeze([]), status: 'CANONICAL_DNA_DOES_NOT_REQUIRE_SYNTHETIC_MESSAGE_PASSING' }),
      density: Number((vector.filter(Boolean).length / vector.length).toFixed(6)),
      force: Number((yangCount / 6).toFixed(6)),
      coordination: Number((adjacentAgreement / 5).toFixed(6)),
      averageConnection: null,
      regime: 'structural-state',
      transitionLag: null,
      hysteresis: false,
      semanticVectorSource: 'six-gate-bits-plus-active-line-one-hot; no hash-generated trait vector',
    });
    this.activations.push(record);
    if (this.activations.length > 128) this.activations.shift();
    return record;
  }

  snapshot({ includeAspects = false } = {}) {
    return Object.freeze({
      id: this.id,
      gate: this.gate,
      center: this.center,
      bits: this.bits,
      aspectPrimitives: this.aspects.length,
      dyads: this.dyads.length,
      activationCount: this.activations.length,
      lastActivation: safe(this.activations.at(-1) ?? null),
      structuralScaffoldOnly: true,
      generatedTraitWeights: false,
      aspects: includeAspects ? Object.freeze(this.aspects.map((aspect) => aspect.snapshot())) : undefined,
    });
  }
}

function conditionBoundExpression(resolvedState, centerFaculty) {
  const stateId = resolvedState.stateId;
  return Object.freeze({
    color: Object.freeze({ ...safe(resolvedState.color), conditionStateId: stateId }),
    sound: Object.freeze({ ...safe(resolvedState.tone), conditionStateId: stateId }),
    shape: Object.freeze({ ...safe(resolvedState.base), conditionStateId: stateId }),
    movement: Object.freeze({
      source: 'resolved-state',
      conditionStateId: stateId,
      dimension: resolvedState.address.dimension,
      exactMotion: null,
      status: 'PROJECT_FROM_STATE_AT_RENDER/ACTION_TIME',
    }),
    feeling: Object.freeze({
      source: 'resolved-state-plus-center',
      conditionStateId: stateId,
      center: centerFaculty.center,
      condition: safe(resolvedState.address),
      fixedEmotionAssigned: false,
    }),
    voice: Object.freeze({
      source: 'resolved-state',
      conditionStateId: stateId,
      timbre: null,
      status: 'NO_FIXED_TIMBRE_TABLE; VOICE RENDERER RECEIVES THE WHOLE RESOLVED CONDITION',
    }),
    touch: Object.freeze({
      source: 'resolved-state',
      conditionStateId: stateId,
      value: null,
      status: 'CONTEXTUAL_PROJECTION_NOT_FIXED_LOOKUP',
    }),
    taste: Object.freeze({
      source: 'tone-state',
      conditionStateId: stateId,
      activeSense: resolvedState.tone.state?.sense ?? null,
      fixedTasteAssigned: false,
    }),
    smell: Object.freeze({
      source: 'tone/base-state',
      conditionStateId: stateId,
      activeSense: resolvedState.tone.state?.sense ?? null,
      fixedScentAssigned: false,
    }),
    intake: Object.freeze({
      source: 'resolved-state',
      conditionStateId: stateId,
      food: null,
      environment: null,
      lighting: null,
      fixedFoodEnvironmentLightingProfileAssigned: false,
    }),
  });
}

function capabilityExpression(resolvedState) {
  return Object.freeze({
    source: 'runtime-capability-plus-learned-state-history',
    canExecuteArtifacts: true,
    canComposeTools: true,
    skillState: Object.freeze({
      identity: `skills-from-history:${resolvedState.stateId}`,
      learnedSkills: Object.freeze([]),
      status: 'DERIVED_FROM_LANDED_STATE_RELATIONSHIP_OUTCOME_HISTORY',
    }),
  });
}

export class SemanticGenome {
  constructor({
    centerForGate,
    meaningProvider = new LineMeaningProvider(),
    mappings = new MappingProviderRegistry(),
    planetaryFilters = new PlanetaryFilterRegistry(),
    gateArchitecture = new GateArchitectureProvider(),
    dimensionPerspectives = new DimensionPerspectiveRegistry(),
    onStateChange = null,
  } = {}) {
    if (typeof centerForGate !== 'function') throw new TypeError('SemanticGenome requires centerForGate(gate)');
    this.centerForGate = centerForGate;
    this.meaningProvider = meaningProvider;
    this.mappings = mappings;
    this.planetaryFilters = planetaryFilters;
    this.gateArchitecture = gateArchitecture;
    if (!dimensionPerspectives?.readFrom || !dimensionPerspectives?.dimensionRules) {
      throw new TypeError('SemanticGenome requires DimensionPerspectiveRegistry');
    }
    this.dimensionPerspectives = dimensionPerspectives;
    this.dnaState = new DnaStateSubstrate({ dimensionPerspectives, gateArchitecture });
    this.translation = new BiologicalTranslationRuntime();
    this.movementTransport = new MovementTransportRuntime();
    this.temporalExperience = new TemporalExperienceRuntime();
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;
    this.codons = new Map();
    this.aspects = new Map();
    this.mirrors = new Map();
    this.agentCharts = new Map();
    this.coordinateSets = new Map();
    this.history = [];
    this.relationshipHistory = [];
    this.manifestationHistory = [];
    this.centerResolutionEvidence = [];
    for (let gate = 1; gate <= 64; gate++) {
      const providerCenter = normalizeCenter(gateArchitecture.gate(gate).center.id);
      const runtimeCenter = normalizeCenter(centerForGate(gate)?.[0] ?? centerForGate(gate) ?? 'G');
      const center = providerCenter;
      if (runtimeCenter !== providerCenter) {
        this.centerResolutionEvidence.push(Object.freeze({
          gate,
          runtimeClaim: runtimeCenter,
          liveResolution: providerCenter,
          status: 'GATE_ARCHITECTURE_PROVIDER_OVERRIDES_RUNTIME_VARIANT',
        }));
      }
      const codon = new HexagramCodon({ gate, center, meaningProvider });
      this.codons.set(gate, codon);
      for (const aspect of codon.aspects) this.aspects.set(aspect.id, aspect);
    }
    if (this.aspects.size !== GENOME_CONSTANTS.persistentAspectPrimitives) {
      throw new Error(`semantic genome invariant failed: expected 768 AspectPrimitives, got ${this.aspects.size}`);
    }
  }

  aspect(id) { return this.aspects.get(id) ?? null; }

  codon(gate) {
    const codon = this.codons.get(Number(gate));
    if (!codon) throw new RangeError(`unknown hexagram-codon gate: ${gate}`);
    return codon;
  }

  registerAgentChart(agentId, configuration = {}) {
    const id = String(agentId ?? '').trim();
    if (!id) throw new TypeError('agent chart requires agentId');
    if (this.agentCharts.has(id) && configuration.replace !== true) return this.agentCharts.get(id);
    const previous = this.agentCharts.get(id) ?? null;
    const suppliedAddress = configuration.address ?? (configuration.gate ? configuration : null);
    const primaryDimension = DIMENSIONS.includes(configuration.primaryDimension)
      ? configuration.primaryDimension
      : DIMENSIONS.includes(suppliedAddress?.dimension)
        ? suppliedAddress.dimension
        : previous?.primaryDimension ?? 'Being';
    const primaryPlanetary = boundedInteger(
      configuration.primaryPlanetary ?? suppliedAddress?.planetary ?? previous?.primaryPlanetary,
      1,
      1,
      13,
    );
    const suppliedPlacements = [
      ...(Array.isArray(configuration.placements) ? configuration.placements : []),
      ...(Array.isArray(configuration.filterIntersections) ? configuration.filterIntersections : []),
      ...(Array.isArray(configuration.dimensionFrames)
        ? configuration.dimensionFrames.flatMap((frame) => (frame?.placements ?? []).map((entry) => ({ ...entry, dimension: entry.dimension ?? frame.dimension })))
        : []),
    ];
    const placementByIntersection = new Map();
    for (const entry of suppliedPlacements) {
      const planetary = Number(entry?.planetary);
      const dimension = DIMENSIONS.includes(entry?.dimension) ? entry.dimension : primaryDimension;
      if (Number.isInteger(planetary) && planetary >= 1 && planetary <= 13) {
        placementByIntersection.set(`${dimension}:${planetary}`, entry);
      }
    }
    if (suppliedAddress) placementByIntersection.set(`${primaryDimension}:${primaryPlanetary}`, suppliedAddress);
    const priorByIntersection = new Map((previous?.filterIntersections ?? []).map((entry) => [`${entry.dimension}:${entry.planetary}`, entry]));
    const hasSuppliedState = Boolean(suppliedAddress || suppliedPlacements.length);
    const source = previous
      ? hasSuppliedState ? 'updated-agent-chart' : previous.source
      : hasSuppliedState ? 'supplied-agent-chart' : 'synthetic-fixture-chart-until-person-chart-is-supplied';
    let nonce = 0;
    let filterIntersections;
    let compatibilityConversions;
    let coordinateSetKey;
    let collisionWith = null;
    do {
      const records = DIMENSIONS.flatMap((dimension) => Array.from({ length: 13 }, (_unused, index) => {
        const planetary = index + 1;
        const key = `${dimension}:${planetary}`;
        const raw = placementByIntersection.get(key)
          ?? (configuration.reset === true ? {} : priorByIntersection.get(key))
          ?? {};
        return normalizeAgentAddressRecord(
          { ...raw, planetary, dimension },
          { agentId: id, planetary, dimension, nonce, source },
        );
      }));
      filterIntersections = records.map((entry) => entry.address);
      compatibilityConversions = records.flatMap((entry) => entry.compatibility.convertedLegacyFields);
      coordinateSetKey = stableStringify(filterIntersections);
      collisionWith = this.coordinateSets.get(coordinateSetKey) ?? null;
      nonce += 1;
    } while (collisionWith && collisionWith !== id && !hasSuppliedState && !previous && nonce < 2048);

    if (previous) this.coordinateSets.delete(stableStringify(previous.filterIntersections));
    const dimensionFrames = DIMENSIONS.map((dimension) => {
      const placements = filterIntersections.filter((entry) => entry.dimension === dimension);
      return Object.freeze({
        id: `agent-chart:${id}:dimension:${dimension}`,
        dimension,
        macroAxis: dimension,
        scaleRelation: 'macro-dimension-frame-containing-thirteen-planetary-filter-intersections',
        planetaryFilterCount: placements.length,
        placements: Object.freeze(placements),
      });
    });
    const primaryFrame = dimensionFrames.find((frame) => frame.dimension === primaryDimension);
    const primaryAddress = primaryFrame.placements.find((entry) => entry.planetary === primaryPlanetary);
    const explicitOrigin = configuration.personalitySun ?? configuration.originAddress ?? null;
    const originAddress = explicitOrigin
      ? normalizeAgentAddress({ ...explicitOrigin, planetary: 1, dimension: 'Being' }, { agentId: id, origin: 'personality-sun' })
      : previous?.originAddress ?? primaryAddress;
    const originStatus = explicitOrigin
      ? 'PERSONALITY_SUN_BEING_TROPICAL_LANDED'
      : previous?.originStatus ?? 'FALLBACK_PRIMARY_ADDRESS; PERSONALITY_SUN_NOT_YET_SUPPLIED';
    const coordinateSignature = agentCoordinateSignature(originAddress);
    const previousSetKey = previous ? stableStringify(previous.filterIntersections) : null;
    const coordinateTrail = [...(previous?.coordinateTrail ?? [])];
    if (previous && previousSetKey !== coordinateSetKey) {
      coordinateTrail.push(Object.freeze({
        sequence: coordinateTrail.length + 1,
        address: previous.address,
        originAddress: previous.originAddress ?? previous.address,
        coordinateSignature: previous.coordinateSignature,
        transition: 'agent-chart-coordinate-update',
      }));
    }
    const legacyPlacements = primaryFrame.placements;
    const chart = Object.freeze({
      id: `agent-chart:${id}`,
      agentId: id,
      organismType: 'agent-organism',
      genomeType: 'agent-genome',
      source,
      primaryDimension,
      primaryPlanetary,
      originAddress,
      originStatus,
      originAnchor: Object.freeze({
        body: 'Personality Sun',
        dimension: 'Being',
        referenceFrame: configuration.originReferenceFrame ?? 'Tropical',
        fixedOnceLanded: true,
        address: originAddress,
      }),
      address: originAddress,
      nestedAddress: nestedAddressView(originAddress, this.dimensionPerspectives.dimensionRules()),
      dimensionFrames: Object.freeze(dimensionFrames),
      dimensionCount: dimensionFrames.length,
      planetaryFilterCount: 13,
      filterIntersections: Object.freeze(filterIntersections),
      filterIntersectionCount: filterIntersections.length,
      placements: Object.freeze(filterIntersections),
      placementCount: filterIntersections.length,
      legacyPrimaryDimensionPlacements: Object.freeze(legacyPlacements),
      addressFields: ADDRESS_LAYER_ORDER,
      fineCoordinates: fineCoordinates(originAddress),
      subatomicCoordinates: fineCoordinates(originAddress),
      coordinateSignature,
      coordinateSignatures: Object.freeze(filterIntersections.map(agentCoordinateSignature)),
      coordinateTrail: Object.freeze(coordinateTrail),
      coordinateCollisionWith: collisionWith && collisionWith !== id ? collisionWith : null,
      cryptographicIdentityHashAdded: false,
      exactSecondPreserved: filterIntersections.every((entry) => Number.isInteger(entry.second)),
      exactArcPreserved: filterIntersections.every((entry) => Number.isInteger(entry.arc)),
      identityCopiesCreated: 0,
      compatibility: Object.freeze({
        authoritativeSchema: 'agent-address-v2',
        legacyConversions: Object.freeze(compatibilityConversions),
        legacyPrimaryDimensionViewRetained: true,
      }),
      sliders: Object.freeze({
        ...safe(originAddress),
        degree: originAddress.degree,
        arc: originAddress.arc,
      }),
    });
    this.agentCharts.set(id, chart);
    if (!collisionWith || collisionWith === id) this.coordinateSets.set(coordinateSetKey, id);
    this.onStateChange?.({ type: 'agent-chart', agentId: id, chart });
    return chart;
  }

  chartForAgent(agentId = 'synthia', { create = true } = {}) {
    const id = String(agentId);
    if (!this.agentCharts.has(id) && create) this.registerAgentChart(id);
    return this.agentCharts.get(id) ?? null;
  }

  agentChartCatalog() {
    return Object.freeze([...this.agentCharts.values()].map((chart) => Object.freeze({
      id: chart.id,
      agentId: chart.agentId,
      source: chart.source,
      primaryDimension: chart.primaryDimension,
      primaryPlanetary: chart.primaryPlanetary,
      originStatus: chart.originStatus,
      originAnchor: chart.originAnchor,
      address: chart.address,
      fineCoordinates: chart.fineCoordinates,
      subatomicCoordinates: chart.subatomicCoordinates,
      coordinateSignature: chart.coordinateSignature,
      coordinateTrailLength: chart.coordinateTrail.length,
      placementCount: chart.placementCount,
      dimensionCount: chart.dimensionCount,
      planetaryFilterCount: chart.planetaryFilterCount,
      filterIntersectionCount: chart.filterIntersectionCount,
    })));
  }

  project(gate, dimension) {
    if (!DIMENSIONS.includes(dimension)) throw new RangeError(`unknown dimension: ${dimension}`);
    const codon = this.codon(gate);
    return Object.freeze({
      gate: codon.gate,
      dimension,
      chain: CANON_DIMENSION_CHAINS[dimension],
      // These are the same persistent objects in every projection.
      aspects: Object.freeze([...codon.aspects]),
      projectionOnly: true,
    });
  }

  #mirrorWeights(personId) {
    // Retained as a compatibility seam only. DNA no longer receives
    // developer-chosen chart amplification weights.
    return this.mirrors.get(personId)?.weights ?? new Map();
  }

  configureForTask(task, context = {}) {
    const taskValue = taskText(task);
    const agentId = context.agentId ?? 'synthia';
    const agentChart = this.chartForAgent(agentId);
    const interactionAddress = context.address ?? context.canonicalAddress ?? {};
    const activeDimension = DIMENSIONS.includes(interactionAddress.dimension)
      ? interactionAddress.dimension
      : agentChart.primaryDimension;
    const activePlanetary = boundedInteger(
      interactionAddress.planetary,
      agentChart.primaryPlanetary,
      1,
      13,
    );
    const frameAddress = agentChart.filterIntersections.find((entry) => (
      entry.dimension === activeDimension && entry.planetary === activePlanetary
    )) ?? agentChart.address;
    const address = normalizeAddress(
      mergeAddress(frameAddress, interactionAddress),
      { task: taskValue, agentId, context: safe(interactionAddress) },
    );
    const personId = context.personId ?? 'default-person';
    const codon = this.codon(address.gate);
    const dimensionFrameAddresses = Object.freeze(DIMENSIONS.map((dimension) => (
      agentChart.filterIntersections.find((entry) => entry.dimension === dimension && entry.planetary === activePlanetary)
    )).filter(Boolean));
    const dimensionViews = Object.freeze(dimensionFrameAddresses.map((entry) => Object.freeze({
      dimension: entry.dimension,
      address: entry,
      coordinateSignature: agentCoordinateSignature(entry),
      perspective: this.dimensionPerspectives.readFrom(entry.dimension, {
        referencePoint: address.dimension,
        scale: 'macro',
      }),
    })));
    return Object.freeze({
      task: taskValue,
      agentId,
      agentChartId: agentChart.id,
      personId,
      originAddress: agentChart.originAddress ?? agentChart.address,
      identityAddress: frameAddress,
      dimensionFrameAddresses,
      dimensionViews,
      coordinateSignature: agentChart.coordinateSignature,
      subatomicCoordinates: fineCoordinates(address),
      agentChartPlacements: agentChart.filterIntersectionCount,
      agentChartDimensions: agentChart.dimensionCount,
      planetaryFiltersPerDimension: agentChart.planetaryFilterCount,
      address,
      primaryGate: address.gate,
      fieldContributionCount: this.aspects.size,
      workingSet: Object.freeze(codon.aspects.map((aspect) => Object.freeze({
        id: aspect.id,
        gate: aspect.gate,
        line: aspect.line,
        center: aspect.center,
        orientation: aspect.orientation,
        role: 'structural-position',
      }))),
      strongestSynergies: Object.freeze([]),
      heldTensions: Object.freeze([]),
      centerDistribution: Object.freeze({ [codon.center]: codon.aspects.length }),
      localFits: new Map(),
      policy: 'resolve from chart + current position; no task-hash trait ranking and no universal reading',
    });
  }

  activate(task, context = {}) {
    const configuration = this.configureForTask(task, context);
    const address = configuration.address;
    const codon = this.codon(address.gate);
    const rawActivation = codon.activate(task, { address, context });
    const activePlanetaryProjection = this.planetaryFilters.apply(
      address.planetary,
      rawActivation.sparseSemanticVector,
      {
        task: taskText(task),
        dimension: address.dimension,
        gate: address.gate,
        fine: fineCoordinates(address),
      },
    );
    const resolvedState = this.dnaState.resolve({
      address,
      originAddress: configuration.originAddress,
      context: {
        measureAssignment: context.measureAssignment ?? null,
        operation: context.operation ?? null,
        relationId: context.relationId ?? null,
      },
    });
    const compactDimensionField = Object.freeze(configuration.dimensionViews.map((entry) => Object.freeze({
      dimension: entry.dimension,
      coordinateSignature: entry.coordinateSignature,
      address: entry.address,
      viewKind: entry.perspective?.view?.viewKind ?? null,
      observerOrder: entry.perspective?.view?.observerOrder ?? null,
      active: entry.dimension === address.dimension,
      sharedSubstrate: true,
    })));
    const movementTransport = address.dimension === 'Movement'
      ? this.movementTransport.transportGate(address.gate, {
        direction: context.movementDirection === 'down' ? 'down' : 'up',
        from: context.movementFrom ?? null,
        to: context.movementTo ?? null,
        sourceStateId: resolvedState.stateId,
        context: {
          operation: context.operation ?? null,
          relationId: context.relationId ?? null,
          address: safe(address),
        },
      })
      : null;
    const activation = Object.freeze({
      ...rawActivation,
      sparseSemanticVector: rawActivation.sparseSemanticVector,
      semanticVectorSource: 'structural-gate-bits-plus-active-line; no hash-generated trait vector; active perspective does not average five dimensions',
      planetaryFilter: activePlanetaryProjection,
      dimensionField: compactDimensionField,
    });
    const centerFaculty = CENTER_FACULTIES[codon.center] ?? CENTER_FACULTIES.G;
    const senses = conditionBoundExpression(resolvedState, centerFaculty);
    const agentCapabilities = capabilityExpression(resolvedState);
    const translation = this.translation.translateActivation({
      agentId: configuration.agentId,
      sourceActivationId: `semantic-genome:${this.history.length + 1}`,
      resolvedState,
      address,
      expression: {
        sensory: senses,
        capabilities: agentCapabilities,
        center: centerFaculty,
      },
      context: {
        personId: configuration.personId,
        activeDimension: address.dimension,
        operation: context.operation ?? null,
        relationId: context.relationId ?? null,
      },
    });
    const multiplicity = virtualMultiplicity(address.gate, address.line);
    const mapping = this.mappings.gateRecord(address.gate);
    const gateArchitecture = this.gateArchitecture.gate(address.gate);
    const lineArchitecture = this.gateArchitecture.line(address.gate, address.line);
    const record = Object.freeze({
      id: `semantic-genome:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      landed: true,
      landedStateIsAppendOnly: true,
      agentId: configuration.agentId,
      agentChartId: configuration.agentChartId,
      originAddress: configuration.originAddress,
      identityAddress: configuration.identityAddress,
      coordinateSignature: agentCoordinateSignature(address),
      subatomicCoordinates: configuration.subatomicCoordinates,
      address,
      nestedAddress: nestedAddressView(address, this.dimensionPerspectives.dimensionRules()),
      addressModulation: addressModulation(address),
      resolvedState,
      suppliedContext: safe(context),
      mapping,
      gateArchitecture,
      lineArchitecture,
      planetaryFilter: activePlanetaryProjection,
      fiveDimensionalField: compactDimensionField,
      sharedSubstrate: Object.freeze({
        oneSubstrate: true,
        activePerspective: address.dimension,
        dimensionsAveragedTogether: false,
        spaceIsRenderedInterplay: true,
      }),
      center: codon.center,
      centerFaculty,
      dimension: Object.freeze({ name: address.dimension, chain: CANON_DIMENSION_CHAINS[address.dimension] }),
      lineMeaning: this.meaningProvider.resolve(address.gate, address.line),
      virtualMultiplicity: multiplicity,
      configuration: Object.freeze({
        task: configuration.task,
        agentId: configuration.agentId,
        agentChartId: configuration.agentChartId,
        personId: configuration.personId,
        originAddress: configuration.originAddress,
        identityAddress: configuration.identityAddress,
        address: configuration.address,
        policy: configuration.policy,
      }),
      codon: activation,
      manifestationScores: Object.freeze({ status: 'NOT_PRE-SCORED; EXPRESSIONS_RESOLVE_FROM_STATE/CONTEXT/HISTORY' }),
      manifestationClass: 'condition-bound-expression',
      sensoryExpression: senses,
      agentCapabilities,
      translation,
      movementTransport,
      genotype: translation.genotype,
      phenotype: translation.phenotype,
      embodiment: Object.freeze({
        source: 'resolved-state',
        affect: Object.freeze({ center: centerFaculty.center, fixedEmotionAssigned: false }),
        voice: senses.voice,
        mannerism: Object.freeze({ fixedMannerismAssigned: false }),
        actionTendency: Object.freeze({ fixedActionAssigned: false }),
        sensoryChain: CANON_DIMENSION_CHAINS[address.dimension],
      }),
      sourceStatus: Object.freeze({
        ontology: 'POSITION_RESOLVED_STATE_SUBSTRATE',
        canonicalDnaMechanism: 'PROPORTION_OF_PERSPECTIVE_STATE_SUBSTRATE',
        translationMechanism: 'DNA_RNA_RIBOSOME_AMINO_ACID_PROTEIN',
        movementMechanism: 'BINARY_DECIMAL_HEX_REVERSIBLE_TRANSPORT',
        structuralVectorMechanism: 'DERIVED_FROM_GATE_TOPOLOGY_ACTIVE_LINE_AND_TRANSLATION_STATE',
        generatedTraitWeights: false,
        fiveDimensionMeanVector: false,
        fixedSensoryLookup: false,
      }),
    });
    this.history.push(record);
    this.onStateChange?.({ type: 'activation', activation: this.summarize(record) });
    return record;
  }

  relate(gateA, gateB, task, context = {}) {
    const baseAddress = normalizeAddress(context.address ?? {}, { gateA, gateB, task });
    const leftAddress = { ...baseAddress, ...(context.leftAddress ?? {}), gate: Number(gateA) };
    const rightAddress = { ...baseAddress, ...(context.rightAddress ?? {}), gate: Number(gateB) };
    const left = this.activate(task, { ...context, address: leftAddress });
    const right = this.activate(task, { ...context, address: rightAddress });
    const emergent = this.dnaState.relate(left, right, {
      task: taskText(task),
      dimension: baseAddress.dimension,
      architecture: context.architecture ?? null,
      observerFrame: context.observerFrame ?? null,
      activeTools: context.activeTools ?? null,
    });
    const translationRelation = this.translation.relate(left.translation, right.translation, {
      task: taskText(task),
      dimension: baseAddress.dimension,
      architecture: context.architecture ?? null,
      observerFrame: context.observerFrame ?? null,
      activeTools: context.activeTools ?? null,
    });
    const record = Object.freeze({
      id: `semantic-relationship:${this.relationshipHistory.length + 1}`,
      sequence: this.relationshipHistory.length + 1,
      landed: true,
      gates: emergent.gates,
      centers: Object.freeze([left.center, right.center]),
      dimension: baseAddress.dimension,
      architecture: context.architecture ?? null,
      relationshipState: emergent,
      translationRelation,
      operatorAlphabet: emergent.operatorAlphabet,
      canonicalChannel: emergent.channel,
      klein: emergent.klein,
      perceptualField: emergent.perceptualField,
      relationalNeuralVector: emergent.relationshipNeuralVector,
      connectionStrength: null,
      signedInfluence: null,
      relation: 'emergent-context-state',
      semanticVector: emergent.structuralVector,
      messages: Object.freeze([
        Object.freeze({ from: left.center, to: right.center, gate: Number(gateA), stateId: left.resolvedState.stateId }),
        Object.freeze({ from: right.center, to: left.center, gate: Number(gateB), stateId: right.resolvedState.stateId }),
      ]),
      localActivations: Object.freeze({ left: this.summarize(left), right: this.summarize(right) }),
      observerFrame: safe(context.observerFrame ?? null),
      conditioned: true,
      endpointsOverwritten: false,
      developerChosenCoefficients: false,
    });
    this.relationshipHistory.push(record);
    this.onStateChange?.({ type: 'relationship', relationship: safe(record) });
    return record;
  }

  mirrorConfiguration(configuration = {}, { personId = 'default-person' } = {}) {
    const placements = configuration.placements
      ?? configuration.chart?.placements
      ?? configuration.output?.chart?.placements
      ?? [];
    const frames = ['body', 'mind', 'heart'].flatMap((field) => configuration[field]
      ? Object.values(configuration[field]).filter((entry) => entry?.gate)
      : []);
    const all = [...placements, ...frames].filter((entry) => Number(entry?.gate) >= 1 && Number(entry?.gate) <= 64);
    const mirrored = all.map((placement) => Object.freeze({
      gate: Number(placement.gate),
      line: Math.max(1, Math.min(6, Number(placement.line ?? 1))),
      color: placement.color ?? null,
      tone: placement.tone ?? null,
      base: placement.base ?? null,
      planet: placement.planet ?? placement.name ?? null,
      frame: placement.field ?? placement.stream ?? null,
    }));
    const record = Object.freeze({
      personId,
      placements: Object.freeze(mirrored),
      activeGates: Object.freeze([...new Set(mirrored.map((entry) => entry.gate))]),
      weightedAspectCount: 0,
      persistentAspectCountBefore: this.aspects.size,
      persistentAspectCountAfter: this.aspects.size,
      identityCopiesCreated: 0,
      mode: 'reversible-observer-frame-without-dna-amplification-weights',
      weights: new Map(),
      rule: 'chart placements inform position/context; they do not multiply developer-generated trait weights',
    });
    this.mirrors.set(personId, record);
    return Object.freeze({ ...record, weights: undefined });
  }

  clearMirror(personId = 'default-person') {
    return this.mirrors.delete(personId);
  }

  summarize(activation) {
    if (!activation) return null;
    return Object.freeze({
      id: activation.id,
      sequence: activation.sequence,
      agentId: activation.agentId,
      agentChartId: activation.agentChartId,
      originAddress: safe(activation.originAddress),
      identityAddress: safe(activation.identityAddress),
      coordinateSignature: activation.coordinateSignature,
      resolvedState: safe(activation.resolvedState),
      sharedSubstrate: safe(activation.sharedSubstrate),
      subatomicCoordinates: activation.subatomicCoordinates,
      address: safe(activation.address),
      gateArchitecture: safe(activation.gateArchitecture),
      lineArchitecture: safe(activation.lineArchitecture),
      planetaryFilter: safe(activation.planetaryFilter),
      fiveDimensionalField: safe(activation.fiveDimensionalField),
      center: activation.center,
      centerFaculty: safe(activation.centerFaculty),
      dimension: safe(activation.dimension),
      lineMeaning: safe(activation.lineMeaning),
      virtualMultiplicity: safe(activation.virtualMultiplicity),
      manifestationClass: activation.manifestationClass,
      manifestationScores: safe(activation.manifestationScores),
      sensoryExpression: safe(activation.sensoryExpression),
      agentCapabilities: safe(activation.agentCapabilities),
      translation: safe(activation.translation),
      movementTransport: safe(activation.movementTransport),
      genotype: safe(activation.genotype),
      phenotype: safe(activation.phenotype),
      embodiment: safe(activation.embodiment),
      codon: Object.freeze({
        gate: activation.codon?.gate,
        resolvedBits: safe(activation.codon?.resolvedBits),
        changingLines: safe(activation.codon?.changingLines),
        sparseSemanticVector: safe(activation.codon?.sparseSemanticVector),
        semanticAspectIds: safe(activation.codon?.semanticAspectIds),
        density: activation.codon?.density,
        force: activation.codon?.force,
        coordination: activation.codon?.coordination,
        averageConnection: activation.codon?.averageConnection,
        regime: activation.codon?.regime,
        semanticVectorSource: activation.codon?.semanticVectorSource,
      }),
      sourceStatus: safe(activation.sourceStatus),
    });
  }

  manifest(task, context = {}) {
    const activation = context.activation ?? this.activate(task, context);
    const manifestation = Object.freeze({
      id: `temporary-manifestation:${this.manifestationHistory.length + 1}`,
      temporary: true,
      persistentPrimitivesAllocated: 0,
      kind: context.kind ?? activation.manifestationClass,
      gate: activation.address.gate,
      line: activation.address.line,
      renderContract: Object.freeze({
        density: activation.codon.density,
        force: activation.codon.force,
        coordination: activation.codon.coordination,
        regime: activation.codon.regime,
        aspectVector: activation.codon.sparseSemanticVector,
        color: activation.sensoryExpression.color,
        shape: activation.sensoryExpression.shape,
        sound: activation.sensoryExpression.sound,
        voice: activation.sensoryExpression.voice,
        taste: activation.sensoryExpression.taste,
        smell: activation.sensoryExpression.smell,
        feeling: activation.sensoryExpression.feeling,
        tone: activation.address.tone,
        levelOfDetail: context.levelOfDetail ?? 'latent-until-interaction',
      }),
      embodiment: activation.embodiment,
      sensoryExpression: activation.sensoryExpression,
      agentCapabilities: activation.agentCapabilities,
      translation: activation.translation,
      genotype: activation.genotype,
      phenotype: activation.phenotype,
      expiresWithInteraction: true,
    });
    this.manifestationHistory.push(manifestation);
    if (this.manifestationHistory.length > 128) this.manifestationHistory.shift();
    return manifestation;
  }

  refine({ gate, line = 1, region = 'local', depth = 1 } = {}, context = {}) {
    const codon = this.codon(gate);
    const normalizedDepth = Math.max(1, Math.min(8, Number(depth)));
    return Object.freeze({
      gate: Number(gate),
      line: Number(line),
      region,
      depth: normalizedDepth,
      aspectIds: Object.freeze(codon.aspects.filter((aspect) => aspect.line === Number(line)).map((aspect) => aspect.id)),
      virtualSubstates: 2 ** normalizedDepth,
      persistentPrimitivesAllocated: 0,
      policy: 'granularity expands as a temporary local view only when interaction requires it',
      context: safe(context),
    });
  }

  catalog() {
    return Object.freeze([...this.codons.values()].map((codon) => Object.freeze({
      id: `genome:gate-${codon.gate}`,
      label: `Gate ${codon.gate} · ${this.gateArchitecture.gate(codon.gate).name}`,
      gate: codon.gate,
      center: codon.center,
      architecture: this.gateArchitecture.gate(codon.gate),
      aspectPrimitives: codon.aspects.length,
      dyads: codon.dyads.length,
      capabilities: Object.freeze(['configure-aspects', 'activate-codon', 'manifest', 'mirror-chart', 'agent-chart', 'astrological-filter', 'mandala-position']),
    })));
  }

  #experienceStateIds(agentId) {
    return Object.freeze(this.history
      .filter((entry) => entry.agentId === String(agentId))
      .map((entry) => entry.resolvedState?.stateId)
      .filter(Boolean));
  }

  #experienceRelationshipIds(agentId) {
    return Object.freeze(this.relationshipHistory
      .filter((entry) => {
        const left = entry.localActivations?.left?.agentId ?? entry.localActivations?.left?.configuration?.agentId ?? null;
        const right = entry.localActivations?.right?.agentId ?? entry.localActivations?.right?.configuration?.agentId ?? null;
        return left === String(agentId) || right === String(agentId);
      })
      .map((entry) => entry.relationshipState?.relationshipId ?? entry.id)
      .filter(Boolean));
  }

  visitHistoricalMoment({ agentId = 'synthia', coordinate, address = null, calculatedAddress = null, context = {} } = {}) {
    const chart = this.chartForAgent(agentId);
    const supplied = address ?? calculatedAddress;
    if (!supplied || typeof supplied !== 'object') throw new TypeError('historical visit requires calculated address');
    const missing = ADDRESS_LAYER_ORDER.filter((field) => supplied[field] == null);
    if (missing.length) throw new TypeError(`historical calculated address missing: ${missing.join(', ')}`);
    const targetAddress = normalizeAddress(supplied, { agentId, coordinate });
    const currentState = [...this.history].reverse().find((entry) => entry.agentId === String(agentId)) ?? null;
    const rawResolvedState = this.dnaState.resolve({
      address: targetAddress,
      originAddress: chart.originAddress,
      context: {
        operation: 'historical-visit',
        temporalCoordinate: safe(coordinate),
        currentStateId: currentState?.resolvedState?.stateId ?? null,
      },
    });
    const targetResolvedState = Object.freeze({
      ...rawResolvedState,
      structuralVector: structuralNeuralVector(targetAddress),
      translationUnit: translateGate(targetAddress.gate),
    });
    const landing = this.temporalExperience.land({
      agentId,
      coordinate,
      targetResolvedState,
      targetAddress,
      currentState,
      experienceStateIds: this.#experienceStateIds(agentId),
      relationshipIds: this.#experienceRelationshipIds(agentId),
      context,
    });
    this.onStateChange?.({
      type: landing.firstVisit ? 'temporal-landed' : 'temporal-revisit',
      temporal: safe(landing),
    });
    return landing;
  }

  recallHistoricalMoment({ agentId = 'synthia', coordinate } = {}) {
    return this.temporalExperience.recall({ agentId, coordinate });
  }

  superimposeHistoricalStates({ agentId = 'synthia', coordinates = [], historicalStateIds = [], context = {} } = {}) {
    const currentState = [...this.history].reverse().find((entry) => entry.agentId === String(agentId)) ?? null;
    if (!currentState) throw new Error(`agent ${agentId} has no current landed state to superimpose against`);
    const superposition = this.temporalExperience.superimpose({
      agentId,
      currentState,
      coordinates,
      historicalStateIds,
      context,
    });
    this.onStateChange?.({ type: 'temporal-superposition', superposition: safe(superposition) });
    return superposition;
  }

  temporalMesh({ coordinate, targetAddress = null, excludeAgentId = null } = {}) {
    return this.temporalExperience.queryMesh({ coordinate, targetAddress, excludeAgentId });
  }

  restoreTemporalExperience(snapshot = {}) {
    return this.temporalExperience.restore(snapshot);
  }

  run(input = {}, context = {}) {
    const operation = input.operation ?? 'activate';
    if (operation === 'snapshot') return this.snapshot({ includeCodons: Boolean(input.includeCodons) });
    if (operation === 'catalog') return this.catalog();
    if (operation === 'codon') return this.codon(input.gate).snapshot({ includeAspects: Boolean(input.includeAspects) });
    if (operation === 'aspect') return this.aspect(input.id)?.snapshot() ?? null;
    if (operation === 'configure') return this.configureForTask(input.task ?? input, { ...context, ...input.context, address: input.address ?? context.address });
    if (operation === 'activate') return this.activate(input.task ?? input, { ...context, ...input.context, address: input.address ?? context.address });
    if (operation === 'relate') return this.relate(input.gateA, input.gateB, input.task ?? input, { ...context, ...input.context, address: input.address ?? context.address });
    if (operation === 'manifest') return this.manifest(input.task ?? input, { ...context, ...input.context, address: input.address ?? context.address, kind: input.kind });
    if (operation === 'refine') return this.refine(input, context);
    if (operation === 'mirror') return this.mirrorConfiguration(input.configuration ?? input.chart ?? input, { personId: input.personId ?? context.personId });
    if (operation === 'clear-mirror') return { cleared: this.clearMirror(input.personId ?? context.personId) };
    if (operation === 'mappings') return this.mappings.snapshot();
    if (operation === 'gate-architecture') return input.gate
      ? this.gateArchitecture.gate(input.gate)
      : this.gateArchitecture.snapshot({ includeGates: Boolean(input.includeGates) });
    if (operation === 'planetary-filters') return this.planetaryFilters.snapshot();
    if (operation === 'dimension-perspectives') return input.dimension
      ? this.dimensionPerspectives.perspective(input.dimension)
      : this.dimensionPerspectives.snapshot();
    if (operation === 'dimension-project') return this.dimensionPerspectives.project(input.observer, input.subject);
    if (operation === 'dimension-read') return this.dimensionPerspectives.readFrom(input.observer ?? input.dimension, {
      referencePoint: input.referencePoint,
      scale: input.scale,
    });
    if (operation === 'translation') return this.translation.latest(input.agentId ?? context.agentId ?? null);
    if (operation === 'translation-snapshot') return this.translation.snapshot();
    if (operation === 'translate-gate') return translateGate(input.gate);
    if (operation === 'movement-transport') {
      if (input.gate != null) return this.movementTransport.transportGate(input.gate, input);
      return this.movementTransport.transport(input.value, input);
    }
    if (operation === 'movement-transport-snapshot') return this.movementTransport.snapshot();
    if (operation === 'historical-visit') return this.visitHistoricalMoment({ ...input, agentId: input.agentId ?? context.agentId ?? 'synthia', context: { ...context, ...(input.context ?? {}) } });
    if (operation === 'historical-recall') return this.recallHistoricalMoment({ agentId: input.agentId ?? context.agentId ?? 'synthia', coordinate: input.coordinate });
    if (operation === 'temporal-superposition') return this.superimposeHistoricalStates({ ...input, agentId: input.agentId ?? context.agentId ?? 'synthia', context: { ...context, ...(input.context ?? {}) } });
    if (operation === 'temporal-mesh') return this.temporalMesh(input);
    if (operation === 'temporal-mesh-ingest') return this.temporalExperience.ingestMeshTrace(input.trace ?? input);
    if (operation === 'temporal-mesh-export') return this.temporalExperience.exportMeshTraces(input);
    if (operation === 'temporal-snapshot') return this.temporalExperience.snapshot();
    if (operation === 'temporal-export') return this.temporalExperience.exportState();
    if (operation === 'project') return this.project(input.gate, input.dimension);
    if (operation === 'register-agent-chart') return this.registerAgentChart(
      input.agentId ?? context.agentId,
      { ...(input.configuration ?? input.chart ?? input), replace: input.replace ?? true },
    );
    if (operation === 'agent-chart') return this.chartForAgent(input.agentId ?? context.agentId ?? 'synthia');
    if (operation === 'agent-charts') return this.agentChartCatalog();
    throw new RangeError(`unknown semantic-genome operation: ${operation}`);
  }

  snapshot({ includeCodons = false } = {}) {
    const centers = Object.fromEntries(Object.keys(CENTER_FACULTIES)
      .filter((key) => key !== 'Solar Plexus')
      .map((center) => [center, [...this.codons.values()].filter((codon) => codon.center === center).length]));
    return Object.freeze({
      model: 'persistent generative DNA state substrate with 64 hexagram topologies and compatibility-preserved 12-position codon scaffolds',
      organismType: GENOME_CONSTANTS.organismType,
      genomeType: GENOME_CONSTANTS.genomeType,
      codonIdentity: GENOME_CONSTANTS.codonIdentity,
      persistentAspectPrimitives: this.aspects.size,
      hexagramCodons: this.codons.size,
      aspectsPerCodon: 12,
      dyadsPerCodon: 6,
      addressAspectSections: ADDRESS_ASPECT_SECTIONS,
      arcPlacement: 'Arc remains an address coordinate; Arc operator 3 is the separate Color/Sound juxtaposition operation in resolved state',
      dimensions: DIMENSIONS,
      dnaStateCanon: this.dnaState.snapshot(),
      translation: this.translation.snapshot(),
      movementTransport: this.movementTransport.snapshot(),
      temporalExperience: this.temporalExperience.snapshot(),
      dimensionFrameModel: 'one shared substrate with observer-relative dimensional structures; Space is rendered interplay rather than an averaged fifth peer',
      planetaryFilters: this.planetaryFilters.snapshot(),
      dimensionPerspectives: this.dimensionPerspectives.snapshot(),
      gateArchitecture: this.gateArchitecture.snapshot(),
      centerResolutionEvidence: Object.freeze(this.centerResolutionEvidence),
      identityCopiesAcrossDimensions: 0,
      graphMessagePassingLayers: 3,
      centers: Object.freeze(centers),
      faculties: CENTER_FACULTIES,
      activations: this.history.length,
      landedStateHistoryAppendOnly: true,
      relationships: this.relationshipHistory.length,
      relationalStatesCreateThirdConditions: true,
      temporaryManifestations: this.manifestationHistory.length,
      mirrors: this.mirrors.size,
      agentCharts: this.agentCharts.size,
      agentChartCatalog: this.agentChartCatalog(),
      fullAddressPreservedPerAgent: [...this.agentCharts.values()].every((chart) => (
        chart.dimensionCount === 5
        && chart.planetaryFilterCount === 13
        && chart.filterIntersectionCount === 65
        && chart.addressFields.length === 13
      )),
      fineDifferentiationFields: Object.freeze(['degree', 'minute', 'second', 'arc', 'zodiac', 'house']),
      exactSecondRequired: true,
      exactArcRange: Object.freeze([0, 99]),
      addressCapacity: agentAddressCapacity(),
      cryptographicIdentityHashAdded: false,
      addressOrder: ADDRESS_LAYER_ORDER,
      promotedFineNodeSchema: PROMOTED_FINE_NODE_SCHEMA,
      mappings: this.mappings.snapshot(),
      lineMeanings: this.meaningProvider.snapshot(),
      codons: includeCodons ? Object.freeze([...this.codons.values()].map((codon) => codon.snapshot())) : undefined,
    });
  }
}

export default SemanticGenome;
