const clone = value => value === undefined ? undefined : structuredClone(value);

function mapValues(map) {
  return [...map.values()].map(clone);
}

export class ConsciousnessRealmAdapter {
  constructor({ engine, bus = null, clock = () => Date.now(), id = 'reality:consciousness-realm' } = {}) {
    if (!engine?.agents || !engine?.places || typeof engine.tick !== 'function') {
      throw new TypeError('ConsciousnessRealmAdapter requires the real AgentLifeEngine');
    }
    Object.assign(this, { engine, bus, clock, id });
    this.subscribers = new Set();
    this.dormantRemainderMs = 0;

    if (typeof engine.onUpdate === 'function') {
      engine.onUpdate(() => this.#emit({
        type: 'world_tick',
        source: this.id,
        summary: `Realm day ${engine.time?.day ?? '?'} ${String(engine.time?.hour ?? 0).padStart(2,'0')}:${String(engine.time?.minute ?? 0).padStart(2,'0')}`,
        payload: { time: clone(engine.time) },
        at: new Date(this.clock()).toISOString(),
      }));
    }
  }

  subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('world subscriber function required');
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  #emit(event) {
    for (const callback of this.subscribers) callback(clone(event));
    this.bus?.emit('consciousness-realm:event', clone(event));
  }

  snapshot() {
    return {
      id: this.id,
      donor: 'ConsciousnessRealm/attached_assets/AgentLifeEngine_1777724026235.ts',
      time: clone(this.engine.time),
      agents: mapValues(this.engine.agents),
      places: mapValues(this.engine.places),
      events: clone(this.engine.events ?? []),
      messages: clone(this.engine.messages ?? []),
      dormantRemainderMs: this.dormantRemainderMs,
    };
  }

  hydrate(snapshot = {}) {
    if (snapshot.time) this.engine.time = clone(snapshot.time);
    if (Array.isArray(snapshot.agents)) this.engine.agents = new Map(snapshot.agents.map(agent => [agent.id, clone(agent)]));
    if (Array.isArray(snapshot.places)) this.engine.places = new Map(snapshot.places.map(place => [place.id, clone(place)]));
    if (Array.isArray(snapshot.events)) this.engine.events = clone(snapshot.events);
    if (Array.isArray(snapshot.messages)) this.engine.messages = clone(snapshot.messages);
    this.dormantRemainderMs = Number(snapshot.dormantRemainderMs ?? 0);
    this.#emit({ type:'world_hydrated', source:this.id, summary:'Consciousness Realm restored from checkpoint', payload:{time:clone(this.engine.time)} });
    return this.snapshot();
  }

  admitCanonicalResident(agent) {
    if (!agent?.id || !agent?.humanId || !agent?.name) throw new Error('canonical resident requires id, humanId and name');
    if (!agent.birthChart) throw new Error('canonical resident requires externally resolved birthChart; Realm random chart generation is not allowed here');
    if (!agent.traits || !agent.needs || !agent.state || !agent.location) {
      throw new Error('canonical resident requires traits, needs, state and location supplied by resident adapter');
    }
    const record = clone(agent);
    record.relationships ??= [];
    record.memories ??= [];
    record.skills ??= {};
    record.consciousness ??= { level: 10, stage: 'dormant', insights: [] };
    record.dailySchedule ??= typeof this.engine.generateSchedule === 'function'
      ? clone(this.engine.generateSchedule(record.birthChart))
      : [];
    this.engine.agents.set(record.id, record);
    const home = this.engine.places.get(record.location.placeId ?? 'home');
    if (home && !home.currentAgents.includes(record.id)) home.currentAgents.push(record.id);
    this.#emit({ type:'resident_admitted', source:this.id, summary:`${record.name} entered Consciousness Realm`, payload:{agentId:record.id} });
    return clone(record);
  }

  async advanceElapsed(elapsedMs) {
    const totalMs = Math.max(0, Number(elapsedMs ?? 0)) + this.dormantRemainderMs;
    // Dormant time follows real elapsed minutes. The donor's live 1 sec -> 10
    // game-minute acceleration remains a live-play behavior, not an offline multiplier.
    const worldMinutes = Math.floor(totalMs / 60000);
    this.dormantRemainderMs = totalMs % 60000;
    const ticks = Math.floor(worldMinutes / 10);
    const remainderMinutes = worldMinutes % 10;
    for (let i = 0; i < ticks; i++) this.engine.tick();
    if (remainderMinutes) {
      this.engine.time.minute += remainderMinutes;
      while (this.engine.time.minute >= 60) { this.engine.time.minute -= 60; this.engine.time.hour += 1; }
      while (this.engine.time.hour >= 24) { this.engine.time.hour -= 24; this.engine.time.day += 1; }
      this.engine.time.totalMinutes = this.engine.time.day * 1440 + this.engine.time.hour * 60 + this.engine.time.minute;
    }
    const result = { elapsedMs:Number(elapsedMs ?? 0), worldMinutes, donorTicks:ticks, remainderMinutes, time:clone(this.engine.time) };
    this.#emit({ type:'dormant_time_advanced', source:this.id, summary:`Realm advanced ${worldMinutes} minutes while dormant`, payload:result });
    return result;
  }

  async applyAction(action = {}) {
    const type = String(action.type ?? action.action ?? 'world_action');
    const p = clone(action.payload ?? action.data ?? {});
    let result;

    if (type === 'world.tick') {
      const ticks = Math.max(1, Number(p.ticks ?? 1));
      for (let i = 0; i < ticks; i++) this.engine.tick();
      result = { ticks, time:clone(this.engine.time) };
    } else if (type === 'world.advance-elapsed') {
      result = await this.advanceElapsed(Number(p.elapsedMs ?? 0));
    } else if (type === 'resident.admit') {
      result = this.admitCanonicalResident(p.agent);
    } else if (type === 'agent.move') {
      const agent = this.engine.agents.get(String(p.agentId));
      const place = this.engine.places.get(String(p.placeId));
      if (!agent || !place) throw new Error('agent.move requires known agent and place');
      const oldPlace = this.engine.places.get(agent.location.placeId);
      if (oldPlace) oldPlace.currentAgents = oldPlace.currentAgents.filter(id => id !== agent.id);
      agent.location = { placeId:place.id, x:Number(p.x ?? place.position.x), y:Number(p.y ?? place.position.y) };
      if (!place.currentAgents.includes(agent.id)) place.currentAgents.push(agent.id);
      result = { agentId:agent.id, location:clone(agent.location) };
    } else if (type === 'activity.start') {
      const agent = this.engine.agents.get(String(p.agentId));
      if (!agent || typeof this.engine.startActivity !== 'function') throw new Error('activity.start requires real Realm activity engine');
      this.engine.startActivity(agent, p.activity, p.placeId);
      // Donor stores Date.now() but updateAgent compares against world minutes.
      // Normalize only the time basis, leaving donor activity selection/effects intact.
      if (agent.currentActivity) agent.currentActivity.startTime = Number(this.engine.time.totalMinutes ?? 0) * 60000;
      result = { agentId:agent.id, activity:clone(agent.currentActivity) };
    } else if (type === 'event.record') {
      if (typeof this.engine.recordEvent !== 'function') throw new Error('Realm recordEvent unavailable');
      this.engine.recordEvent(clone(p.event));
      result = clone(p.event);
    } else if (type === 'message.send') {
      if (typeof this.engine.sendMessage !== 'function') throw new Error('Realm sendMessage unavailable');
      this.engine.sendMessage(clone(p.message));
      result = clone(p.message);
    } else {
      result = { accepted:false, reason:'UNSUPPORTED_REALM_ACTION', type };
    }

    this.#emit({
      id: action.id,
      type,
      source: this.id,
      summary: action.reason ?? type,
      address: clone(action.address ?? null),
      payload: clone(result),
      at: action.at ?? new Date(this.clock()).toISOString(),
    });
    return result;
  }

  async request({ operation, payload = {} } = {}) {
    if (operation === 'snapshot') return this.snapshot();
    if (operation === 'hydrate') return this.hydrate(payload.snapshot ?? payload);
    if (operation === 'advance-elapsed') return this.advanceElapsed(payload.elapsedMs);
    if (operation === 'apply-action') return this.applyAction(payload.action ?? payload);
    if (operation === 'resident.admit') return this.admitCanonicalResident(payload.agent);
    throw new Error(`unsupported Consciousness Realm operation: ${operation}`);
  }
}

export default ConsciousnessRealmAdapter;
