const DONOR = Object.freeze({
  kimi: new URL('../donors/Back-up-/vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/engine/synthia.js', import.meta.url).href,
  ato: new URL('../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/ato-core/automaton.mjs', import.meta.url).href,
  state: new URL('../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/ato-core/state-space-kernel.mjs', import.meta.url).href,
  klein: new URL('../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/ato-core/klein-tools.mjs', import.meta.url).href,
  factory: new URL('../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/integrated-tool-factory/integrated-tool-factory.mjs', import.meta.url).href,
  factoryBridge: new URL('../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/integrated-tool-factory/ato-native-bridge.mjs', import.meta.url).href,
  androidCompile: new URL('../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/runtime/AndroidSelfCompileCapability.mjs', import.meta.url).href,
  androidReproduce: new URL('../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/runtime/AndroidReproductionExecutor.mjs', import.meta.url).href,
});

export const RESIDENT_BOOT_ORDER = Object.freeze([
  'execution-engine',
  'state-space',
  'ato-engine',
  'tool-factory',
  'klein',
  'synthia',
  'hands',
]);

export const CANONICAL_KIMI_TOOLS = Object.freeze([
  'autoling-lite', 'diseminer-lite', 'klein-analogy', 'iching-grammar',
  'language-contact', 'historical-monte-carlo', 'autonovel', 'messy',
  'success', 'conversation', 'browser-form', 'research-browser',
  'computational-grammar-coder', 'autoling', 'diseminer', 'morph-mir',
]);

const TOKEN_FEATURES = Object.freeze([
  ['question', /\?|\b(what|why|how|who|where|when)\b/i],
  ['build', /\b(build|create|code|app|system|tool|computer|runtime)\b/i],
  ['research', /\b(research|evidence|source|study|report)\b/i],
  ['state', /\b(state|gate|line|dimension|human design|address)\b/i],
  ['artifact', /\b(file|zip|apk|repo|repository|artifact|build)\b/i],
  ['browser', /\b(browser|web|site|page|navigate)\b/i],
  ['automation', /\b(auto|automatic|automate|autonomous|agent)\b/i],
  ['relationship', /\b(connect|mesh|relationship|link|channel)\b/i],
]);

function featureSet(text) {
  const value = String(text ?? '');
  const out = TOKEN_FEATURES.filter(([, pattern]) => pattern.test(value)).map(([name]) => name);
  return out.length ? out : ['input'];
}

function safeText(value, limit = 900) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.slice(0, limit);
  try { return JSON.stringify(value).slice(0, limit); }
  catch { return String(value).slice(0, limit); }
}

function factoryProbe(tool, request = {}) {
  const manifest = tool.manifest();
  const level = manifest?.structure?.level ?? 0;
  const a = manifest.address ?? {};
  const seed = request.input ?? request.purpose ?? 'resident verification';
  if (level === 1) return 0.5;
  if (level === 2) return [{ gate: a.gate, line: a.line, color: a.color, tone: a.tone, base: a.base }];
  if (level === 3) return [seed, seed];
  return seed;
}

export class SynthiaResident {
  constructor({ bus = null, state = null, stateResolver = null, executionGateway = null, autoRegistrar = null } = {}) {
    this.bus = bus;
    this.state = state;
    this.stateResolver = stateResolver;
    this.executionGateway = executionGateway;
    this.autoRegistrar = autoRegistrar;
    this.status = 'created';
    this.bootedAt = null;
    this.loadedBuilds = new Map();
    this.chatSequence = 0;
  }

  async boot() {
    if (this.status === 'ready') return this;
    this.status = 'booting';
    const [kimiMod, atoMod, stateMod, kleinMod, factoryMod, bridgeMod, androidCompileMod, androidReproduceMod] = await Promise.all([
      import(DONOR.kimi), import(DONOR.ato), import(DONOR.state), import(DONOR.klein),
      import(DONOR.factory), import(DONOR.factoryBridge), import(DONOR.androidCompile), import(DONOR.androidReproduce),
    ]);

    this.Automaton = atoMod.Automaton;
    this.atoMesh = new atoMod.AutomataMesh();
    this.stateKernel = new stateMod.StateSpaceKernel();
    this.factory = new factoryMod.IntegratedToolFactory();
    this.factoryBridge = new bridgeMod.ATONativeBridge({ Automaton: this.Automaton, mesh: this.atoMesh, factory: this.factory });
    this.kleinTools = kleinMod.bootstrapKleinTools(this.atoMesh);
    this.kimi = new kimiMod.SynthiaAutomata();
    this.androidSelfCompile = new androidCompileMod.AndroidSelfCompileCapability();
    this.AndroidReproductionExecutor = androidReproduceMod.AndroidReproductionExecutor;

    this.#mountControlMesh();
    this.#assertKimiContract();

    const persisted = this.state?.get('resident.loadedBuilds', {}) ?? {};
    for (const [id, build] of Object.entries(persisted)) this.loadedBuilds.set(id, build);

    this.status = 'ready';
    this.bootedAt = Date.now();
    await this.state?.set('resident.boot', {
      status: 'ready', bootedAt: this.bootedAt, order: RESIDENT_BOOT_ORDER,
      kimiTools: this.kimi.listTools().map(tool => tool.id),
      restoredBuilds: this.loadedBuilds.size,
    }, { source: 'synthia-resident' });
    this.bus?.emit('resident:ready', this.snapshot());
    return this;
  }

  #mountControlMesh() {
    const hub = new this.Automaton({
      id: 'resident-mesh-hub',
      address: { mode: 'macro', gate: 20, line: 1, color: 1, tone: 1, base: 1 },
      structure: 'hexagram', activeLevels: [1, 2, 3, 4, 5], functionalLevel: 'space',
      ports: [
        { id: 'in', direction: 'input', type: 'json', schemaVersion: '1' },
        { id: 'out', direction: 'output', type: 'json', schemaVersion: '1', guarantees: ['addressed'] },
      ],
      implementation: input => input,
      metadata: { family: 'resident-control-mesh', role: 'hub' },
    });
    this.atoMesh.add(hub);

    const stateAdapter = new this.Automaton({
      id: 'state-space',
      address: { mode: 'macro', gate: 61, line: 1, color: 1, tone: 1, base: 1 },
      structure: 'hexagram', activeLevels: [1, 2, 3, 4, 5], functionalLevel: 'mind',
      ports: [
        { id: 'in', direction: 'input', type: 'json', schemaVersion: '1' },
        { id: 'out', direction: 'output', type: 'json', schemaVersion: '1', guarantees: ['addressed'] },
      ],
      implementation: input => input?.address ? this.stateKernel.get(input.address) : this.stateKernel.describe(input?.text ?? input),
      metadata: { family: 'state-space-kernel', role: 'possibility-space' },
    });
    this.atoMesh.add(stateAdapter);

    const executionAdapter = new this.Automaton({
      id: 'execution-engine',
      address: { mode: 'macro', gate: 34, line: 1, color: 1, tone: 1, base: 1 },
      structure: 'hexagram', activeLevels: [1, 2, 3, 4, 5], functionalLevel: 'being',
      ports: [
        { id: 'in', direction: 'input', type: 'json', schemaVersion: '1' },
        { id: 'out', direction: 'output', type: 'json', schemaVersion: '1', guarantees: ['addressed'] },
      ],
      implementation: async input => {
        if (!this.executionGateway || !input?.capability) return { status: 'ready', provider: this.executionGateway?.providerId ?? null };
        return this.executionGateway.execute(input.capability, input.input, input.context ?? {});
      },
      metadata: { family: 'execution-engine', role: 'execution-substrate' },
    });
    this.atoMesh.add(executionAdapter);

    for (const id of ['state-space', 'execution-engine', ...this.kleinTools.map(tool => tool.id)]) {
      const result = this.atoMesh.connect(id, hub.id, { outputPort: 'out', inputPort: 'in' });
      if (result.status !== 'connected') throw new Error(`resident control mesh failed to connect ${id}: ${result.reason}`);
    }
  }

  #assertKimiContract() {
    const ids = new Set(this.kimi.listTools().map(tool => tool.id));
    const missing = CANONICAL_KIMI_TOOLS.filter(id => !ids.has(id));
    if (missing.length) throw new Error(`Kimi mesh missing canonical tools: ${missing.join(', ')}`);
    const metrics = this.kimi.meshMetrics();
    const projections = metrics?.projections ?? {};
    for (const projection of ['knowledge', 'causal', 'phase', 'temporal', 'dependency']) {
      if (!projections?.[projection]) throw new Error(`Kimi mesh missing projection: ${projection}`);
    }
  }

  async chat(text, context = {}) {
    await this.boot();
    const input = String(text ?? '').trim();
    if (!input) throw new Error('chat text required');

    const state = this.stateResolver
      ? await this.stateResolver.resolveState(context.entity ?? { identity: context.actorId ?? 'resident-user', ...(context.address ? { address: context.address } : {}) }, null, context)
      : null;

    const learning = await this.kimi.request(input, context);
    const autoling = await this.atoMesh.automatons.get('autoling').call({ operation: 'recognize', text: input }, context);
    const diseminer = await this.atoMesh.automatons.get('diseminer').call({ operation: 'ingest', text: input, context: { source: 'resident-chat', address: state?.address ?? null } }, context);

    const previousText = context.previousText ?? this.state?.get('resident.chat.lastInput', '') ?? '';
    const goalText = context.goal ?? input;
    const A = featureSet(input);
    const B = featureSet(previousText || input);
    const C = featureSet(goalText);
    const vocab = [...new Set([...TOKEN_FEATURES.map(([name]) => name), 'input'])];
    const analogy = await this.atoMesh.automatons.get('klein-analogy').call({ vocab, A, B, C }, context);

    let iching = { ok: false, status: 'unaddressed' };
    if (Number.isInteger(state?.address?.gate)) {
      const bits = [...this.stateKernel.vector({ mode: 'macro', gate: state.address.gate, line: state.address.line ?? 1, color: state.address.color ?? 1, tone: state.address.tone ?? 1, base: state.address.base ?? 1 })].slice(0, 6);
      iching = await this.atoMesh.automatons.get('iching-grammar').call({ lines: bits }, context);
    }

    const contributions = [
      `Kimi state-space route: ${safeText({ status: learning?.status ?? 'processed', route: learning?.route ?? null })}`,
      `Klein ATO: ${safeText(analogy)}`,
      `AutoLing: ${safeText(autoling)}`,
      `DISEMINER: ${safeText(diseminer)}`,
      state ? `Resolved state: ${safeText({ address: state.address, confidence: state.confidence })}` : null,
      iching?.ok ? `I Ching grammar: ${safeText(iching)}` : null,
    ].filter(Boolean);

    const conversation = this.kimi.toolsById.get('conversation').run({ text: input, contributions }, context);
    const reply = conversation?.output?.utterance ?? safeText(conversation?.output ?? input, 5000);
    const sequence = ++this.chatSequence;
    const trace = Object.freeze([
      'execution-engine', 'state-space', 'ato-engine', 'tool-factory',
      'autoling', 'diseminer', 'klein-analogy', 'iching-grammar', 'conversation',
    ]);
    const record = { sequence, input, reply, trace, at: Date.now(), kimiStatus: learning?.status ?? null, stateAddress: state?.address ?? null };
    await this.state?.set('resident.chat.lastInput', input, { source: 'synthia-resident' });
    await this.state?.set('resident.chat.last', record, { source: 'synthia-resident' });
    this.autoRegistrar?.registerAccepted({
      kind: 'runtime-execution', identity: `resident-chat-${sequence}`, status: 'VERIFIED',
      origin: { source: 'synthia-resident', at: record.at }, capabilities: ['chat', 'klein', 'kimi-state-space', 'ato'],
      relationships: trace.map(target => ({ type: 'executed-through', target })), verification: [{ kind: 'runtime', status: 'verified-by-runtime', at: record.at }],
      metadata: record,
    });
    this.bus?.emit('resident:chat-complete', { sequence, trace });
    return { ...record, learning, state, klein: analogy, autoling, diseminer, iching, conversation: conversation?.output ?? null };
  }

  async growTool(request = {}) {
    await this.boot();
    const generated = this.factoryBridge.generateAndMount(request);
    if (!generated?.tool) return generated;
    const tool = generated.tool;
    const automaton = generated.automaton;
    const probe = request.probeInput ?? factoryProbe(tool, request);
    try {
      const output = await automaton.call(probe, { purpose: 'resident-retention-test' });
      const link = this.atoMesh.connect(automaton.id, 'resident-mesh-hub', { inputPort: 'in' });
      const manifest = tool.manifest();
      this.autoRegistrar?.registerAccepted({
        kind: 'tool', identity: tool.id, status: 'VERIFIED', origin: { source: 'integrated-tool-factory', at: Date.now() },
        capabilities: [manifest?.metadata?.purpose ?? 'generated-tool'].filter(Boolean), relationships: [{ type: 'mesh', target: 'ato-engine' }],
        verification: [{ kind: 'retention-probe', status: 'passed', at: Date.now() }], metadata: { manifest, probe, output, meshLink: link.status },
      });
      this.bus?.emit('resident:tool-retained', { toolId: tool.id, manifest });
      return { ...generated, retention: 'VERIFIED', probe, output, meshLink: link.status };
    } catch (error) {
      this.factoryBridge.dissolve(tool.id, 'retention-probe-failed');
      this.autoRegistrar?.registerAccepted({
        kind: 'tool', identity: tool.id, status: 'FAILED', origin: { source: 'integrated-tool-factory', at: Date.now() },
        verification: [{ kind: 'retention-probe', status: 'failed', at: Date.now(), error: String(error?.message ?? error) }], metadata: { request },
      });
      this.bus?.emit('resident:tool-rejected', { toolId: tool.id, error: String(error?.message ?? error) });
      return { ...generated, retention: 'FAILED', error: String(error?.message ?? error) };
    }
  }

  async loadBuild(build = {}) {
    await this.boot();
    if (!build.id) throw new Error('build id required');
    const record = Object.freeze({ ...build, loadedAt: Date.now() });
    this.loadedBuilds.set(build.id, record);
    await this.state?.set(`resident.loadedBuilds.${encodeURIComponent(build.id)}`, record, { source: 'resident-autoloader' });
    this.bus?.emit('resident:build-loaded', { id: build.id, version: build.version ?? null });
    return record;
  }

  inspectAndroid(env = {}) {
    return this.androidSelfCompile?.inspect(env) ?? { available: false, status: 'resident-not-booted' };
  }

  androidReproduction(root = '.') {
    if (!this.AndroidReproductionExecutor) throw new Error('resident not booted');
    return new this.AndroidReproductionExecutor({ root });
  }

  browserSurface() {
    const tools = this.kimi?.listTools?.() ?? [];
    return {
      status: this.status === 'ready' ? 'ready' : this.status,
      tools: tools.filter(tool => ['browser-form', 'research-browser'].includes(tool.id)),
      mode: 'resident-browser-hands',
    };
  }

  snapshot() {
    const kimiTools = this.kimi?.listTools?.() ?? [];
    return {
      id: 'synthia-resident-computer', status: this.status, bootedAt: this.bootedAt,
      order: RESIDENT_BOOT_ORDER,
      execution: { provider: this.executionGateway?.providerId ?? null, ready: Boolean(this.executionGateway) },
      stateSpace: { atoKernelStates: this.stateKernel?.states?.size ?? 0, kimiProvider: this.stateResolver?.providerId ?? null },
      ato: this.atoMesh?.snapshot?.() ?? null,
      toolFactory: this.factory?.snapshot?.() ?? null,
      klein: { mounted: this.kleinTools?.map(tool => tool.id) ?? [] },
      kimi: {
        toolCount: kimiTools.length,
        tools: kimiTools,
        mesh: this.kimi?.meshMetrics?.()?.projections ?? null,
        meshSummary: this.kimi?.meshMetrics?.() ?? null,
        grownTools: this.kimi?.grownTools?.()?.map?.(tool => tool.id ?? tool.manifest?.id ?? null) ?? [],
      },
      hands: { browser: this.browserSurface(), androidSelfCompile: Boolean(this.androidSelfCompile) },
      loadedBuilds: [...this.loadedBuilds.keys()],
      federation: {
        nativeMeshes: ['kimi-state-space-mesh', 'ato-core-mesh'],
        links: [
          { from: 'execution-engine', to: 'state-space' },
          { from: 'state-space', to: 'ato-engine' },
          { from: 'ato-engine', to: 'tool-factory' },
          { from: 'tool-factory', to: 'klein' },
          { from: 'klein', to: 'synthia' },
          { from: 'synthia', to: 'hands' },
        ],
      },
    };
  }
}

export default SynthiaResident;
