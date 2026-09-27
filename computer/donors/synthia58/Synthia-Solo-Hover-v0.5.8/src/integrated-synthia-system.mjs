import { SynthiaSystem as SpineSynthiaSystem } from '../vendor/execution-spine-v0.4.0/src/synthia-system.mjs';
import { UniversalExecutionBridge } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/integration/universal-execution-bridge.js';
import { validateCanonicalAddress, canonicalAddressKey } from '../vendor/execution-spine-v0.4.0/src/canonical-address.mjs';
import { ScientistLoop } from './science/scientist-loop.mjs';
import { IntegratedExecutionAddressResolver, computationalAddress } from './execution/integrated-address-resolver.mjs';
import { AnticipatoryMemory } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/merged/mesh-memory.js';
import { RegisteredAppRuntime } from './execution/registered-app-runtime.mjs';
import { ExactAddressRecall } from './execution/exact-address-recall.mjs';
import { ExecutionPipeline } from './execution/execution-pipeline.mjs';
import { ChatPipeline } from './pipeline/chat-pipeline.mjs';
import { CultivationPipeline } from './pipeline/cultivation-pipeline.mjs';
import { IntentOrchestrator } from './pipeline/intent-orchestrator.mjs';
import { SuccessFeedbackLoop } from './pipeline/success-feedback.mjs';
import { ToolSynthesizer } from './pipeline/tool-synthesizer.mjs';
import { PORT_TRANSLATION_ADAPTERS } from './pipeline/adapters.mjs';
import { ChartTiming } from './governance/chart-timing.mjs';
import { DeletionGuard } from './governance/deletion-guard.mjs';
import { ProposalLedger } from './governance/proposal-ledger.mjs';
import { ObservationEngine } from './governance/observation-engine.mjs';
import { safe } from './util.mjs';

function addTransportSurface(mesh) {
  if (!(mesh.transportConnections instanceof Map)) mesh.transportConnections = new Map();
  if (typeof mesh.connectTransport !== 'function') {
    mesh.connectTransport = (fromId, toId, { operator = 'state-packet' } = {}) => {
      if (!mesh.automata.has(fromId) || !mesh.automata.has(toId)) throw new Error('both automata must be mounted');
      const id = `transport:${fromId}->${toId}`;
      const edge = Object.freeze({ id, fromId, toId, operator, type: 'state-packet' });
      mesh.transportConnections.set(id, edge);
      return Object.freeze({ status: 'connected', edge });
    };
  }
  const tools = [...mesh.automata.values()];
  for (let index = 0; index < tools.length; index++) {
    mesh.connectTransport(tools[index].id, tools[(index + 1) % tools.length].id);
  }
  return mesh;
}

/** One live system: the baseline engine, primitive execution, cognition, and governance. */
export class IntegratedSynthiaSystem extends SpineSynthiaSystem {
  constructor({ engine, federation = null, chartStateProvider = null, ...options } = {}) {
    if (!engine) throw new TypeError('IntegratedSynthiaSystem requires Pure Synthia’s live engine');
    addTransportSurface(engine.mesh);
    const executionBridge = options.executionBridge ?? new UniversalExecutionBridge({
      remember: options.remember ?? true,
      seed: options.seed ?? 18091999,
      runtimeAdapters: options.runtimeAdapters ?? [],
    });
    const addressResolver = options.addressResolver ?? new IntegratedExecutionAddressResolver();
    super({ ...options, engine, executionBridge, addressResolver });
    this.federation = federation;
    // FederatedSynthia binds this after its nine center meshes exist. Keeping
    // the hook optional preserves independently usable IntegratedSynthiaSystem
    // instances while ensuring governed growth enters the body when present.
    this.grownToolHandler = options.grownToolHandler ?? null;
    this.scientist = options.scientist ?? new ScientistLoop();
    this.appRegistry = options.appRegistry ?? new RegisteredAppRuntime();
    this.exactRecall = options.exactRecall ?? new ExactAddressRecall({
      engine: this.engine,
      appRegistry: this.appRegistry,
    });
    this.anticipatoryMemory = options.anticipatoryMemory ?? new AnticipatoryMemory();
    this.coordinationRuns = [];
    this.cultivation = new CultivationPipeline({
      engine: this.engine,
      resolver: this.addressResolver,
      scientist: this.scientist,
    });
    this.chartTiming = new ChartTiming({ chartStateProvider });
    this.deletionGuard = new DeletionGuard({ ageThreshold: options.ageThreshold ?? 7 });
    this.disabledAgents = new Set();
    this.proposals = new ProposalLedger({
      editor: this.editor,
      intent: this.intent,
      deletionGuard: this.deletionGuard,
      mountHandler: (spec) => this.#governedMount(spec),
      deletionHandler: (target, spec) => this.#governedDelete(target, spec),
      evolutionHandler: (spec) => this.#governedEvolution(spec),
    });
    this.chatPipeline = new ChatPipeline({ engine: this.engine, scientist: this.scientist, federation });
    this.executionPipeline = new ExecutionPipeline({
      engine: this.engine,
      bridge: this.execution,
      resolver: this.addressResolver,
      scientist: this.scientist,
      appRegistry: this.appRegistry,
      proposalHandler: (proposal, evidence) => this.#handleIntentProposal(proposal, evidence),
    });
    this.observation = new ObservationEngine({
      intent: this.intent,
      scientist: this.scientist,
      success: this.mesh.get('success'),
      chartTiming: this.chartTiming,
      proposals: this.proposals,
      deletionGuard: this.deletionGuard,
    });
    this.intentOrchestrator = new IntentOrchestrator({
      engine: this.engine,
      scientist: this.scientist,
      chatPipeline: this.chatPipeline,
      executionPipeline: this.executionPipeline,
      observation: this.observation,
    });
    this.toolSynthesizer = new ToolSynthesizer({
      system: this,
      engine: this.engine,
      scientist: this.scientist,
      proposalLedger: this.proposals,
      adapters: PORT_TRANSLATION_ADAPTERS,
    });
    this.successFeedback = new SuccessFeedbackLoop({
      engine: this.engine,
      orchestrator: this.intentOrchestrator,
      proposalLedger: this.proposals,
      toolSynthesizer: this.toolSynthesizer,
      interval: options.successInterval ?? 10,
    });
    this.semanticGenome = null;
    this.lastChatByPerson = new Map();
    if (options.semanticGenome) this.bindSemanticGenome(options.semanticGenome);
  }

  async #handleIntentProposal(proposal, { gap } = {}) {
    const record = this.proposals.append({
      flow: 'self',
      kind: 'architecture',
      observation: {
        source: 'gap',
        chartContext: null,
        successSignal: null,
        gapRecord: { gapType: gap.gapType, missing: gap.missing, recurrenceCount: 1 },
      },
      proposedChange: {
        description: proposal.spec.description,
        target: proposal.spec.missing?.[0] ?? gap.missing?.[0] ?? 'execution-capability',
        editType: 'add_primitive',
        spec: { ...proposal.spec, dependencies: [gap.id], intentProposalId: proposal.id },
      },
      reasoning: 'A failed analyzed execution produced a confidence-threshold capability proposal.',
      confidence: proposal.confidence,
      chartTiming: { appropriate: true, heldUntil: null, context: 'no conflicting chart state supplied' },
    });
    const applied = this.proposals.accept(record.id, { actor: 'self', execute: true });
    proposal.applied = applied.editId ?? applied.output?.id ?? null;
    return applied;
  }

  coordinatePopulation(input, options = {}) {
    const result = this.coordinator.run(input, {
      only: options.only ?? ['iching-grammar', 'morph-mir'],
      maxPackets: options.maxPackets ?? 8,
      context: options.context ?? {},
    });
    const record = Object.freeze({
      id: `coordination-${this.coordinationRuns.length + 1}`,
      sequence: this.coordinationRuns.length + 1,
      participants: Object.freeze(result.traces.map((trace) => trace.automatonId)),
      accepted: result.allAccepted,
      packetCount: result.packetCount,
      result: safe(result),
    });
    this.coordinationRuns.push(record);
    return record;
  }

  exactAddress(operation, input = {}) {
    if (operation === 'commit-tool') return this.exactRecall.commitTool(input.address, input.request ?? input.toolId, input.options);
    if (operation === 'commit-app') return this.exactRecall.commitApp(input.address, input.app ?? input, input.options);
    if (operation === 'recall') return this.exactRecall.recall(input.address, { kind: input.kind });
    if (operation === 'recognize') return this.exactRecall.recognize(input.candidate);
    if (operation === 'snapshot') return this.exactRecall.snapshot();
    throw new RangeError(`unknown exact-address operation: ${operation}`);
  }

  #governedMount(spec) {
    const implementation = spec.implementationKind === 'validated-gap-response'
      ? (input) => ({
        ok: true,
        synthesized: true,
        toolId: spec.forcedId,
        input: safe(input),
        capabilities: [...(spec.capabilities ?? [])],
        candidateStructure: safe(spec.candidateStructure ?? null),
        validatedAgainst: safe(spec.validationRuns ?? []),
      })
      : spec.implementation;
    const grown = this.growAgent({ ...spec, implementation });
    const id = grown.automaton?.id ?? grown.toolId;
    let bodyMount = null;
    try {
      bodyMount = typeof this.grownToolHandler === 'function'
        ? this.grownToolHandler({ id, automaton: grown.automaton, spec: safe(spec) })
        : null;
    } catch (error) {
      // A grown hand is not considered mounted if it cannot enter the body.
      this.mesh.automata.delete(id);
      this.engine.toolsById?.delete(id);
      this.learning.grownById?.delete(id);
      throw error;
    }
    return {
      ...grown,
      bodyMount,
      undo: () => {
        const body = typeof bodyMount?.undo === 'function' ? bodyMount.undo() : null;
        this.mesh.automata.delete(id);
        this.engine.toolsById?.delete(id);
        this.learning.grownById?.delete(id);
        this.disabledAgents.add(id);
        return { unmounted: true, id, body };
      },
    };
  }

  #governedDelete(target) {
    const automaton = this.mesh.get(target);
    const grown = this.learning.grownById?.get(target) ?? null;
    this.mesh.automata.delete(target);
    this.engine.toolsById?.delete(target);
    this.learning.grownById?.delete(target);
    this.disabledAgents.add(target);
    return {
      deactivated: true,
      target,
      undo: () => {
        if (automaton) this.mesh.automata.set(target, automaton);
        if (automaton) this.engine.toolsById?.set(target, automaton);
        if (grown) this.learning.grownById?.set(target, grown);
        this.disabledAgents.delete(target);
        return { restored: true, target };
      },
    };
  }

  #governedEvolution(spec) {
    const personId = spec.personId;
    if (!personId || !spec.weights) return { updated: false, reason: 'no live routing weights supplied' };
    const hadPrevious = this.intentOrchestrator.routingWeights.has(personId);
    const previous = this.intentOrchestrator.routingWeights.get(personId) ?? null;
    const weights = this.intentOrchestrator.updateRoutingWeights(personId, spec.weights);
    return {
      updated: true,
      personId,
      weights,
      undo: () => {
        if (hadPrevious) this.intentOrchestrator.routingWeights.set(personId, previous);
        else this.intentOrchestrator.routingWeights.delete(personId);
        return { restored: true, personId, hadPrevious };
      },
    };
  }

  async chat(message, context = {}) {
    const personId = context.personId ?? context.relationalContext?.personId ?? 'default-person';
    const previous = this.lastChatByPerson.get(personId);
    if (previous) {
      await this.successFeedback.observe({
        personId,
        indicatorId: 'engagement',
        score: context.engagementScore ?? this.successFeedback.inferChatScore(message),
        pipeline: previous.trace.map((entry) => entry.stage),
        outcome: { nextMessage: String(message) },
      });
    }
    const memoryAddress = context.canonicalAddress
      ?? context.relationalContext?.address
      ?? computationalAddress({ kind: 'chat', message: String(message) });
    let genomeMirror = null;
    if (this.semanticGenome && (context.chartConfiguration ?? context.chart)) {
      genomeMirror = this.semanticGenome.mirrorConfiguration(
        context.chartConfiguration ?? context.chart,
        { personId },
      );
    }
    const semanticGenomeActivation = this.semanticGenome?.activate(message, {
      ...context,
      personId,
      address: context.agentAddress ?? context.relationalContext?.agentAddress ?? memoryAddress,
      observerFrame: context.observerFrame ?? null,
    }) ?? null;
    const semanticGenome = this.semanticGenome?.summarize(semanticGenomeActivation) ?? null;
    const precedents = this.anticipatoryMemory.recall(memoryAddress);
    const pipeline = await this.chatPipeline.run(message, {
      ...context,
      semanticGenome,
      genomeMirror,
      relationalContext: {
        ...(context.relationalContext ?? {}),
        semanticGenome: safe(semanticGenome),
        genomeMirror: safe(genomeMirror),
      },
      anticipatoryPrecedents: precedents,
    });
    const coordination = this.coordinatePopulation(message, {
      context: { ...context, pipelineTrace: pipeline.trace },
    });
    this.lastChatByPerson.set(personId, pipeline);
    const shared = super.shareKnowledge({
      kind: 'chat-pipeline-complete',
      utterance: pipeline.utterance,
      pipelineTrace: pipeline.trace,
      relationalContext: pipeline.relationalContext,
      coordination,
    }, { source: 'chat-pipeline', kind: 'pipeline-trace' });
    const cultivation = this.cultivation.observe('chat', {
      ok: true,
      message,
      utterance: pipeline.utterance,
      pipelineTrace: pipeline.trace,
    }, {
      ...context,
      scienceAlreadyRecorded: true,
      toolPath: pipeline.trace.map((entry) => entry.stage),
    });
    const precedent = this.anticipatoryMemory.observe(memoryAddress, {
      kind: 'chat-outcome',
      stages: pipeline.trace.map((entry) => entry.stage),
      accepted: true,
      evidenceCount: 1,
      confidence: pipeline.experiment?.score ?? 0.7,
    });
    const record = this.#integratedRecord('chat', { pipeline, coordination, shared, cultivation, precedent });
    return {
      ok: true,
      utterance: pipeline.utterance,
      pipelineTrace: pipeline.trace,
      relationalContext: pipeline.relationalContext,
      experiment: pipeline.experiment,
      emergence: pipeline.emergence,
      coordination,
      cultivation,
      semanticGenome: safe(semanticGenome),
      genomeMirror: safe(genomeMirror),
      anticipatoryMemory: { recalled: precedents.length, precedent },
      shared,
      recordId: record.id,
    };
  }

  async executeArtifact(artifact, context = {}) {
    let suppliedCanonicalAddress = null;
    if (context.canonicalAddress) {
      validateCanonicalAddress(context.canonicalAddress);
      suppliedCanonicalAddress = safe(context.canonicalAddress);
    }
    const genomeAddress = suppliedCanonicalAddress
      ?? context.relationalContext?.organismAddress
      ?? computationalAddress({ kind: 'execution', artifact: safe(artifact) });
    const personId = context.personId ?? context.relationalContext?.personId ?? 'default-person';
    let genomeMirror = null;
    if (this.semanticGenome && (context.chartConfiguration ?? context.chart)) {
      genomeMirror = this.semanticGenome.mirrorConfiguration(
        context.chartConfiguration ?? context.chart,
        { personId },
      );
    }
    const semanticGenomeActivation = this.semanticGenome?.activate(artifact, {
      ...context,
      personId,
      address: context.agentAddress ?? context.relationalContext?.agentAddress ?? genomeAddress,
      observerFrame: context.observerFrame ?? null,
    }) ?? null;
    const semanticGenome = this.semanticGenome?.summarize(semanticGenomeActivation) ?? null;
    const pipeline = await this.executionPipeline.run(artifact, {
      ...context,
      semanticGenome,
      genomeMirror,
    });
    const canonicalAddress = suppliedCanonicalAddress ?? pipeline.resolution.address;
    const placement = Object.freeze({
      id: `execution-address-${this.executionAddressRecords.length + 1}`,
      sequence: this.executionAddressRecords.length + 1,
      canonicalAddress,
      canonicalAddressKey: canonicalAddressKey(canonicalAddress),
      addressBasis: suppliedCanonicalAddress ? 'creator-supplied' : pipeline.resolution.derivation.basis,
      derivation: safe(pipeline.resolution.derivation),
      scaleLadder: safe(pipeline.resolution.scaleLadder),
      outcome: safe({ ok: pipeline.ok, path: pipeline.path, strategy: pipeline.strategy }),
    });
    this.executionAddressRecords.push(placement);
    const shared = super.shareKnowledge({
      kind: 'execution-pipeline-complete',
      strategy: pipeline.strategy,
      analysis: pipeline.analysis,
      scaleLadder: pipeline.resolution.scaleLadder,
      result: pipeline.result,
    }, { source: 'execution-pipeline', kind: 'pipeline-trace' });
    const feedback = await this.successFeedback.observe({
      personId,
      indicatorId: 'task_completion',
      score: pipeline.ok ? 1 : pipeline.result?.result ? 0.5 : 0,
      pipeline: ['primitive-descent', 'scale-ladder', pipeline.strategy],
      outcome: pipeline.result,
    });
    const cultivation = this.cultivation.observe('execution', {
      ok: pipeline.ok,
      strategy: pipeline.strategy,
      path: pipeline.result?.path,
      canonicalAddress,
    }, {
      ...context,
      scienceAlreadyRecorded: true,
      toolPath: ['primitive-descent', 'five-level-state-space', 'scale-ladder', pipeline.strategy],
    });
    const precedents = this.anticipatoryMemory.recall(canonicalAddress);
    const precedent = this.anticipatoryMemory.observe(canonicalAddress, {
      kind: 'execution-outcome',
      strategy: pipeline.strategy,
      accepted: pipeline.ok,
      evidenceCount: 1,
      confidence: pipeline.experiment?.score ?? (pipeline.ok ? 0.8 : 0.4),
    });
    const record = this.#integratedRecord('execution', { pipeline, placement, shared, feedback, cultivation, precedent });
    return {
      ...pipeline.result,
      ok: pipeline.ok,
      strategy: pipeline.strategy,
      bridgeUsed: pipeline.bridgeUsed,
      decomposition: pipeline.decomposition,
      scaleLadder: pipeline.resolution.scaleLadder,
      fiveLevelProjection: pipeline.resolution.fiveLevelProjection,
      analysis: pipeline.analysis,
      canonicalAddress,
      canonicalAddressKey: canonicalAddressKey(canonicalAddress),
      addressBasis: placement.addressBasis,
      addressDerivation: pipeline.resolution.derivation,
      placementRecordId: placement.id,
      experiment: pipeline.experiment,
      gap: pipeline.gap,
      proposal: pipeline.proposal,
      proposalApplication: pipeline.proposalApplication,
      shared,
      feedback,
      cultivation,
      semanticGenome: safe(semanticGenome),
      genomeMirror: safe(genomeMirror),
      anticipatoryMemory: { recalled: precedents.length, precedent },
      recordId: record.id,
    };
  }

  async route(task, context = {}) {
    const routed = await this.intentOrchestrator.route(task, context);
    const cultivation = this.cultivation.observe('intent-routing', {
      ok: routed.outcome?.ok !== false,
      intentType: routed.intentType,
      pipeline: routed.pipeline,
    }, {
      ...context,
      scienceAlreadyRecorded: true,
      toolPath: [...routed.pipeline],
    });
    return Object.freeze({ ...routed, cultivation });
  }

  water(text, context = {}) {
    const result = this.cultivation.water(text, context);
    const shared = super.shareKnowledge({ kind: 'watering-complete', result }, { source: 'cultivation', kind: 'learning-trace' });
    const record = this.#integratedRecord('water', { result, shared });
    return { ...result, shared, recordId: record.id };
  }

  admit(piece, context = {}) {
    const result = this.cultivation.admit(piece, context);
    const shared = super.shareKnowledge({ kind: 'admission-complete', result }, { source: 'cultivation', kind: 'learning-trace' });
    const record = this.#integratedRecord('admit', { result, shared });
    return { ...result, shared, recordId: record.id };
  }

  contact(entityIdA, entityIdB, options = {}) {
    const result = this.cultivation.contact(entityIdA, entityIdB, options);
    const shared = super.shareKnowledge({ kind: 'sentence-contact-complete', result }, { source: 'cultivation', kind: 'learning-trace' });
    const record = this.#integratedRecord('contact', { result, shared });
    return { ...result, shared, recordId: record.id };
  }

  ingestBook(spec = {}) {
    const result = this.cultivation.ingestBook(spec);
    const shared = super.shareKnowledge({ kind: 'book-ingestion-complete', result }, { source: 'cultivation', kind: 'learning-trace' });
    const record = this.#integratedRecord('book-ingest', { result, shared });
    return { ...result, shared, recordId: record.id };
  }

  trainingSnapshot() { return this.cultivation.trainingSnapshot(); }

  /** Bind an organism-level placement hook without coupling this package to it. */
  bindGrownToolHandler(handler) {
    if (handler != null && typeof handler !== 'function') throw new TypeError('grown tool handler must be callable');
    this.grownToolHandler = handler;
    return this;
  }

  /** Bind the one persistent 768-aspect substrate into both live task paths. */
  bindSemanticGenome(genome) {
    if (!genome?.activate || !genome?.relate || !genome?.snapshot) {
      throw new TypeError('semantic genome must expose activate, relate, and snapshot');
    }
    this.semanticGenome = genome;
    this.chatPipeline.semanticGenome = genome;
    this.executionPipeline.semanticGenome = genome;
    return this;
  }

  instrument(id) {
    const automaton = this.mesh.get(id);
    if (!automaton || this.disabledAgents.has(id)) return null;
    return automaton;
  }

  wiringAudit() {
    const automata = [...this.mesh.automata.keys()];
    const audit = {
      chat: automata.includes('conversation'),
      canonicalTools: this.engine.tools.length,
      mountedAutomata: automata.length,
      meshConnections: this.mesh.connections.size,
      transportConnections: this.mesh.transportConnections.size,
      learning: typeof this.learning.request === 'function',
      growth: typeof this.learning.grow === 'function',
      reversibleRewrite: typeof this.editor.addRule === 'function' && typeof this.editor.revert === 'function',
      executionBridge: typeof this.execution.execute === 'function',
      executionAddressResolver: typeof this.addressResolver?.resolve === 'function',
      chatPipeline: typeof this.chatPipeline?.run === 'function',
      primitiveSystemPromoted: this.addressResolver?.constructor?.name === 'IntegratedExecutionAddressResolver',
      intentOrchestrator: typeof this.intentOrchestrator?.inferIntent === 'function',
      toolSynthesizer: typeof this.toolSynthesizer?.checkTrigger === 'function',
      grownToolBodyPlacement: this.grownToolHandler == null || typeof this.grownToolHandler === 'function',
      successFeedback: typeof this.successFeedback?.observe === 'function',
      autonomyLoop: this.scientist.experiments.length > 0 && this.intent.gaps.length >= 0,
      observationEngine: typeof this.observation?.watch === 'function',
      proposalLedger: typeof this.proposals?.pending === 'function',
      chartTiming: typeof this.chartTiming?.evaluate === 'function',
      deletionGuard: typeof this.deletionGuard?.check === 'function',
      rollbackGuarantee: typeof this.editor?.revert === 'function',
      registeredAppRuntime: typeof this.appRegistry?.execute === 'function',
      exactAddressRecall: typeof this.exactRecall?.recall === 'function'
        && this.exactRecall.snapshot().schemaField === 'arcAxis',
      anticipatoryMemory: typeof this.anticipatoryMemory?.recall === 'function'
        && typeof this.anticipatoryMemory?.contribute === 'function',
      meshCoordinator: typeof this.coordinator?.run === 'function'
        && typeof this.coordinatePopulation === 'function',
      backendlessRegisteredApps: this.appRegistry.list().some((app) => app.singlePlayer && !app.backendRequired),
      watering: typeof this.cultivation?.water === 'function',
      admissionRegistry: typeof this.cultivation?.admit === 'function',
      sentenceContact: typeof this.cultivation?.contact === 'function',
      bookIngestion: typeof this.cultivation?.ingestBook === 'function',
      trainingJournal: typeof this.cultivation?.trainingSnapshot === 'function',
      universalCultivation: typeof this.cultivation?.observe === 'function',
      fiveLevelStateSpace: typeof this.addressResolver?.projectFiveLevels === 'function'
        && this.addressResolver.projectFiveLevels(1).length === 5,
      semanticGenomeLive: typeof this.semanticGenome?.activate === 'function',
      persistentAspectPrimitives768: this.semanticGenome?.aspects?.size === 768,
      sixAspectDyadsPerCodon: this.semanticGenome?.codons?.size === 64
        && [...this.semanticGenome.codons.values()].every((codon) => codon.dyads.length === 6),
      sensoryExpressionLive: typeof this.semanticGenome?.manifest === 'function',
    };
    return Object.freeze({
      ok: Object.values(audit).every(Boolean),
      ...audit,
      meshCoordinatorRuns: this.coordinationRuns.length,
      exactRecallCommitments: this.exactRecall.snapshot().commitments,
    });
  }

  #integratedRecord(type, data) {
    const record = Object.freeze({ id: `integrated-${this.history.length + 1}`, sequence: this.history.length + 1, type, data: safe(data) });
    this.history.push(record);
    return record;
  }
}

export { addTransportSurface };
export default IntegratedSynthiaSystem;
