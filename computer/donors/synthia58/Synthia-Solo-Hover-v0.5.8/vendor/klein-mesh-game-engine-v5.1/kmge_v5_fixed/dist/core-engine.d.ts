/**
 * ============================================================
 * CORE ENGINE v2 — Deterministic Semantic Reconstruction
 *
 * Fixes from v1:
 *   - All Math.random() replaced with deterministic hashing
 *   - Boolean feature vectors derived from content, not noise
 *   - Autoregressive loop ACTUALLY recurses: generate → parse → ingest → reevaluate
 *   - Gap filling produces real code, not TODO stubs
 *   - Clean TypeScript, no compilation errors
 * ============================================================
 */
export interface IngestedSignal {
    id: string;
    raw: string;
    mimeType: string;
    filename: string;
    size: number;
    timestamp: number;
    source: 'file' | 'url' | 'api' | 'stream' | 'git' | 'huggingface';
    metadata: Record<string, any>;
}
export declare class ImpulseIngestor {
    private signalQueue;
    private observers;
    private counter;
    ingest(source: IngestedSignal['source'], payload: string, metadata?: Record<string, any>): Promise<IngestedSignal>;
    private inferMimeType;
    onIngest(callback: (signal: IngestedSignal) => void): void;
    getSignals(): IngestedSignal[];
}
export interface PolarityVector {
    signalId: string;
    isCode: boolean;
    isAsset: boolean;
    isConfig: boolean;
    isDocumentation: boolean;
    isExecutable: boolean;
    isData: boolean;
    language: string | null;
    hasImports: boolean;
    hasExports: boolean;
    hasTypes: boolean;
    hasTests: boolean;
    hasComments: boolean;
    functionalDomain: string[];
    confidence: number;
}
export declare class PolarityClassifier {
    classify(signal: IngestedSignal): PolarityVector;
    private inferDomain;
}
export interface SemanticNode {
    id: string;
    type: 'atom' | 'class' | 'relation' | 'script' | 'operator';
    features: boolean[];
    label: string;
    relations: Map<string, string[]>;
    analogies: AnalogyMapping[];
    depth: number;
}
export interface AnalogyMapping {
    sourceDomain: string;
    targetDomain: string;
    mapping: Map<string, string>;
    strength: number;
    confidence: number;
}
export declare class WitnessEngine {
    private semanticNetwork;
    private analogyGraph;
    private featureDimension;
    constructor();
    private seedBaseOntology;
    private hashFeatures;
    private addRelation;
    private addAnalogy;
    observe(polarity: PolarityVector, signal: IngestedSignal): SemanticNode;
    private polarityToFeatures;
    private simpleHash;
    private findNearestNeighbors;
    private hammingSimilarity;
    private computeDomainOverlap;
    inferByAnalogy(nodeId: string, targetDomain: string): AnalogyMapping | null;
    getNetwork(): Map<string, SemanticNode>;
    getAnalogies(): AnalogyMapping[];
}
export interface GapReport {
    nodeId: string;
    gapType: 'missing_dependency' | 'missing_type' | 'missing_test' | 'missing_doc' | 'missing_config' | 'missing_asset' | 'missing_implementation' | 'semantic_incoherence';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    suggestedFill: string;
    confidence: number;
    relatedNodes: string[];
    triggeringAnalogy?: AnalogyMapping;
}
export interface ContextField {
    nodeId: string;
    incomingRelations: Map<string, string[]>;
    outgoingRelations: Map<string, string[]>;
    depth: number;
    coherence: number;
}
export declare class ContextEngine {
    private witness;
    private contextFields;
    constructor(witness: WitnessEngine);
    buildContext(nodeId: string): ContextField;
    detectGaps(nodeId: string): GapReport[];
}
export interface GeneratedArtifact {
    id: string;
    fillsGap: GapReport;
    content: string;
    filename: string;
    generator: 'template' | 'analogy' | 'inference' | 'hybrid';
    coherence: number;
    novelty: number;
    isFrame: boolean;
    frameIndex?: number;
}
export interface WorldModel {
    nodes: SemanticNode[];
    gaps: GapReport[];
    filled: GeneratedArtifact[];
    emergentProperties: Map<string, any>;
}
export declare class MeaningSynthesizer {
    private witness;
    private context;
    private generationLog;
    constructor(witness: WitnessEngine, context: ContextEngine);
    synthesize(gap: GapReport, sourceContent?: string): GeneratedArtifact;
    private generateDependency;
    private generateTest;
    private generateDoc;
    private generateImplementation;
    private generateBridge;
    private extractImports;
    private extractMethods;
    private inferDependencyFilename;
    autoregressiveRollout(seedNodeId: string, steps: number, sourceContent?: string): GeneratedArtifact[];
    private reingestArtifact;
    buildWorldModel(): WorldModel;
    getGenerationLog(): GeneratedArtifact[];
}
export declare class IngestGapFillEngine {
    private impulse;
    private polarity;
    private witness;
    private context;
    private meaning;
    private ingestedSignals;
    private worldModel;
    constructor();
    private processSignal;
    ingestFile(content: string, filename: string, metadata?: Record<string, any>): Promise<IngestedSignal>;
    synthesize(): WorldModel;
    rollout(seedFilename: string, steps?: number): GeneratedArtifact[];
    rolloutNode(nodeId: string, steps?: number): GeneratedArtifact[];
    query(pattern: string): SemanticNode[];
    getAnalogies(nodeId: string): AnalogyMapping[];
    exportWorldModel(): string;
    getStats(): {
        ingested: number;
        nodes: number;
        analogies: number;
        generated: number;
        worldModel: {
            gaps: number;
            filled: number;
            coverage: any;
        } | null;
    };
}
//# sourceMappingURL=core-engine.d.ts.map