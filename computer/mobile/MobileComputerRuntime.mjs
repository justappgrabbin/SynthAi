import { EventBus, MemoryPersistence, StateStore, Registry } from '../core/kernel.mjs';
import { VirtualFileSystem, ArtifactIntake } from '../runtime/storage.mjs';
import { AutomataEngine, ProcessFabric, BackendBroker } from '../runtime/execution.mjs';
import { CapabilityGraph, MorphEngine, CultivationEngine, PolicyEngine } from '../runtime/experience.mjs';
import { ShellManager, MutationDispatcher } from '../runtime/shells.mjs';
import { ProjectWorkspace } from '../runtime/projects.mjs';
import { registerCanonicalMicros } from '../micros/MicroRegistry.mjs';
import { StateSpaceEngine } from '../donors/recovered/you-n-i-verse-corrected/state-space-engine-v2.ported.mjs';
import { encodeMicro, decodeMicro, encodeMacro, decodeMacro } from '../donors/recovered/you-n-i-verse-corrected/synthia-bridge.ported.mjs';
import { SynthImageRuntime } from './SynthImageRuntime.mjs';
import { createMobilePersistence } from './IndexedDBPersistence.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { DormantCompilerBroker } from '../runtime/dormant-compiler.mjs';
import { ResidentHost } from '../runtime/resident-host.mjs';
import { IndiVerseRuntime } from '../worlds/indiverse.mjs';

export const ADDRESS_FIELDS = Object.freeze([
  'planetary', 'dimension', 'gate', 'line', 'color', 'tone', 'base',
  'degree', 'minute', 'second', 'arc', 'zodiac', 'house'
]);

const emptyAddress = () => Object.fromEntries(ADDRESS_FIELDS.map(k => [k, null]));

const clone = value => value === undefined ? undefined : structuredClone(value);

async function digestText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
}

export class MobileEventLog {
  constructor({ state, bus } = {}) { Object.assign(this, { state, bus }); }

  buildEvent(partial = {}) {
    return Object.freeze({
      event_id: partial.event_id ?? `evt-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      timestamp: partial.timestamp ?? new Date().toISOString(),
      actor_id: partial.actor_id ?? 'system',
      actor_type: partial.actor_type ?? 'system',
      target_id: partial.target_id ?? null,
      event_type: partial.event_type ?? 'observation',
      input: partial.input ?? null,
      actor_address: partial.actor_address ?? null,
      target_address: partial.target_address ?? null,
      event_address: partial.event_address ?? null,
      pre_state: partial.pre_state ?? null,
      context: partial.context ?? null,
      process_id: partial.process_id ?? null,
      provider: partial.provider ?? 'mobile-computer',
      result: partial.result ?? null,
      result_status: partial.result_status ?? 'unknown',
      post_state: partial.post_state ?? null,
      observable_effect: partial.observable_effect ?? null,
      related_events: [...(partial.related_events ?? [])],
      parents: [...(partial.parents ?? [])],
      trajectory_id: partial.trajectory_id ?? `traj-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      evidence: partial.evidence ?? null,
    });
  }

  async emitEvent(partial = {}) {
    const event = this.buildEvent(partial);
    const events = this.state.get('events.log', []);
    events.push(event);
    await this.state.set('events.log', events, { source: 'mobile-event-log' });
    this.bus?.emit('event:emitted', event);
    this.bus?.emit(`event:${event.event_type}`, event);
    return event;
  }

  async readAll() { return this.state.get('events.log', []); }
  async history(trajectoryId) { return (await this.readAll()).filter(e => e.trajectory_id === trajectoryId); }
  async forEntity(id) { return (await this.readAll()).filter(e => e.actor_id === id || e.target_id === id); }
}

export class PortableAddressService {
  constructor({ state, bus, mesh = null } = {}) {
    Object.assign(this, { state, bus, mesh });
  }

  normalize(partial = {}) {
    const address = emptyAddress();
    for (const field of ADDRESS_FIELDS) {
      if (partial[field] !== undefined && partial[field] !== null) address[field] = partial[field];
    }
    if (partial.arcSecond !== undefined && address.arc === null) address.arc = partial.arcSecond;
    return address;
  }

  async key(address) {
    const canonical = this.normalize(address);
    return 'addr:' + await digestText(JSON.stringify(ADDRESS_FIELDS.map(k => canonical[k])));
  }

  async resolveAddress(input = {}) {
    if (input?.address) input = input.address;
    if (typeof input === 'string') {
      const parts = input.split(/[.\s]+/).map(Number).filter(Number.isFinite);
      input = { gate: parts[0], line: parts[1], color: parts[2], tone: parts[3], base: parts[4] };
    }
    const address = this.normalize(input);
    const resolved_fields = ADDRESS_FIELDS.filter(k => address[k] !== null);
    const key = await this.key(address);
    return {
      address,
      key,
      status: resolved_fields.length ? 'resolved' : 'unknown',
      resolved_fields,
      provider: 'mobile:portable-canonical-address',
    };
  }

  async remember(address, { meshState = null, privateStateRef = null, checkpoint = null } = {}) {
    const resolved = await this.resolveAddress(address);
    const record = {
      key: resolved.key,
      address: resolved.address,
      meshState: clone(meshState),
      privateStateRef,
      checkpoint: clone(checkpoint),
      updatedAt: Date.now(),
    };
    await this.state.set(`addressBook.${encodeURIComponent(resolved.key)}`, record, { source: 'portable-address-service' });
    if (this.mesh?.publishAddress && meshState !== null) {
      await this.mesh.publishAddress({ key: resolved.key, address: resolved.address, state: meshState });
    }
    this.bus?.emit('address:remembered', { key: resolved.key });
    return record;
  }

  async relocate(address) {
    const resolved = await this.resolveAddress(address);
    const local = this.state.get(`addressBook.${encodeURIComponent(resolved.key)}`, null);
    if (local) return { source: 'local', ...local };
    if (this.mesh?.resolveAddress) {
      const remote = await this.mesh.resolveAddress(resolved.key, resolved.address);
      if (remote) return { source: 'mesh', key: resolved.key, address: resolved.address, ...remote };
    }
    return { source: 'unseen', key: resolved.key, address: resolved.address, checkpoint: null };
  }
}

export class MobileComputerRuntime {
  constructor({
    persistence = createMobilePersistence() ?? new MemoryPersistence(),
    namespace = 'synthai-mobile-computer',
    mesh = null,
    launchProfile = 'compact',
  } = {}) {
    this.bus = new EventBus();
    this.state = new StateStore({ bus: this.bus, persistence, namespace });
    this.launchProfile = launchProfile;
    this.mesh = mesh;
    const registry = kind => new Registry({ kind, bus: this.bus });

    this.tools = registry('tool');
    this.apps = registry('app');
    this.shells = registry('shell');
    this.agents = registry('agent');
    this.worlds = registry('world');
    this.automataRegistry = registry('automaton');
    this.processRegistry = registry('process');
    this.capabilityRegistry = registry('capability');
    this.backendsRegistry = registry('backend');
    this.artifacts = registry('artifact');
    this.micros = registry('micro');
    this.systems = registry('system');
    this.services = registry('service');

    this.vfs = new VirtualFileSystem({ bus: this.bus, state: this.state });
    this.shellManager = new ShellManager({ bus: this.bus, shells: this.shells, apps: this.apps, state: this.state });
    this.automata = new AutomataEngine({ bus: this.bus, automata: this.automataRegistry, tools: this.tools, state: this.state });
    this.processes = new ProcessFabric({ bus: this.bus, processes: this.processRegistry, state: this.state });
    this.backends = new BackendBroker({ bus: this.bus, backends: this.backendsRegistry });
    this.capabilities = new CapabilityGraph({ capabilities: this.capabilityRegistry });
    this.morph = new MorphEngine({ bus: this.bus, state: this.state, micros: this.micros });
    this.cultivation = new CultivationEngine({ bus: this.bus, state: this.state });
    this.policy = new PolicyEngine({ bus: this.bus });
    this.mutations = new MutationDispatcher({
      bus: this.bus, state: this.state, shellManager: this.shellManager,
      automata: this.automata, tools: this.tools, agents: this.agents, morph: this.morph
    });
    this.intake = new ArtifactIntake({ bus: this.bus, vfs: this.vfs, artifacts: this.artifacts, mutations: this.mutations });
    this.projects = new ProjectWorkspace({ bus: this.bus, state: this.state, vfs: this.vfs, backends: this.backends });

    this.events = new MobileEventLog({ state: this.state, bus: this.bus });
    this.addresses = new PortableAddressService({ state: this.state, bus: this.bus, mesh });
    this.stateSpace = new StateSpaceEngine();
    this.images = new SynthImageRuntime({ state: this.state, bus: this.bus });
    // Mesh is the Computer's connective substrate. The optional constructor
    // mesh above remains the remote address transport; meshKernel is local,
    // persistent, and owns resident/world/event continuity.
    this.meshKernel = new RelationalMeshKernel({ state: this.state, bus: this.bus });
    this.compiler = new DormantCompilerBroker({ state: this.state, bus: this.bus });
    this.indiverse = new IndiVerseRuntime({ state: this.state, bus: this.bus, mesh: this.meshKernel });
    this.residents = new ResidentHost({
      state: this.state, bus: this.bus, mesh: this.meshKernel,
      compiler: this.compiler, indiverse: this.indiverse,
    });
  }

  async boot() {
    await this.state.restore();
    await this.meshKernel.boot();
    if (!this.meshKernel.participant('computer:self')) {
      await this.meshKernel.registerParticipant('computer:self', {
        kind: 'computer-host',
        publicState: { name: 'SynthAI Computer', flavor: 'mobile-synthimg' },
        capabilities: ['mesh.host', 'state-space', 'execution', 'resident-host', 'indiverse'],
        residency: 'active',
      });
    } else {
      await this.meshKernel.setResidency('computer:self', 'active');
    }
    if (!this.shells.has('workspace')) this.shells.register('workspace', { name: 'Mobile Workspace', kind: 'mobile' });
    if (!this.shells.has('compact')) this.shells.register('compact', { name: 'Compact Phone Shell', kind: 'mobile-lazy' });
    registerCanonicalMicros(this.micros);

    for (const [id, description] of Object.entries({
      'state-space': 'Five-stage Movement→Evolution→Being→Design→Space state engine',
      'canonical-addressing': '13-field portable canonical addressing and relocation',
      'synthimg': 'SHA-verified Synth image install/mount',
      'app-mounting': 'Namespaced mounted application lifecycle',
      'project-workspace': 'Local project files and snapshots',
      'automata': 'Portable automata execution',
      'morph-expression': 'State-linked morph expression',
      'checkpoint-restore': 'ASLEEP/WARM/ACTIVE checkpoint lifecycle',
      'relational-mesh': 'Persistent mesh participants, relationships, presence, queued events and dormancy',
      'resident-host': '5.7-compatible resident world-port host with sleep/wake continuity',
      'indiverse': 'Canonical shared reality plus host-specific qualia/world-grammar transforms',
      'on-demand-compiler': 'Dormant compiler broker with content-hash reuse; compiler adapter binds separately',
    })) {
      if (!this.capabilityRegistry.has(id)) this.capabilities.register(id, { providers: ['mobile-computer'], description });
    }

    this.services.register('event-log', { provider: this.events, contract: 'emitEvent' });
    this.services.register('address-service', { provider: this.addresses, contract: 'resolveAddress/relocate' });
    this.services.register('state-space', { provider: this.stateSpace, contract: 'applyPipeline/step/query' });
    this.services.register('synthimg-runtime', { provider: this.images, contract: 'install/wake/checkpoint' });
    this.services.register('relational-mesh', { provider: this.meshKernel, contract: 'registerParticipant/connect/queueEvent/sleepParticipant/wakeParticipant' });
    this.services.register('resident-host', { provider: this.residents, contract: 'registerResident/bindRuntime/registerWorld/enterWorld/sleep/wake' });
    this.services.register('indiverse', { provider: this.indiverse, contract: 'createWorld/registerCanonicalObject/renderShared/renderInWorld/visitorContract' });
    this.services.register('compiler-broker', { provider: this.compiler, contract: 'attachCompiler/ensure/snapshot' });

    await this.state.set('computer.boot', {
      status: 'ready',
      flavor: 'mobile-synthimg',
      profile: this.launchProfile,
      at: Date.now(),
    }, { source: 'boot' });
    this.bus.emit('computer:ready', this.snapshot());
    return this;
  }

  async setLaunchProfile(profile) {
    if (!['compact', 'full'].includes(profile)) throw new Error('profile must be compact or full');
    this.launchProfile = profile;
    await this.state.set('computer.launchProfile', profile, { source: 'mobile-computer' });
    return profile;
  }

  async resolveAddress(input) { return this.addresses.resolveAddress(input); }
  async relocateAddress(input) { return this.addresses.relocate(input); }

  async activateAddress(input, { remember = true, meshState = null, privateStateRef = null } = {}) {
    const resolved = await this.addresses.resolveAddress(input);
    const a = resolved.address;
    for (const field of ['gate', 'line', 'color', 'tone', 'base']) {
      if (!Number.isFinite(Number(a[field]))) throw new Error(`activateAddress requires ${field}`);
    }
    const node = this.stateSpace.createNode(
      Number(a.gate), Number(a.line), Number(a.color), Number(a.tone), Number(a.base),
      Number(a.degree ?? 0), Number(a.minute ?? 0), Number(a.second ?? 0), Number(a.arc ?? 0) % 100
    );
    const final = this.stateSpace.applyPipeline(node);
    const stateRecord = {
      addressKey: resolved.key,
      node: this._nodeForPersistence(final),
      coherence: this.stateSpace.getState().coherence,
      timestamp: Date.now(),
    };
    await this.state.set(`stateSpace.last.${encodeURIComponent(resolved.key)}`, stateRecord, { source: 'state-space' });
    if (remember) {
      await this.addresses.remember(a, {
        meshState,
        privateStateRef,
        checkpoint: stateRecord,
      });
    }
    await this.events.emitEvent({
      actor_id: resolved.key,
      actor_type: 'system',
      event_type: 'state_transition',
      event_address: a,
      result_status: 'success',
      result: stateRecord,
      observable_effect: 'address activated through mobile five-stage state-space',
    });
    return { ...resolved, state: stateRecord, sentence: this.stateSpace.generateSentence(final) };
  }

  _nodeForPersistence(node) {
    if (!node) return null;
    return {
      id: node.id,
      gate: node.gate, line: node.line, color: node.color, tone: node.tone, base: node.base,
      degree: node.degree, minute: node.minute, second: node.second, arcSecond: node.arcSecond,
      axis: node.axis, zodiac: node.zodiac, house: node.house, planet: node.planet,
      dimension: node.dimension, amplitude: node.amplitude, phase: node.phase,
    };
  }

  encodeAddressSpace({ micro, macro }) {
    return {
      microIndex: micro ? encodeMicro(micro) : null,
      macroIndex: macro ? encodeMacro(macro) : null,
    };
  }

  decodeAddressSpace({ microIndex, macroIndex }) {
    return {
      micro: Number.isFinite(microIndex) ? decodeMicro(microIndex) : null,
      macro: Number.isFinite(macroIndex) ? decodeMacro(macroIndex) : null,
    };
  }

  async installSynthImage(source, options = {}) {
    const record = await this.images.install(source, options);
    if (!this.apps.has(record.id)) {
      this.apps.register(record.id, {
        kind: 'synthimg-app',
        imageSha256: record.payloadSha256,
        entry: record.entry,
        manifest: record.manifest,
      });
    }
    return record;
  }

  async launchSynthImage(appId, { full = this.launchProfile === 'full' } = {}) {
    const wake = await this.images.wake(appId, { full });
    const mount = await this.shellManager.mount(appId, {
      shell: full ? 'workspace' : 'compact',
      options: { launchUrl: wake.launchUrl, image: wake.record.payloadSha256 },
    });
    await this.events.emitEvent({
      actor_id: `app:${appId}`,
      actor_type: 'application',
      event_type: 'application_launch',
      result_status: 'success',
      result: { launchUrl: wake.launchUrl, lifecycle: wake.record.lifecycle },
      observable_effect: 'Synth image mounted in mobile Computer',
    });
    return { ...wake, mount };
  }

  async sleepSynthImage(appId, { address = null, previewRef = null, memoryRef = null } = {}) {
    const appState = this.state.get(`apps.${appId}`, null);
    return this.images.checkpoint(appId, {
      state: appState,
      address,
      previewRef,
      memoryRef,
    });
  }

  async setAppState(appId, path, value) {
    return this.state.set(`apps.${appId}.${path}`, value, { source: `app:${appId}` });
  }

  getAppState(appId, path = '') {
    return this.state.get(path ? `apps.${appId}.${path}` : `apps.${appId}`, null);
  }

  async createIndiVerse(ownerId, options = {}) {
    return this.indiverse.createWorld(ownerId, options);
  }

  async registerCanonicalWorldObject(object) {
    return this.indiverse.registerCanonicalObject(object);
  }

  viewSharedWorldObject(objectId) {
    return this.indiverse.renderShared(objectId);
  }

  viewIndiVerseObject(worldId, objectId) {
    return this.indiverse.renderInWorld(worldId, objectId);
  }

  visitorMorphContract(options) {
    return this.indiverse.visitorContract(options);
  }

  async registerResident(id, options = {}) {
    return this.residents.registerResident(id, options);
  }

  bindResidentRuntime(id, runtime) {
    return this.residents.bindRuntime(id, runtime);
  }

  async registerReality(id, adapter, options = {}) {
    return this.residents.registerWorld(id, adapter, options);
  }

  async enterReality(residentId, worldId) {
    return this.residents.enterWorld(residentId, worldId);
  }

  async sleepResident(residentId, checkpoint = {}) {
    return this.residents.sleep(residentId, checkpoint);
  }

  async wakeResident(residentId, options = {}) {
    return this.residents.wake(residentId, options);
  }

  stateSpaceSnapshot() {
    const s = this.stateSpace.getState();
    return {
      nodes: [...s.nodes.values()].map(n => this._nodeForPersistence(n)),
      edges: s.edges.map(e => ({ ...e })),
      coherence: s.coherence,
      timestamp: s.timestamp,
      historyLength: s.history.length,
    };
  }

  snapshot() {
    return {
      flavor: 'mobile-synthimg',
      launchProfile: this.launchProfile,
      state: this.state.snapshot(),
      capabilities: this.capabilityRegistry.list(),
      apps: this.apps.list(),
      images: this.images.list(),
      mounted: this.shellManager.listMounted(),
      projects: this.projects.list(),
      stateSpace: this.stateSpaceSnapshot(),
      mesh: this.meshKernel.snapshot(),
      residents: this.residents.snapshot(),
      indiverse: this.indiverse.snapshot(),
      compiler: this.compiler.snapshot(),
    };
  }
}

export default MobileComputerRuntime;
