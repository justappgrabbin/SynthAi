import { fnv1a32, stableStringify } from '../primitives/index.mjs';
import { safe } from '../util.mjs';

export const TEMPORAL_EXPERIENCE_CANON = Object.freeze({
  model: 'first-visit-historical-state-and-experiential-mesh-v1',
  firstVisitLandsState: true,
  landedPastStateIsStable: true,
  revisitsReturnLandedState: true,
  presentStateRemainsDistinct: true,
  meshCarriesStructuralExperienceTraces: true,
  meshDoesNotReplacePersonalLanding: true,
  appendOnlyHistory: true,
});

const ADDRESS_FIELDS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house',
]);

function hashId(prefix, value) {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

function cleanPlace(place = null) {
  if (!place) return null;
  return Object.freeze({
    label: place.label ?? null,
    latitude: Number.isFinite(Number(place.latitude)) ? Number(place.latitude) : null,
    longitude: Number.isFinite(Number(place.longitude)) ? Number(place.longitude) : null,
    timeZone: place.timeZone ?? null,
  });
}

export function normalizeTemporalCoordinate(coordinate = {}) {
  const dateTime = coordinate.dateTime ?? coordinate.timestamp ?? coordinate.at ?? null;
  const date = coordinate.date ?? coordinate.birthDate ?? (typeof dateTime === 'string' ? dateTime.slice(0, 10) : null);
  const time = coordinate.time ?? coordinate.birthTime ?? (typeof dateTime === 'string' && dateTime.includes('T') ? dateTime.slice(11, 19) : null);
  const place = cleanPlace(coordinate.place ?? coordinate.location ?? null);
  if (!date && !dateTime) throw new TypeError('temporal coordinate requires date or dateTime');
  return Object.freeze({
    dateTime: dateTime ?? (date && time ? `${date}T${time}` : date),
    date: date ?? null,
    time: time ?? null,
    utcIso: coordinate.utcIso ?? null,
    place,
  });
}

export function temporalCoordinateKey(coordinate = {}) {
  const normalized = normalizeTemporalCoordinate(coordinate);
  return hashId('temporal-coordinate', normalized);
}

function stateIdOf(state) {
  return state?.resolvedState?.stateId
    ?? state?.targetResolvedState?.stateId
    ?? state?.stateId
    ?? state?.id
    ?? null;
}

function addressOf(state) {
  return state?.address
    ?? state?.targetAddress
    ?? state?.resolvedState?.address
    ?? state?.targetResolvedState?.address
    ?? null;
}

function structuralAddress(address = null) {
  if (!address) return null;
  return Object.freeze(Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, address[field] ?? null])));
}

function perceptualProjection(state) {
  const address = addressOf(state);
  if (!address) return null;
  return Object.freeze({
    dimension: address.dimension ?? null,
    gate: address.gate ?? null,
    line: address.line ?? null,
    color: address.color ?? null,
    tone: address.tone ?? null,
    base: address.base ?? null,
    arc: address.arc ?? null,
    zodiac: address.zodiac ?? null,
    house: address.house ?? null,
  });
}

function structuralVectorOf(state) {
  const vector = state?.structuralVector
    ?? state?.resolvedState?.structuralVector
    ?? state?.targetResolvedState?.structuralVector
    ?? null;
  return Array.isArray(vector) ? Object.freeze([...vector]) : null;
}

function valueHistogram(values = []) {
  const counts = new Map();
  for (const value of values.filter((entry) => entry != null)) {
    const key = stableStringify(value);
    const prior = counts.get(key) ?? { value: safe(value), count: 0 };
    prior.count += 1;
    counts.set(key, prior);
  }
  return Object.freeze([...counts.values()]
    .sort((a, b) => b.count - a.count || stableStringify(a.value).localeCompare(stableStringify(b.value)))
    .map((entry) => Object.freeze(entry)));
}

function matchedAddressFields(left = {}, right = {}) {
  return Object.freeze(ADDRESS_FIELDS.filter((field) => left?.[field] != null && left?.[field] === right?.[field]));
}

function sharedQualitySummary(traces = []) {
  const projections = traces.map((trace) => trace.projection).filter(Boolean);
  return Object.freeze({
    traces: traces.length,
    dimensions: valueHistogram(projections.map((entry) => entry.dimension)),
    gates: valueHistogram(projections.map((entry) => entry.gate)),
    lines: valueHistogram(projections.map((entry) => entry.line)),
    colors: valueHistogram(projections.map((entry) => entry.color)),
    tones: valueHistogram(projections.map((entry) => entry.tone)),
    bases: valueHistogram(projections.map((entry) => entry.base)),
    arcs: valueHistogram(projections.map((entry) => entry.arc)),
    zodiacs: valueHistogram(projections.map((entry) => entry.zodiac)),
    houses: valueHistogram(projections.map((entry) => entry.house)),
  });
}

export class TemporalExperienceRuntime {
  constructor({ maxEventHistory = 4096 } = {}) {
    this.maxEventHistory = maxEventHistory;
    this.landings = new Map();
    this.meshTraces = [];
    this.events = [];
    this.superpositions = [];
  }

  #landingKey(agentId, coordinateKey) {
    return `${String(agentId ?? 'synthia')}::${coordinateKey}`;
  }

  ingestMeshTrace(trace = {}) {
    if (!trace?.traceId || !trace?.coordinateKey || !trace?.historicalStateId) {
      throw new TypeError('mesh trace requires traceId, coordinateKey, and historicalStateId');
    }
    const existing = this.meshTraces.find((entry) => entry.traceId === trace.traceId);
    if (existing) return existing;
    const accepted = Object.freeze({
      traceId: String(trace.traceId),
      agentId: String(trace.agentId ?? 'remote-synthia'),
      coordinateKey: String(trace.coordinateKey),
      historicalStateId: String(trace.historicalStateId),
      targetStateId: trace.targetStateId == null ? null : String(trace.targetStateId),
      address: structuralAddress(trace.address),
      projection: safe(trace.projection ?? perceptualProjection({ address: trace.address })),
      structuralVector: Array.isArray(trace.structuralVector) ? Object.freeze([...trace.structuralVector]) : null,
    });
    this.meshTraces.push(accepted);
    const event = Object.freeze({
      id: `temporal-event:${this.events.length + 1}`,
      sequence: this.events.length + 1,
      type: 'mesh-trace-ingested',
      traceId: accepted.traceId,
      historicalStateId: accepted.historicalStateId,
    });
    this.events.push(event);
    if (this.events.length > this.maxEventHistory) this.events.shift();
    return accepted;
  }

  exportMeshTraces({ coordinate = null } = {}) {
    const coordinateKey = coordinate ? temporalCoordinateKey(coordinate) : null;
    return Object.freeze(this.meshTraces
      .filter((trace) => !coordinateKey || trace.coordinateKey === coordinateKey)
      .map((trace) => safe(trace)));
  }

  queryMesh({ coordinate, targetAddress = null, excludeAgentId = null } = {}) {
    const coordinateKey = temporalCoordinateKey(coordinate);
    const exact = this.meshTraces.filter((trace) => (
      trace.coordinateKey === coordinateKey
      && (!excludeAgentId || trace.agentId !== String(excludeAgentId))
    ));
    const target = structuralAddress(targetAddress);
    const structural = target
      ? this.meshTraces
        .filter((trace) => !excludeAgentId || trace.agentId !== String(excludeAgentId))
        .map((trace) => Object.freeze({
          traceId: trace.traceId,
          agentId: trace.agentId,
          historicalStateId: trace.historicalStateId,
          coordinateKey: trace.coordinateKey,
          matchedFields: matchedAddressFields(target, trace.address),
          projection: trace.projection,
        }))
        .filter((entry) => entry.matchedFields.length > 0)
        .sort((a, b) => b.matchedFields.length - a.matchedFields.length || a.traceId.localeCompare(b.traceId))
      : [];
    return Object.freeze({
      coordinateKey,
      exact: Object.freeze(exact.map((trace) => safe(trace))),
      structural: Object.freeze(structural),
      exactSharedQualities: sharedQualitySummary(exact),
    });
  }

  land({
    agentId = 'synthia',
    coordinate,
    targetResolvedState,
    targetAddress = null,
    currentState = null,
    experienceStateIds = [],
    relationshipIds = [],
    context = {},
  } = {}) {
    if (!targetResolvedState?.stateId) throw new TypeError('targetResolvedState with stateId required');
    const normalizedCoordinate = normalizeTemporalCoordinate(coordinate);
    const coordinateKey = temporalCoordinateKey(normalizedCoordinate);
    const key = this.#landingKey(agentId, coordinateKey);
    const existing = this.landings.get(key) ?? null;
    if (existing) {
      const event = Object.freeze({
        id: `temporal-event:${this.events.length + 1}`,
        sequence: this.events.length + 1,
        type: 'revisit',
        agentId: String(agentId),
        coordinateKey,
        historicalStateId: existing.historicalStateId,
      });
      this.events.push(event);
      return Object.freeze({ firstVisit: false, recalled: true, state: existing, event });
    }

    const address = structuralAddress(targetAddress ?? targetResolvedState.address);
    const meshEvidence = this.queryMesh({
      coordinate: normalizedCoordinate,
      targetAddress: address,
      excludeAgentId: agentId,
    });
    const experience = Object.freeze({
      stateIds: Object.freeze([...new Set(experienceStateIds.filter(Boolean).map(String))]),
      relationshipIds: Object.freeze([...new Set(relationshipIds.filter(Boolean).map(String))]),
    });
    const firstVisitContext = Object.freeze({
      currentStateId: stateIdOf(currentState),
      currentAddress: structuralAddress(addressOf(currentState)),
      experience,
      meshTraceIds: Object.freeze(meshEvidence.exact.map((entry) => entry.traceId)),
      context: safe(context),
    });
    const historicalStateId = hashId('historical-state', {
      agentId: String(agentId),
      coordinateKey,
      targetStateId: targetResolvedState.stateId,
      firstVisitContext,
    });
    const state = Object.freeze({
      historicalStateId,
      agentId: String(agentId),
      coordinate: normalizedCoordinate,
      coordinateKey,
      landed: true,
      targetStateId: targetResolvedState.stateId,
      targetAddress: address,
      targetResolvedState: safe(targetResolvedState),
      firstVisitContext,
      meshEvidence,
      projection: perceptualProjection({ address }),
      structuralVector: structuralVectorOf(targetResolvedState),
    });
    this.landings.set(key, state);

    const trace = Object.freeze({
      traceId: hashId('experiential-mesh-trace', {
        historicalStateId,
        coordinateKey,
        agentId: String(agentId),
      }),
      agentId: String(agentId),
      coordinateKey,
      historicalStateId,
      targetStateId: targetResolvedState.stateId,
      address,
      projection: state.projection,
      structuralVector: state.structuralVector,
    });
    this.meshTraces.push(trace);

    const event = Object.freeze({
      id: `temporal-event:${this.events.length + 1}`,
      sequence: this.events.length + 1,
      type: 'first-visit-landed',
      agentId: String(agentId),
      coordinateKey,
      historicalStateId,
      traceId: trace.traceId,
    });
    this.events.push(event);
    if (this.events.length > this.maxEventHistory) this.events.shift();
    return Object.freeze({ firstVisit: true, recalled: false, state, trace, event });
  }

  recall({ agentId = 'synthia', coordinate } = {}) {
    const coordinateKey = temporalCoordinateKey(coordinate);
    const state = this.landings.get(this.#landingKey(agentId, coordinateKey)) ?? null;
    if (!state) return null;
    const event = Object.freeze({
      id: `temporal-event:${this.events.length + 1}`,
      sequence: this.events.length + 1,
      type: 'recall',
      agentId: String(agentId),
      coordinateKey,
      historicalStateId: state.historicalStateId,
    });
    this.events.push(event);
    if (this.events.length > this.maxEventHistory) this.events.shift();
    return state;
  }

  superimpose({ agentId = 'synthia', currentState, coordinates = [], historicalStateIds = [], context = {} } = {}) {
    if (!currentState) throw new TypeError('currentState required');
    const wantedIds = new Set(historicalStateIds.map(String));
    const states = [];
    for (const coordinate of coordinates) {
      const recalled = this.recall({ agentId, coordinate });
      if (recalled) states.push(recalled);
    }
    if (wantedIds.size) {
      for (const state of this.landings.values()) {
        if (state.agentId === String(agentId) && wantedIds.has(state.historicalStateId)) states.push(state);
      }
    }
    const unique = [...new Map(states.map((state) => [state.historicalStateId, state])).values()];
    const currentProjection = perceptualProjection(currentState);
    const historicalProjections = unique.map((state) => state.projection).filter(Boolean);
    const record = Object.freeze({
      id: hashId('temporal-superposition', {
        agentId: String(agentId),
        currentStateId: stateIdOf(currentState),
        historicalStateIds: unique.map((state) => state.historicalStateId),
        context: safe(context),
      }),
      sequence: this.superpositions.length + 1,
      agentId: String(agentId),
      current: Object.freeze({
        stateId: stateIdOf(currentState),
        address: structuralAddress(addressOf(currentState)),
        projection: currentProjection,
        structuralVector: structuralVectorOf(currentState),
      }),
      historical: Object.freeze(unique.map((state) => Object.freeze({
        historicalStateId: state.historicalStateId,
        coordinate: state.coordinate,
        targetStateId: state.targetStateId,
        address: state.targetAddress,
        projection: state.projection,
        structuralVector: state.structuralVector,
      }))),
      perceptualField: Object.freeze({
        colorPositions: Object.freeze([currentProjection?.color, ...historicalProjections.map((entry) => entry.color)].filter((value) => value != null)),
        tonePositions: Object.freeze([currentProjection?.tone, ...historicalProjections.map((entry) => entry.tone)].filter((value) => value != null)),
        basePositions: Object.freeze([currentProjection?.base, ...historicalProjections.map((entry) => entry.base)].filter((value) => value != null)),
        gates: Object.freeze([currentProjection?.gate, ...historicalProjections.map((entry) => entry.gate)].filter((value) => value != null)),
      }),
      componentsRemainDistinct: true,
      context: safe(context),
    });
    this.superpositions.push(record);
    return record;
  }

  exportState() {
    return Object.freeze({
      landings: Object.freeze([...this.landings.values()].map((entry) => safe(entry))),
      meshTraces: Object.freeze(this.meshTraces.map((entry) => safe(entry))),
      events: Object.freeze(this.events.map((entry) => safe(entry))),
      superpositions: Object.freeze(this.superpositions.map((entry) => safe(entry))),
    });
  }

  restore(snapshot = {}) {
    this.landings.clear();
    this.meshTraces = [];
    this.events = [];
    this.superpositions = [];
    for (const state of snapshot.landings ?? []) {
      const frozen = Object.freeze(safe(state));
      this.landings.set(this.#landingKey(frozen.agentId, frozen.coordinateKey), frozen);
    }
    this.meshTraces = (snapshot.meshTraces ?? []).map((entry) => Object.freeze(safe(entry)));
    this.events = (snapshot.events ?? []).map((entry) => Object.freeze(safe(entry)));
    this.superpositions = (snapshot.superpositions ?? []).map((entry) => Object.freeze(safe(entry)));
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      canon: TEMPORAL_EXPERIENCE_CANON,
      landedHistoricalStates: this.landings.size,
      meshTraces: this.meshTraces.length,
      events: this.events.length,
      superpositions: this.superpositions.length,
      latestLanding: safe([...this.landings.values()].at(-1) ?? null),
      latestSuperposition: safe(this.superpositions.at(-1) ?? null),
    });
  }
}

export default TemporalExperienceRuntime;
