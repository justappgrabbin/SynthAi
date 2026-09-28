/**
 * ============================================================
 * ATO ENGINE v2 — Episodic Memory + Semantic Completion
 * Based on: Fayyaz et al. (2022) PMID: 35896150
 * Fixed: deterministic, no random, clean syntax
 * ============================================================
 */
export interface EpisodicTrace {
    id: string;
    contextId: string;
    contextLabel: string;
    discreteCodes: number[];
    codebookSize: number;
    partialObservation: {
        visual?: Float32Array;
        audio?: Float32Array;
        state?: Record<string, any>;
        action?: number;
    };
    missingMask: {
        visual: boolean;
        audio: boolean;
        state: boolean;
    };
    timestamp: number;
    sequenceIndex: number;
    semanticEmbedding: Float32Array;
    attentionLevel: number;
}
export interface EpisodicContext {
    id: string;
    label: string;
    domain: 'fps' | 'rpg' | 'platformer' | 'strategy' | 'puzzle' | 'simulation' | 'custom';
    traces: EpisodicTrace[];
    semanticCentroid: Float32Array;
    codebook: Float32Array[];
    isActive: boolean;
    totalEpisodes: number;
    averageTraceLength: number;
    compressionRatio: number;
}
export interface VQVAEConfig {
    inputResolution: [number, number];
    latentResolution: [number, number];
    numEmbeddings: number;
    embeddingDim: number;
    commitmentCost: number;
}
export declare class VectorQuantizer {
    private config;
    private codebook;
    private codebookUsage;
    constructor(config: VQVAEConfig);
    private initializeCodebook;
    encode(continuousLatent: Float32Array): {
        codes: number[];
        quantized: Float32Array;
    };
    decode(codes: number[]): Float32Array;
    private euclideanDistance;
    getCodebook(): Float32Array[];
}
export declare class PixelCNNGenerator {
    private contextEmbeddings;
    registerContext(contextId: string, embedding: Float32Array): void;
    complete(partialTrace: EpisodicTrace, completionMask: {
        visual: boolean;
        audio: boolean;
        state: boolean;
    }): EpisodicTrace;
    generateFromScratch(contextId: string, seedCodes?: number[]): EpisodicTrace;
    private generateVisual;
    private generateAudio;
    private generateState;
    private sampleCodes;
}
export declare class Hippocampus {
    private contexts;
    private vectorQuantizers;
    private vqConfig;
    constructor(vqConfig?: Partial<VQVAEConfig>);
    createContext(id: string, label: string, domain: EpisodicContext['domain']): EpisodicContext;
    storeTrace(contextId: string, observation: EpisodicTrace['partialObservation'], attentionLevel?: number): EpisodicTrace;
    retrieve(queryEmbedding: Float32Array, contextId?: string, topK?: number): EpisodicTrace[];
    activateContext(contextId: string): void;
    getActiveContext(): EpisodicContext | undefined;
    getContext(id: string): EpisodicContext | undefined;
    getAllContexts(): EpisodicContext[];
    private observationToLatent;
    private computeSemanticEmbedding;
    private updateCentroid;
    private computeCompressionRatio;
    private cosineSimilarity;
}
export declare class Neocortex {
    private hippocampus;
    private pixelCNN;
    constructor(hippocampus: Hippocampus);
    completeTrace(trace: EpisodicTrace): EpisodicTrace;
    generateEpisode(contextId: string, seedCodes?: number[]): EpisodicTrace;
    registerContextEmbedding(contextId: string, embedding: Float32Array): void;
}
export declare class AtoSwitchingLayer {
    private hippocampus;
    private neocortex;
    private activeBlend;
    constructor(hippocampus: Hippocampus, neocortex: Neocortex);
    switchContext(contextId: string): void;
    blendContexts(contextA: string, contextB: string, alpha?: number): void;
    generateNextFrame(previousTrace?: EpisodicTrace): EpisodicTrace;
    getActiveBlend(): {
        contextA: string;
        contextB: string;
        alpha: number;
    } | null;
}
export declare class AutopoieticGenerator {
    private hippocampus;
    private neocortex;
    constructor(hippocampus: Hippocampus, neocortex: Neocortex, _switchingLayer: AtoSwitchingLayer);
    evolveNewSystem(parentContexts: string[], generations?: number): EpisodicContext;
    generateNovelSystem(label: string): EpisodicContext;
    private blendEmbeddings;
    private selectRandomTrace;
    private mutateTrace;
}
export declare class AtoEngine {
    hippocampus: Hippocampus;
    neocortex: Neocortex;
    switchingLayer: AtoSwitchingLayer;
    autopoietic: AutopoieticGenerator;
    constructor(vqConfig?: Partial<VQVAEConfig>);
    learnSystem(id: string, label: string, domain: EpisodicContext['domain']): EpisodicContext;
    storeEpisode(contextId: string, observation: EpisodicTrace['partialObservation'], attentionLevel?: number): EpisodicTrace;
    switchSystem(contextId: string): void;
    generateFrame(previousTrace?: EpisodicTrace): EpisodicTrace;
    blendSystems(contextA: string, contextB: string, alpha?: number): void;
    evolveSystem(parentContexts: string[], generations?: number): EpisodicContext;
    createNovelSystem(label: string): EpisodicContext;
    complete(trace: EpisodicTrace): EpisodicTrace;
    recall(query: Float32Array, contextId?: string, topK?: number): EpisodicTrace[];
    getStats(): {
        totalContexts: number;
        totalTraces: number;
        activeContext: string;
        blend: {
            contextA: string;
            contextB: string;
            alpha: number;
        } | null;
    };
}
export default AtoEngine;
//# sourceMappingURL=ato-engine.d.ts.map