/**
 * GRAPH RUNTIME
 * 
 * Owns one complete execution session.
 * 
 * Responsibilities:
 * 1. Accept intent
 * 2. Activate initial substrate states
 * 3. Run the five dimensions sequentially
 * 4. Create collapse events
 * 5. Open and advance Arcs
 * 6. Resolve channels
 * 7. Allocate computational capabilities
 * 8. Attach Klein tools
 * 9. Build an Expression Graph
 * 10. Materialize an artifact
 */

import {
  RuntimeIntent, RuntimeSession, RuntimeStepResult, RuntimeSeed,
  DimensionalFrame, ExpressionGraph, ArtifactTarget, ArtifactResult,
  SurfaceSide, SurfaceState, ActiveNodeState, RuntimeMessage,
  CollapseEvent, ArcTraversal, ChannelActivation, Hyperchannel,
  RuntimeState, IntrinsicAddress, GateLineAddress, KleinToolAdapter
} from './foundations';

import { MessageBus } from './MessageBus';
import { SurfaceCoordinator } from './SurfaceCoordinator';
import { CollapseResolver } from './CollapseResolver';
import { ArcRuntime } from './ArcRuntime';
import { ChannelResolver } from './ChannelResolver';
import { ChannelRegistry } from './ChannelRegistry';
import { CapabilityRegistry } from './CapabilityRegistry';
import { ToolRegistry } from './ToolRegistry';
import { ExpressionPlanner } from './ExpressionPlanner';
import { ToolScheduler, MissingToolGenerator } from './ToolScheduler';
import { ArtifactAssembler } from './ArtifactAssembler';
import { ArtifactValidator } from './ArtifactValidator';

export class GraphRuntime {
  private sessions: Map<string, RuntimeSession>;
  private states: Map<string, RuntimeState>;

  private messageBus: MessageBus;
  private surfaceCoordinator: SurfaceCoordinator;
  private collapseResolver: CollapseResolver;
  private arcRuntime: ArcRuntime;
  private channelResolver: ChannelResolver;
  private channelRegistry: ChannelRegistry;
  private capabilityRegistry: CapabilityRegistry;
  private toolRegistry: ToolRegistry;
  private expressionPlanner: ExpressionPlanner;
  private toolScheduler: ToolScheduler;
  private artifactAssembler: ArtifactAssembler;
  private artifactValidator: ArtifactValidator;

  constructor() {
    this.sessions = new Map();
    this.states = new Map();

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

  /** Install or upgrade one executable tool without rebuilding the runtime.
   * ToolRegistry uses toolId as identity, so registering an equal-or-better
   * implementation under the same id upgrades the active slot.
   */
  registerTool(tool: KleinToolAdapter): this {
    this.toolRegistry.registerTool(tool);
    return this;
  }

  registerTools(tools: KleinToolAdapter[]): this {
    for (const tool of tools) this.registerTool(tool);
    return this;
  }

  getRegisteredTools(): KleinToolAdapter[] {
    return this.toolRegistry.getAllTools();
  }

  getRegisteredCapabilities(): string[] {
    return this.capabilityRegistry.getAll();
  }

  setMissingToolGenerator(generator: MissingToolGenerator | null): this {
    this.toolScheduler.setMissingToolGenerator(generator);
    return this;
  }

  /**
   * Ingest an intent and create a new runtime session.
   */
  async ingest(intent: RuntimeIntent): Promise<RuntimeSession> {
    const session: RuntimeSession = {
      sessionId: intent.intentId,
      intent,
      seed: {
        sessionSeed: intent.seed,
        eventCounter: 0
      },
      createdAt: Date.now()
    };

    this.sessions.set(session.sessionId, session);

    // Initialize runtime state
    const state = this.initializeRuntimeState(session);
    this.states.set(session.sessionId, state);

    // Activate initial substrate states based on intent
    await this.activateInitialStates(state, intent);

    return session;
  }

  /**
   * Execute one step of the runtime.
   */
  async step(sessionId: string): Promise<RuntimeStepResult> {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);

    const stepNumber = state.seed.eventCounter++;
    const dimensionalStage = (stepNumber % 5) + 1 as 1 | 2 | 3 | 4 | 5;

    const frame: DimensionalFrame = {
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

    // v0.3: commit dimensional changes BEFORE downstream organs run. The old
    // order let ArcRuntime/ChannelResolver mutate state and then overwrote those
    // mutations from a stale frame snapshot at the end of the step.
    state.activeNodes = new Map(transformedFrame.activeStates.map(s => [s.stateId, s]));
    state.collapseEvents = new Map(transformedFrame.collapseEvents.map(e => [e.eventId, e]));
    state.arcs = new Map(transformedFrame.arcs.map(a => [a.arcId, a]));
    state.channelActivations = new Map(transformedFrame.channelActivations.map(c => [c.activationId, c]));

    const messagesProcessed = await this.messageBus.process(state);
    await this.collapseResolver.resolve(state);
    await this.arcRuntime.advance(state);

    const newChannels = await this.channelResolver.resolve(state);
    await this.toolScheduler.schedule(state);
    state.expressionGraph = await this.expressionPlanner.plan(state);

    // Once a resolved arc has produced a channel activation and any matching
    // tool has had its chance to execute, the traversal event is consumed.
    // All resolved traversals have now been offered to ChannelResolver.
    // Consume both channel-producing and non-channel arcs so resolved generic
    // relationships do not accumulate forever in the live state.
    this.arcRuntime.consumeResolved(state);

    const coherence = this.calculateCoherence(state);

    return {
      stepNumber,
      sessionId,
      dimensionalStage,
      activeStates: state.activeNodes.size,
      openArcs: Array.from(state.arcs.values()).filter(a => a.status === 'OPEN' || a.status === 'ADVANCING').length,
      activeChannels: newChannels.length,
      coherence,
      messagesProcessed
    };
  }

  /**
   * Run until the graph settles.
   */
  async runUntilSettled(sessionId: string): Promise<ExpressionGraph> {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);

    const maxSteps = 100;
    let steps = 0;

    while (steps < maxSteps) {
      const result = await this.step(sessionId);
      steps++;

      // Check if settled (no new messages, no changing states, no open arcs)
      if (result.messagesProcessed === 0 && result.openArcs === 0 && result.activeChannels === 0) {
        break;
      }

      // Check if coherence has stabilized
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
  async materialize(sessionId: string, target: ArtifactTarget): Promise<ArtifactResult> {
    const state = this.states.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);

    if (!state.expressionGraph.settled) {
      await this.runUntilSettled(sessionId);
    }

    state.expressionGraph.target = target;

    const result = await this.artifactAssembler.assemble(state.expressionGraph, target);
    const validation = await this.artifactValidator.validate(result);
    if (!validation.valid) {
      result.success = false;
      result.errors.push(...validation.errors);
    }
    return result;
  }

  // =========================================================================
  // PRIVATE
  // =========================================================================

  private initializeRuntimeState(session: RuntimeSession): RuntimeState {
    return {
      session,
      surfaces: new Map([
        ['FOUR_SIDE', { side: 'FOUR_SIDE', activeStates: new Map(), planetaryPositions: new Map() }],
        ['FIVE_SIDE', { side: 'FIVE_SIDE', activeStates: new Map(), planetaryPositions: new Map() }]
      ]),
      ternaryEmergences: [],
      activeNodes: new Map(),
      collapseEvents: new Map(),
      arcs: new Map(),
      channelActivations: new Map(),
      hyperchannels: new Map(),
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

  private async activateInitialStates(state: RuntimeState, intent: RuntimeIntent): Promise<void> {
    // Activate states based on intent description
    // Parse intent for W-H keywords and activate corresponding gate-lines

    const side = intent.side;
    const planet = intent.planet || 1;
    const dimension = intent.dimension || 1;

    // Create initial active states for key gates
    const initialGates = [1, 25, 10, 34, 57];  // Key activation gates

    for (const gate of initialGates) {
      for (let line = 1; line <= 6; line++) {
        const stateId = `state_${side}_p${planet}_d${dimension}_g${gate}_l${line}`;
        const activeState: ActiveNodeState = {
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
          activation: 0.1 + (this.deriveValue(state.seed, gate, line) * 0.4),
          phase: this.deriveValue(state.seed, gate, line + 100) * 2 * Math.PI,
          coherence: 0.5,
          tension: 0.5,
          regime: 'STABLE',
          collapseEventIds: [],
          outgoingArcIds: [],
          incomingArcIds: [],
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };

        state.activeNodes.set(stateId, activeState);

        const surface = state.surfaces.get(side)!;
        surface.activeStates.set(stateId, activeState);
      }
    }
  }

  private async executeDimension(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Execute the appropriate dimensional operator
    const operators: Record<number, (frame: DimensionalFrame, state: RuntimeState) => Promise<DimensionalFrame>> = {
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

  private async executeMovement(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Movement: Create impulse from gate frequencies
    for (const activeState of frame.activeStates) {
      const gateFreq = activeState.address.gateLine.gate / 64;
      const linePhase = Math.sin(activeState.address.gateLine.line * Math.PI / 6);

      activeState.activation = gateFreq * 0.5 + 0.5;
      activeState.phase = linePhase * Math.PI;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }

  private async executeEvolution(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Evolution: Apply polarity from color and tone
    for (const activeState of frame.activeStates) {
      const colorRatio = activeState.address.color / 6;
      const toneFreq = activeState.address.tone / 6;

      const exaltation = activeState.activation * colorRatio;
      const detriment = activeState.activation * (1 - colorRatio);

      activeState.activation = Math.sqrt(
        exaltation**2 + detriment**2 + 
        2 * exaltation * detriment * Math.cos(toneFreq * Math.PI)
      );
      activeState.phase += toneFreq * Math.PI;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }

  private async executeBeing(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Being: Create witness from base perspective
    for (const activeState of frame.activeStates) {
      const witnessPerspective = activeState.address.base / 5;
      const selfInterference = activeState.activation * Math.cos(activeState.phase);

      activeState.activation = Math.abs(selfInterference);
      activeState.phase = activeState.phase * witnessPerspective;
      activeState.lastUpdated = Date.now();
    }
    return frame;
  }

  private async executeDesign(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Design: Add context, create arcs between compatible states
    const states = frame.activeStates;

    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const source = states[i];
        const target = states[j];

        // Do not reopen a pair already expressed in this session. Channel
        // activations are retained as session history even after their arcs are
        // consumed, so they also act as the bounded-repeat guard.
        const alreadyExpressed = Array.from(state.channelActivations.values()).some(activation =>
          (activation.sourceStateId === source.stateId && activation.targetStateId === target.stateId) ||
          (activation.sourceStateId === target.stateId && activation.targetStateId === source.stateId)
        );
        if (alreadyExpressed) continue;

        // Check compatibility for arc creation
        if (this.areCompatible(source, target)) {
          const arcId = `arc_${source.stateId}_${target.stateId}_${Date.now()}`;
          const arc: ArcTraversal = {
            arcId,
            sourceStateId: source.stateId,
            targetStateId: target.stateId,
            path: [source.stateId, target.stateId],
            accumulatedMessages: [],
            resonance: source.activation * target.activation,
            tension: Math.abs(source.phase - target.phase) / (2 * Math.PI),
            coherence: (source.coherence + target.coherence) / 2,
            openedAt: Date.now(),
            status: 'OPEN'
          };

          frame.arcs.push(arc);
          source.outgoingArcIds.push(arcId);
          target.incomingArcIds.push(arcId);
        }
      }
    }

    return frame;
  }

  private async executeSpace(frame: DimensionalFrame, state: RuntimeState): Promise<DimensionalFrame> {
    // Space: Generate meaning from channel interference
    // This is where channels are resolved and expression graph is built
    // (Actual channel resolution happens in ChannelResolver)

    for (const activeState of frame.activeStates) {
      // Calculate emergent meaning from connected arcs
      const connectedArcs = frame.arcs.filter(
        a => a.sourceStateId === activeState.stateId || a.targetStateId === activeState.stateId
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

  private areCompatible(a: ActiveNodeState, b: ActiveNodeState): boolean {
    // Compatibility rules:
    // 1. Same side
    if (a.address.side !== b.address.side) return false;

    // 2. Canonical channel relationship OR the older generic harmonic rules.
    // The previous implementation only allowed opposite/adjacent gates, which
    // excluded real registered channels such as 34-57 before ChannelResolver
    // could ever see them.
    const gateA = a.address.gateLine.gate;
    const gateB = b.address.gateLine.gate;
    const isCanonicalChannel = Boolean(this.channelRegistry.findByGates(gateA, gateB));
    const harmonicGate = ((gateA + 32) % 64) || 64;
    const isHarmonic = gateB === harmonicGate;
    const isComplementary = Math.abs(gateA - gateB) === 1;

    // 3. Phase alignment
    const phaseDiff = Math.abs(a.phase - b.phase);
    const phaseAligned = phaseDiff < Math.PI / 4;

    // 4. Coherence threshold
    const minCoherence = 0.2;

    return (isCanonicalChannel || isHarmonic || isComplementary) && phaseAligned && 
           a.coherence > minCoherence && b.coherence > minCoherence;
  }

  private calculateCoherence(state: RuntimeState): number {
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
  private deriveValue(seed: RuntimeSeed, a: number, b: number): number {
    // Simple deterministic hash from seed + parameters
    const hash = Number(seed.sessionSeed) + a * 31 + b * 17 + seed.eventCounter;
    return (Math.sin(hash) + 1) / 2;  // 0-1
  }
}

export default GraphRuntime;
