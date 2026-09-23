const clone = value => value === undefined ? undefined : structuredClone(value);

function valuesOf(collection) {
  if (collection instanceof Map) return [...collection.values()];
  if (Array.isArray(collection)) return collection;
  return Object.values(collection ?? {});
}

export class ConsciousnessRealmAdapter {
  constructor({ engine, id = 'reality:consciousness-realm', clock = () => Date.now(), maxCatchUpTicks = 10000 } = {}) {
    if (!engine?.agents || !engine?.places || typeof engine.tick !== 'function' || typeof engine.createAgent !== 'function') {
      throw new TypeError('ConsciousnessRealmAdapter requires the AgentLifeEngine contract');
    }
    Object.assign(this, { engine, id, clock, maxCatchUpTicks });
    this.name = 'Consciousness Realm';
    this.projections = new Map();
    this.listeners = new Set();
    if (typeof engine.onUpdate === 'function') {
      engine.onUpdate(() => this.#emit({
        type: 'realm:tick',
        source: this.id,
        summary: this.#timeSummary(),
        payload: this.snapshot(),
      }));
    }
  }

  bindProjection(residentId, { humanProfile, canonicalIdentity = {} } = {}) {
    if (!residentId || !humanProfile?.id) throw new Error('Realm projection requires residentId and humanProfile.id');
    if (!canonicalIdentity.birthChart) {
      throw new Error('Realm projection requires externally resolved canonicalIdentity.birthChart');
    }
    let agent = typeof this.engine.getAgentForHuman === 'function'
      ? this.engine.getAgentForHuman(humanProfile.id)
      : valuesOf(this.engine.agents).find(item => item.humanId === humanProfile.id);

    if (!agent) {
      // Reuse the donor's real createAgent path while replacing only its
      // explicitly non-canonical random/simple chart generator for this call.
      // This preserves donor needs, places, schedule, memories and event setup.
      const originalGenerateBirthChart = this.engine.generateBirthChart;
      if (typeof originalGenerateBirthChart !== 'function') {
        throw new Error('AgentLifeEngine generateBirthChart hook unavailable for canonical projection');
      }
      this.engine.generateBirthChart = () => clone(canonicalIdentity.birthChart);
      try { agent = this.engine.createAgent(humanProfile); }
      finally { this.engine.generateBirthChart = originalGenerateBirthChart; }
    }

    // Realm agent is a world projection only. Canonical identity remains owned
    // by Synthia 5.7 and is overlaid after donor creation.
    if (canonicalIdentity.name) agent.name = canonicalIdentity.name;
    agent.birthChart = clone(canonicalIdentity.birthChart);
    if (canonicalIdentity.traits) agent.traits = clone(canonicalIdentity.traits);
    if (typeof this.engine.determineElement === 'function') agent.element = this.engine.determineElement(agent.birthChart);
    if (typeof this.engine.determineArchetype === 'function') agent.archetype = this.engine.determineArchetype(agent.birthChart);
    if (typeof this.engine.generateSchedule === 'function') agent.dailySchedule = this.engine.generateSchedule(agent.birthChart);
    agent.externalIdentity = clone(canonicalIdentity);
    agent.projectionOf = String(residentId);
    this.projections.set(String(residentId), agent.id);
    this.#emit({
      type: 'realm:projection-bound',
      source: this.id,
      summary: `${agent.name} entered Consciousness Realm`,
      payload: { residentId: String(residentId), agentId: agent.id, location: clone(agent.location) },
    });
    return this.#publicAgent(agent);
  }

  projection(residentId = 'synthia') {
    const agentId = this.projections.get(String(residentId));
    return agentId ? this.engine.agents.get(agentId) ?? null : null;
  }

  subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('Realm subscriber callback required');
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      time: clone(this.engine.time),
      places: valuesOf(this.engine.places).map(place => ({
        id: place.id, name: place.name, type: place.type, description: place.description,
        position: clone(place.position), activities: clone(place.activities ?? []),
        currentAgents: clone(place.currentAgents ?? []),
      })),
      residents: valuesOf(this.engine.agents).map(agent => this.#publicAgent(agent)),
      events: clone((this.engine.events ?? []).slice(-50)),
      projectionAuthority: 'world-only',
      checkpointState: {
        time: clone(this.engine.time),
        agents: valuesOf(this.engine.agents).map(clone),
        places: valuesOf(this.engine.places).map(clone),
        events: clone(this.engine.events ?? []),
        messages: clone(this.engine.messages ?? []),
        projections: [...this.projections.entries()].map(clone),
      },
    };
  }

  hydrate(snapshot = {}) {
    const saved = snapshot.checkpointState ?? snapshot;
    if (saved.time) this.engine.time = clone(saved.time);
    if (Array.isArray(saved.agents)) this.engine.agents = new Map(saved.agents.map(agent => [agent.id, clone(agent)]));
    if (Array.isArray(saved.places)) this.engine.places = new Map(saved.places.map(place => [place.id, clone(place)]));
    if (Array.isArray(saved.events)) this.engine.events = clone(saved.events);
    if (Array.isArray(saved.messages)) this.engine.messages = clone(saved.messages);
    if (Array.isArray(saved.projections)) this.projections = new Map(saved.projections.map(clone));
    this.#emit({ type:'realm:hydrated', source:this.id, summary:this.#timeSummary(), payload:{ time:clone(this.engine.time) } });
    return this.snapshot();
  }

  async applyAction(action = {}) {
    const residentId = String(action.actor ?? action.residentId ?? 'synthia');
    const agent = this.projection(residentId);
    if (!agent) return { accepted: false, reason: 'NO_REALM_PROJECTION', residentId };

    const type = String(action.type ?? action.action ?? 'world_action');
    const payload = action.payload ?? {};
    let effect = null;

    if (['travel', 'move'].includes(type)) {
      const placeId = action.target?.placeId ?? payload.placeId ?? action.target;
      effect = this.#move(agent, String(placeId));
    } else if (['work', 'working'].includes(type)) {
      effect = this.#activity(agent, 'working', action.target?.placeId ?? payload.placeId ?? 'studio');
    } else if (['rest', 'resting'].includes(type)) {
      effect = this.#activity(agent, 'resting', action.target?.placeId ?? payload.placeId ?? 'home');
    } else if (['socialize', 'socializing'].includes(type)) {
      effect = this.#activity(agent, 'socializing', action.target?.placeId ?? payload.placeId ?? 'plaza');
    } else if (['create', 'creating'].includes(type)) {
      effect = this.#activity(agent, 'creating', action.target?.placeId ?? payload.placeId ?? 'studio');
    } else if (['learn', 'learning'].includes(type)) {
      effect = this.#activity(agent, 'learning', action.target?.placeId ?? payload.placeId ?? 'library');
    } else if (['explore', 'exploring'].includes(type)) {
      effect = this.#activity(agent, 'exploring', action.target?.placeId ?? payload.placeId ?? 'wilds');
    } else if (['meditate', 'meditating'].includes(type)) {
      effect = this.#activity(agent, 'meditating', action.target?.placeId ?? payload.placeId ?? 'garden');
    } else if (type === 'activity') {
      effect = this.#activity(agent, String(payload.activity ?? action.target?.activity ?? 'resting'), String(payload.placeId ?? action.target?.placeId ?? agent.location?.placeId ?? 'home'));
    } else if (type === 'tick') {
      const ticks = Math.max(1, Math.min(this.maxCatchUpTicks, Number(payload.ticks ?? 1)));
      for (let i = 0; i < ticks; i += 1) this.engine.tick();
      effect = { ticks, time: clone(this.engine.time) };
    } else {
      return { accepted: false, reason: 'UNSUPPORTED_REALM_ACTION', type };
    }

    const event = {
      id: action.id ?? `realm-action-${this.clock()}`,
      type: 'realm:action',
      source: this.id,
      summary: `${agent.name} ${type}`,
      payload: { residentId, type, effect: clone(effect) },
      accepted: true,
      at: new Date(this.clock()).toISOString(),
    };
    this.#emit(event);
    return { accepted: true, residentId, type, effect, projection: this.#publicAgent(agent) };
  }

  advanceElapsed(elapsedMs, { maxTicks = this.maxCatchUpTicks } = {}) {
    // Live Realm intentionally runs accelerated (1 real second = 10 world minutes).
    // Dormancy follows Animal-Crossing-style elapsed real time instead: one real
    // minute advances one world minute, replayed through the donor in 10-minute ticks.
    const elapsed = Math.max(0, Number(elapsedMs ?? 0));
    const worldMinutes = Math.floor(elapsed / 60000);
    const requestedTicks = Math.floor(worldMinutes / 10);
    const executedTicks = Math.min(requestedTicks, Math.max(0, Number(maxTicks)));
    for (let i = 0; i < executedTicks; i += 1) this.engine.tick();
    const replayedMinutes = executedTicks * 10;
    const pendingMinutes = Math.max(0, worldMinutes - replayedMinutes);
    return {
      elapsedMs: elapsed,
      worldMinutes,
      requestedTicks,
      executedTicks,
      replayedMinutes,
      pendingMinutes,
      pendingTicks: Math.floor(pendingMinutes / 10),
      complete: pendingMinutes < 10,
      time: clone(this.engine.time),
    };
  }

  #activity(agent, activity, placeId) {
    const place = this.engine.places.get(placeId);
    if (!place) return { accepted: false, reason: 'UNKNOWN_PLACE', placeId };
    if (typeof this.engine.startActivity === 'function') {
      this.engine.startActivity(agent, activity, placeId);
      // Donor writes Date.now() but updateAgent subtracts startTime/60000 from
      // world totalMinutes. Normalize only the clock basis at the adapter edge.
      if (agent.currentActivity) agent.currentActivity.startTime = Number(this.engine.time?.totalMinutes ?? 0) * 60000;
    } else {
      this.#move(agent, placeId);
      agent.currentActivity = { id: `external-${this.clock()}`, type: activity, placeId, startTime: this.clock(), duration: 60 };
    }
    return { activity, placeId, currentActivity: clone(agent.currentActivity) };
  }

  #move(agent, placeId) {
    const place = this.engine.places.get(placeId);
    if (!place) return { accepted: false, reason: 'UNKNOWN_PLACE', placeId };
    for (const candidate of valuesOf(this.engine.places)) {
      if (Array.isArray(candidate.currentAgents)) candidate.currentAgents = candidate.currentAgents.filter(id => id !== agent.id);
    }
    if (Array.isArray(place.currentAgents) && !place.currentAgents.includes(agent.id)) place.currentAgents.push(agent.id);
    agent.location = {
      ...(agent.location ?? {}),
      placeId,
      x: place.position?.x ?? agent.location?.x ?? 0,
      y: place.position?.y ?? agent.location?.y ?? 0,
    };
    return { placeId, location: clone(agent.location) };
  }

  #publicAgent(agent) {
    return {
      id: agent.id,
      humanId: agent.humanId,
      name: agent.name,
      projectionOf: agent.projectionOf ?? null,
      location: clone(agent.location),
      currentActivity: clone(agent.currentActivity ?? null),
      relationships: clone(agent.relationships ?? []),
      worldNeeds: clone(agent.needs ?? null),
      lifeStage: agent.lifeStage ?? null,
      externalIdentity: clone(agent.externalIdentity ?? null),
      authority: 'projection-only',
    };
  }

  #timeSummary() {
    const t = this.engine.time ?? {};
    return `Consciousness Realm day ${t.day ?? '?'} ${String(t.hour ?? 0).padStart(2,'0')}:${String(t.minute ?? 0).padStart(2,'0')}`;
  }

  #emit(event) {
    for (const listener of this.listeners) {
      try { listener(clone(event)); } catch {}
    }
  }
}

export default ConsciousnessRealmAdapter;
