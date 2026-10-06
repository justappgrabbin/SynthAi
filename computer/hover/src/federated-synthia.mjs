import { bootstrapCurrentSynthiaSwarm } from '../vendor/pure-synthia-v0.4.0/src/synthia/swarm/bootstrap.mjs';
import { MemoryCheckpointStore } from '../vendor/pure-synthia-v0.4.0/src/synthia/swarm/checkpointStores.mjs';
import { FileRuntimeStore } from './persistence/file-runtime-store.mjs';
import { BirthMirrorRuntime } from './identity/birth-mirror-runtime.mjs';
import { resolveZonedBirthInstant } from './identity/birth-location-provider.mjs';
import { MirrorExpressionOrgan } from './identity/mirror-expression-organ.mjs';
import { IntegratedSynthiaSystem } from './integrated-synthia-system.mjs';
import { RelationalMesh } from './mesh/relational-mesh.mjs';
import { MeshFederation } from './mesh/mesh-federation.mjs';
import { SovereignStateSpaceRuntime, centerSlug } from './state-space/sovereign-state-space-runtime.mjs';
import { NineCenterBody, centerMeshId } from './state-space/nine-center-body.mjs';
import { ChannelMeshBody, NEURAL_ORGAN_SPECS } from './state-space/channel-mesh-body.mjs';
import { SemanticGenome } from './state-space/semantic-genome.mjs';
import { DnaLinguisticObserver } from './state-space/dna-linguistic-observer.mjs';
import { DnaPerceptionRuntime } from './state-space/dna-perception-runtime.mjs';
import { CanonicalMorphRuntime } from './morph/canonical-morph-runtime.mjs';
import { createDeepSurfaceMorphAdapter } from './morph/deep-surface-morph-adapter.mjs';
import { LineMeaningProvider } from './state-space/line-meaning-provider.mjs';
import { MappingProviderRegistry } from './state-space/mapping-providers.mjs';
import { GateArchitectureProvider, AUTHORITATIVE_GATE_CENTERS } from './state-space/gate-architecture-provider.mjs';
import { PlanetaryFilterRegistry } from './state-space/planetary-filters.mjs';
import { DimensionPerspectiveRegistry } from './state-space/dimension-perspective-registry.mjs';
import { SynthiaRoleResolver } from './forms/synthia-role-resolver.mjs';
import { CENTER_NAMES } from '../vendor/kimi-agent-automata-state-space-merge/pure-synthia-automata/src/merged/centers-channels.js';
import { safe } from './util.mjs';

function runnable(id, capabilities, run) {
  return { id, capabilities, run };
}

/**
 * The assembled organism. Pure Synthia supplies the living/process body; the
 * execution spine and all pipeline organs share its exact semantic engine.
 */
export class FederatedSynthia {
  static async create(options = {}) {
    const runtimeStore = options.runtimeStore
      ?? (options.persistenceDir ? await new FileRuntimeStore({ directory: options.persistenceDir }).open() : null);
    const baseline = await bootstrapCurrentSynthiaSwarm({
      store: options.store ?? runtimeStore ?? new MemoryCheckpointStore(),
      identity: options.identity,
      attachFoundry: options.attachFoundry !== false,
    });
    const organism = new FederatedSynthia({ ...options, baseline, runtimeStore });
    await organism.restorePersistentState();
    return organism;
  }

  constructor({ baseline, runtimeStore = null, ...options } = {}) {
    if (!baseline?.synthia?.meshRuntime?.engine) throw new TypeError('FederatedSynthia requires the finished Pure Synthia baseline');
    this.runtimeStore = runtimeStore;
    this.requireBirthConfiguration = options.requireBirthConfiguration !== false;
    this.persistenceQueue = Promise.resolve();
    this.persistenceFailure = null;
    this.persistenceStatus = Object.freeze({ configured: Boolean(runtimeStore), durable: false, restored: false });
    this.restoringPersistentState = true;
    this.baseline = baseline;
    this.swarm = baseline.swarm;
    this.synthia = baseline.synthia;
    this.physiology = baseline.physiology;
    this.worldPort = baseline.worldPort;
    this.capabilityBridge = baseline.capabilityBridge;
    this.baselineProcessCount = this.swarm.snapshot().processCount;
    this.federation = new MeshFederation({ id: 'synthia:mesh-of-meshes' });
    this.system = new IntegratedSynthiaSystem({
      ...options,
      engine: this.synthia.meshRuntime.engine,
      federation: this.federation,
    });
    this.roleResolver = new SynthiaRoleResolver();
    this.gateArchitecture = new GateArchitectureProvider();
    this.planetaryFilters = new PlanetaryFilterRegistry();
    this.dimensionPerspectives = new DimensionPerspectiveRegistry({
      dimensionRules: options.dimensionRules ?? {},
    });
    this.stateSpaceRuntime = new SovereignStateSpaceRuntime({
      stateSpace: this.system.addressResolver.stateSpace,
      seed: options.seed ?? 0x5117,
      gateCenterMap: options.gateCenterMap ?? AUTHORITATIVE_GATE_CENTERS,
    });
    this.lineMeaningProvider = new LineMeaningProvider();
    this.mappingProviders = new MappingProviderRegistry();
    this.dnaLinguistics = new DnaLinguisticObserver();
    this.semanticGenome = new SemanticGenome({
      centerForGate: (gate) => this.stateSpaceRuntime.centersForGate(gate),
      meaningProvider: this.lineMeaningProvider,
      mappings: this.mappingProviders,
      gateArchitecture: this.gateArchitecture,
      planetaryFilters: this.planetaryFilters,
      dimensionPerspectives: this.dimensionPerspectives,
      onStateChange: (event) => {
        options.onSemanticGenomeStateChange?.(event);
        if (event?.type === 'activation' && event.activation) {
          this.dnaLinguistics.observeActivation(event.activation);
          this.dnaPerception?.enqueueActivation(event.activation);
          this.canonicalMorph?.observeActivation(event.activation);
        }
        if (event?.type === 'relationship' && event.relationship) {
          this.dnaPerception?.enqueueRelationship?.(event.relationship);
          this.canonicalMorph?.observeRelationship(event.relationship);
        }
        if (event?.type === 'temporal-superposition' && event.superposition) {
          this.dnaPerception?.enqueueTemporalSuperposition?.(event.superposition);
          this.canonicalMorph?.observeTemporalSuperposition(event.superposition);
        }
        this.#queueAgentChartPersistence(event);
        this.#queueTemporalExperiencePersistence(event);
      },
    });
    this.semanticGenome.registerAgentChart('synthia', options.agentChart ?? {});
    this.birthMirror = new BirthMirrorRuntime({
      stateSpaceRuntime: this.stateSpaceRuntime,
      semanticGenome: this.semanticGenome,
      houseProvider: options.houseProvider,
      dimensionLandingProvider: options.dimensionLandingProvider,
    });
    this.mirrorExpressionOrgan = new MirrorExpressionOrgan({
      semanticGenome: this.semanticGenome,
      identityProvider: () => this.birthMirror.configuration,
    });
    this.system.bindSemanticGenome(this.semanticGenome);
    this.centerBody = new NineCenterBody({
      runtime: this.stateSpaceRuntime,
      resolver: this.system.addressResolver,
      federation: this.federation,
      semanticGenome: this.semanticGenome,
      dimensionPerspectives: this.dimensionPerspectives,
    });
    this.channelBody = new ChannelMeshBody({
      neural: this.synthia.neural,
      stateSpaceRuntime: this.stateSpaceRuntime,
      resolver: this.system.addressResolver,
      federation: this.federation,
      scientist: this.system.scientist,
      semanticGenome: this.semanticGenome,
      gateArchitecture: this.gateArchitecture,
    });
    this.dnaPerception = new DnaPerceptionRuntime({
      channelBody: this.channelBody,
    });
    this.canonicalMorph = new CanonicalMorphRuntime({
      semanticGenome: this.semanticGenome,
      dnaPerception: this.dnaPerception,
    });
    this.embodimentRenderer = options.morphRenderer ?? null;
    if (!this.embodimentRenderer && typeof document !== 'undefined' && globalThis.MorphEngineLib?.MorphEngine) {
      this.embodimentRenderer = createDeepSurfaceMorphAdapter();
    }
    this.#registerStateSpaceApp();
    this.contextMemory = new Map();
    this.localMeshes = this.#buildLocalMeshes();
    this.system.bindGrownToolHandler(({ id, automaton, spec }) =>
      this.centerBody.mountEmergentTool({ id, automaton, spec }));
    this.#connectFederation();
    this.#registerSwarmExtensions();
  }

  #serializableAgentCharts() {
    return [...this.semanticGenome.agentCharts.values()].map((chart) => Object.freeze({
      agentId: chart.agentId,
      primaryDimension: chart.primaryDimension,
      primaryPlanetary: chart.primaryPlanetary,
      filterIntersections: chart.filterIntersections,
      source: chart.source,
    }));
  }

  #serializableTemporalExperience() {
    return this.semanticGenome.temporalExperience.exportState();
  }

  #queueTemporalExperiencePersistence(event) {
    if (!this.runtimeStore || this.restoringPersistentState || !String(event?.type ?? '').startsWith('temporal-')) return;
    const payload = this.#serializableTemporalExperience();
    this.persistenceQueue = this.persistenceQueue
      .then(() => this.runtimeStore.put('semantic-genome:temporal-experience', payload))
      .then(async () => {
        const audit = await this.runtimeStore.audit();
        this.persistenceStatus = Object.freeze({
          ...audit,
          restored: true,
          temporalHistoricalStatesPersisted: payload.landings?.length ?? 0,
          temporalMeshTracesPersisted: payload.meshTraces?.length ?? 0,
        });
      })
      .catch((error) => {
        this.persistenceFailure = error;
      });
  }

  #queueAgentChartPersistence(event) {
    if (!this.runtimeStore || this.restoringPersistentState || event?.type !== 'agent-chart') return;
    const payload = this.#serializableAgentCharts();
    this.persistenceQueue = this.persistenceQueue
      .then(() => this.runtimeStore.put('semantic-genome:agent-charts', payload))
      .then(async () => {
        const audit = await this.runtimeStore.audit();
        this.persistenceStatus = Object.freeze({ ...audit, restored: true, agentChartsPersisted: payload.length });
      })
      .catch((error) => {
        this.persistenceFailure = error;
      });
  }

  #assertPersonalized(context = {}) {
    if (this.birthMirror.configuration?.configured) return;
    if (!this.requireBirthConfiguration || context.diagnosticMode === true) return;
    const error = new Error('Birth date, exact time including seconds, and birthplace must configure the mirror before personalized execution.');
    error.code = 'BIRTH_CONFIGURATION_REQUIRED';
    throw error;
  }

  async #personalize(task, context = {}, surface = 'runtime') {
    this.#assertPersonalized(context);
    const identity = this.birthMirror.configuration;
    if (!identity?.configured) {
      return Object.freeze({
        context: Object.freeze({ ...context, diagnosticMode: true }),
        expression: null,
        swarm: null,
      });
    }
    const personId = context.personId ?? identity.personId;
    const agentId = context.agentId ?? identity.agentId;
    if (personId !== identity.personId || agentId !== identity.agentId) {
      const error = new Error(`active birth mirror belongs to personId=${identity.personId}, agentId=${identity.agentId}`);
      error.code = 'BIRTH_CONFIGURATION_SCOPE_MISMATCH';
      throw error;
    }
    const swarm = await this.swarm.submit([{
      id: `mirror-expression-${surface}-${this.swarm.cycle + 1}`,
      capability: 'express-birth-mirror',
      input: { task, address: context.agentAddress ?? null, surface },
      meta: {
        configurationId: identity.id,
        agentId,
        personId,
        replaySafe: true,
      },
    }], { checkpoint: Boolean(this.runtimeStore) });
    const execution = swarm.executions[0];
    if (!execution || execution.status !== 'complete' || !execution.output?.address) {
      const error = new Error(`birth-mirror swarm expression failed: ${execution?.error ?? 'no completed expression'}`);
      error.code = 'BIRTH_MIRROR_SWARM_EXPRESSION_FAILED';
      throw error;
    }
    const expression = execution.output;
    return Object.freeze({
      expression,
      swarm,
      context: Object.freeze({
        ...context,
        personId,
        agentId,
        agentAddress: expression.address,
        chartConfiguration: identity.chart,
        birthMirrorConfigurationId: identity.id,
        observerFrame: Object.freeze({
          ...(context.observerFrame ?? {}),
          configurationId: identity.id,
          coordinateSignature: expression.coordinateSignature,
          identityAddress: expression.identityAddress,
        }),
      }),
    });
  }

  async configureBirthMirror(input) {
    const configuration = await this.birthMirror.configure(input);
    const swarm = await this.swarm.submit([{
      id: `mirror-configuration-${this.swarm.cycle + 1}`,
      capability: 'express-birth-mirror',
      input: { task: 'initialize persisted birth mirror across the organism', surface: 'identity-configuration' },
      meta: {
        configurationId: configuration.id,
        agentId: configuration.agentId,
        personId: configuration.personId,
        replaySafe: true,
      },
    }], { checkpoint: Boolean(this.runtimeStore) });
    if (swarm.executions[0]?.status !== 'complete') {
      const error = new Error(`birth mirror could not enter the swarm: ${swarm.executions[0]?.error ?? 'no execution'}`);
      error.code = 'BIRTH_MIRROR_SWARM_CONFIGURATION_FAILED';
      throw error;
    }
    if (this.runtimeStore) {
      await this.flushPersistence();
      await this.runtimeStore.put('identity:birth-mirror', this.birthMirror.persistenceRecord());
      await this.runtimeStore.put('semantic-genome:agent-charts', this.#serializableAgentCharts());
      await this.runtimeStore.put('semantic-genome:temporal-experience', this.#serializableTemporalExperience());
      const audit = await this.runtimeStore.audit();
      this.persistenceStatus = Object.freeze({
        ...audit,
        restored: true,
        birthMirrorPersisted: true,
        agentChartsPersisted: this.semanticGenome.agentCharts.size,
      });
    }
    return Object.freeze({
      ok: true,
      identity: this.birthMirror.publicSnapshot(),
      swarm: safe(swarm),
      persistence: this.persistenceStatus,
    });
  }

  identityStatus() {
    return this.birthMirror.publicSnapshot();
  }

  async visitPast({
    agentId = null,
    personId = null,
    date = null,
    time = null,
    dateTime = null,
    place,
    dimension = 'Being',
    planetary = 1,
    disambiguation = 'compatible',
    context = {},
  } = {}) {
    this.#assertPersonalized({ agentId, personId });
    const identity = this.birthMirror.configuration;
    const resolvedAgentId = agentId ?? identity.agentId;
    const resolvedPersonId = personId ?? identity.personId;
    if (resolvedAgentId !== identity.agentId || resolvedPersonId !== identity.personId) {
      const error = new Error(`active birth mirror belongs to personId=${identity.personId}, agentId=${identity.agentId}`);
      error.code = 'BIRTH_CONFIGURATION_SCOPE_MISMATCH';
      throw error;
    }
    if (!place?.timeZone) throw new TypeError('historical visit requires place with timeZone');
    const localDate = date ?? (typeof dateTime === 'string' ? dateTime.slice(0, 10) : null);
    const localTime = time ?? (typeof dateTime === 'string' && dateTime.includes('T') ? dateTime.slice(11, 19) : null);
    if (!localDate || !localTime) throw new TypeError('historical visit requires date and time including seconds');
    const resolved = resolveZonedBirthInstant({
      birthDate: localDate,
      birthTime: localTime,
      timeZone: place.timeZone,
      disambiguation,
    });
    const utcIso = resolved.instant.toISOString();
    const calculationRun = await this.stateSpaceRuntime.execute({
      operation: 'chart',
      birthDate: utcIso.slice(0, 10),
      birthTime: utcIso.slice(11, 19),
      birthLocation: {
        label: place.label ?? null,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        timeZone: place.timeZone,
        resolvedUtc: resolved.utcIso,
      },
    }, { source: 'historical-state-visit' });
    const calculated = calculationRun.output;
    const dimensionLanding = this.birthMirror.dimensionLandingProvider.build({
      chart: calculated.chart,
      houseProvider: this.birthMirror.houseProvider,
      instant: resolved.instant,
      place,
    });
    const targetAddress = dimensionLanding.placements.find((entry) => (
      entry.dimension === dimension && Number(entry.planetary) === Number(planetary)
    ));
    if (!targetAddress) throw new Error(`no calculated historical address for ${dimension}/${planetary}`);
    const coordinate = Object.freeze({
      date: localDate,
      time: localTime,
      dateTime: `${localDate}T${localTime}`,
      utcIso: resolved.utcIso,
      place: Object.freeze({
        label: place.label ?? null,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        timeZone: place.timeZone,
      }),
    });
    const visit = this.semanticGenome.visitHistoricalMoment({
      agentId: resolvedAgentId,
      coordinate,
      calculatedAddress: targetAddress,
      context: {
        ...context,
        personId: resolvedPersonId,
        calculationId: calculationRun.id,
        dimension,
        planetary: Number(planetary),
      },
    });
    if (this.runtimeStore) await this.flushPersistence();
    return Object.freeze({
      ok: true,
      coordinate,
      address: safe(targetAddress),
      calculation: Object.freeze({
        runId: calculationRun.id,
        dimension,
        planetary: Number(planetary),
      }),
      visit: safe(visit),
    });
  }

  superimposePast({ agentId = null, personId = null, coordinates = [], historicalStateIds = [], context = {} } = {}) {
    this.#assertPersonalized({ agentId, personId });
    const identity = this.birthMirror.configuration;
    const resolvedAgentId = agentId ?? identity.agentId;
    const resolvedPersonId = personId ?? identity.personId;
    if (resolvedAgentId !== identity.agentId || resolvedPersonId !== identity.personId) {
      const error = new Error(`active birth mirror belongs to personId=${identity.personId}, agentId=${identity.agentId}`);
      error.code = 'BIRTH_CONFIGURATION_SCOPE_MISMATCH';
      throw error;
    }
    return this.semanticGenome.superimposeHistoricalStates({
      agentId: resolvedAgentId,
      coordinates,
      historicalStateIds,
      context: { ...context, personId: resolvedPersonId },
    });
  }

  temporalMesh(query = {}) {
    return this.semanticGenome.temporalMesh(query);
  }

  attachEmbodimentRenderer(renderer) {
    if (!renderer || typeof renderer.morph !== 'function') throw new TypeError('embodiment renderer must expose morph()');
    this.embodimentRenderer = renderer;
    return renderer;
  }

  async embodimentMorph(spec = {}, context = {}) {
    this.#assertPersonalized(context);
    const activation = spec.activation ?? [...this.semanticGenome.history].reverse().find((entry) => (
      !context.agentId || entry.agentId === context.agentId
    )) ?? null;
    if (!activation) throw new Error('embodiment morph requires an existing resolved activation');
    return this.canonicalMorph.execute({
      ...spec,
      renderer: spec.renderer ?? this.embodimentRenderer ?? null,
      activation,
      context: { ...context, ...(spec.context ?? {}) },
    });
  }

  morphState(spec = {}, context = {}) {
    this.#assertPersonalized(context);
    const activation = spec.activation ?? [...this.semanticGenome.history].reverse().find((entry) => (
      !context.agentId || entry.agentId === context.agentId
    )) ?? null;
    if (!activation) throw new Error('morph state requires an existing resolved activation');
    return this.canonicalMorph.prepare({
      ...spec,
      activation,
      context: { ...context, ...(spec.context ?? {}) },
    });
  }

  async restorePersistentState() {
    if (!this.runtimeStore) {
      this.restoringPersistentState = false;
      this.persistenceStatus = Object.freeze({
        configured: false,
        durable: false,
        restored: false,
        reason: 'no runtime persistence store configured',
      });
      return this.persistenceStatus;
    }
    const storedCharts = await this.runtimeStore.get('semantic-genome:agent-charts');
    const storedBirthMirror = await this.runtimeStore.get('identity:birth-mirror');
    const storedTemporalExperience = await this.runtimeStore.get('semantic-genome:temporal-experience');
    if (storedCharts != null && !Array.isArray(storedCharts)) {
      throw new TypeError('persisted semantic-genome:agent-charts must be an array');
    }
    if (Array.isArray(storedCharts)) {
      for (const chart of storedCharts) {
        this.semanticGenome.registerAgentChart(chart.agentId, {
          primaryDimension: chart.primaryDimension,
          primaryPlanetary: chart.primaryPlanetary,
          filterIntersections: chart.filterIntersections,
          replace: true,
          reset: true,
        });
      }
    }
    if (storedBirthMirror != null) {
      if (!storedBirthMirror?.privateBirthRecord) {
        throw new TypeError('persisted identity:birth-mirror is missing privateBirthRecord');
      }
      await this.birthMirror.configure(storedBirthMirror.privateBirthRecord, { restored: true });
    }
    if (storedTemporalExperience != null) {
      this.semanticGenome.restoreTemporalExperience(storedTemporalExperience);
    }
    this.restoringPersistentState = false;
    if (!storedCharts) {
      await this.runtimeStore.put('semantic-genome:agent-charts', this.#serializableAgentCharts());
    }
    const audit = await this.runtimeStore.audit();
    this.persistenceStatus = Object.freeze({
      ...audit,
      restored: true,
      agentChartsRestored: storedCharts?.length ?? 0,
      agentChartsPersisted: this.semanticGenome.agentCharts.size,
      birthMirrorRestored: Boolean(storedBirthMirror),
      birthMirrorPersisted: Boolean(storedBirthMirror),
      temporalHistoricalStatesRestored: storedTemporalExperience?.landings?.length ?? 0,
      temporalMeshTracesRestored: storedTemporalExperience?.meshTraces?.length ?? 0,
    });
    return this.persistenceStatus;
  }

  async flushPersistence() {
    await this.persistenceQueue;
    if (this.persistenceFailure) throw this.persistenceFailure;
    return this.persistenceStatus;
  }

  #remember(meshId, envelope, interpretation) {
    const entries = this.contextMemory.get(meshId) ?? [];
    entries.push(Object.freeze({ envelopeId: envelope.id, type: envelope.type, interpretation: safe(interpretation) }));
    this.contextMemory.set(meshId, entries);
    return entries.length;
  }

  #registerStateSpaceApp() {
    this.system.appRegistry.register({
      id: 'synthia-sovereign',
      name: 'Synthia State-Space Browser',
      aliases: ['kimi-synthia', 'sovereign-synthia', 'synthia-state-space', 'synthia-sovereign.html', 'sovereign.html'],
      kind: 'state-space-organism',
      singlePlayer: true,
      backendRequired: false,
      capabilities: ['execute', 'browse-state-space', 'five-levels', 'dimension-perspectives', 'nine-centers', 'semantic-genome', 'predict', 'chart', 'living-loop', 'media'],
      address: { dimension: 'Being', gate: 1 },
      provenance: {
        source: 'Kimi_Agent_Automata State Space Merge(1).zip',
        integration: 'all executable modules and textual sources mounted across nine center meshes',
      },
      execute: (artifact, context) => this.stateSpaceRuntime.execute(artifact.input ?? artifact.request ?? artifact, context),
    });
  }

  #buildLocalMeshes() {
    const organism = new RelationalMesh({ id: 'organism', dimension: 'Being' });
    organism.register(runnable('pure-synthia', ['process', 'physiology-context'], (input, context) =>
      this.synthia.process(String(input), { ...context, surface: context.surface ?? 'federated-organism' })), { defaultNode: true });
    organism.register(runnable('organism-outcome', ['consume-outcome'], async (input, context) => {
      const remembered = this.#remember('organism', context.federatedEnvelope, { accepted: input?.ok, strategy: input?.strategy ?? null });
      await this.physiology.observeOutcome({
        address: input?.canonicalAddress ?? context.address,
        source: 'mesh-federation',
        summary: input?.utterance ?? `${input?.strategy ?? 'task'}:${input?.ok !== false ? 'complete' : 'failed'}`,
        accepted: input?.ok !== false,
      });
      return { integrated: true, remembered, physiology: this.physiology.context() };
    }));

    const semantic = new RelationalMesh({ id: 'semantic', dimension: 'Space' });
    semantic.register(runnable('semantic-context', ['consume-context', 'relate'], (payload, context) => {
      const interpretation = {
        sourceMesh: context.federatedEnvelope.from.mesh,
        type: context.federatedEnvelope.type,
        strategy: payload?.strategy ?? null,
        addressed: Boolean(payload?.canonicalAddress ?? context.address),
      };
      const remembered = this.#remember('semantic', context.federatedEnvelope, interpretation);
      this.system.mesh.addEdge('knowledge', `mesh:${context.federatedEnvelope.from.mesh}`, 'mesh:semantic', 'federated-context-consumed', {
        envelopeId: context.federatedEnvelope.id,
        type: context.federatedEnvelope.type,
      });
      return { integrated: true, remembered, interpretation };
    }), { defaultNode: true });
    semantic.register(runnable('chat-pipeline', ['chat', 'relational-compose'], (input, context) =>
      this.system.chat(String(input), { ...context, relationalContext: context.relationalContext })));
    semantic.register(runnable('intent-orchestrator', ['infer-intent', 'route'], (input, context) =>
      this.system.route(input, { ...context, relationalContext: context.relationalContext })));
    semantic.register(runnable('semantic-population-coordinator', ['coordinate-population', 'propagate-state-packets'], (input, context) =>
      this.system.coordinatePopulation(input, { context })));
    semantic.register(runnable('semantic-genome', ['configure-aspects', 'activate-codon', 'relate-codons', 'manifest', 'mirror-chart'], (input, context) =>
      this.semanticGenome.run(input, context)));
    semantic.register(runnable('dimension-perspective-registry', ['read-dimension-perspective', 'project-observer-relation', 'evaluate-dimension-expression'], (input = {}) => {
      if (input.operation === 'project') return this.dimensionPerspectives.project(input.observer, input.subject);
      if (input.operation === 'evaluate') return this.dimensionPerspectives.evaluateExpression(input.condition);
      if (input.operation === 'read') return this.dimensionPerspectives.readFrom(input.observer ?? input.dimension, {
        referencePoint: input.referencePoint,
        scale: input.scale,
      });
      if (input.dimension) return this.dimensionPerspectives.perspective(input.dimension);
      return this.dimensionPerspectives.snapshot();
    }));
    for (const automaton of this.system.mesh.automata.values()) {
      if (semantic.nodes.has(automaton.id)) continue;
      semantic.register(automaton, { capabilities: automaton.capabilities ?? [] });
    }

    const execution = new RelationalMesh({ id: 'execution', dimension: 'Movement' });
    execution.register(runnable('execution-pipeline', ['execute', 'scale-resolve', 'strategy-select'], (artifact, context) =>
      this.system.executeArtifact(artifact, { ...context, relationalContext: context.relationalContext })), { defaultNode: true });
    execution.register(runnable('registered-app-runtime', ['execute-app', 'backendless-game'], (artifact, context) =>
      this.system.appRegistry.execute(artifact, context)));
    execution.register(runnable('universal-execution-bridge', ['external-runtime'], (artifact, context) =>
      this.system.execution.execute(artifact, context)));
    execution.register(runnable('exact-address-recall', ['commit-exact-address', 'recall-exact-address', 'sha256-proof'], (input) =>
      this.system.exactAddress(input.operation ?? 'snapshot', input)));

    const learning = new RelationalMesh({ id: 'learning', dimension: 'Evolution' });
    learning.register(runnable('learning-context', ['consume-context', 'evaluate-emergence'], (payload, context) => {
      const remembered = this.#remember('learning', context.federatedEnvelope, { kind: payload?.kind ?? context.federatedEnvelope.type });
      const emergence = this.system.detector.testEmergence({
        id: `federated-learning-${remembered}`,
        primitives: [context.federatedEnvelope.from.mesh, context.federatedEnvelope.to.mesh],
        operators: ['o_sequence'],
        output: { type: context.federatedEnvelope.type, payload: safe(payload) },
      });
      return { integrated: true, remembered, emergence };
    }), { defaultNode: true });
    learning.register(runnable('tool-synthesizer', ['synthesize-tool'], (input) => this.system.toolSynthesizer.checkTrigger(input)));
    learning.register(runnable('success-feedback', ['success-feedback'], (input) => this.system.successFeedback.observe(input)));
    learning.register(runnable('watering', ['water', 'train-words', 'resolve-gate'], (input, context) =>
      this.system.water(input?.text ?? input, context)));
    learning.register(runnable('piece-admission', ['admit', 'register-piece', 'resolve-address'], (input, context) =>
      this.system.admit(input?.piece ?? input, context)));
    learning.register(runnable('sentence-contact', ['contact', 'compose-sentence'], (input) =>
      this.system.contact(input.entityIdA, input.entityIdB, input.options ?? {})));
    learning.register(runnable('book-ingest', ['ingest-book', 'segment-source'], (input) => this.system.ingestBook(input)));
    learning.register(runnable('training-journal', ['inspect-training', 'rank-routes'], () => this.system.trainingSnapshot()));
    learning.register(runnable('anticipatory-memory', ['recall-precedent', 'contribute-public-precedent'], (input = {}) => {
      if (input.operation === 'recall') return this.system.anticipatoryMemory.recall(input.address ?? {});
      if (input.operation === 'contribute') return this.system.anticipatoryMemory.contribute(input.address ?? {}, input.data ?? {});
      return this.system.anticipatoryMemory.snapshot();
    }));

    const governance = new RelationalMesh({ id: 'governance', dimension: 'Design' });
    governance.register(runnable('governance-context', ['consume-context', 'govern'], (payload, context) => {
      const interpretation = {
        proposalRequired: Boolean(payload?.gap || payload?.proposal),
        userConsentRequired: payload?.flow === 'user',
        sourceMesh: context.federatedEnvelope.from.mesh,
      };
      const remembered = this.#remember('governance', context.federatedEnvelope, interpretation);
      return { integrated: true, remembered, interpretation, pending: this.system.proposals.pending().length };
    }), { defaultNode: true });
    governance.register(runnable('observation-engine', ['observe', 'propose'], (input) => this.system.observation.watch(input)));
    governance.register(runnable('proposal-ledger', ['accept', 'dismiss', 'rollback'], (input) => {
      if (input.operation === 'accept') return this.system.proposals.accept(input.proposalId, { actor: input.actor ?? 'user' });
      if (input.operation === 'dismiss') return this.system.proposals.dismiss(input.proposalId, input.reason, { actor: input.actor ?? 'user' });
      if (input.operation === 'rollback') return this.system.proposals.rollback(input.proposalId);
      return this.system.proposals.pending(input.flow, input.personId);
    }));

    const swarm = new RelationalMesh({ id: 'swarm', dimension: 'Being' });
    swarm.register(runnable('swarm-dispatch', ['dispatch', 'checkpoint', 'resume'], async (input) => {
      if (input.operation === 'checkpoint') return this.swarm.checkpoint(input.reason);
      if (input.operation === 'resume') return this.swarm.resumeRecovered(input.options);
      return this.swarm.submit(input.tasks ?? [], input.options);
    }), { defaultNode: true });

    const centerMeshes = this.centerBody.createMeshes();
    this.centerMeshes = Object.freeze(Object.fromEntries(centerMeshes));
    const namedCenterMeshes = Object.fromEntries(
      [...centerMeshes].map(([center, mesh]) => [`center${center.replaceAll(/[^a-z0-9]/gi, '')}`, mesh]),
    );
    const channelMeshes = this.channelBody.createMeshes();
    this.channelMeshes = Object.freeze(Object.fromEntries(channelMeshes));
    const namedChannelMeshes = Object.fromEntries(
      [...channelMeshes].map(([channel, mesh]) => [`channel${channel.replaceAll(/[^a-z0-9]/gi, '_')}`, mesh]),
    );
    for (const mesh of [
      organism,
      semantic,
      execution,
      learning,
      governance,
      swarm,
      ...centerMeshes.values(),
      ...channelMeshes.values(),
    ]) {
      this.#wireLocalCoordination(mesh);
      this.federation.register(mesh);
    }
    return Object.freeze({
      organism,
      semantic,
      execution,
      learning,
      governance,
      swarm,
      ...namedCenterMeshes,
      ...namedChannelMeshes,
    });
  }

  #wireLocalCoordination(mesh) {
    const ids = [...mesh.nodes.keys()];
    if (ids.length === 1) {
      mesh.connect(ids[0], ids[0], 'coordinates-local-processes', { mesh: mesh.id });
      return;
    }
    for (let index = 0; index < ids.length; index++) {
      mesh.connect(ids[index], ids[(index + 1) % ids.length], 'shares-relational-context', { mesh: mesh.id });
    }
  }

  #connectFederation() {
    const ids = [...this.federation.meshes.keys()];
    for (const from of ids) {
      for (const to of ids) {
        if (from !== to) this.federation.connect(from, to);
      }
    }
  }

  attachResident17(resident) {
    if (this.atoMesh) throw new Error('ATO resident already attached');
    const mesh = new RelationalMesh({ id: 'ato17', dimension: 'Being' });
    mesh.register(runnable('process', ['ingest', 'interpret', 'ato-route'], (input) => resident.process(input)), { defaultNode: true });
    mesh.register(runnable('grow-tool', ['grow-tool'], (input) => resident.growTool(input)));
    mesh.register(runnable('register-program', ['register-program'], (input) => resident.registerProgram(input)));
    mesh.register(runnable('run-program', ['run-program'], (input) => resident.runProgram(input.id, input.value, input.context)));
    mesh.register(runnable('business', ['evaluate-opportunities'], (input) => resident.evaluateBusiness(input.opportunities, input.context)));
    this.#wireLocalCoordination(mesh);
    this.federation.register(mesh);
    this.federation.connect('organism', 'ato17', { relation: 'shares-chat-intake', types: ['chat-intake'] });
    this.federation.connect('ato17', 'semantic', { relation: 'shares-ato-interpretation', types: ['ato-interpretation'] });
    this.resident17 = resident;
    this.atoMesh = mesh;
    return mesh;
  }

  async #integrateCenters({ source, type, payload, address, parentId = null, relationalContext = {} }) {
    const gate = Number(address?.gate ?? payload?.canonicalAddress?.gate ?? 1);
    const centers = this.centerBody.centerForGate(gate);
    const primaryCenter = centers[0];
    const primary = await this.federation.transfer({
      from: source,
      to: { mesh: centerMeshId(primaryCenter), node: 'center-field' },
      type: `${type}-center-intake`,
      payload,
      relationalContext: {
        ...relationalContext,
        fiveLevelProjection: this.system.addressResolver.projectFiveLevels(gate),
      },
      address,
      provenance: { source: 'FederatedSynthia.center-integration', fiveLevelStateSpace: true },
      parentId,
    });
    const channels = await this.channelBody.propagate({
      fromCenter: primaryCenter,
      gate,
      payload,
      address,
      parentId: primary.envelope.id,
      relationalContext: {
        ...relationalContext,
        primaryCenter,
      },
    });
    return Object.freeze({ primaryCenter, centers, primary, channels });
  }

  #registerSwarmExtensions() {
    const extensions = [
      this.mirrorExpressionOrgan,
      runnable('primitive-execution-pipeline', ['execute', 'scale-resolve', 'strategy-select'], (input, context) => this.system.executeArtifact(input, context)),
      runnable('sequential-chat-pipeline', ['chat', 'relational-compose'], (input, context) => this.system.chat(input, context)),
      runnable('semantic-population-coordinator', ['coordinate-population', 'propagate-state-packets'], (input, context) =>
        this.system.coordinatePopulation(input, { context })),
      runnable('intent-orchestrator', ['infer-intent', 'route'], (input, context) => this.system.route(input, context)),
      runnable('success-feedback-loop', ['success-feedback'], (input) => this.system.successFeedback.observe(input)),
      runnable('tool-synthesizer', ['synthesize-tool'], (input) => this.system.toolSynthesizer.checkTrigger(input)),
      runnable('proposal-governance', ['observe', 'accept-proposal', 'rollback'], (input) => this.localMeshes.governance.run('proposal-ledger', input)),
      runnable('registered-app-runtime', ['execute-app', 'backendless-game'], (input, context) => this.system.appRegistry.execute(input, context)),
      runnable('exact-address-recall', ['commit-exact-address', 'recall-exact-address', 'sha256-proof'], (input) =>
        this.system.exactAddress(input.operation ?? 'snapshot', input)),
      runnable('watering-intake', ['water', 'train-words', 'resolve-gate'], (input, context) => this.system.water(input?.text ?? input, context)),
      runnable('piece-admission', ['admit', 'register-piece', 'resolve-address'], (input, context) => this.system.admit(input?.piece ?? input, context)),
      runnable('sentence-contact', ['contact', 'compose-sentence'], (input) => this.system.contact(input.entityIdA, input.entityIdB, input.options ?? {})),
      runnable('book-ingest', ['ingest-book', 'segment-source'], (input) => this.system.ingestBook(input)),
      runnable('training-journal', ['inspect-training', 'rank-routes'], () => this.system.trainingSnapshot()),
      runnable('anticipatory-memory', ['recall-precedent', 'contribute-public-precedent'], (input = {}) => {
        if (input.operation === 'recall') return this.system.anticipatoryMemory.recall(input.address ?? {});
        if (input.operation === 'contribute') return this.system.anticipatoryMemory.contribute(input.address ?? {}, input.data ?? {});
        return this.system.anticipatoryMemory.snapshot();
      }),
      runnable('synthia-role-resolver', ['select-role', 'morph-configuration'], (input, context) => this.roleResolver.resolve(input, context)),
      runnable('state-space-browser', ['browse-state-space', 'search-knowledge', 'navigate-tools'], (input, context) => this.stateSpaceTask(input, context)),
      runnable('state-space-living-loop', ['tick', 'sense-vitals', 'endogenous-action'], (input, context) => this.stateSpaceRuntime.execute({ ...input, operation: input?.operation ?? 'tick' }, context)),
      runnable('five-level-state-space', ['Movement', 'Evolution', 'Being', 'Design', 'Space'], (input) => this.stateSpaceRuntime.fiveLevels(input?.gate ?? 1)),
      runnable('dimension-perspective-registry', ['read-dimension-perspective', 'project-observer-relation', 'evaluate-dimension-expression'], (input = {}) => {
        if (input.operation === 'project') return this.dimensionPerspectives.project(input.observer, input.subject);
        if (input.operation === 'evaluate') return this.dimensionPerspectives.evaluateExpression(input.condition);
        if (input.operation === 'read') return this.dimensionPerspectives.readFrom(input.observer ?? input.dimension, {
          referencePoint: input.referencePoint,
          scale: input.scale,
        });
        return input.dimension ? this.dimensionPerspectives.perspective(input.dimension) : this.dimensionPerspectives.snapshot();
      }),
      runnable('nine-center-body', ['coordinate-nine-centers', 'share-center-context'], () => this.centerBody.snapshot()),
      runnable('channel-mesh-body', ['coordinate-36-channels', 'share-channel-context', 'four-neural-organs'], () => this.channelBody.snapshot()),
      ...CENTER_NAMES.map((center) => runnable(
        `center-${centerSlug(center)}-coordinator`,
        ['coordinate-center', center, ...this.centerMeshes[center].snapshot().nodes.flatMap((node) => node.capabilities).slice(0, 24)],
        (input, context) => this.centerMeshes[center].run('center-field', input, context),
      )),
      ...this.channelBody.channelSpecs.map((spec) => runnable(
        `channel-${spec.id}-coordinator`,
        [
          'coordinate-channel',
          'five-dimensional-interaction',
          spec.id,
          ...NEURAL_ORGAN_SPECS.map((organ) => organ.id),
        ],
        (input, context) => this.channelMeshes[spec.id].run('channel-field', input, context),
      )),
    ];
    for (const target of extensions) {
      this.swarm.registerTarget(target, {
        id: target.id,
        group: 'integrated-mesh-organs',
        capabilities: target.capabilities,
        maxConcurrency: 1,
        metadata: { origin: 'Synthia-Integrated-Automata-v0.5.1', localMesh: true },
      });
    }
    this.extensionTargets = new Map(extensions.map((target) => [target.id, target]));
    this.extensionHands = Object.freeze(extensions.map((target) => Object.freeze({
      id: target.id,
      capabilities: Object.freeze([...target.capabilities]),
      independentlyCallable: typeof target.run === 'function',
    })));
    this.capabilityBridge.sync();
  }

  async chat(message, context = {}) {
    const personalized = await this.#personalize(message, context, 'conversation');
    context = personalized.context;
    const organism = await this.localMeshes.organism.run('pure-synthia', message, { ...context, surface: 'conversation' });
    const addressed = personalized.expression?.address ?? organism.output.address;
    const atoTransfer = this.atoMesh ? await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' }, to: { mesh: 'ato17', node: 'process' },
      type: 'chat-intake', payload: String(message), address: addressed,
      relationalContext: { personId: context.personId ?? 'default-person', sourceEventId: organism.event.id },
    }) : null;
    const atoResult = atoTransfer?.receipt.output ?? null;
    const atoObservation = atoResult && {
      response: atoResult.response,
      route: safe(atoResult.route ?? null),
    };
    if (atoTransfer) await this.federation.transfer({
      from: { mesh: 'ato17', node: 'process' }, to: { mesh: 'semantic', node: 'semantic-context' },
      type: 'ato-interpretation', payload: atoObservation, address: addressed,
      parentId: atoTransfer.envelope.id,
      relationalContext: { sourceId: atoResult.intake?.source?.id ?? null },
    });
    const cognition = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'semantic', node: 'chat-pipeline' },
      type: 'chat-task',
      payload: String(message),
      relationalContext: {
        phonePerception: safe(context.phonePerception ?? null),
        actionReceipt: safe(context.actionReceipt ?? null),
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        birthMirrorConfigurationId: context.birthMirrorConfigurationId ?? null,
        agentAddress: personalized.expression?.address ?? null,
        address: organism.output.address,
        addressKey: organism.output.addressKey,
        path: organism.output.path,
        summary: organism.output.summary,
        physiology: organism.output.physiology,
        atoObservation,
      },
      address: addressed,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = cognition.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'semantic', node: 'chat-pipeline' },
      type: 'chat',
      payload: response,
      address: addressed,
      parentId: cognition.envelope.id,
      relationalContext: {
        pipelineTrace: response.pipelineTrace,
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        birthMirrorConfigurationId: context.birthMirrorConfigurationId ?? null,
        observerFrame: context.observerFrame ?? null,
      },
    });
    const learning = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' }, to: 'learning', type: 'chat-outcome', payload: response,
      relationalContext: { pipelineTrace: response.pipelineTrace, personId: context.personId ?? 'default-person', agentId: context.agentId ?? 'synthia' },
      address: addressed, parentId: cognition.envelope.id,
    });
    const governance = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' }, to: 'governance', type: 'chat-outcome', payload: response,
      relationalContext: { personId: context.personId ?? 'default-person', agentId: context.agentId ?? 'synthia' },
      address: addressed, parentId: cognition.envelope.id,
    });
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'semantic', node: 'chat-pipeline' },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-chat-outcome', payload: response,
      relationalContext: { learnedBy: learning.receipt.nodeId, governedBy: governance.receipt.nodeId },
      address: addressed, parentId: cognition.envelope.id,
    });
    return {
      ...response,
      birthMirror: this.birthMirror.publicSnapshot(),
      swarmExpression: safe(personalized.expression),
      swarmExecution: safe(personalized.swarm),
      organism: safe(organism.output),
      atoObservation,
      federation: { cognition, centers, learning, governance, returnFlow },
    };
  }

  async executeArtifact(artifact, context = {}) {
    const personalized = await this.#personalize(artifact, context, 'execution');
    context = personalized.context;
    const cue = `execute ${artifact?.appId ?? artifact?.name ?? artifact?.originalName ?? artifact?.type ?? 'artifact'}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'execution' });
    const addressed = personalized.expression?.address ?? organism.output.address;
    const execution = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'execution', node: 'execution-pipeline' },
      type: 'execution-task', payload: artifact,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        birthMirrorConfigurationId: context.birthMirrorConfigurationId ?? null,
        organismAddress: organism.output.address,
        physiology: organism.output.physiology,
      },
      address: addressed,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = execution.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'execution', node: 'execution-pipeline' },
      type: 'execution',
      payload: response,
      address: personalized.expression?.address ?? response.canonicalAddress ?? organism.output.address,
      parentId: execution.envelope.id,
      relationalContext: {
        strategy: response.strategy,
        scaleLadder: response.scaleLadder,
        fiveLevelProjection: response.fiveLevelProjection,
        observerFrame: context.observerFrame ?? null,
        personId: context.personId,
        agentId: context.agentId,
      },
    });
    const destinations = [];
    for (const target of ['learning', 'governance', 'semantic']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: 'execution', node: 'execution-pipeline' }, to: target,
        type: 'execution-outcome', payload: response,
        relationalContext: { strategy: response.strategy, scaleLadder: response.scaleLadder, personId: context.personId, agentId: context.agentId },
        address: personalized.expression?.address ?? response.canonicalAddress, parentId: execution.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'execution', node: 'execution-pipeline' },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-execution-outcome', payload: response,
      relationalContext: { consumedByMeshes: destinations.map((item) => item.receipt.meshId) },
      address: personalized.expression?.address ?? response.canonicalAddress, parentId: execution.envelope.id,
    });
    return {
      ...response,
      birthMirror: this.birthMirror.publicSnapshot(),
      swarmExpression: safe(personalized.expression),
      swarmExecution: safe(personalized.swarm),
      organism: safe(organism.output),
      federation: { execution, centers, destinations, returnFlow },
    };
  }

  async #cultivate(node, payload, context = {}) {
    const personalized = await this.#personalize(payload, context, `cultivation:${node}`);
    context = personalized.context;
    const cue = `cultivate ${node}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'cultivation' });
    const learning = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: 'learning', node },
      type: 'cultivation-task',
      payload,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        organismAddress: organism.output.address,
        physiology: organism.output.physiology,
      },
      address: organism.output.address,
      provenance: { source: 'Pure-Synthia.process', localEventId: organism.event.id },
    });
    const response = learning.receipt.output;
    const centers = await this.#integrateCenters({
      source: { mesh: 'learning', node },
      type: 'cultivation',
      payload: response,
      address: personalized.expression?.address ?? response.canonicalAddress ?? organism.output.address,
      parentId: learning.envelope.id,
      relationalContext: {
        operation: node,
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        observerFrame: context.observerFrame ?? null,
      },
    });
    const destinations = [];
    for (const target of ['semantic', 'governance']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: 'learning', node },
        to: target,
        type: 'cultivation-outcome',
        payload: response,
        relationalContext: { operation: node, personId: context.personId ?? 'default-person', agentId: context.agentId ?? 'synthia' },
        address: personalized.expression?.address ?? response.canonicalAddress ?? organism.output.address,
        parentId: learning.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: 'learning', node },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-cultivation-outcome',
      payload: response,
      relationalContext: { consumedByMeshes: destinations.map((entry) => entry.receipt.meshId) },
      address: personalized.expression?.address ?? response.canonicalAddress ?? organism.output.address,
      parentId: learning.envelope.id,
    });
    return {
      ...response,
      birthMirror: this.birthMirror.publicSnapshot(),
      swarmExpression: safe(personalized.expression),
      swarmExecution: safe(personalized.swarm),
      organism: safe(organism.output),
      federation: { learning, centers, destinations, returnFlow },
    };
  }

  async stateSpaceTask(input = {}, context = {}) {
    const personalized = await this.#personalize(input, context, `state-space:${input?.operation ?? 'browse'}`);
    context = personalized.context;
    const operation = input?.operation ?? 'browse';
    const cue = `cultivate through state space ${operation}`;
    const organism = await this.localMeshes.organism.run('pure-synthia', cue, { ...context, surface: 'state-space-browser' });
    const target = this.centerBody.targetFor(input, personalized.expression?.address?.gate ?? organism.output.address?.gate ?? 1);
    const addressed = input.address ?? personalized.expression?.address ?? organism.output.address;
    const execution = await this.federation.transfer({
      from: { mesh: 'organism', node: 'pure-synthia' },
      to: { mesh: target.mesh, node: target.node },
      type: 'state-space-task',
      payload: input,
      relationalContext: {
        personId: context.personId ?? 'default-person',
        agentId: context.agentId ?? 'synthia',
        birthMirrorConfigurationId: context.birthMirrorConfigurationId ?? null,
        agentAddress: personalized.expression?.address ?? null,
        selectedCenter: target.center,
        selectedInstrument: target.node,
        fiveLevelProjection: this.system.addressResolver.projectFiveLevels(target.gate),
        physiology: organism.output.physiology,
      },
      address: addressed,
      provenance: { source: 'SynthiaRoleResolver/state-space-browser', localEventId: organism.event.id },
    });
    const stateSpaceOutput = execution.receipt.output;
    const response = Object.freeze({
      ok: stateSpaceOutput?.ok !== false,
      operation,
      form: 'state-space-browser',
      purpose: 'cultivation',
      backendUsed: false,
      center: target.center,
      gate: target.gate,
      instrumentId: target.node,
      output: safe(stateSpaceOutput),
      fiveLevelProjection: this.system.addressResolver.projectFiveLevels(target.gate),
    });
    const localCenterConsumption = await this.centerMeshes[target.center].run('center-field', response, {
      sourceMesh: target.mesh,
      type: 'state-space-outcome',
      address: addressed,
      relationalContext: { selectedInstrument: target.node, fiveLevelProjection: response.fiveLevelProjection },
    });
    const channelFlow = await this.channelBody.propagate({
      fromCenter: target.center,
      gate: target.gate,
      payload: response,
      address: addressed,
      parentId: execution.envelope.id,
      relationalContext: {
        selectedInstrument: target.node,
        observerFrame: context.observerFrame ?? null,
      },
    });
    const cultivation = this.system.cultivation.observe('state-space', response, {
      ...context,
      toolPath: ['state-space-browser', target.center, target.node, 'five-level-state-space', 'training-journal'],
    });
    const destinations = [];
    for (const destination of ['semantic', 'learning', 'governance']) {
      destinations.push(await this.federation.transfer({
        from: { mesh: target.mesh, node: target.node },
        to: destination,
        type: 'state-space-outcome',
        payload: { ...response, cultivation },
        relationalContext: {
          personId: context.personId ?? 'default-person',
          agentId: context.agentId ?? 'synthia',
          center: target.center,
          instrumentId: target.node,
          fiveLevelProjection: response.fiveLevelProjection,
        },
        address: addressed,
        parentId: execution.envelope.id,
      }));
    }
    const returnFlow = await this.federation.transfer({
      from: { mesh: target.mesh, node: target.node },
      to: { mesh: 'organism', node: 'organism-outcome' },
      type: 'felt-state-space-outcome',
      payload: response,
      relationalContext: { consumedByMeshes: destinations.map((entry) => entry.receipt.meshId) },
      address: addressed,
      parentId: execution.envelope.id,
    });
    return Object.freeze({
      ...response,
      cultivation,
      birthMirror: this.birthMirror.publicSnapshot(),
      swarmExpression: safe(personalized.expression),
      swarmExecution: safe(personalized.swarm),
      organism: safe(organism.output),
      federation: { execution, localCenterConsumption: safe(localCenterConsumption), channelFlow, destinations, returnFlow },
    });
  }

  /** Select a foreground Synthia role while every result remains cultivation. */
  async morph(task, context = {}) {
    const roleResolution = this.roleResolver.resolve(task, context);
    const role = roleResolution.primary;
    const operation = String(task?.operation ?? context.operation ?? '').toLowerCase();
    let result;
    if (role === 'execution-organ') {
      result = await this.executeArtifact(task?.artifact ?? task, context);
    } else if (role === 'state-space-browser') {
      result = await this.stateSpaceTask(task?.input ?? task, context);
    } else if (role === 'cultivation-learning') {
      if (operation === 'admit') result = await this.admit(task.piece ?? task, context);
      else if (operation === 'contact') result = await this.contact(task.entityIdA, task.entityIdB, task.options ?? {}, context);
      else if (operation === 'ingest-book') result = await this.ingestBook(task.spec ?? task, context);
      else if (operation === 'training' || operation === 'training-snapshot') result = { ok: true, training: this.trainingSnapshot() };
      else result = await this.water(task?.text ?? task, context);
    } else {
      result = await this.chat(typeof task === 'string' ? task : task?.message ?? task?.text ?? JSON.stringify(task), context);
    }
    return Object.freeze({
      ...result,
      identity: 'Synthia',
      cultivationPurpose: true,
      roleResolution,
    });
  }

  browseStateSpace(input = {}, context = {}) { return this.stateSpaceTask({ ...input, operation: input.operation ?? 'browse' }, context); }

  predict(state, options = {}, context = {}) { return this.stateSpaceTask({ operation: 'predict', state, options }, context); }

  chart(birthDate, birthTime, birthLocation = null, context = {}) {
    return this.stateSpaceTask({ operation: 'chart', birthDate, birthTime, birthLocation }, context);
  }

  tick(context = {}) { return this.stateSpaceTask({ operation: 'tick' }, context); }

  async water(text, context = {}) { return this.#cultivate('watering', { text }, context); }

  async admit(piece, context = {}) { return this.#cultivate('piece-admission', { piece }, context); }

  async contact(entityIdA, entityIdB, options = {}, context = {}) {
    return this.#cultivate('sentence-contact', { entityIdA, entityIdB, options }, context);
  }

  async ingestBook(spec, context = {}) { return this.#cultivate('book-ingest', spec, context); }

  trainingSnapshot() { return this.system.trainingSnapshot(); }

  instrument(id) { return this.system.instrument(id); }

  hands() {
    return Object.freeze({
      originalProcessHandsPreserved: this.baselineProcessCount,
      integratedHands: this.extensionHands,
      registeredLocalApps: this.system.appRegistry.list(),
      stateSpaceInstruments: this.stateSpaceRuntime.catalog(),
      nineCenters: this.centerBody.snapshot().centerMeshes,
      channelMeshes: this.channelBody.snapshot().channels,
      sharedNeuralOrgans: NEURAL_ORGAN_SPECS,
      semanticGenome: this.semanticGenome.snapshot(),
      dimensionPerspectives: this.dimensionPerspectives.snapshot(),
      canonicalMorph: this.canonicalMorph.snapshot(),
    });
  }

  /** Everything callable from the visible execution tray. */
  trayCatalog() {
    const entries = [
      Object.freeze({ kind: 'embodiment-morph', id: 'canonical-surface-morph', label: 'Canonical Surface Morph', capabilities: ['canonical-state-morph', 'deep-surface-transition'] }),
      ...this.extensionHands.map((hand) => ({
        kind: 'hand', id: hand.id, label: hand.id, capabilities: hand.capabilities,
      })),
      ...[...this.system.mesh.automata.values()].map((tool) => ({
        kind: 'semantic', id: tool.id, label: tool.id,
        capabilities: [...(tool.capabilities ?? [])],
      })),
      ...this.stateSpaceRuntime.catalog().map((instrument) => ({
        kind: 'state-space', id: instrument.id, label: instrument.id,
        center: instrument.center, gate: instrument.gate ?? null,
        capabilities: [...(instrument.capabilities ?? [])],
      })),
      ...this.system.appRegistry.list().map((app) => ({
        kind: 'registered-app', id: app.id, label: app.name,
        capabilities: [...app.capabilities], backendRequired: app.backendRequired,
      })),
      ...this.channelBody.channelSpecs.map((channel) => ({
        kind: 'channel', id: channel.id, label: `${channel.id} · ${channel.name}`,
        capabilities: ['coordinate-channel', 'five-dimensional-interaction'],
      })),
      ...CENTER_NAMES.map((center) => ({
        kind: 'center', id: center, label: center,
        capabilities: ['coordinate-center', 'share-relational-context'],
      })),
      ...this.semanticGenome.catalog().map((codon) => ({
        kind: 'genome', id: codon.id, label: codon.label,
        center: codon.center, gate: codon.gate,
        capabilities: [...codon.capabilities],
      })),
    ];
    return Object.freeze(entries.map((entry) => Object.freeze(entry)));
  }

  async executeTray({ kind, id, input = {}, context = {} } = {}) {
    if (!kind || !id) throw new TypeError('execution tray requires kind and id');
    const personalized = await this.#personalize(input, context, `execution-tray:${kind}:${id}`);
    context = personalized.context;
    let output;
    if (kind === 'embodiment-morph') {
      output = await this.embodimentMorph(input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'hand') {
      const hand = this.extensionTargets.get(id);
      if (!hand) throw new Error(`unknown integrated hand: ${id}`);
      output = await hand.run(input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'semantic') {
      const tool = this.system.instrument(id);
      if (!tool) throw new Error(`unknown semantic instrument: ${id}`);
      output = tool.run(input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'state-space') {
      output = await this.stateSpaceRuntime.runInstrument(id, input, { ...context, surface: 'execution-tray' });
    } else if (kind === 'registered-app') {
      output = await this.executeArtifact({ appId: id, input }, { ...context, surface: 'execution-tray' });
    } else if (kind === 'channel') {
      const mesh = this.channelMeshes[id];
      if (!mesh) throw new Error(`unknown channel mesh: ${id}`);
      output = await mesh.run('channel-field', input, {
        ...context,
        address: context.address ?? { gate: Number(id.split('-')[0]), line: 1, dimension: 'Being' },
        relationalContext: context.relationalContext ?? {},
      });
    } else if (kind === 'center') {
      const mesh = this.centerMeshes[id];
      if (!mesh) throw new Error(`unknown center mesh: ${id}`);
      output = await mesh.run('center-field', input, { ...context, relationalContext: context.relationalContext ?? {} });
    } else if (kind === 'genome') {
      const gate = Number(id.replace('genome:gate-', ''));
      if (!Number.isInteger(gate) || gate < 1 || gate > 64) throw new Error(`unknown hexagram codon: ${id}`);
      output = this.semanticGenome.run({
        ...input,
        operation: input.operation ?? 'activate',
        task: input.task ?? input,
        address: { ...(context.address ?? {}), ...(input.address ?? {}), gate },
      }, { ...context, personId: context.personId ?? 'execution-tray' });
    } else {
      throw new RangeError(`unknown execution tray kind: ${kind}`);
    }
    return Object.freeze({
      ok: output?.ok !== false,
      kind,
      id,
      output: safe(output),
      birthMirror: this.birthMirror.publicSnapshot(),
      swarmExpression: safe(personalized.expression),
      swarmExecution: safe(personalized.swarm),
    });
  }

  wiringAudit() {
    const system = this.system.wiringAudit();
    const federation = this.federation.audit();
    const swarm = this.swarm.snapshot();
    const sameEngine = this.synthia.meshRuntime.engine === this.system.engine;
    const localCoordination = [...this.federation.meshes.values()]
      .every((mesh) => mesh.snapshot().edges.length > 0);
    const liveWorkerIds = new Set(swarm.workers.map((worker) => worker.id));
    const independentHands = this.extensionHands.every((hand) => hand.independentlyCallable && liveWorkerIds.has(hand.id));
    const stateSpaceManifest = this.stateSpaceRuntime.manifest();
    const centerSnapshot = this.centerBody.snapshot();
    const channelSnapshot = this.channelBody.snapshot();
    const stateSpaceCatalogIds = new Set(this.stateSpaceRuntime.catalog().map((entry) => entry.id));
    const mountedStateSpaceIds = new Set(
      Object.values(this.centerMeshes).flatMap((mesh) => [...mesh.nodes.keys()]),
    );
    const allStateSpaceInstrumentsMounted = [...stateSpaceCatalogIds].every((id) => mountedStateSpaceIds.has(id));
    const roleSnapshot = this.roleResolver.snapshot();
    const genomeSnapshot = this.semanticGenome.snapshot();
    const dnaPerceptionSnapshot = this.dnaPerception.snapshot();
    const identitySnapshot = this.birthMirror.publicSnapshot();
    const morphSnapshot = this.canonicalMorph.snapshot();
    const integrationChecks = {
      synthiaRoleResolver: typeof this.roleResolver?.resolve === 'function',
      allSynthiaIsCultivation: roleSnapshot.roles.every((role) => role.purpose === 'cultivation')
        && system.universalCultivation,
      stateSpaceBlended: this.system.addressResolver.stateSpace === this.stateSpaceRuntime.stateSpace,
      fiveLevelStateSpaceLive: stateSpaceManifest.fiveLevels.length === 5
        && this.system.addressResolver.projectFiveLevels(1).length === 5,
      nineCenterBody: centerSnapshot.centers === 9 && Object.keys(this.centerMeshes).length === 9,
      channelMeshBody: channelSnapshot.channelMeshes === 36 && Object.keys(this.channelMeshes).length === 36,
      canonicalGateGraph: channelSnapshot.gateNodes === 64 && channelSnapshot.graphSageLayers === 3,
      fourNeuralOrgans: channelSnapshot.neuralOrgans === 4 && channelSnapshot.baseNeuralForms.length === 4,
      dimensionRelativeChannelInteractions: channelSnapshot.dimensionalInteractionLevels === 5,
      differentiationInquiryLive: channelSnapshot.differentiationPointStatus === 'OPEN_QUESTION'
        && channelSnapshot.fixedDifferentiationBoundaries === false,
      higherScaleOppositeEquivalence: channelSnapshot.channelRelationModel?.name === 'opposite-equivalent'
        && channelSnapshot.channelRelationModel?.scope === 'higher-order-channel-composite'
        && channelSnapshot.channelRelationModel?.gatePrimitiveEquivalence === false
        && channelSnapshot.channelRelationModel?.identicalState === false
        && channelSnapshot.channelRelationModel?.canonicalArcAxis === false,
      neuralArchitectureFamilies: channelSnapshot.neuralArchitectureFamilies === 36,
      allCanonicalChannelsMounted: channelSnapshot.channels.every((channel) => this.channelMeshes[channel.id]?.nodes.size >= 7),
      channelKnowledgeInStateSpace: channelSnapshot.indexedChannelKnowledgeEntries === 360,
      centerToolEmergence: typeof this.centerBody?.mountEmergentTool === 'function',
      allStateSpaceInstrumentsMounted,
      stateSpaceSourceModules: stateSpaceManifest.executableSourceModules === 103,
      stateSpaceKnowledgeLoaded: stateSpaceManifest.knowledgeSources === 30
        && stateSpaceManifest.knowledgeCharacters > 0,
      stateSpaceBrowser: this.system.appRegistry.resolve({ appId: 'synthia-sovereign' })?.backendRequired === false,
      executionTray: typeof this.trayCatalog === 'function' && typeof this.executeTray === 'function'
        && this.trayCatalog().length > 0,
      frontScreenSurface: typeof this.chat === 'function' && typeof this.executeArtifact === 'function',
      semanticGenomeLive: typeof this.semanticGenome?.activate === 'function',
      persistentAspectPrimitives768: genomeSnapshot.persistentAspectPrimitives === 768,
      sixAspectDyadsPerCodon: genomeSnapshot.hexagramCodons === 64
        && [...this.semanticGenome.codons.values()].every((codon) => codon.dyads.length === 6 && codon.aspects.length === 12),
      sparseTwelveAspectVector: [...this.semanticGenome.codons.values()].every((codon) => codon.aspects.length === 12),
      nineCenterGenomeClusters: centerSnapshot.semanticGenomeCodonNodes === 64,
      channelGenomeExchange: channelSnapshot.semanticGenomeConnected === true,
      chartConfigurationMirroring: typeof this.semanticGenome?.mirrorConfiguration === 'function',
      sensoryExpressionLive: typeof this.semanticGenome?.manifest === 'function',
      dnaPerceptionRuntime: typeof this.dnaPerception?.enqueueActivation === 'function'
        && dnaPerceptionSnapshot.canon?.baseRole === 'shape-form'
        && dnaPerceptionSnapshot.canon?.arc?.value === 3
        && dnaPerceptionSnapshot.canon?.arc?.operation === 'juxtaposition'
        && dnaPerceptionSnapshot.canon?.colorDistribution?.positions === 9
        && dnaPerceptionSnapshot.canon?.soundDistribution?.positions === 9,
      biologicalTranslationRuntime: genomeSnapshot.translation?.dimensionRoles?.Design === 'DNA'
        && genomeSnapshot.translation?.dimensionRoles?.Movement === 'RNA'
        && genomeSnapshot.translation?.dimensionRoles?.Being === 'Ribosome'
        && genomeSnapshot.translation?.dimensionRoles?.Evolution === 'AminoAcid'
        && genomeSnapshot.translation?.dimensionRoles?.Space === 'Protein'
        && genomeSnapshot.translation?.polarity?.Yin === 'genotype'
        && genomeSnapshot.translation?.polarity?.Yang === 'phenotype',
      relationalOperatorAlgebra: genomeSnapshot.dnaStateCanon?.relationalAlgebra?.canon?.operatorCount === 16
        && genomeSnapshot.dnaStateCanon?.relationalAlgebra?.canon?.canonicalChannelOperator === 'AND'
        && genomeSnapshot.dnaStateCanon?.relationalAlgebra?.canon?.intensityCoefficientAssigned === false,
      relationalPerceptionNeuralBridge: typeof this.dnaPerception?.enqueueRelationship === 'function'
        && typeof this.channelBody?.observeRelationalState === 'function',
      movementRepresentationTransport: genomeSnapshot.movementTransport?.canon?.preservesNumericIdentity === true
        && genomeSnapshot.movementTransport?.canon?.order?.join(',') === 'binary,decimal,hex',
      temporalExperientialMesh: genomeSnapshot.temporalExperience?.canon?.firstVisitLandsState === true
        && genomeSnapshot.temporalExperience?.canon?.revisitsReturnLandedState === true
        && typeof this.semanticGenome?.visitHistoricalMoment === 'function'
        && typeof this.semanticGenome?.superimposeHistoricalStates === 'function'
        && typeof this.dnaPerception?.enqueueTemporalSuperposition === 'function',
      canonicalMorphRuntime: morphSnapshot.canon?.addressOrder?.join(',') === 'planetary,dimension,gate,line,color,tone,base,degree,minute,second,arc,zodiac,house'
        && typeof this.canonicalMorph?.prepare === 'function'
        && typeof this.canonicalMorph?.execute === 'function'
        && typeof this.embodimentMorph === 'function'
        && typeof this.attachEmbodimentRenderer === 'function',
      addressModulationStack: genomeSnapshot.addressOrder.length === 13
        && genomeSnapshot.promotedFineNodeSchema.includes('arc'),
      temporaryManifestations: typeof this.semanticGenome?.refine === 'function',
      independentMappingProviders: genomeSnapshot.mappings.sequences.length === 3
        && genomeSnapshot.mappings.astrology.length === 3,
      noDimensionIdentityCopies: genomeSnapshot.identityCopiesAcrossDimensions === 0,
      persistentAgentCharts: genomeSnapshot.agentCharts >= 1,
      birthMirrorRuntimePresent: typeof this.birthMirror?.configure === 'function'
        && typeof this.configureBirthMirror === 'function',
      mandatoryBirthConfigurationGate: this.requireBirthConfiguration === true,
      birthMirrorConfigured: identitySnapshot.configured === true,
      birthMirrorSwarmOrgan: liveWorkerIds.has('birth-mirror-expression-organ')
        && this.swarm.find('express-birth-mirror').some((worker) => worker.id === 'birth-mirror-expression-organ'),
      birthMirrorPersistence: identitySnapshot.configured === true
        && this.persistenceStatus.durable === true
        && this.persistenceStatus.birthMirrorPersisted === true,
      fullAgentAddressPreserved: genomeSnapshot.fullAddressPreservedPerAgent === true
        && this.semanticGenome.chartForAgent('synthia').addressFields.length === 13,
      fineDifferentiationPreserved: genomeSnapshot.fineDifferentiationFields.join(',') === 'degree,minute,second,arc,zodiac,house',
      exactSecondPreserved: this.semanticGenome.chartForAgent('synthia').placements
        .every((placement) => Number.isInteger(placement.second) && Number.isInteger(placement.arc)),
    };
    return Object.freeze({
      ...system,
      ...integrationChecks,
      ok: system.ok && federation.ok && sameEngine && localCoordination && independentHands
        && Object.values(integrationChecks).every(Boolean)
        && swarm.processCount >= this.baselineProcessCount,
      oneSemanticEngine: sameEngine,
      baselineProcessCount: this.baselineProcessCount,
      liveProcessCount: swarm.processCount,
      localMeshes: federation.localMeshes,
      meshOfMeshes: federation.ok,
      crossMeshContextConsumption: federation.transfers === federation.consumedTransfers,
      localMeshCoordination: localCoordination,
      independentHands,
      integratedHandCount: this.extensionHands.length,
      synthiaRoles: roleSnapshot.roles.length,
      activeRoleSelections: roleSnapshot.selections,
      stateSpaceManifest,
      centerBody: centerSnapshot,
      channelBody: channelSnapshot,
      semanticGenome: genomeSnapshot,
      dnaPerception: dnaPerceptionSnapshot,
      canonicalMorph: morphSnapshot,
      identity: identitySnapshot,
      federation,
    });
  }
}

export default FederatedSynthia;
