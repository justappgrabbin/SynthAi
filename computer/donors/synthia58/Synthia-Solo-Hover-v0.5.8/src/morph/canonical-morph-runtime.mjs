import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';
import { AGENT_ADDRESS_LAYER_ORDER, validateAgentAddress } from '../state-space/agent-address.mjs';

export const CANONICAL_MORPH_CANON = Object.freeze({
  version: 'canonical-surface-morph-v1',
  addressOrder: AGENT_ADDRESS_LAYER_ORDER,
  stages: Object.freeze([
    'canonical-state',
    'relational-context',
    'temporal-context',
    'mesh-context',
    'surface-endpoints',
    'landmark-registration',
    'mesh-build',
    'motion-field',
    'joint-interpolation',
    'surface-reconstruction',
    'frame-validation',
  ]),
  surfaceEndpointFields: Object.freeze(['name', 'landmarks']),
});

function idFor(prefix, value) {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

function stateIdOf(activation) {
  return activation?.resolvedState?.stateId ?? activation?.stateId ?? activation?.id ?? null;
}

function addressOf(activation) {
  return activation?.address ?? activation?.resolvedState?.address ?? null;
}

function canonicalAddress(address) {
  if (!address) return null;
  validateAgentAddress(address);
  return Object.freeze(Object.fromEntries(AGENT_ADDRESS_LAYER_ORDER.map((field) => [field, safe(address[field])])));
}

function surfaceDescriptor(surface) {
  if (!surface) return null;
  if (!surface.name || !surface.landmarks || typeof surface.landmarks !== 'object') {
    throw new TypeError('surface endpoint requires name and landmarks');
  }
  return Object.freeze({
    name: String(surface.name),
    width: Number.isFinite(Number(surface.width)) ? Number(surface.width) : null,
    height: Number.isFinite(Number(surface.height)) ? Number(surface.height) : null,
    landmarkNames: Object.freeze(Object.keys(surface.landmarks).sort()),
  });
}

function activationProjection(activation) {
  if (!activation) return null;
  const address = canonicalAddress(addressOf(activation));
  const resolvedState = activation.resolvedState ?? activation;
  return Object.freeze({
    activationId: activation.id ?? null,
    agentId: activation.agentId ?? null,
    stateId: stateIdOf(activation),
    address,
    originAddress: safe(resolvedState?.originAddress ?? null),
    resolvedState: safe(resolvedState),
    structuralVector: safe(activation.structuralVector ?? resolvedState?.structuralVector ?? null),
    sensoryExpression: safe(activation.sensoryExpression ?? null),
    translation: safe(activation.translation ?? null),
    genotype: safe(activation.genotype ?? activation.translation?.genotype ?? null),
    phenotype: safe(activation.phenotype ?? activation.translation?.phenotype ?? null),
    movementTransport: safe(activation.movementTransport ?? null),
  });
}

function relationshipMatches(relationship, stateId) {
  if (!relationship || !stateId) return false;
  const state = relationship.relationshipState ?? relationship;
  return state.leftStateId === stateId || state.rightStateId === stateId
    || state.endpoints?.left?.stateId === stateId || state.endpoints?.right?.stateId === stateId;
}

function relationshipProjection(relationship) {
  if (!relationship) return null;
  const state = relationship.relationshipState ?? relationship;
  return Object.freeze({
    relationshipId: state.relationshipId ?? relationship.id ?? null,
    gates: safe(state.gates ?? null),
    endpoints: safe(state.endpoints ?? null),
    channel: safe(state.channel ?? null),
    klein: safe(state.klein ?? null),
    operatorAlphabet: safe(state.operatorAlphabet ?? null),
    perceptualField: safe(state.perceptualField ?? null),
    relationshipNeuralVector: safe(state.relationshipNeuralVector ?? relationship.relationalNeuralVector ?? null),
  });
}

function temporalProjection(superposition) {
  if (!superposition) return null;
  return Object.freeze({
    id: superposition.id ?? superposition.sourceSuperpositionId ?? null,
    agentId: superposition.agentId ?? null,
    current: safe(superposition.current ?? null),
    historical: safe(superposition.historical ?? []),
    perceptualField: safe(superposition.perceptualField ?? null),
    componentsRemainDistinct: superposition.componentsRemainDistinct === true,
  });
}

export class CanonicalMorphRuntime {
  constructor({ semanticGenome = null, dnaPerception = null, maxHistory = 512 } = {}) {
    this.semanticGenome = semanticGenome;
    this.dnaPerception = dnaPerception;
    this.maxHistory = maxHistory;
    this.latestActivation = null;
    this.latestRelationship = null;
    this.latestSuperposition = null;
    this.history = [];
  }

  observeActivation(activation) {
    if (activation?.address) this.latestActivation = activation;
    return this.latestActivation;
  }

  observeRelationship(relationship) {
    if (relationship?.relationshipState?.relationshipId || relationship?.relationshipId) this.latestRelationship = relationship;
    return this.latestRelationship;
  }

  observeTemporalSuperposition(superposition) {
    if (superposition?.id || superposition?.sourceSuperpositionId) this.latestSuperposition = superposition;
    return this.latestSuperposition;
  }

  prepare({
    activation = null,
    target = null,
    relationship = null,
    superposition = null,
    meshEvidence = null,
    environment = null,
    sourceSurface = null,
    targetSurface = null,
    context = {},
  } = {}) {
    const currentActivation = activation ?? this.latestActivation;
    if (!currentActivation?.address) throw new TypeError('canonical morph requires a resolved activation');
    const current = activationProjection(currentActivation);
    const stateId = current.stateId;

    const relationCandidate = relationship
      ?? (relationshipMatches(this.latestRelationship, stateId) ? this.latestRelationship : null);
    const latestTemporal = this.latestSuperposition ?? this.dnaPerception?.latestTemporal?.() ?? null;
    const temporalCandidate = superposition
      ?? ((!current.agentId || !latestTemporal?.agentId || latestTemporal.agentId === current.agentId) ? latestTemporal : null);
    const perception = this.dnaPerception?.latest?.(current.agentId ?? null) ?? null;

    const targetProjection = target?.address || target?.resolvedState
      ? activationProjection(target)
      : (target == null ? null : safe(target));

    const sourceDescriptor = surfaceDescriptor(sourceSurface);
    const targetDescriptor = surfaceDescriptor(targetSurface);
    const renderReady = Boolean(sourceDescriptor && targetDescriptor);

    const packetCore = Object.freeze({
      current,
      target: targetProjection,
      relationship: relationshipProjection(relationCandidate),
      temporal: temporalProjection(temporalCandidate),
      mesh: safe(meshEvidence ?? null),
      perception: safe(perception),
      environment: safe(environment),
      surfaces: Object.freeze({ source: sourceDescriptor, target: targetDescriptor }),
      context: safe(context),
    });
    const packetId = idFor('canonical-morph', packetCore);
    const packet = Object.freeze({
      id: packetId,
      canon: CANONICAL_MORPH_CANON,
      ...packetCore,
      klein: packetCore.relationship?.klein ?? null,
      renderReady,
      renderer: Object.freeze({
        type: 'deep-surface-landmark-transition',
        stages: CANONICAL_MORPH_CANON.stages.slice(5),
      }),
    });
    return packet;
  }

  async execute({ renderer = null, sourceSurface = null, targetSurface = null, options = {}, ...spec } = {}) {
    const packet = this.prepare({ ...spec, sourceSurface, targetSurface });
    if (!renderer) {
      const result = Object.freeze({ status: packet.renderReady ? 'READY_FOR_RENDERER' : 'AWAITING_SURFACE_ENDPOINTS', packet });
      this.#record(result);
      return result;
    }
    if (typeof renderer.morph !== 'function') throw new TypeError('renderer must expose morph()');
    if (!packet.renderReady) throw new TypeError('renderer execution requires sourceSurface and targetSurface');
    const renderResult = await renderer.morph({ packet, sourceSurface, targetSurface, options });
    const result = Object.freeze({ status: 'RENDERED', packet, renderResult });
    this.#record(Object.freeze({
      status: result.status,
      packet: safe(packet),
      renderResult: safe({
        adapterId: renderResult?.adapterId ?? renderer.id ?? null,
        frameCount: renderResult?.frames?.length ?? renderResult?.frameCount ?? null,
        edge: renderResult?.edge?.toJSON?.() ?? safe(renderResult?.edge ?? null),
        report: safe(renderResult?.report ?? null),
      }),
    }));
    return result;
  }

  #record(record) {
    this.history.push(Object.freeze({ sequence: this.history.length + 1, ...safe(record) }));
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  snapshot() {
    return Object.freeze({
      canon: CANONICAL_MORPH_CANON,
      preparedOrRendered: this.history.length,
      latestActivationStateId: stateIdOf(this.latestActivation),
      latestRelationshipId: (this.latestRelationship?.relationshipState ?? this.latestRelationship)?.relationshipId ?? null,
      latestSuperpositionId: this.latestSuperposition?.id ?? this.latestSuperposition?.sourceSuperpositionId ?? null,
      latest: safe(this.history.at(-1) ?? null),
    });
  }
}

export default CanonicalMorphRuntime;
