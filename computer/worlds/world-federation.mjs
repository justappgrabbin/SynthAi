const clone = value => value === undefined ? undefined : structuredClone(value);
const safeKey = value => String(value ?? 'layer').replace(/[^A-Za-z0-9_-]/g, c => `_${c.charCodeAt(0).toString(16)}`);

export const WORLD_ROLES = Object.freeze({
  HOME: 'home',
  MECHANICS: 'mechanics',
  DIAGNOSTIC: 'diagnostic',
  RESEARCH: 'research',
  PROFILE: 'profile',
});

export const CANONICAL_WORLD_LAYERS = Object.freeze([
  { id: 'reality:consciousness-realm', name: 'Consciousness Realm', role: WORLD_ROLES.HOME, capabilities: ['world.life','world.place','world.relationship','world.schedule','world.event'] },
  { id: 'mechanics:human-agent', name: 'Human Agent', role: WORLD_ROLES.MECHANICS, capabilities: ['life.work','life.needs','life.challenge','life.skill','life.journal'] },
  { id: 'lab:triform', name: 'Triform', role: WORLD_ROLES.DIAGNOSTIC, capabilities: ['world.deterministic-probe','world.relationship-consequence','world.memory'] },
  { id: 'lab:stellar', name: 'Stellar Lab', role: WORLD_ROLES.RESEARCH, capabilities: ['experiment.hypothesis','experiment.observation','experiment.evidence','experiment.report'] },
]);

export class WorldFederation {
  constructor({ state, bus = null, mesh, residents = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('WorldFederation requires a StateStore-like state service');
    if (!mesh) throw new TypeError('WorldFederation requires the relational mesh kernel');
    Object.assign(this, { state, bus, mesh, residents, clock });
    this.adapters = new Map();
  }

  _path(id) { return `worldFederation.layers.${safeKey(id)}`; }
  layer(id) { return this.state.get(this._path(id), null); }
  list() { return Object.values(this.state.get('worldFederation.layers', {}) ?? {}).filter(Boolean); }

  async defineLayer({ id, name, role, capabilities = [], dependsOn = [], metadata = {}, publicState = {} } = {}) {
    if (!id || !role) throw new Error('world layer id and role required');
    const previous = this.layer(id);
    const record = {
      id: String(id), name: name ?? String(id), role, capabilities: [...new Set(capabilities.map(String))],
      dependsOn: [...new Set(dependsOn.map(String))], metadata: clone(metadata), publicState: clone(publicState),
      bound: this.adapters.has(String(id)), createdAt: previous?.createdAt ?? this.clock(), updatedAt: this.clock(),
    };
    await this.state.set(this._path(id), record, { source: 'world-federation' });
    if (!this.mesh.participant(id)) {
      await this.mesh.registerParticipant(id, {
        kind: `world-${role}`, publicState: { name: record.name, role, ...clone(publicState) },
        capabilities: record.capabilities, residency: 'warm', metadata: { ...clone(metadata), role },
      });
    } else {
      await this.mesh.publishPresence(id, { name: record.name, role, ...clone(publicState) });
    }
    for (const dependency of record.dependsOn) {
      if (this.mesh.participant(dependency)) await this.mesh.connect(id, dependency, { type: 'depends-on' });
    }
    this.bus?.emit('world-federation:defined', clone(record));
    return clone(record);
  }

  async seedCanonicalLayers() {
    for (const layer of CANONICAL_WORLD_LAYERS) await this.defineLayer(layer);
    await this.mesh.connect('reality:consciousness-realm', 'mechanics:human-agent', { type: 'uses-mechanics' });
    await this.mesh.connect('lab:triform', 'reality:consciousness-realm', { type: 'probes' });
    await this.mesh.connect('lab:stellar', 'reality:consciousness-realm', { type: 'observes' });
    return this.snapshot();
  }

  async bind(id, adapter) {
    const layer = this.layer(id);
    if (!layer) throw new Error(`unknown world layer: ${id}`);
    if (!adapter || typeof adapter !== 'object') throw new TypeError('world layer adapter object required');
    this.adapters.set(String(id), adapter);
    const next = { ...layer, bound: true, adapterId: adapter.id ?? null, updatedAt: this.clock() };
    await this.state.set(this._path(id), next, { source: 'world-federation' });
    await this.mesh.publishPresence(id, { bound: true, adapterId: adapter.id ?? null });
    this.bus?.emit('world-federation:bound', { id, adapterId: adapter.id ?? null });
    return clone(next);
  }

  adapter(id) { return this.adapters.get(String(id)) ?? null; }

  async invoke(id, operation, payload = {}) {
    const adapter = this.adapter(id);
    if (!adapter) throw new Error(`world layer adapter not bound: ${id}`);
    let result;
    if (typeof adapter[operation] === 'function') result = await adapter[operation](clone(payload));
    else if (typeof adapter.request === 'function') result = await adapter.request({ operation, payload: clone(payload) });
    else if (typeof adapter.process === 'function') result = await adapter.process({ operation, input: clone(payload) });
    else if (typeof adapter.run === 'function') result = await adapter.run({ operation, input: clone(payload) });
    else throw new Error(`adapter for ${id} cannot perform ${operation}`);
    await this.state.set(`worldFederation.last.${safeKey(id)}`, { operation, result: clone(result), at: this.clock() }, { source: 'world-federation' });
    this.bus?.emit('world-federation:invoked', { id, operation });
    return clone(result);
  }

  async attachHome(residentId, worldId = 'reality:consciousness-realm') {
    if (!this.residents) throw new Error('resident host unavailable');
    const adapter = this.adapter(worldId);
    if (!adapter) throw new Error(`home adapter not bound: ${worldId}`);
    await this.residents.registerWorld(worldId, adapter, { kind: 'home-reality', capabilities: this.layer(worldId)?.capabilities ?? [] });
    return this.residents.enterWorld(residentId, worldId);
  }

  async registerProfileWorld(id, { ownerId, name, capabilities = ['world.qualia-contract','world.visitor-morph'], metadata = {} } = {}) {
    return this.defineLayer({ id, name, role: WORLD_ROLES.PROFILE, capabilities, metadata: { ...metadata, ownerId } });
  }

  snapshot() {
    return { layers: this.list(), bound: [...this.adapters.keys()], roles: Object.values(WORLD_ROLES) };
  }
}

export default WorldFederation;
