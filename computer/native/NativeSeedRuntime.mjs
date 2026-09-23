import { EventBus, MemoryPersistence, StateStore, Registry } from '../core/kernel.mjs';
import { AutomataEngine, ProcessFabric, BackendBroker } from '../runtime/execution.mjs';
import { StateSpaceEngine } from '../donors/recovered/you-n-i-verse-corrected/state-space-engine-v2.ported.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { DormantCompilerBroker } from '../runtime/dormant-compiler.mjs';
import { ResidentHost } from '../runtime/resident-host.mjs';
import { IndiVerseRuntime } from '../worlds/indiverse.mjs';
import { WorldFederation } from '../worlds/world-federation.mjs';
import { Synthia57PackageLoader } from '../residents/synthia57-package-loader.mjs';
import { StellarLabAdapter } from '../labs/stellar-lab-adapter.mjs';
import { ConsciousnessRealmPackageLoader } from '../worlds/consciousness-realm-loader.mjs';
import { HumanAgentMechanicsAdapter } from '../worlds/adapters/human-agent.mjs';
import { TriformPackageLoader } from '../worlds/triform-loader.mjs';
import { PhoneWorldBridge } from './phone-world.mjs';
import { NativeTerminalService } from './terminal-service.mjs';
import { TermuxCompilerAdapter } from '../adapters/termux-compiler.mjs';

const clone = value => value === undefined ? undefined : structuredClone(value);

export class NativeSeedRuntime {
  constructor({
    persistence = new MemoryPersistence(),
    namespace = 'synthai-native-seed',
    clock = () => Date.now(),
  } = {}) {
    this.bus = new EventBus();
    this.state = new StateStore({ bus: this.bus, persistence, namespace });
    this.clock = clock;
    const registry = kind => new Registry({ kind, bus: this.bus });
    this.tools = registry('tool');
    this.automataRegistry = registry('automaton');
    this.processRegistry = registry('process');
    this.backendsRegistry = registry('backend');

    this.automata = new AutomataEngine({ bus: this.bus, automata: this.automataRegistry, tools: this.tools, state: this.state });
    this.processes = new ProcessFabric({ bus: this.bus, processes: this.processRegistry, state: this.state });
    this.backends = new BackendBroker({ bus: this.bus, backends: this.backendsRegistry });
    this.stateSpace = new StateSpaceEngine();

    this.meshKernel = new RelationalMeshKernel({ state: this.state, bus: this.bus, clock });
    this.compiler = new DormantCompilerBroker({ state: this.state, bus: this.bus, clock });
    this.compilerBackends = new Map();
    this.compiler.attachCompiler({
      id: 'native-seed-compiler-router',
      compile: async spec => {
        const backend = this.compilerBackends.get(String(spec.target ?? 'auto'));
        if (!backend?.compile) throw new Error(`compiler backend unavailable: ${spec.target ?? 'auto'}`);
        return backend.compile(clone(spec));
      },
    });

    this.indiverse = new IndiVerseRuntime({ state: this.state, bus: this.bus, mesh: this.meshKernel, clock });
    this.residents = new ResidentHost({ state: this.state, bus: this.bus, mesh: this.meshKernel, compiler: this.compiler, indiverse: this.indiverse, clock });
    this.worldFederation = new WorldFederation({ state: this.state, bus: this.bus, mesh: this.meshKernel, residents: this.residents, clock });
    this.synthia57 = new Synthia57PackageLoader({ computer: this, bus: this.bus });
    this.stellarLab = new StellarLabAdapter({ mesh: this.meshKernel, state: this.state, bus: this.bus, clock });
    this.consciousnessRealm = new ConsciousnessRealmPackageLoader({ computer: this, bus: this.bus });
    this.humanAgent = null;
    this.triform = new TriformPackageLoader({ computer: this, bus: this.bus });
    this.phoneWorld = null;
    this.terminal = null;
  }

  async boot() {
    await this.state.restore();
    await this.meshKernel.boot();

    await this.#ensureParticipant('computer:self', {
      kind: 'native-seed',
      residency: 'active',
      capabilities: ['mesh.host','state-space','execution','resident-host','compiler.dormant','terminal','app.host','indiverse','world-federation'],
      publicState: { name: 'SynthAI Native Seed', runtime: 'native-seed' },
    });
    await this.#ensureParticipant('system:state-space', {
      kind: 'core-service', residency: 'active',
      capabilities: ['state-space.activate','state-space.query'],
      publicState: { wired: true },
    });
    await this.#ensureParticipant('system:execution', {
      kind: 'core-service', residency: 'active',
      capabilities: ['automata.run','process.execute','backend.request'],
      publicState: { wired: true },
    });
    await this.#ensureParticipant('system:compiler', {
      kind: 'core-service', residency: 'warm',
      capabilities: ['compiler.ensure','compiler.cache'],
      publicState: { lifecycle: this.compiler.lifecycle },
    });
    await this.#ensureParticipant('system:resident-host', {
      kind: 'core-service', residency: 'active',
      capabilities: ['resident.mount','resident.sleep','resident.wake','world.attach'],
    });
    await this.#ensureParticipant('system:indiverse', {
      kind: 'core-service', residency: 'active',
      capabilities: ['world.qualia-contract','world.visitor-morph'],
    });

    for (const id of ['system:state-space','system:execution','system:compiler','system:resident-host','system:indiverse']) {
      if (!this.meshKernel.relationshipsFor(id).some(e => e.type === 'hosted-by' && e.to === 'computer:self')) {
        await this.meshKernel.connect(id, 'computer:self', { type: 'hosted-by' });
      }
    }
    if (!this.meshKernel.relationshipsFor('system:execution').some(e => e.type === 'contextualized-by' && e.to === 'system:state-space')) {
      await this.meshKernel.connect('system:execution', 'system:state-space', { type: 'contextualized-by' });
    }

    this.meshKernel.bindHandler('system:state-space', async envelope => {
      if (envelope.operation === 'activate') return this.#activateLocal(envelope.payload ?? {});
      if (envelope.operation === 'snapshot') return this.stateSpaceSnapshot();
      throw new Error(`unsupported state-space operation: ${envelope.operation}`);
    });
    this.meshKernel.bindHandler('system:execution', async envelope => {
      const p = envelope.payload ?? {};
      if (envelope.operation === 'automata.run') return this.automata.run(p.id, p.input, p.context ?? {});
      if (envelope.operation === 'process.execute') return this.processes.execute(p.id, p.input, p.context ?? {});
      if (envelope.operation === 'backend.request') return this.backends.request(p.id, p.request);
      throw new Error(`unsupported execution operation: ${envelope.operation}`);
    });
    this.meshKernel.bindHandler('system:compiler', async envelope => {
      if (envelope.operation !== 'ensure') throw new Error(`unsupported compiler operation: ${envelope.operation}`);
      const result = await this.compiler.ensure(envelope.payload ?? {});
      await this.meshKernel.publishPresence('system:compiler', { lifecycle: this.compiler.lifecycle, lastModule: result.id });
      return result;
    });

    await this.worldFederation.seedCanonicalLayers();
    await this.stellarLab.mount();
    await this.worldFederation.bind('lab:stellar', this.stellarLab);
    await this.state.set('computer.boot', { status: 'ready', flavor: 'native-seed', at: this.clock() }, { source: 'native-seed' });
    this.bus.emit('computer:ready', this.snapshot());
    return this;
  }

  async #ensureParticipant(id, options) {
    if (!this.meshKernel.participant(id)) return this.meshKernel.registerParticipant(id, options);
    await this.meshKernel.setResidency(id, options.residency ?? 'active');
    if (options.publicState) await this.meshKernel.publishPresence(id, options.publicState);
    return this.meshKernel.participant(id);
  }

  async activateAddress(input, options = {}) {
    const routed = await this.meshKernel.request('system:state-space', {
      operation: 'activate', payload: { input: clone(input), options: clone(options) },
    });
    if (!routed.delivered) throw new Error('state-space mesh service unavailable');
    return routed.result;
  }

  async #activateLocal(packet = {}) {
    const input = packet.input ?? packet;
    for (const field of ['gate','line','color','tone','base']) {
      if (!Number.isFinite(Number(input[field]))) throw new Error(`activateAddress requires ${field}`);
    }
    const node = this.stateSpace.createNode(
      Number(input.gate), Number(input.line), Number(input.color), Number(input.tone), Number(input.base),
      Number(input.degree ?? 0), Number(input.minute ?? 0), Number(input.second ?? 0), Number(input.arc ?? 0) % 100
    );
    const final = this.stateSpace.applyPipeline(node);
    const result = {
      input: clone(input),
      node: this.#node(final),
      coherence: this.stateSpace.getState().coherence,
      sentence: this.stateSpace.generateSentence(final),
      at: this.clock(),
    };
    await this.state.set('stateSpace.last', result, { source: 'native-seed-state-space' });
    return result;
  }

  #node(node) {
    if (!node) return null;
    return {
      id: node.id, gate: node.gate, line: node.line, color: node.color, tone: node.tone, base: node.base,
      degree: node.degree, minute: node.minute, second: node.second, arcSecond: node.arcSecond,
      axis: node.axis, zodiac: node.zodiac, house: node.house, planet: node.planet,
      dimension: node.dimension, amplitude: node.amplitude, phase: node.phase,
    };
  }

  stateSpaceSnapshot() {
    const s = this.stateSpace.getState();
    return { nodes:[...s.nodes.values()].map(n=>this.#node(n)), edges:s.edges.map(e=>({...e})), coherence:s.coherence, timestamp:s.timestamp, historyLength:s.history.length };
  }

  async runAutomaton(id, input, context = {}) {
    const r = await this.meshKernel.request('system:execution', { operation:'automata.run', payload:{id,input:clone(input),context:clone(context)} });
    if (!r.delivered) throw new Error('execution mesh service unavailable');
    return r.result;
  }
  async runProcess(id, input, context = {}) {
    const r = await this.meshKernel.request('system:execution', { operation:'process.execute', payload:{id,input:clone(input),context:clone(context)} });
    if (!r.delivered) throw new Error('execution mesh service unavailable');
    return r.result;
  }
  async requestBackend(id, request) {
    const r = await this.meshKernel.request('system:execution', { operation:'backend.request', payload:{id,request:clone(request)} });
    if (!r.delivered) throw new Error('execution mesh service unavailable');
    return r.result;
  }

  registerCompilerBackend(target, adapter) {
    if (!target || typeof adapter?.compile !== 'function') throw new TypeError('compiler backend requires target and compile(spec)');
    this.compilerBackends.set(String(target), adapter);
    return adapter;
  }
  async ensureCompiled(spec) {
    const r = await this.meshKernel.request('system:compiler', { operation:'ensure', payload:clone(spec) });
    if (!r.delivered) throw new Error('compiler mesh service unavailable');
    return r.result;
  }

  async mountTriform(options = {}) { return this.triform.mount(options); }
  async mountInstalledTriform(options = {}) { return this.triform.mountInstalledPackage(options); }

  async bindTerminalHost(host, { compilerTarget = 'termux' } = {}) {
    this.terminal = new NativeTerminalService({
      executor:host,
      state:this.state,
      mesh:this.meshKernel,
      bus:this.bus,
      clock:this.clock,
    });
    await this.terminal.mount();
    this.registerCompilerBackend(compilerTarget, new TermuxCompilerAdapter({
      executor:host,
      files:host,
      id:'computer-terminal-compiler',
    }));
    if (!this.meshKernel.relationshipsFor('system:terminal').some(e => e.type === 'hosted-by' && e.to === 'computer:self')) {
      await this.meshKernel.connect('system:terminal','computer:self',{type:'hosted-by'});
    }
    if (!this.meshKernel.relationshipsFor('system:compiler').some(e => e.type === 'executes-through' && e.to === 'system:terminal')) {
      await this.meshKernel.connect('system:compiler','system:terminal',{type:'executes-through'});
    }
    return this.terminal.snapshot();
  }

  async terminalRequest(operation, payload = {}) {
    if (!this.terminal) throw new Error('Computer terminal host not bound');
    const routed = await this.meshKernel.request('system:terminal', {
      operation,
      payload:clone(payload),
    });
    if (!routed.delivered) return { queued:routed.queued, result:null };
    return routed.result;
  }

  async bindPhoneHost(host) {
    this.phoneWorld = new PhoneWorldBridge({
      host,
      mesh:this.meshKernel,
      indiverse:this.indiverse,
      state:this.state,
      bus:this.bus,
      clock:this.clock,
    });
    return this.phoneWorld.mount();
  }

  async phoneRequest(operation, payload = {}) {
    if (!this.phoneWorld) throw new Error('Phone World host not bound');
    const routed = await this.meshKernel.request('phone:world', {
      operation,
      payload:clone(payload),
    });
    if (!routed.delivered) return { queued:routed.queued, result:null };
    return routed.result;
  }

  async bindHumanAgentHost(host) {
    this.humanAgent = new HumanAgentMechanicsAdapter({ host, state:this.state, bus:this.bus, clock:this.clock });
    await this.worldFederation.bind('mechanics:human-agent', this.humanAgent);
    return this.humanAgent.snapshot();
  }

  async humanAgentRequest(operation, payload = {}) {
    if (!this.humanAgent) throw new Error('Human Agent mechanics host not bound');
    return this.worldFederation.invoke('mechanics:human-agent', operation, payload);
  }

  async mountConsciousnessRealm(options = {}) { return this.consciousnessRealm.mount(options); }
  async mountInstalledConsciousnessRealm(options = {}) { return this.consciousnessRealm.mountInstalledPackage(options); }
  async sendResidentHome(residentId = 'synthia') { return this.consciousnessRealm.attachResident(residentId); }

  async registerResident(id, options = {}) { return this.residents.registerResident(id, options); }
  bindResidentRuntime(id, runtime) { return this.residents.bindRuntime(id, runtime); }
  async mountSynthia57(options = {}) { return this.synthia57.mount(options); }
  async registerReality(id, adapter, options = {}) { return this.residents.registerWorld(id, adapter, options); }
  async enterReality(residentId, worldId) { return this.residents.enterWorld(residentId, worldId); }
  async sleepResident(id, checkpoint = {}) { return this.residents.sleep(id, checkpoint); }
  async wakeResident(id, options = {}) { return this.residents.wake(id, options); }
  registerStellarExecutor(id, executor) { return this.stellarLab.registerExecutor(id, executor); }
  registerStellarMeasure(id, measure) { return this.stellarLab.registerMeasure(id, measure); }
  async stellarRequest(operation, payload = {}) {
    const routed = await this.meshKernel.request('lab:stellar', { operation, payload: clone(payload) });
    if (!routed.delivered) return { queued: routed.queued, result: null };
    return routed.result;
  }

  async createIndiVerse(ownerId, options = {}) { return this.indiverse.createWorld(ownerId, options); }
  async registerCanonicalWorldObject(object) { return this.indiverse.registerCanonicalObject(object); }
  viewSharedWorldObject(objectId) { return this.indiverse.renderShared(objectId); }
  viewIndiVerseObject(worldId, objectId) { return this.indiverse.renderInWorld(worldId, objectId); }
  visitorMorphContract(options) { return this.indiverse.visitorContract(options); }

  async sleep() {
    const checkpoint = { stateSpace: this.stateSpaceSnapshot(), worlds: this.worldFederation.snapshot(), at: this.clock() };
    return this.meshKernel.sleepParticipant('computer:self', checkpoint);
  }

  async wake({ replay = null } = {}) {
    return this.meshKernel.wakeParticipant('computer:self', { replay });
  }

  snapshot() {
    return {
      flavor: 'native-seed',
      mesh: this.meshKernel.snapshot(),
      stateSpace: this.stateSpaceSnapshot(),
      compiler: this.compiler.snapshot(),
      residents: this.residents.snapshot(),
      worlds: this.worldFederation.snapshot(),
      stellar: this.stellarLab.snapshot(),
      humanAgent: this.humanAgent?.snapshot?.() ?? null,
      phoneWorld: this.phoneWorld?.snapshot?.() ?? null,
      terminal: this.terminal?.snapshot?.() ?? null,
      triform: this.triform.get()?.adapter?.snapshot?.() ?? null,
      indiverse: this.indiverse.snapshot(),
      synthia57: this.synthia57.get('synthia')?.adapter?.snapshot?.() ?? null,
    };
  }
}

export default NativeSeedRuntime;
