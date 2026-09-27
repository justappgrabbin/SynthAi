import { MessageBus } from "./MessageBus";
import { SurfaceCoordinator } from "./SurfaceCoordinator";
import { CollapseResolver } from "./CollapseResolver";
import { ArcRuntime } from "./ArcRuntime";
import { ChannelResolver } from "./ChannelResolver";
import { ChannelRegistry } from "./ChannelRegistry";
import { CapabilityRegistry } from "./CapabilityRegistry";
import { ToolRegistry } from "./ToolRegistry";
import { ExpressionPlanner } from "./ExpressionPlanner";
import { ToolScheduler } from "./ToolScheduler";
import { ArtifactAssembler } from "./ArtifactAssembler";
import { ArtifactValidator } from "./ArtifactValidator";
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
    this.artifactAssembler = new ArtifactAssembler();
    this.artifactValidator = new ArtifactValidator();
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
    return session;
  }
  /**
   * Execute one step of the runtime.
   */
  async step(sessionId) {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);
    const session = this.sessions.get(sessionId);
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
    const messagesProcessed = await this.messageBus.process(state);
    await this.collapseResolver.resolve(state);
    await this.arcRuntime.advance(state);
    const newChannels = await this.channelResolver.resolve(state);
    await this.toolScheduler.schedule(state);
    state.expressionGraph = await this.expressionPlanner.plan(state);
    state.activeNodes = new Map(transformedFrame.activeStates.map((s) => [s.stateId, s]));
    state.collapseEvents = new Map(transformedFrame.collapseEvents.map((e) => [e.eventId, e]));
    state.arcs = new Map(transformedFrame.arcs.map((a) => [a.arcId, a]));
    state.channelActivations = new Map(transformedFrame.channelActivations.map((c) => [c.activationId, c]));
    state.messageBus = [];
    const coherence = this.calculateCoherence(state);
    return {
      stepNumber,
      sessionId,
      dimensionalStage,
      activeStates: state.activeNodes.size,
      openArcs: state.arcs.size,
      activeChannels: state.channelActivations.size,
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
    return this.artifactAssembler.assemble(state.expressionGraph, target);
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
    const harmonicGate = (a.address.gateLine.gate + 32) % 64 || 64;
    const isHarmonic = b.address.gateLine.gate === harmonicGate;
    const isComplementary = Math.abs(a.address.gateLine.gate - b.address.gateLine.gate) === 1;
    const phaseDiff = Math.abs(a.phase - b.phase);
    const phaseAligned = phaseDiff < Math.PI / 4;
    const minCoherence = 0.2;
    return (isHarmonic || isComplementary) && phaseAligned && a.coherence > minCoherence && b.coherence > minCoherence;
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
