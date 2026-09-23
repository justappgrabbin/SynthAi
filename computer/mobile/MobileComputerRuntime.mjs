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
import { WorldFederation } from '../worlds/world-federation.mjs';
import { Synthia57PackageLoader } from '../residents/synthia57-package-loader.mjs';
import { PhoneWorldBridge } from '../native/phone-world.mjs';
import { PurposeGuideService } from '../services/purpose-guide.mjs';

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
    this.purposeGuide = new PurposeGuideService({
      bus: this.bus,
      state: this.state,
      projects: this.projects,
      listCapabilities: () => this.capabilityRegistry.list(),
      emitEvent: event => this.events.emitEvent(event),
    });
    this.stateSpace = new StateSpaceEngine();
    this.images = new SynthImageRuntime({ state: this.state, bus: this.bus });
    // Mesh is the Computer's connective substrate. The optional constructor
    // mesh above remains the remote address transport; meshKernel is local,
    // persistent, and owns resident/world/event continuity.
    this.meshKernel = new RelationalMeshKernel({ state: this.state, bus: this.bus });
    this.compiler = new DormantCompilerBroker({ state: this.state, bus: this.bus });
    this.compilerBackends = new Map();
    this.compiler.attachCompiler({
      id: 'mobile-compiler-backend-router',
      compile: async (spec) => {
        const backend = this.compilerBackends.get(spec.target);
        if (!backend?.compile) throw new Error(`compiler backend unavailable: ${spec.target}`);
        const result = await backend.compile(spec);
        return {
          ...result,
          target: result?.target ?? spec.target,
          artifactRef: result?.artifactRef ?? result?.location ?? null,
        };
      },
    });
    // Compatibility clock for the first global sleep/wake prototype. Resident
    // agents use ResidentHost + meshKernel's dormant checkpoint path instead.
    this.continuity = { clock: () => Date.now() };
    this.indiverse = new IndiVerseRuntime({ state: this.state, bus: this.bus, mesh: this.meshKernel });
    this.residents = new ResidentHost({
      state: this.state, bus: this.bus, mesh: this.meshKernel,
      compiler: this.compiler, indiverse: this.indiverse,
    });
    this.worldFederation = new WorldFederation({
      state: this.state, bus: this.bus, mesh: this.meshKernel, residents: this.residents,
    });
    this.synthia57 = new Synthia57PackageLoader({ computer: this, bus: this.bus });
    this.phoneWorld = null;
  }

  async boot() {
    await this.state.restore();
    await this.meshKernel.boot();
    if (!this.meshKernel.participant('computer:self')) {
      await this.meshKernel.registerParticipant('computer:self', {
        kind: 'computer-host',
        publicState: { name: 'SynthAI Computer', flavor: 'mobile-synthimg' },
        capabilities: ['mesh.host', 'state-space', 'execution', 'resident-host', 'indiverse', 'purpose-guide'],
        residency: 'active',
      });
    } else {
      await this.meshKernel.setResidency('computer:self', 'active');
    }
    for (const core of [
      { id: 'system:state-space', kind: 'core-service', capabilities: ['state-space.activate','state-space.query'] },
      { id: 'system:execution', kind: 'core-service', capabilities: ['automata.run','process.execute','backend.request'] },
      { id: 'system:purpose-guide', kind: 'core-service', capabilities: ['purpose.roadmap','purpose.outcome','purpose.read'] },
    ]) {
      if (!this.meshKernel.participant(core.id)) {
        await this.meshKernel.registerParticipant(core.id, {
          kind: core.kind, capabilities: core.capabilities, residency: 'active',
          publicState: { name: core.id.split(':')[1], wired: true },
        });
      } else {
        await this.meshKernel.setResidency(core.id, 'active');
      }
      const hosted = this.meshKernel.relationshipsFor(core.id).some(edge => edge.type === 'hosted-by' && edge.to === 'computer:self');
      if (!hosted) await this.meshKernel.connect(core.id, 'computer:self', { type: 'hosted-by' });
    }
    if (!this.meshKernel.relationshipsFor('system:execution').some(edge => edge.type === 'contextualized-by' && edge.to === 'system:state-space')) {
      await this.meshKernel.connect('system:execution', 'system:state-space', { type: 'contextualized-by' });
    }
    this.meshKernel.bindHandler('system:state-space', async envelope => {
      if (envelope.operation === 'activate') return this._activateAddressLocal(envelope.payload ?? {});
      if (envelope.operation === 'snapshot') return this.stateSpaceSnapshot();
      throw new Error(`unsupported state-space mesh operation: ${envelope.operation}`);
    });
    this.meshKernel.bindHandler('system:execution', async envelope => {
      const payload = envelope.payload ?? {};
      if (envelope.operation === 'automata.run') return this.automata.run(payload.id, payload.input, payload.context ?? {});
      if (envelope.operation === 'process.execute') return this.processes.execute(payload.id, payload.input, payload.context ?? {});
      if (envelope.operation === 'backend.request') return this.backends.request(payload.id, payload.request);
      throw new Error(`unsupported execution mesh operation: ${envelope.operation}`);
    });
    this.meshKernel.bindHandler('system:purpose-guide', async envelope => {
      const payload = envelope.payload ?? {};
      if (envelope.operation === 'roadmap') return this.purposeGuide.buildRoadmap(payload);
      if (envelope.operation === 'outcome') return this.purposeGuide.recordOutcome(payload);
      if (envelope.operation === 'read') return this.purposeGuide.getRoadmap(payload.userId, payload.roadmapId ?? null);
      throw new Error(`unsupported purpose-guide mesh operation: ${envelope.operation}`);
    });
    await this.worldFederation.seedCanonicalLayers();
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
      'world-federation': 'Mesh roles for home, daily-life mechanics, diagnostic lab, research lab and profile worlds',
      'synthia57-resident': 'Mounts the canonical Synthia v0.5.7 package intact as a Computer resident',
      'phone-world': 'Maps real Android applications and observed app state into canonical IndiVerse places and events',
      'pathways-to-purpose': 'Persistent personal purpose roadmaps and real-world outcome feedback from live Computer state',
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
    this.services.register('world-federation', { provider: this.worldFederation, contract: 'defineLayer/seedCanonicalLayers/bind/invoke/attachHome/registerProfileWorld' });
    this.services.register('synthia57-loader', { provider: this.synthia57, contract: 'mount/get/unmount' });
    this.services.register('phone-world-gateway', { provider: this, contract: 'bindPhoneHost/phoneRequest/observePhoneApplication' });
    this.services.register('purpose-guide', { provider: this.purposeGuide, contract: 'buildRoadmap/recordOutcome/getRoadmap' });

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

  registerCompilerBackend(target, adapter) {
    if (!target || typeof adapter?.compile !== 'function') throw new Error('compiler backend target and compile(spec) required');
    this.compilerBackends.set(String(target), adapter);
    return adapter;
  }

  async ensureCompiled(spec) {
    return this.compiler.ensure(spec);
  }

  async sleep() {
    const since = this.continuity.clock();
    await this.state.set('continuity.lifecycle', { state: 'dormant', since }, { source: 'mobile-computer-compat' });
    for (const participant of this.meshKernel.listParticipants()) {
      if (participant.residency === 'hot') await this.meshKernel.setResidency(participant.id, 'warm');
    }
    return { state: 'dormant', since };
  }

  async queueDormantEvent(event = {}) {
    const pending = this.state.get('continuity.pending', []);
    const record = {
      id: event.id ?? `event-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      at: event.at ?? this.continuity.clock(),
      ...clone(event),
    };
    pending.push(record);
    pending.sort((a,b) => Number(a.at ?? 0) - Number(b.at ?? 0));
    await this.state.set('continuity.pending', pending, { source: 'mobile-computer-compat' });
    return record;
  }

  async wake({ resolveEvent = null } = {}) {
    const life = this.state.get('continuity.lifecycle', { state: 'new', since: this.continuity.clock() });
    const now = this.continuity.clock();
    const elapsed = Math.max(0, now - Number(life.since ?? now));
    const pending = this.state.get('continuity.pending', []);
    const receipts = [];
    for (const event of pending) {
      receipts.push(resolveEvent ? await resolveEvent(clone(event), { elapsed, now }) : { event: clone(event), status: 'held' });
    }
    await this.state.set('continuity.pending', [], { source: 'mobile-computer-compat' });
    await this.state.set('continuity.lifecycle', { state: 'active', since: now, lastElapsedMs: elapsed }, { source: 'mobile-computer-compat' });
    return { elapsed, pending: pending.length, receipts };
  }

  async defineIndiVerse(ownerId, options = {}) {
    return this.createIndiVerse(ownerId, {
      id: options.id ?? `indiverse:${ownerId}`,
      name: options.name,
      grammar: {
        ...(options.grammar ?? {}),
        thresholds: options.grammar?.thresholds ?? options.grammar?.threshold ?? {},
      },
      publicState: options.publicState ?? {},
      metadata: { ...(options.metadata ?? {}), invariants: clone(options.invariants ?? {}) },
    });
  }

  renderIndiVerse(ownerId, canonicalObject, visitor = {}) {
    const world = this.indiverse.world(`indiverse:${ownerId}`) ?? this.indiverse.world(ownerId);
    if (!world) throw new Error(`unknown IndiVerse: ${ownerId}`);
    const grammar = clone(world.grammar ?? {});
    // Early IndiVerse drafts used singular "threshold"; preserve that read
    // surface while canonical storage uses the plural thresholds grammar.
    if (grammar.threshold === undefined) grammar.threshold = clone(grammar.thresholds ?? {});
    return {
      canonicalId: canonicalObject.id,
      canonicalType: canonicalObject.type ?? canonicalObject.kind ?? null,
      canonical: clone(canonicalObject),
      host: ownerId,
      grammar,
      visitor: clone(visitor),
      rendered: { ...clone(canonicalObject), qualiaGrammar: grammar },
    };
  }

  async resolveAddress(input) { return this.addresses.resolveAddress(input); }
  async relocateAddress(input) { return this.addresses.relocate(input); }

  async runAutomaton(id, input, context = {}) {
    const routed = await this.meshKernel.request('system:execution', {
      operation: 'automata.run', payload: { id, input: clone(input), context: clone(context) },
    });
    if (!routed.delivered) throw new Error('execution mesh service unavailable');
    return routed.result;
  }

  async runProcess(id, input, context = {}) {
    const routed = await this.meshKernel.request('system:execution', {
      operation: 'process.execute', payload: { id, input: clone(input), context: clone(context) },
    });
    if (!routed.delivered) throw new Error('execution mesh service unavailable');
    return routed.result;
  }

  async requestBackend(id, request) {
    const routed = await this.meshKernel.request('system:execution', {
      operation: 'backend.request', payload: { id, request: clone(request) },
    });
    if (!routed.delivered) throw new Error('execution mesh service unavailable');
    return routed.result;
  }

  async buildPurposeRoadmap(input) {
    const routed = await this.meshKernel.request('system:purpose-guide', {
      operation: 'roadmap', payload: clone(input),
    });
    if (!routed.delivered) throw new Error('purpose-guide mesh service unavailable');
    return routed.result;
  }

  async recordPurposeOutcome(input) {
    const routed = await this.meshKernel.request('system:purpose-guide', {
      operation: 'outcome', payload: clone(input),
    });
    if (!routed.delivered) throw new Error('purpose-guide mesh service unavailable');
    return routed.result;
  }

  async getPurposeRoadmap(userId, roadmapId = null) {
    const routed = await this.meshKernel.request('system:purpose-guide', {
      operation: 'read', payload: { userId, roadmapId },
    });
    if (!routed.delivered) throw new Error('purpose-guide mesh service unavailable');
    return routed.result;
  }

  async activateAddress(input, options = {}) {
    const routed = await this.meshKernel.request('system:state-space', {
      operation: 'activate',
      payload: { input: clone(input), options: clone(options) },
    });
    if (!routed.delivered) throw new Error('state-space mesh service unavailable');
    return routed.result;
  }

  async _activateAddressLocal(packet = {}) {
    const input = packet?.input ?? packet;
    const { remember = true, meshState = null, privateStateRef = null } = packet?.options ?? {};
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
    if (record.entry && !this.apps.has(record.id)) {
      this.apps.register(record.id, {
        kind: 'synthimg-app',
        imageSha256: record.payloadSha256,
        entry: record.entry,
        manifest: record.manifest,
      });
    }
    if (record.residentEntry && !this.agents.has(record.id)) {
      this.agents.register(record.id, {
        kind: 'synthimg-resident',
        imageSha256: record.payloadSha256,
        residentEntry: record.residentEntry,
        manifest: record.manifest,
      });
    }
    return record;
  }

  async launchSynthImage(appId, { full = this.launchProfile === 'full' } = {}) {
    const wake = await this.images.wake(appId, { full });
    if (!wake.launchUrl) throw new Error(`${appId} is a resident Synth image, not an iframe application; use mountResidentSynthImage()`);
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

  async mountResidentSynthImage(imageId, options = {}) {
    const wake = await this.images.wake(imageId, { full: true });
    if (!wake.residentModuleUrl) throw new Error(`${imageId} has no resident runtime entry`);
    const manifest = wake.record.manifest ?? {};
    const residentType = manifest.resident_type ?? manifest.residentType ?? null;
    if (residentType !== 'synthia57') {
      throw new Error(`No resident loader is registered for ${residentType ?? 'unknown resident type'}`);
    }
    const base = new URL(wake.record.base, globalThis.location?.origin ?? 'https://synth.local').href;
    const runtimeEntry = manifest.embodiment_entry ?? manifest.embodimentEntry
      ?? 'vendor/pure-synthia-v0.4.0/src/synthia/synthiaRuntime.mjs';
    return this.mountSynthia57({
      ...options,
      base,
      federatedModule: wake.residentModuleUrl,
      synthiaRuntimeModule: new URL(runtimeEntry, base).href,
      residentId: options.residentId ?? manifest.resident_id ?? manifest.residentId ?? 'synthia',
    });
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

  async bindPhoneHost(host) {
    this.phoneWorld = new PhoneWorldBridge({
      host,
      mesh: this.meshKernel,
      indiverse: this.indiverse,
      state: this.state,
      bus: this.bus,
    });
    return this.phoneWorld.mount();
  }

  async phoneRequest(operation, payload = {}) {
    if (!this.phoneWorld) throw new Error('Phone World host not bound');
    const routed = await this.meshKernel.request('phone:world', {
      operation,
      payload: clone(payload),
    });
    if (!routed.delivered) return { queued: routed.queued, result: null };
    return routed.result;
  }

  async observePhoneApplication(observation, options = {}) {
    if (!this.phoneWorld) throw new Error('Phone World host not bound');
    return this.phoneWorld.observeApplication(clone(observation), clone(options));
  }

  async mountSynthia57(options = {}) {
    return this.synthia57.mount(options);
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
      worlds: this.worldFederation.snapshot(),
      synthia57: this.synthia57.get('synthia')?.adapter?.snapshot?.() ?? null,
      phoneWorld: this.phoneWorld?.snapshot?.() ?? null,
    };
  }
}

export default MobileComputerRuntime;
