const clone = value => value === undefined ? undefined : structuredClone(value);

export class ResidentHost {
  constructor({ state, bus = null, mesh, compiler = null, indiverse = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('ResidentHost requires a StateStore-like state service');
    if (!mesh) throw new TypeError('ResidentHost requires a relational mesh kernel');
    Object.assign(this, { state, bus, mesh, compiler, indiverse, clock });
    this.runtimeBindings = new Map();
    this.worldAdapters = new Map();
  }

  async registerResident(id, { runtime = null, publicState = {}, address = null, capabilities = [], metadata = {} } = {}) {
    const record = await this.mesh.registerParticipant(id, {
      kind: 'resident-agent', address, publicState, capabilities, residency: 'warm', metadata,
    });
    if (runtime) this.bindRuntime(id, runtime);
    return record;
  }

  bindRuntime(id, runtime) {
    const worldPort = runtime?.worldPort ?? runtime?.practiceWorldPort ?? null;
    if (!worldPort?.attach || !worldPort?.observe || !worldPort?.act) {
      throw new TypeError('resident runtime must expose a 5.7-compatible worldPort with attach/observe/act');
    }
    this.runtimeBindings.set(String(id), { runtime, worldPort });
    this.bus?.emit('resident:runtime-bound', { id: String(id) });
    return this;
  }

  registerWorld(id, adapter, { kind = 'reality', publicState = {}, capabilities = [], metadata = {} } = {}) {
    if (!adapter?.snapshot || !adapter?.applyAction) throw new TypeError('world adapter must expose snapshot() and applyAction(action)');
    this.worldAdapters.set(String(id), adapter);
    return this.mesh.registerParticipant(id, {
      kind, publicState, capabilities: ['world.observe', 'world.action', ...capabilities], residency: 'warm', metadata,
    });
  }

  async enterWorld(residentId, worldId) {
    const binding = this.runtimeBindings.get(String(residentId));
    const adapter = this.worldAdapters.get(String(worldId));
    if (!binding) throw new Error(`resident runtime not bound: ${residentId}`);
    if (!adapter) throw new Error(`world adapter not registered: ${worldId}`);
    const attachment = binding.worldPort.attach(adapter);
    await this.state.set(`residents.activeWorld.${residentId}`, worldId, { source: 'resident-host' });
    await this.mesh.connect(residentId, worldId, { type: 'inhabits', evidence: { adapterId: adapter.id ?? worldId } });
    await this.mesh.setResidency(residentId, 'active');
    await this.mesh.setResidency(worldId, 'active');
    this.bus?.emit('resident:entered-world', { residentId, worldId });
    return clone(attachment);
  }

  async leaveWorld(residentId) {
    const binding = this.runtimeBindings.get(String(residentId));
    binding?.worldPort?.detach?.();
    await this.state.set(`residents.activeWorld.${residentId}`, null, { source: 'resident-host' });
    this.bus?.emit('resident:left-world', { residentId });
  }

  async sleep(residentId, checkpoint = {}) {
    const binding = this.runtimeBindings.get(String(residentId));
    const worldState = await binding?.worldPort?.pull?.();
    const merged = { ...clone(checkpoint), worldPort: clone(worldState), activeWorld: this.state.get(`residents.activeWorld.${residentId}`, null), sleptAt: this.clock() };
    binding?.worldPort?.detach?.();
    return this.mesh.sleepParticipant(residentId, merged);
  }

  async wake(residentId, { replay = null, restoreWorld = true } = {}) {
    const binding = this.runtimeBindings.get(String(residentId));
    if (!binding) throw new Error(`resident runtime not bound: ${residentId}`);
    const result = await this.mesh.wakeParticipant(residentId, { replay });
    if (result.checkpoint?.worldPort && binding.worldPort?.hydrate) binding.worldPort.hydrate(result.checkpoint.worldPort);
    if (restoreWorld && result.checkpoint?.activeWorld) {
      const adapter = this.worldAdapters.get(String(result.checkpoint.activeWorld));
      if (adapter) binding.worldPort.attach(adapter);
    }
    this.bus?.emit('resident:woke', { residentId, elapsedMs: result.elapsedMs, replayed: result.receipts.length });
    return result;
  }

  async queueNearbyInteraction(residentId, interaction) {
    return this.mesh.queueEvent(residentId, { ...clone(interaction), type: interaction?.type ?? 'nearby-interaction' });
  }

  snapshot() {
    return {
      boundResidents: [...this.runtimeBindings.keys()],
      registeredWorlds: [...this.worldAdapters.keys()],
      activeWorlds: this.state.get('residents.activeWorld', {}),
    };
  }
}

export default ResidentHost;
