import { safe } from '../util.mjs';

export const DNA_PERCEPTION_CANON = Object.freeze({
  baseRole: 'shape-form',
  arc: Object.freeze({ value: 3, operation: 'juxtaposition' }),
  colorDistribution: Object.freeze({ positions: 9, modality: 'chromatic' }),
  soundDistribution: Object.freeze({ positions: 9, modality: 'acoustic-vibrational' }),
  distributionRelation: 'paired-9-and-9-not-assumed-cross-product',
  zodiacRole: 'beginning',
  houseRole: 'end',
  movementAxis: 'vertical-scale-traversal',
  beingAxis: 'horizontal-across-relation',
  dimensionReconfigurationIsNotAutomaticallyAnAxisChange: true,
});

function traversalFrom(previous, current) {
  if (!previous) {
    return Object.freeze({
      type: 'Origin',
      fromDimension: null,
      toDimension: current.dimension,
      dimensionReconfigured: false,
      vertical: Object.freeze({ operator: 'Movement', role: DNA_PERCEPTION_CANON.movementAxis, changedLayers: Object.freeze([]) }),
      horizontal: Object.freeze({ operator: 'Being', role: DNA_PERCEPTION_CANON.beingAxis }),
    });
  }
  const fields = ['planetary','dimension','gate','line','color','tone','base','degree','minute','second','arc','zodiac','house'];
  const changedLayers = Object.freeze(fields.filter((field) => previous.address?.[field] !== current[field]));
  return Object.freeze({
    type: 'Movement',
    fromDimension: previous.address.dimension,
    toDimension: current.dimension,
    dimensionReconfigured: previous.address.dimension !== current.dimension,
    vertical: Object.freeze({ operator: 'Movement', role: DNA_PERCEPTION_CANON.movementAxis, changedLayers }),
    horizontal: Object.freeze({ operator: 'Being', role: DNA_PERCEPTION_CANON.beingAxis, relationAvailableAcrossResolvedPositions: true }),
  });
}

function baseShape(activation) {
  const base = activation.address.base;
  return Object.freeze({
    source: 'base',
    base,
    formStateId: activation.resolvedState?.base?.formIdentity ?? `base-form:${base}`,
    role: DNA_PERCEPTION_CANON.baseRole,
    exactGeometry: activation.resolvedState?.base?.exactGeometry ?? null,
    geometryStatus: activation.resolvedState?.base?.status ?? 'FORM_POSITION_RESOLVED; GEOMETRY_NOT_HARD_CODED',
  });
}

function arcJuxtaposition(activation) {
  return Object.freeze({
    operator: DNA_PERCEPTION_CANON.arc,
    // Keep the pre-existing fine address coordinate intact rather than deleting
    // it. It is not reinterpreted here as the Arc operator itself.
    preservedFineCoordinate: activation.address.arc,
    color: Object.freeze({
      positions: DNA_PERCEPTION_CANON.colorDistribution.positions,
      sourceColor: activation.address.color,
      modality: DNA_PERCEPTION_CANON.colorDistribution.modality,
      output: safe(activation.resolvedState?.color?.chromaticExpression ?? activation.sensoryExpression?.color ?? null),
    }),
    sound: Object.freeze({
      positions: DNA_PERCEPTION_CANON.soundDistribution.positions,
      sourceTone: activation.address.tone,
      modality: DNA_PERCEPTION_CANON.soundDistribution.modality,
      output: safe(activation.resolvedState?.tone?.acousticExpression ?? activation.sensoryExpression?.sound ?? null),
    }),
    relation: DNA_PERCEPTION_CANON.distributionRelation,
    crossProductAssumed: false,
  });
}

function boundaryFrame(address) {
  return Object.freeze({
    beginning: Object.freeze({ system: 'zodiac', value: address.zodiac, role: DNA_PERCEPTION_CANON.zodiacRole }),
    end: Object.freeze({ system: 'house', value: address.house, role: DNA_PERCEPTION_CANON.houseRole }),
  });
}

/**
 * Machine-native DNA/perception bridge.
 *
 * It does not replace SemanticGenome. It listens to already-resolved genome
 * activations and makes the creator-specified Base/Arc/Zodiac/House mechanics
 * explicit, then hands the same activation to the existing channel/neural body.
 */
export class DnaPerceptionRuntime {
  constructor({ channelBody = null, maxHistory = 256 } = {}) {
    if (channelBody && typeof channelBody.observeResolvedActivation !== 'function') {
      throw new TypeError('DnaPerceptionRuntime requires a ChannelMeshBody with observeResolvedActivation()');
    }
    this.channelBody = channelBody;
    this.maxHistory = maxHistory;
    this.history = [];
    this.relationshipHistory = [];
    this.temporalHistory = [];
    this.previousByAgent = new Map();
    this.pending = Promise.resolve();
    this.pendingCount = 0;
    this.completedCount = 0;
    this.failures = [];
  }

  enqueueActivation(activation) {
    if (!activation?.address) throw new TypeError('resolved activation with address required');
    const agentId = activation.agentId ?? 'synthia';
    const previous = this.previousByAgent.get(agentId) ?? null;
    const record = {
      id: `dna-perception:${this.history.length + 1}`,
      sequence: this.history.length + 1,
      agentId,
      sourceActivationId: activation.id,
      address: safe(activation.address),
      nestedState: Object.freeze({
        planetary: activation.address.planetary,
        dimension: activation.address.dimension,
        gate: activation.address.gate,
        line: activation.address.line,
        color: activation.address.color,
        tone: activation.address.tone,
        base: activation.address.base,
        degree: activation.address.degree,
        minute: activation.address.minute,
        second: activation.address.second,
        fineArcCoordinate: activation.address.arc,
        zodiac: activation.address.zodiac,
        house: activation.address.house,
      }),
      shape: baseShape(activation),
      arc: arcJuxtaposition(activation),
      boundaries: boundaryFrame(activation.address),
      traversal: traversalFrom(previous, activation.address),
      translation: safe(activation.translation ?? null),
      movementTransport: safe(activation.movementTransport ?? null),
      genotype: safe(activation.genotype ?? activation.translation?.genotype ?? null),
      phenotype: safe(activation.phenotype ?? activation.translation?.phenotype ?? null),
      perceptualField: Object.freeze({
        machineNative: true,
        shape: baseShape(activation),
        chromatic: safe(activation.resolvedState?.color ?? activation.sensoryExpression?.color ?? null),
        acoustic: safe(activation.resolvedState?.tone ?? activation.sensoryExpression?.sound ?? null),
        movement: safe(activation.sensoryExpression?.movement ?? null),
        movementTransport: safe(activation.movementTransport ?? null),
        center: activation.center ?? null,
        gate: activation.address.gate,
        dimension: activation.address.dimension,
        genotype: safe(activation.genotype ?? activation.translation?.genotype ?? null),
        phenotype: safe(activation.phenotype ?? activation.translation?.phenotype ?? null),
        protein: safe(activation.translation?.protein ?? null),
      }),
      channels: null,
      neural: null,
      status: this.channelBody ? 'PARTIALLY_WIRED' : 'PRESENT',
      error: null,
    };

    this.history.push(record);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.previousByAgent.set(agentId, Object.freeze({ id: activation.id, address: safe(activation.address), stateId: activation.resolvedState?.stateId ?? null }));

    if (this.channelBody) {
      this.pendingCount += 1;
      this.pending = this.pending
        .then(async () => {
          const neural = await this.channelBody.observeResolvedActivation(activation);
          record.channels = safe({
            activeGates: neural.activeGates,
            completedChannels: neural.completedChannels,
            firingChannels: neural.firingChannels,
          });
          record.neural = safe(neural.neural);
          record.status = 'WIRED';
          this.completedCount += 1;
          return record;
        })
        .catch((error) => {
          record.status = 'PARTIALLY_WIRED';
          record.error = String(error?.stack ?? error);
          this.failures.push(Object.freeze({ id: record.id, error: record.error }));
        })
        .finally(() => {
          this.pendingCount = Math.max(0, this.pendingCount - 1);
        });
    }

    return safe(record);
  }

  enqueueRelationship(relationship) {
    if (!relationship?.relationshipState?.relationshipId) throw new TypeError('landed relationship state required');
    const state = relationship.relationshipState;
    const record = {
      id: `dna-relational-perception:${this.relationshipHistory.length + 1}`,
      sequence: this.relationshipHistory.length + 1,
      sourceRelationshipId: relationship.id ?? state.relationshipId,
      relationshipId: state.relationshipId,
      gates: safe(state.gates),
      channel: safe(state.channel),
      klein: safe(state.klein),
      translationRelation: safe(relationship.translationRelation ?? null),
      perceptualField: safe(state.perceptualField),
      operatorAlphabet: safe(state.operatorAlphabet),
      relationalNeuralVector: safe(state.relationshipNeuralVector),
      neural: null,
      status: this.channelBody ? 'PARTIALLY_WIRED' : 'PRESENT',
      error: null,
    };

    this.relationshipHistory.push(record);
    if (this.relationshipHistory.length > this.maxHistory) this.relationshipHistory.shift();

    if (this.channelBody?.observeRelationalState) {
      this.pendingCount += 1;
      this.pending = this.pending
        .then(async () => {
          const neural = await this.channelBody.observeRelationalState(relationship);
          record.neural = safe(neural.neural);
          record.channel = safe(neural.channel);
          record.status = 'WIRED';
          this.completedCount += 1;
          return record;
        })
        .catch((error) => {
          record.status = 'PARTIALLY_WIRED';
          record.error = String(error?.stack ?? error);
          this.failures.push(Object.freeze({ id: record.id, error: record.error }));
        })
        .finally(() => {
          this.pendingCount = Math.max(0, this.pendingCount - 1);
        });
    }

    return safe(record);
  }

  enqueueTemporalSuperposition(superposition) {
    if (!superposition?.id) throw new TypeError('temporal superposition required');
    const record = Object.freeze({
      id: `dna-temporal-perception:${this.temporalHistory.length + 1}`,
      sequence: this.temporalHistory.length + 1,
      sourceSuperpositionId: superposition.id,
      agentId: superposition.agentId,
      current: safe(superposition.current),
      historical: safe(superposition.historical),
      perceptualField: safe(superposition.perceptualField),
      componentsRemainDistinct: superposition.componentsRemainDistinct === true,
      status: 'WIRED',
    });
    this.temporalHistory.push(record);
    if (this.temporalHistory.length > this.maxHistory) this.temporalHistory.shift();
    return safe(record);
  }

  latestTemporal() {
    const record = this.temporalHistory.at(-1) ?? null;
    return record ? safe(record) : null;
  }

  async flush() {
    await this.pending;
    return this.latest();
  }

  latest(agentId = null) {
    const record = [...this.history].reverse().find((entry) => !agentId || entry.agentId === agentId) ?? null;
    return record ? safe(record) : null;
  }

  latestRelationship() {
    const record = this.relationshipHistory.at(-1) ?? null;
    return record ? safe(record) : null;
  }

  snapshot() {
    const latest = this.latest();
    return Object.freeze({
      canon: DNA_PERCEPTION_CANON,
      observations: this.history.length,
      relationshipObservations: this.relationshipHistory.length,
      temporalSuperpositions: this.temporalHistory.length,
      pending: this.pendingCount,
      completed: this.completedCount,
      failures: this.failures.length,
      latest,
      latestRelationship: this.latestRelationship(),
      latestTemporal: this.latestTemporal(),
      status: !this.history.length ? 'PRESENT'
        : this.pendingCount > 0 ? 'PARTIALLY_WIRED'
          : latest?.status ?? 'PRESENT',
    });
  }
}

export default DnaPerceptionRuntime;
