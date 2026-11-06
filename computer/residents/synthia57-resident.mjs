const clone = value => value === undefined ? undefined : structuredClone(value);

function requireMethod(value, method, label) {
  if (typeof value?.[method] !== 'function') throw new TypeError(`${label} requires ${method}()`);
}

export class Synthia57ResidentAdapter {
  constructor({ runtime, embodiment, mesh = null, bus = null, residentId = 'synthia' } = {}) {
    if (!runtime) throw new TypeError('Synthia57ResidentAdapter requires a FederatedSynthia-compatible runtime');
    requireMethod(runtime.worldPort, 'attach', 'Synthia 5.7 worldPort');
    requireMethod(runtime.worldPort, 'observe', 'Synthia 5.7 worldPort');
    requireMethod(runtime.worldPort, 'act', 'Synthia 5.7 worldPort');
    requireMethod(runtime.physiology, 'observeOutcome', 'Synthia 5.7 physiology');
    requireMethod(runtime.physiology, 'tick', 'Synthia 5.7 physiology');
    if (!embodiment?.body?.addEventListener || typeof embodiment?.bindHost !== 'function') {
      throw new TypeError('Synthia 5.7 embodiment with CapabilityBody and bindHost() required');
    }
    Object.assign(this, { runtime, embodiment, body: embodiment.body, mesh, bus, residentId: String(residentId) });
    this.worldPort = runtime.worldPort;
    this.physiology = runtime.physiology;
    this.listeners = [];
    this.started = false;
  }

  async start() {
    if (this.started) return this.snapshot();
    for (const type of ['activated', 'deactivated', 'resonance-selected', 'request']) {
      const listener = event => { void this.#onCapabilityEvent(type, event?.detail ?? {}); };
      this.body.addEventListener(type, listener);
      this.listeners.push([type, listener]);
    }
    this.started = true;
    await this.syncPresence('resident-start');
    this.bus?.emit('synthia57:resident-started', { residentId: this.residentId });
    return this.snapshot();
  }

  stop() {
    for (const [type, listener] of this.listeners) this.body.removeEventListener(type, listener);
    this.listeners = [];
    this.started = false;
    this.bus?.emit('synthia57:resident-stopped', { residentId: this.residentId });
  }

  async bindHand(definition = {}) {
    if (!definition.id) throw new Error('hand binding requires id');
    const record = this.embodiment.bindHost(definition);
    await this.syncPresence('hand-bound');
    return record;
  }

  activateHand(id) {
    return this.body.activate(id);
  }

  deactivateHand(id) {
    return this.body.deactivate(id);
  }

  selectHandsByResonance(field = []) {
    return this.body.selectByResonance(field);
  }

  async requestHand(id, task, context = {}) {
    const result = await this.embodiment.request(id, task, context);
    await this.syncPresence('hand-request');
    return result;
  }

  async observeConnection(connection = {}) {
    const summary = `connection:${connection.type ?? 'relational'}:${connection.sourceId ?? connection.from ?? 'unknown'}`;
    const observation = await this.physiology.observeOutcome({
      source: 'relational-mesh',
      summary,
      accepted: connection.accepted !== false,
      address: connection.address ?? null,
      data: clone(connection),
    });
    let resonance = null;
    if (Array.isArray(connection.resonanceField)) {
      resonance = this.selectHandsByResonance(connection.resonanceField);
    }
    const physiology = await this.physiology.tick();
    await this.syncPresence('connection-observed');
    this.bus?.emit('synthia57:connection-observed', {
      residentId: this.residentId,
      summary,
      resonance: clone(resonance),
      felt: clone(physiology?.felt ?? null),
    });
    return { observation, resonance, physiology };
  }

  async syncPresence(reason = 'sync') {
    const body = this.body.snapshot();
    const publicBody = {
      activeActionToolCount: body.activeActionToolCount,
      activeActionTools: [...body.activeActionTools],
      maxActiveActionTools: body.maxActiveActionTools,
    };
    if (this.mesh?.participant?.(this.residentId)) {
      await this.mesh.publishPresence(this.residentId, {
        embodiment: publicBody,
        residentRuntime: 'synthia-5.7',
        lastCapabilityChange: reason,
      });
    }
    return publicBody;
  }

  snapshot() {
    return {
      id: this.residentId,
      version: 'synthia57-resident-adapter.v1',
      started: this.started,
      worldPort: this.worldPort.snapshot?.() ?? null,
      body: this.body.snapshot(),
      physiology: this.physiology.snapshot?.() ?? this.physiology.context?.() ?? null,
    };
  }

  async #onCapabilityEvent(type, detail) {
    const accepted = type !== 'deactivated' && detail?.status !== 'failed' && detail?.status !== 'declined';
    const summary = `capability-body:${type}:${detail?.id ?? detail?.componentId ?? 'body'}`;
    const observation = await this.physiology.observeOutcome({
      source: 'capability-body',
      summary,
      accepted,
      data: { type, detail: clone(detail), body: this.body.snapshot() },
    });
    const physiology = await this.physiology.tick();
    const embodiment = await this.syncPresence(type);
    this.bus?.emit('synthia57:capability-state', {
      residentId: this.residentId,
      type,
      detail: clone(detail),
      observation: clone(observation),
      felt: clone(physiology?.felt ?? null),
      embodiment,
    });
  }
}

export default Synthia57ResidentAdapter;
