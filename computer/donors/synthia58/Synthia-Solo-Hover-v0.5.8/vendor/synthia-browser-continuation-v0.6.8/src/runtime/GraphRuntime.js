import { MessageBus } from "./MessageBus.js";
import { SurfaceCoordinator } from "./SurfaceCoordinator.js";
import { CollapseResolver } from "./CollapseResolver.js";
import { ArcRuntime } from "./ArcRuntime.js";
import { ChannelResolver } from "./ChannelResolver.js";
import { ChannelRegistry } from "./ChannelRegistry.js";
import { CapabilityRegistry } from "./CapabilityRegistry.js";
import { ToolRegistry } from "./ToolRegistry.js";
import { ExpressionPlanner } from "./ExpressionPlanner.js";
import { ToolScheduler } from "./ToolScheduler.js";
import { ArtifactAssembler } from "./ArtifactAssembler.js";
import { ArtifactValidator } from "./ArtifactValidator.js";
import { RuntimeLearningCoordinator } from "./RuntimeLearningCoordinator.js";
import { AnticipatoryMeshMemory } from "./AnticipatoryMeshMemory.js";
class GraphRuntime {
  sessions;
  states;
  messageBus;
  surfaceCoordinator;
  collapseResolver;
  arcRuntime;
  channelResolver;
  channelRegistry;
  capabilityRegistry;
  toolRegistry;
  expressionPlanner;
  toolScheduler;
  artifactAssembler;
  artifactValidator;
  learningCoordinator;
  anticipatoryMemory;
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    this.states = /* @__PURE__ */ new Map();
    this.messageBus = new MessageBus();
    this.surfaceCoordinator = new SurfaceCoordinator();
    this.collapseResolver = new CollapseResolver();
    this.arcRuntime = new ArcRuntime();
    this.channelRegistry = new ChannelRegistry();
    this.channelResolver = new ChannelResolver(this.channelRegistry);
    this.capabilityRegistry = new CapabilityRegistry();
    this.toolRegistry = new ToolRegistry(this.capabilityRegistry);
    this.expressionPlanner = new ExpressionPlanner();
    this.toolScheduler = new ToolScheduler(this.toolRegistry);
    this.learningCoordinator = new RuntimeLearningCoordinator();
    this.anticipatoryMemory = new AnticipatoryMeshMemory();
    this.artifactAssembler = new ArtifactAssembler(
      this.toolRegistry,
      () => this.getLearningSnapshot(),
      () => this.getAnticipatoryMemorySnapshot()
    );
    this.artifactValidator = new ArtifactValidator();
  }
  /** Install or upgrade one executable tool without rebuilding the runtime.
   * ToolRegistry uses toolId as identity, so registering an equal-or-better
   * implementation under the same id upgrades the active slot.
   */
  registerTool(tool) {
    this.toolRegistry.registerTool(tool);
    return this;
  }
  registerTools(tools) {
    for (const tool of tools) this.registerTool(tool);
    return this;
  }
  getRegisteredTools() {
    return this.toolRegistry.getAllTools();
  }
  getRegisteredCapabilities() {
    return this.capabilityRegistry.getAll();
  }
  setMissingToolGenerator(generator) {
    this.toolScheduler.setMissingToolGenerator(generator);
    return this;
  }
  /** Attach a collective precedent mesh transport. This may be peer/LAN/local
   * mesh; Internet access is not a requirement of this interface. */
  setPrecedentMesh(provider) {
    this.anticipatoryMemory.setProvider(provider);
    return this;
  }
  /** Preload the reachable public Gate→Base neighborhood ahead of time. */
  async prepareForwardHorizon(request) {
    return this.anticipatoryMemory.preload(request);
  }
  /** Local fine-state trigger → already cached collective precedent. No mesh
   * query is made here; below-Base coordinates remain entirely local. */
  activatePreloadedPrecedents(sessionId, trigger) {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);
    const precedents = this.anticipatoryMemory.recall(trigger);
    for (const precedent of precedents) {
      const messageId = `precedent_${trigger.triggerId}_${precedent.precedentId}`;
      if (state.messageBus.some((message) => message.messageId === messageId)) continue;
      state.messageBus.push({
        messageId,
        sessionId,
        targetCapability: precedent.capabilityPath[0],
        intent: "collective-precedent",
        payload: { precedent },
        planet: state.session.intent.planet || 1,
        dimension: state.session.intent.dimension || 1,
        side: state.session.intent.side,
        trace: ["ANTICIPATORY_MESH_CACHE"],
        ttl: 3
      });
    }
    return precedents;
  }
  getAnticipatoryMemorySnapshot() {
    return this.anticipatoryMemory.snapshot();
  }
  /** Explicit teaching/correction entrypoints. The normal autonomous runtime
   * learns from execution outcomes automatically; these expose the original
   * InteractiveLearner when a human intentionally teaches or corrects it. */
  teach(example) {
    return this.learningCoordinator.teach(example);
  }
  receiveFeedback(feedback) {
    this.learningCoordinator.receiveFeedback(feedback);
  }
  getLearningSnapshot() {
    return {
      ...this.learningCoordinator.snapshot(),
      toolHealth: this.toolRegistry.getHealthSnapshot(),
      anticipatoryMemory: this.anticipatoryMemory.snapshot()
    };
  }
  /**
   * Ingest an intent and create a new runtime session.
   */
  async ingest(intent) {
    const session = {
      sessionId: intent.intentId,
      intent,
      seed: {
        sessionSeed: intent.seed,
        eventCounter: 0
      },
      createdAt: Date.now()
    };
    this.sessions.set(session.sessionId, session);
    const state = this.initializeRuntimeState(session);
    this.states.set(session.sessionId, state);
    await this.activateInitialStates(state, intent);
    if (intent.forwardHorizon) await this.anticipatoryMemory.preload(intent.forwardHorizon);
    return session;
  }
  /**
   * Execute one step of the runtime.
   */
  async step(sessionId) {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);
    const stepNumber = state.seed.eventCounter++;
    const dimensionalStage = stepNumber % 5 + 1;
    const frame = {
      sessionId,
      dimension: dimensionalStage,
      activeStates: Array.from(state.activeNodes.values()),
      messages: [...state.messageBus],
      collapseEvents: Array.from(state.collapseEvents.values()),
      arcs: Array.from(state.arcs.values()),
      channelActivations: Array.from(state.channelActivations.values()),
      expressionGraph: state.expressionGraph
    };
    const transformedFrame = await this.executeDimension(frame, state);
    state.activeNodes = new Map(transformedFrame.activeStates.map((s) => [s.stateId, s]));
    state.collapseEvents = new Map(transformedFrame.collapseEvents.map((e) => [e.eventId, e]));
    state.arcs = new Map(transformedFrame.arcs.map((a) => [a.arcId, a]));
    state.channelActivations = new Map(transformedFrame.channelActivations.map((c) => [c.activationId, c]));
    const messagesProcessed = await this.messageBus.process(state);
    await this.collapseResolver.resolve(state);
    await this.arcRuntime.advance(state);
    const newChannels = await this.channelResolver.resolve(state);
    const scheduleReport = await this.toolScheduler.schedule(state);
    this.learningCoordinator.observeSchedule(state, scheduleReport);
    await this.anticipatoryMemory.observeSchedule(state, scheduleReport, this.channelRegistry);
    state.expressionGraph = await this.expressionPlanner.plan(state);
    this.arcRuntime.consumeResolved(state);
    const coherence = this.calculateCoherence(state);
    return {
      stepNumber,
      sessionId,
      dimensionalStage,
      activeStates: state.activeNodes.size,
      openArcs: Array.from(state.arcs.values()).filter((a) => a.status === "OPEN" || a.status === "ADVANCING").length,
      activeChannels: newChannels.length,
      coherence,
      messagesProcessed
    };
  }
  /**
   * Run until the graph settles.
   */
  async runUntilSettled(sessionId) {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);
    const maxSteps = 100;
    let steps = 0;
    while (steps < maxSteps) {
      const result = await this.step(sessionId);
      steps++;
      if (result.messagesProcessed === 0 && result.openArcs === 0 && result.activeChannels === 0) {
        break;
      }
      if (result.coherence > 0.95 && steps > 10) {
        break;
      }
    }
    state.session.settledAt = Date.now();
    state.expressionGraph.settled = true;
    return state.expressionGraph;
  }
  /**
   * Materialize an artifact from the expression graph.
   */
  async materialize(sessionId, target) {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);
    if (!state.expressionGraph.settled) {
      await this.runUntilSettled(sessionId);
    }
    state.expressionGraph.target = target;
    this.learningCoordinator.finalizeSession(sessionId);
    let result = await this.artifactAssembler.assemble(state.expressionGraph, target);
    let validation = await this.artifactValidator.validate(result);
    if (!validation.valid) {
      result = await this.artifactValidator.repair(result);
      validation = await this.artifactValidator.validate(result);
    }
    if (!validation.valid) {
      result.success = false;
      result.errors.push(...validation.errors);
    }
    return result;
  }
  // =========================================================================
  // PRIVATE
  // =========================================================================
  initializeRuntimeState(session) {
    return {
      session,
      surfaces: /* @__PURE__ */ new Map([
        ["FOUR_SIDE", { side: "FOUR_SIDE", activeStates: /* @__PURE__ */ new Map(), planetaryPositions: /* @__PURE__ */ new Map() }],
        ["FIVE_SIDE", { side: "FIVE_SIDE", activeStates: /* @__PURE__ */ new Map(), planetaryPositions: /* @__PURE__ */ new Map() }]
      ]),
      ternaryEmergences: [],
      activeNodes: /* @__PURE__ */ new Map(),
      collapseEvents: /* @__PURE__ */ new Map(),
      arcs: /* @__PURE__ */ new Map(),
      channelActivations: /* @__PURE__ */ new Map(),
      hyperchannels: /* @__PURE__ */ new Map(),
      expressionGraph: {
        graphId: `graph_${session.sessionId}`,
        sessionId: session.sessionId,
        nodes: [],
        edges: [],
        inputs: [],
        outputs: [],
        constraints: [],
        provenance: [],
        settled: false
      },
      messageBus: [],
      seed: session.seed
    };
  }
  async activateInitialStates(state, intent) {
    const side = intent.side;
    const planet = intent.planet || 1;
    const dimension = intent.dimension || 1;
    const initialGates = [1, 25, 10, 34, 57];
    for (const gate of initialGates) {
      for (let line = 1; line <= 6; line++) {
        const stateId = `state_${side}_p${planet}_d${dimension}_g${gate}_l${line}`;
        const activeState = {
          stateId,
          address: {
            side,
            planet,
            dimension,
            gateLine: { gate, line },
            color: 1,
            tone: 1,
            base: 1
          },
          activation: 0.1 + this.deriveValue(state.seed, gate, line) * 0.4,
          phase: this.deriveValue(state.seed, gate, line + 100) * 2 * Math.PI,
          coherence: 0.5,
          tension: 0.5,
          regime: "STABLE",
          collapseEventIds: [],
          outgoingArcIds: [],
          incomingArcIds: [],
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };
        state.activeNodes.set(stateId, activeState);
        const surface = state.surfaces.get(side);
        surface.activeStates.set(stateId, activeState);
      }
    }
  }
  async executeDimension(frame, state) {
    const operators = {
      1: this.executeMovement.bind(this),
      2: this.executeEvolution.bind(this),
      3: this.executeBeing.bind(this),
      4: this.executeDesign.bind(this),
      5: this.executeSpace.bind(this)
    };
    const operator = operators[frame.dimension];
    if (!operator) return frame;
    return operator(frame, state);
  }
  async executeMovement(frame, state) {
    for (const activeState of frame.activeStates) {
      const gateFreq = activeState.address.gateLine.gate / 64;
      const linePhase = Math.sin(activeState.address.gateLine.line * Math.PI / 6);
      activeState.activation = gateFreq * 0.5 + 0.5;
      activeState.phase = linePhase * Math.PI;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }
  async executeEvolution(frame, state) {
    for (const activeState of frame.activeStates) {
      const colorRatio = activeState.address.color / 6;
      const toneFreq = activeState.address.tone / 6;
      const exaltation = activeState.activation * colorRatio;
      const detriment = activeState.activation * (1 - colorRatio);
      activeState.activation = Math.sqrt(
        exaltation ** 2 + detriment ** 2 + 2 * exaltation * detriment * Math.cos(toneFreq * Math.PI)
      );
      activeState.phase += toneFreq * Math.PI;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }
  async executeBeing(frame, state) {
    for (const activeState of frame.activeStates) {
      const witnessPerspective = activeState.address.base / 5;
      const selfInterference = activeState.activation * Math.cos(activeState.phase);
      activeState.activation = Math.abs(selfInterference);
      activeState.phase = activeState.phase * witnessPerspective;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }
  async executeDesign(frame, state) {
    const states = frame.activeStates;
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const source = states[i];
        const target = states[j];
        const alreadyExpressed = Array.from(state.channelActivations.values()).some(
          (activation) => activation.sourceStateId === source.stateId && activation.targetStateId === target.stateId || activation.sourceStateId === target.stateId && activation.targetStateId === source.stateId
        );
        if (alreadyExpressed) continue;
        if (this.areCompatible(source, target)) {
          const arcId = `arc_${source.stateId}_${target.stateId}_${Date.now()}`;
          const arc = {
            arcId,
            sourceStateId: source.stateId,
            targetStateId: target.stateId,
            path: [source.stateId, target.stateId],
            accumulatedMessages: [],
            resonance: source.activation * target.activation,
            tension: Math.abs(source.phase - target.phase) / (2 * Math.PI),
            coherence: (source.coherence + target.coherence) / 2,
            openedAt: Date.now(),
            status: "OPEN"
          };
          frame.arcs.push(arc);
          source.outgoingArcIds.push(arcId);
          target.incomingArcIds.push(arcId);
        }
      }
    }
    return frame;
  }
  async executeSpace(frame, state) {
    for (const activeState of frame.activeStates) {
      const connectedArcs = frame.arcs.filter(
        (a) => a.sourceStateId === activeState.stateId || a.targetStateId === activeState.stateId
      );
      let emergentMeaning = 0;
      let totalWeight = 0;
      for (const arc of connectedArcs) {
        emergentMeaning += arc.coherence * arc.resonance;
        totalWeight += arc.resonance;
      }
      activeState.coherence = totalWeight > 0 ? emergentMeaning / totalWeight : activeState.coherence;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }
  areCompatible(a, b) {
    if (a.address.side !== b.address.side) return false;
    const gateA = a.address.gateLine.gate;
    const gateB = b.address.gateLine.gate;
    const isCanonicalChannel = Boolean(this.channelRegistry.findByGates(gateA, gateB));
    const harmonicGate = (gateA + 32) % 64 || 64;
    const isHarmonic = gateB === harmonicGate;
    const isComplementary = Math.abs(gateA - gateB) === 1;
    const phaseDiff = Math.abs(a.phase - b.phase);
    const phaseAligned = phaseDiff < Math.PI / 4;
    const minCoherence = 0.2;
    return (isCanonicalChannel || isHarmonic || isComplementary) && phaseAligned && a.coherence > minCoherence && b.coherence > minCoherence;
  }
  calculateCoherence(state) {
    if (state.activeNodes.size === 0) return 0;
    let totalCoherence = 0;
    for (const node of state.activeNodes.values()) {
      totalCoherence += node.coherence;
    }
    return totalCoherence / state.activeNodes.size;
  }
  /**
   * Derive deterministic value from seed.
   */
  deriveValue(seed, a, b) {
    const hash = Number(seed.sessionSeed) + a * 31 + b * 17 + seed.eventCounter;
    return (Math.sin(hash) + 1) / 2;
  }
}
var stdin_default = GraphRuntime;
export {
  GraphRuntime,
  stdin_default as default
};
