// ============================================================================
// IsoHuman Vector Mapping — Core Data Models
// ============================================================================

export type ProvenanceCategory =
  | "native"
  | "interpretive"
  | "derived_operator"
  | "external_adapter"
  | "experimental"
  | "observed";

export interface ProvenanceRecord {
  id: string;
  category: ProvenanceCategory;
  source: string;
  description: string;
  timestamp: string;
  verifiedBy?: string;
}

export interface StructuralAddress {
  dimension: string;
  planet?: string;
  gate?: number;
  line?: number;
  color?: number;
  tone?: number;
  base?: number;
  binaryCoordinates?: number[];
  customCoordinates?: Record<string, string | number | boolean>;
}

export interface NodeName {
  value: string;
  language?: string;
  role: "primary" | "historical" | "translation" | "alias" | "operational";
  confidence: number;
  provenanceId?: string;
}

export interface StructuralSupport {
  addressSupport: number;
  neighborSupport: number;
  contrastSupport: number;
  transitionSupport: number;
  historicalSupport: number;
  observationalSupport: number;
  totalScore: number;
}

export interface SemanticItem {
  id: string;
  term: string;
  description?: string;
  weight: number;
  confidence: number;
  status: "candidate" | "central" | "supporting" | "peripheral" | "rejected";
  contexts: string[];
  sourceIds: string[];
  structuralSupport: StructuralSupport;
}

export interface SemanticExample {
  id: string;
  text: string;
  context: string;
  sourceId: string;
  timestamp: string;
}

export interface SemanticRevision {
  id: string;
  semanticItemId: string;
  previousWeight: number;
  newWeight: number;
  reason: string;
  evidenceIds: string[];
  timestamp: string;
}

export interface SemanticField {
  center: SemanticItem[];
  central: SemanticItem[];
  peripheral: SemanticItem[];
  rejected: SemanticItem[];
  examples: SemanticExample[];
  revisionHistory: SemanticRevision[];
  centroid?: number[];
  coherenceScore: number;
}

export interface CorrelativeNode {
  id: string;
  index: number;
  binaryPattern: string;
  address: StructuralAddress;
  names: NodeName[];
  semanticField: SemanticField;
  relationIds: string[];
  incomingTransitionIds: string[];
  outgoingTransitionIds: string[];
  provenance: ProvenanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CorrelativeRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type:
    | "neighbor"
    | "contrast"
    | "inverse"
    | "opposite"
    | "resonance"
    | "correspondence"
    | "contains"
    | "contained_by"
    | "derived_from"
    | "external_mapping";
  dimension?: string;
  weight: number;
  bidirectional: boolean;
  provenance: ProvenanceRecord[];
}

export interface ContrastRelation {
  sourceNodeId: string;
  targetNodeId: string;
  axis: string;
  distinction: string;
  weight: number;
}

export interface ExplanationStep {
  step: number;
  operation: string;
  input: unknown;
  output: unknown;
  ruleId?: string;
  confidence: number;
}

export interface TransitionMeaning {
  rootMeaning: string[];
  operatorMeaning: string[];
  resultantMeaning: string[];
  interpolatedMeaning: string[];
  confidence: number;
  explanationTrace: ExplanationStep[];
}

export interface CorrelativeTransition {
  id: string;
  rootNodeId: string;
  resultantNodeId: string;
  operatorType:
    | "evolution"
    | "combination"
    | "sequence"
    | "cycle"
    | "substitution"
    | "transposition"
    | "permutation"
    | "interpolation";
  changedDimensions: string[];
  preservedDimensions: string[];
  operationData: Record<string, unknown>;
  semanticInterpretation?: TransitionMeaning;
  reciprocalTransitionId?: string;
  provenance: ProvenanceRecord[];
}

export interface DimensionValue {
  id: string;
  value: string | number;
  label: string;
  description?: string;
}

export interface DimensionDefinition {
  id: string;
  name: string;
  category: ProvenanceCategory;
  description: string;
  values: DimensionValue[];
  dependencies: string[];
  incompatibleWith: string[];
  verificationStatus: "unverified" | "partially_verified" | "verified" | "rejected";
  provenance: ProvenanceRecord[];
}

export interface Observation {
  id: string;
  nodeId?: string;
  transitionId?: string;
  source: string;
  content: string;
  context: string;
  timestamp: string;
  provenance: ProvenanceRecord[];
}

export interface EvaluationResult {
  decision: "promote" | "retain" | "demote" | "reject" | "insufficient_evidence";
  previousScore?: number;
  newScore: number;
  supportBreakdown: StructuralSupport;
  explanationTrace: ExplanationStep[];
}

export type CircuitFamily =
  | "understanding"
  | "sensing"
  | "knowing"
  | "integration"
  | "centering"
  | "ego_defense";

export type NodeRegime =
  | "latent"
  | "stable"
  | "activated"
  | "changing"
  | "critical"
  | "settling";

export interface ActivationRecord {
  timestamp: string;
  activation: number;
  tension: number;
  regime: NodeRegime;
  triggeredBy: string;
}

export interface ObserverContext {
  id: string;
  perspective: string;
  scale: number;
  dimensions: string[];
  timestamp: string;
}

export interface ResonanceNode {
  id: string;
  operators: {
    being: number;
    design: number;
    movement: number;
    evolution: number;
    space: number;
  };
  binaryState: 0 | 1;
  lines: [0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1];
  activeLine: 1 | 2 | 3 | 4 | 5 | 6;
  regime: NodeRegime;
  tension: number;
  activation: number;
  attractorWeight: number;
  memoryGravity: number;
  recursionDepth: number;
  circuitFamily?: CircuitFamily;
  channelModes: string[];
  observerContext: ObserverContext;
  activationHistory: ActivationRecord[];
  semanticState: SemanticField;
  provenance: ProvenanceRecord[];
}

export interface WeightedCorrespondence {
  sourceId: string;
  targetId: string;
  relation: string;
  context: string[];
  weight: number;
  confidence: number;
  provenance: ProvenanceRecord[];
}

export interface ChannelAdapter {
  id: string;
  sourceMode: string;
  targetMode: string;
  operations: Array<
    | "normalize"
    | "buffer"
    | "encode"
    | "decode"
    | "project"
    | "gate"
    | "synchronize"
    | "regulate_tension"
    | "map_salience"
  >;
  temporary: boolean;
  activationThreshold: number;
  provenance: ProvenanceRecord[];
}

export interface RouteSuppression {
  routeId: string;
  reason: string;
  alternativeRouteId?: string;
}

export interface MonopoleDecision {
  selectedNodeIds: string[];
  selectedChannelIds: string[];
  activatedAdapterIds: string[];
  dominantAttractorIds: string[];
  suppressedRoutes: RouteSuppression[];
  coherenceScore: number;
  decisionTrace: ExplanationStep[];
}

export interface MCPToolDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  executionLocation: "local" | "peer" | "remote";
  permissions: string[];
  trustLevel: number;
  enabled: boolean;
}

export interface MCPExecutionRequest {
  id: string;
  intentionId: string;
  toolId: string;
  input: Record<string, unknown>;
  requestingNodeIds: string[];
  observerContext: ObserverContext;
  permissionScope: string[];
  provenance: ProvenanceRecord[];
}

export interface MCPExecutionResult {
  requestId: string;
  status: "completed" | "failed" | "denied" | "partial";
  output?: unknown;
  error?: string;
  observations: Observation[];
  auditTrace: ExplanationStep[];
}

export interface RelationalPattern {
  nodes: string[];
  relations: string[];
  constraints: string[];
}

export interface SymbolicOperation {
  type: string;
  parameters: Record<string, unknown>;
}

export interface RuleConstraint {
  type: string;
  value: unknown;
}

export interface RuleException {
  condition: string;
  handling: string;
}

export interface InducedRule {
  id: string;
  inputPattern: RelationalPattern;
  transformation: SymbolicOperation;
  outputPattern: RelationalPattern;
  constraints: RuleConstraint[];
  exceptions: RuleException[];
  supportExampleIds: string[];
  counterexampleIds: string[];
  confidence: number;
  status: "candidate" | "provisional" | "validated" | "revised" | "rejected";
  provenance: ProvenanceRecord[];
  explanationTrace: ExplanationStep[];
}

export interface GenerationRequest {
  sourceStateIds: string[];
  targetIntent: string;
  observerContext: ObserverContext;
  allowedRuleIds?: string[];
  requiredSemanticConstraints?: string[];
  forbiddenTransformations?: string[];
  noveltyLevel: "conservative" | "compositional" | "exploratory";
}

export interface GenerationResult {
  output: string;
  sourceStates: string[];
  rulesUsed: string[];
  transformationsUsed: string[];
  inferredRelations: string[];
  unresolvedAmbiguities: string[];
  structuralValidity: number;
  semanticCoherence: number;
  noveltyScore: number;
  explanationTrace: ExplanationStep[];
}

export interface TextAddress {
  stateId: string;
  section:
    | "name"
    | "root_text"
    | "line_text"
    | "judgment_commentary"
    | "overall_image"
    | "line_image"
    | "appended_phrases"
    | "sequence_commentary"
    | "assorted_commentary"
    | "wenyan"
    | "manuscript_variant";
  line?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  tokenIndex?: number;
}

export interface DictionaryReference {
  dictionaryId: string;
  entryNumber: string;
  page?: string;
}

export interface TranslationCandidate {
  value: string;
  relationToContext:
    | "interchangeable"
    | "syntactic_alternative"
    | "modifier"
    | "inferred"
    | "explanatory"
    | "anachronistic";
  confidence: number;
  supportingOccurrenceIds: string[];
  conflictingOccurrenceIds: string[];
}

export interface GrammaticalCandidate {
  role: string;
  confidence: number;
  explanation?: string;
}

export interface CorpusToken {
  id: string;
  sourceCharacter: string;
  transliteration: string;
  pronunciation?: string[];
  dictionaryReferences: DictionaryReference[];
  radical?: number;
  additionalStrokes?: number;
  occurrenceAddress: TextAddress;
  firstOccurrenceAddress: TextAddress;
  nextOccurrenceAddress?: TextAddress;
  frequency: number;
  hapax: boolean;
  translationCandidates: TranslationCandidate[];
  grammaticalCandidates: GrammaticalCandidate[];
  provenance: ProvenanceRecord[];
}

export interface ParseHypothesis {
  id: string;
  sourceSpanIds: string[];
  boundaryType: "phrase" | "clause" | "sentence" | "paragraph";
  confidence: number;
  source: string;
  explanation?: string;
}

export interface ConcordanceEdge {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  type:
    | "same_character"
    | "same_phrase"
    | "possible_same_sense"
    | "different_sense"
    | "grammatical_parallel"
    | "quoted_from"
    | "commentary_on";
  weight: number;
  explanationTrace: ExplanationStep[];
}

export interface SenseResolution {
  selectedCandidates: TranslationCandidate[];
  rejectedCandidates: TranslationCandidate[];
  unresolvedCandidates: TranslationCandidate[];
  confidence: number;
  explanationTrace: ExplanationStep[];
}

export interface UnifiedFieldState {
  timestamp: string;
  nodes: Map<string, ResonanceNode>;
  activeAttractors: string[];
  coherenceScore: number;
  operatorProjections: {
    being: number;
    design: number;
    movement: number;
    evolution: number;
    space: number;
  };
}
