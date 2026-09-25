/**
 * SYNTIA RUNTIME — FOUNDATIONAL TYPES
 * 
 * Three coordinate classes:
 *   1. Intrinsic Node Address (persistent identity)
 *   2. Collapse Event (emergent situational geometry)
 *   3. Arc Traversal (message path between states)
 * 
 * Two coupled surfaces: FOUR_SIDE, FIVE_SIDE
 * Ternary emergence from correspondence
 * 
 * Channels at every scale, including hyperchannels
 */

// ============================================================================
// SURFACE TYPES
// ============================================================================

export type SurfaceSide = 'FOUR_SIDE' | 'FIVE_SIDE';

export interface SurfaceState {
  side: SurfaceSide;
  activeStates: Map<string, ActiveNodeState>;
  planetaryPositions: Map<number, PlanetaryPosition>;
}

export interface PlanetaryPosition {
  planet: number;      // 1-13
  degree: number;      // 0-360
  minute: number;      // 0-60
  second: number;      // 0-60
  arcSecond: number;   // 0-99
  velocity: number;    // degrees per timestep
}

export interface TernaryEmergence {
  emergenceId: string;
  fourSideStateIds: string[];
  fiveSideStateIds: string[];
  correspondence: number;      // 0-1, strength of correspondence
  resultingStateIds: string[];
  channels: ChannelActivation[];
  openedAt: number;
  resolvedAt?: number;
}

// ============================================================================
// INTRINSIC NODE ADDRESS (Persistent Identity)
// ============================================================================

export interface GateLineAddress {
  gate: number;   // 1-64
  line: number;   // 1-6
}

export interface IntrinsicAddress {
  side: SurfaceSide;
  planet: number;     // 1-13
  dimension: number;  // 1-5 (Movement, Evolution, Being, Design, Space)
  gateLine: GateLineAddress;
  color: number;      // 1-6
  tone: number;       // 1-6
  base: number;       // 1-5 (CORRECTED: 5 bases, not 6)
}

export interface EncodedIntrinsicAddress {
  low: number;   // 32-bit: gate(6) + line(3) + color(3) + tone(3) + base(3) = 18 bits
  high: number;  // 32-bit: side(1) + planet(4) + dimension(3) = 8 bits
}

export function encodeIntrinsic(addr: IntrinsicAddress): EncodedIntrinsicAddress {
  const g = Math.max(0, Math.min(63, addr.gateLine.gate - 1));
  const l = Math.max(0, Math.min(5, addr.gateLine.line - 1));
  const c = Math.max(0, Math.min(5, addr.color - 1));
  const t = Math.max(0, Math.min(5, addr.tone - 1));
  const b = Math.max(0, Math.min(4, addr.base - 1));  // 5 bases: 0-4

  const low = (g << 12) | (l << 9) | (c << 6) | (t << 3) | b;

  const s = addr.side === 'FIVE_SIDE' ? 1 : 0;
  const p = Math.max(0, Math.min(12, addr.planet - 1));
  const d = Math.max(0, Math.min(4, addr.dimension - 1));

  const high = (s << 7) | (p << 3) | d;

  return { low, high };
}

export function decodeIntrinsic(encoded: EncodedIntrinsicAddress): IntrinsicAddress {
  const low = encoded.low;
  const b = low & 0x7;        // 3 bits
  const t = (low >> 3) & 0x7;  // 3 bits
  const c = (low >> 6) & 0x7;  // 3 bits
  const l = (low >> 9) & 0x7;  // 3 bits
  const g = (low >> 12) & 0x3F; // 6 bits

  const high = encoded.high;
  const d = high & 0x7;        // 3 bits
  const p = (high >> 3) & 0xF;  // 4 bits
  const s = (high >> 7) & 0x1;  // 1 bit

  return {
    side: s === 1 ? 'FIVE_SIDE' : 'FOUR_SIDE',
    planet: p + 1,
    dimension: d + 1,
    gateLine: { gate: g + 1, line: l + 1 },
    color: c + 1,
    tone: t + 1,
    base: b + 1
  };
}

// ============================================================================
// COLLAPSE EVENT (Emergent Situational Geometry)
// ============================================================================

export interface CollapseEvent {
  eventId: string;
  degree: number;        // 0-360 (principal collapse position)
  minute: number;        // 0-60 (refines collapse)
  second: number;        // 0-60 (refines collapse)

  sourceStateIds: string[];
  collapsedGateLine: GateLineAddress;

  color: number;         // 1-6
  tone: number;          // 1-6
  base: number;          // 1-5

  magnitude: number;     // 0-1 (collapse strength)
  timestamp: number;
  deterministicSeed: number;
}

export interface EncodedCollapseEvent {
  degree: number;
  minute: number;
  second: number;
  gateLineCode: number;   // encoded gate-line
}

// ============================================================================
// ARC TRAVERSAL (Message Path)
// ============================================================================

export interface ArcTraversal {
  arcId: string;

  sourceStateId: string;
  targetStateId?: string;

  sourceCollapseId?: string;
  targetCollapseId?: string;

  path: string[];                    // sequence of state IDs traversed
  accumulatedMessages: RuntimeMessage[];

  resonance: number;                 // 0-1
  tension: number;                   // 0-1
  coherence: number;                 // 0-1

  openedAt: number;
  resolvedAt?: number;

  status: 'OPEN' | 'ADVANCING' | 'RESOLVED' | 'EXPIRED';
}

// ============================================================================
// ACTIVE NODE STATE
// ============================================================================

export interface ActiveNodeState {
  stateId: string;
  address: IntrinsicAddress;

  activation: number;     // 0-1
  phase: number;          // 0-2π
  coherence: number;      // 0-1
  tension: number;        // 0-1

  regime: 'STABLE' | 'CHANGING' | 'RESOLVING';

  collapseEventIds: string[];
  outgoingArcIds: string[];
  incomingArcIds: string[];

  createdAt: number;
  lastUpdated: number;
}

// ============================================================================
// MACRO FRAME (Emergent Context)
// ============================================================================

export interface MacroFrame {
  frameId: string;
  side: SurfaceSide;

  zodiac?: number;       // 0-11 (emergent, not derived from phase)
  house?: number;        // 1-12 (emergent, not derived from line)
  season?: number;       // 0-3 (emergent)

  sourceArcIds: string[];
  sourceCollapseIds: string[];
  sourceStateIds: string[];

  confidence: number;    // 0-1 (0 = unresolved)
}

export interface MacroResolutionContext {
  side: SurfaceSide;
  planet: number;
  dimension: number;
  activeStates: ActiveNodeState[];
  arcs: ArcTraversal[];
  collapseEvents: CollapseEvent[];
  crossSurfaceCorrespondence?: TernaryEmergence;
}

export interface MacroFrameResolver {
  resolve(context: MacroResolutionContext): MacroFrame[];
}

// ============================================================================
// RUNTIME MESSAGES
// ============================================================================

export type CapabilityId = string;

export interface RuntimeMessage {
  messageId: string;
  sessionId: string;

  sourceStateId?: string;
  sourceExpressionId?: string;

  targetStateId?: string;
  targetCapability?: CapabilityId;

  intent: string;
  payload: unknown;

  planet: number;
  dimension: number;
  side: SurfaceSide;

  trace: string[];
  ttl: number;           // time-to-live, decrements each hop
}

// ============================================================================
// RUNTIME INTENT & SESSION
// ============================================================================

export interface RuntimeIntent {
  intentId: string;
  description: string;
  side: SurfaceSide;
  planet?: number;
  dimension?: number;
  seed: bigint;
}

export interface RuntimeSession {
  sessionId: string;
  intent: RuntimeIntent;
  seed: RuntimeSeed;
  createdAt: number;
  settledAt?: number;
}

export interface RuntimeSeed {
  sessionSeed: bigint;
  eventCounter: number;
}

export interface RuntimeStepResult {
  stepNumber: number;
  sessionId: string;
  dimensionalStage: number;  // 0-4 (Movement-Evolution-Being-Design-Space)
  activeStates: number;
  openArcs: number;
  activeChannels: number;
  coherence: number;
  messagesProcessed: number;
}

// ============================================================================
// DIMENSIONAL FRAME
// ============================================================================

export interface DimensionalFrame {
  sessionId: string;
  dimension: 1 | 2 | 3 | 4 | 5;  // Movement, Evolution, Being, Design, Space

  activeStates: ActiveNodeState[];
  messages: RuntimeMessage[];
  collapseEvents: CollapseEvent[];
  arcs: ArcTraversal[];
  channelActivations: ChannelActivation[];

  expressionGraph: ExpressionGraph;
}

// ============================================================================
// CHANNEL SYSTEM
// ============================================================================

export type ChannelClass = 
  | 'PLANET_DIMENSION'
  | 'GATE_LINE'
  | 'COLLAPSE'
  | 'REFINEMENT'
  | 'CROSS_REFINEMENT'
  | 'ARC'
  | 'ZODIAC_HOUSE'
  | 'HOUSE_SEASON'
  | 'CROSS_SCALE'
  | 'HYPERCHANNEL';

export interface ChannelDefinition {
  channelId: string;
  name: string;

  gateA?: number;        // for Gate-Line channels
  gateB?: number;

  circuit?: string;      // Understanding, Knowing, Sensing, Integration
  computationalExpression: string;  // neural network mapping

  requiredCapabilities: CapabilityId[];
  activationRules: ChannelActivationRule[];
}

export interface ChannelActivationRule {
  ruleId: string;
  condition: (source: ActiveNodeState, target: ActiveNodeState, arc?: ArcTraversal) => boolean;
  weight: number;
}

export interface ChannelActivation {
  activationId: string;
  definitionId: string;

  sourceStateId: string;
  targetStateId: string;
  arcId?: string;

  coherence: number;
  tension: number;
  expressionStrength: number;

  requiredCapabilities: CapabilityId[];
  deterministicSeed: number;
}

export interface ChannelExpression {
  channelActivationId: string;

  inputPorts: ExpressionPort[];
  outputPorts: ExpressionPort[];

  capabilities: CapabilityId[];
  parameters: Record<string, number | string | boolean>;

  constraints: RuntimeConstraint[];
}

export interface Hyperchannel {
  hyperchannelId: string;
  memberChannelIds: string[];

  relation: string;
  expression: ChannelExpression;

  inputs: ExpressionPort[];
  outputs: ExpressionPort[];

  activation: number;
  coherence: number;
}

// ============================================================================
// EXPRESSION GRAPH
// ============================================================================

export type ArtifactTarget = 
  | 'WEB_APP'
  | 'ANDROID_APP'
  | 'GAME'
  | 'CLI'
  | 'AGENT'
  | 'SIMULATION'
  | 'RESEARCH_PIPELINE'
  | 'ROBOT_CONTROLLER'
  | 'DOCUMENT';

export interface ExpressionGraph {
  graphId: string;
  sessionId: string;

  target?: ArtifactTarget;

  nodes: ExpressionNode[];
  edges: ExpressionEdge[];

  inputs: ExpressionPort[];
  outputs: ExpressionPort[];

  constraints: RuntimeConstraint[];
  provenance: ProvenanceRecord[];

  settled: boolean;
}

export interface ExpressionNode {
  expressionNodeId: string;

  sourceChannelIds: string[];
  sourceStateIds: string[];
  sourceToolIds: string[];

  capabilities: CapabilityId[];

  inputs: ExpressionPort[];
  outputs: ExpressionPort[];

  configuration: Record<string, unknown>;
}

export interface ExpressionEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;

  portMapping: Record<string, string>;
  weight: number;

  channelActivationId?: string;
}

export interface ExpressionPort {
  portId: string;
  nodeId: string;
  name: string;
  type: string;
  value?: unknown;
}

export interface RuntimeConstraint {
  constraintId: string;
  type: string;
  parameters: Record<string, unknown>;
}

export interface ProvenanceRecord {
  recordId: string;
  timestamp: number;

  sourceType: 'INTENT' | 'SUBSTRATE' | 'COLLAPSE' | 'ARC' | 'CHANNEL' | 'TOOL' | 'MATERIALIZER';
  sourceId: string;

  description: string;
  resultingNodeIds: string[];
}

// ============================================================================
// KLEIN TOOL SYSTEM
// ============================================================================

export interface KleinToolAdapter {
  toolId: string;
  name: string;

  provides: CapabilityId[];
  requires: CapabilityId[];

  accepts(expression: ChannelExpression): boolean;
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

export interface ToolExecutionContext {
  sessionId: string;
  expression: ChannelExpression;
  inputValues: Record<string, unknown>;
  runtimeState: RuntimeState;
}

export interface ToolExecutionResult {
  success: boolean;
  outputValues: Record<string, unknown>;
  expressionNodes: ExpressionNode[];
  provenance: ProvenanceRecord[];
}

export interface RuntimeState {
  session: RuntimeSession;
  surfaces: Map<SurfaceSide, SurfaceState>;
  ternaryEmergences: TernaryEmergence[];

  activeNodes: Map<string, ActiveNodeState>;
  collapseEvents: Map<string, CollapseEvent>;
  arcs: Map<string, ArcTraversal>;

  channelActivations: Map<string, ChannelActivation>;
  hyperchannels: Map<string, Hyperchannel>;

  expressionGraph: ExpressionGraph;

  messageBus: RuntimeMessage[];

  seed: RuntimeSeed;
}

// ============================================================================
// ARTIFACT SYSTEM
// ============================================================================

export interface ArtifactPlan {
  planId: string;
  target: ArtifactTarget;

  expressionGraph: ExpressionGraph;

  files: ArtifactFile[];
  dependencies: string[];

  tests: ArtifactTest[];
  provenance: ProvenanceRecord[];
}

export interface ArtifactFile {
  path: string;
  content: string;
  type: string;
}

export interface ArtifactTest {
  testId: string;
  description: string;
  assertion: string;
}

export interface ArtifactResult {
  artifactId: string;
  target: ArtifactTarget;

  files: ArtifactFile[];
  manifest: ArtifactManifest;

  success: boolean;
  errors: string[];
}

export interface ArtifactManifest {
  manifestId: string;
  artifactId: string;

  activatedChannels: string[];
  executedTools: string[];
  expressionNodes: string[];
  materializedFiles: string[];

  provenance: ProvenanceRecord[];
}

export interface ArtifactMaterializer {
  target: ArtifactTarget;

  supports(graph: ExpressionGraph): boolean;
  plan(graph: ExpressionGraph): ArtifactPlan;
  emit(plan: ArtifactPlan): Promise<ArtifactResult>;
}

// ============================================================================
// GAME-SPECIFIC EXPRESSIONS
// ============================================================================

export interface GameExpressionPlan {
  worldGraph: ExpressionGraph;
  entityGraph: ExpressionGraph;
  mechanicGraph: ExpressionGraph;
  narrativeGraph?: ExpressionGraph;
  interfaceGraph: ExpressionGraph;
  persistenceGraph: ExpressionGraph;
}

// ============================================================================
// NEURAL NETWORK MAPPINGS
// ============================================================================

export const NEURAL_NETWORK_MAPPINGS: Record<string, { channel: string; name: string; network: string; circuit: string }> = {
  // Understanding Circuit
  '63-4':   { channel: '63-4',   name: 'Logic',          network: 'Deep Feed Forward Network (DFF)', circuit: 'Understanding' },
  '17-62':  { channel: '17-62',  name: 'Acceptance',     network: 'Restricted Boltzmann Machine (RBM)', circuit: 'Understanding' },
  '18-58':  { channel: '18-58',  name: 'Judgment',       network: 'Hopfield Network', circuit: 'Understanding' },
  '16-48':  { channel: '16-48',  name: 'Wavelength',     network: 'Sparse Autoencoder (SAE)', circuit: 'Understanding' },
  '9-52':   { channel: '9-52',   name: 'Concentration',  network: 'Extreme Learning Machine (ELM)', circuit: 'Understanding' },
  '15-5':   { channel: '15-5',   name: 'Rhythm',         network: 'Kohonen Self-Organizing Map', circuit: 'Understanding' },
  '31-7':   { channel: '31-7',   name: 'Alpha',          network: 'Deep Convolutional Network (DCN)', circuit: 'Understanding' },

  // Knowing Circuit
  '3-60':   { channel: '3-60',   name: 'Mutation',       network: 'Liquid State Machine (LSM)', circuit: 'Knowing' },
  '61-24':  { channel: '61-24',  name: 'Awareness',      network: 'Neural Turing Machine (NTM)', circuit: 'Knowing' },
  '43-23':  { channel: '43-23',  name: 'Structuring',    network: 'Deconvolutional Network', circuit: 'Knowing' },
  '28-38':  { channel: '28-38',  name: 'Struggle',       network: 'Generative Adversarial Network (GAN)', circuit: 'Knowing' },
  '20-57':  { channel: '20-57',  name: 'Brainwave',      network: 'Echo State Network (ESN)', circuit: 'Knowing' },
  '55-39':  { channel: '55-39',  name: 'Emoting',        network: 'Gated Recurrent Unit (GRU)', circuit: 'Knowing' },
  '12-22':  { channel: '12-22',  name: 'Openness',       network: 'Variational Autoencoder (VAE)', circuit: 'Knowing' },
  '2-14':   { channel: '2-14',   name: 'The Beat',       network: 'Radial Basis Function Network (RBF)', circuit: 'Knowing' },
  '8-1':    { channel: '8-1',    name: 'Inspiration',    network: 'Attention Network', circuit: 'Knowing' },

  // Sensing Circuit
  '42-53':  { channel: '42-53',  name: 'Maturation',     network: 'Deep Belief Network (DBN)', circuit: 'Sensing' },

  // Integration
  '34-57':  { channel: '34-57',  name: 'Power',          network: 'LSM + DBN reservoir-guided action', circuit: 'Integration' },
  '10-20':  { channel: '10-20',  name: 'Awakening',      network: 'identity network + ESN/attention expression', circuit: 'Integration' },
  '10-57':  { channel: '10-57',  name: 'Perfected Form', network: 'Capsule-style identity + RBF/ESN intuition', circuit: 'Integration' },
  '20-34':  { channel: '20-34',  name: 'Charisma',       network: 'LSM + policy/action layer', circuit: 'Integration' }
};

/**
 * Resolve hybrid architecture from two channel activations.
 * channelA + channelB → emergent hybrid neural network
 */
export function resolveHybridArchitecture(channelA: string, channelB: string): {
  baseA: string;
  baseB: string;
  hybrid: string;
  description: string;
} {
  const mappingA = NEURAL_NETWORK_MAPPINGS[channelA];
  const mappingB = NEURAL_NETWORK_MAPPINGS[channelB];

  if (!mappingA || !mappingB) {
    return {
      baseA: channelA,
      baseB: channelB,
      hybrid: 'Unknown',
      description: 'One or both channels have no neural mapping'
    };
  }

  const hybrid = `${mappingA.network} + ${mappingB.network}`;

  // Generate description based on circuit combination
  let description = '';
  if (mappingA.circuit === mappingB.circuit) {
    description = `Intra-circuit hybrid: ${mappingA.circuit} circuit combining ${mappingA.name} and ${mappingB.name}`;
  } else {
    description = `Cross-circuit hybrid: ${mappingA.circuit} (${mappingA.name}) + ${mappingB.circuit} (${mappingB.name})`;
  }

  return { baseA: mappingA.network, baseB: mappingB.network, hybrid, description };
}

export default {
  encodeIntrinsic,
  decodeIntrinsic,
  resolveHybridArchitecture,
  NEURAL_NETWORK_MAPPINGS
};
