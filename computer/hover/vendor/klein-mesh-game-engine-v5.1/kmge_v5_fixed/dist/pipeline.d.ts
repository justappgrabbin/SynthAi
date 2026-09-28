/**
 * ============================================================
 * PIPELINE v5 — Fixed: recursive seed bug, exports, sensory integration
 * ============================================================
 */
import { WorldModel, GeneratedArtifact, IngestedSignal, SemanticNode } from './core-engine';
import { WhoWhatWhereWhenWhy, MessySymbol } from './klein-full-toolkit';
import { EpisodicTrace, EpisodicContext } from './ato-engine';
import { KleinMeshGameEngine, GameContext } from './klein-mesh-game-engine';
import { SensoryInputAdapter, StructuredObservation } from './sensory-adapter';
export interface PipelineConfig {
    maxFileSize: number;
    allowedExtensions: string[];
    recursive: boolean;
    narrativeLength: number;
    narrativeMorphology: 'linear' | 'circular' | 'branching' | 'networked';
    autoFill: boolean;
    fillSeverity: ('critical' | 'warning' | 'info')[];
    outputDir: string;
    verbose: boolean;
    messyFeatureDimension: number;
    messyMutationRate: number;
    autoNovelMode: 'fiction' | 'code' | 'technical_doc' | 'game_design';
    vqCodebookSize: number;
    vqEmbeddingDim: number;
    enableAto: boolean;
    enableKleinMesh: boolean;
}
export declare const DEFAULT_CONFIG: PipelineConfig;
export declare class IngestGapFillPipeline {
    private engine;
    private klein;
    private ato;
    private kleinMesh;
    private sensory;
    private config;
    private logs;
    private allSignals;
    constructor(config?: Partial<PipelineConfig>);
    initialize(): Promise<void>;
    private logEntry;
    ingestFile(filePath: string, content: string | Uint8Array): Promise<{
        signal: IngestedSignal;
        messySymbol: MessySymbol;
        fiveW: WhoWhatWhereWhenWhy;
    }>;
    private log5W;
    ingestDirectory(dirPath: string, files: Record<string, string>): Promise<{
        signal: IngestedSignal;
        messySymbol: MessySymbol;
        fiveW: WhoWhatWhereWhenWhy;
    }[]>;
    /**
     * Feed a structured observation from the sensory adapter into DISEMINER.
     * DISEMINER now has eyes: it learns objects, relations, and changes.
     */
    ingestObservation(gameId: string, observation: StructuredObservation): void;
    /**
     * Create a perception from raw sensor data and feed it into the mesh.
     */
    perceive(gameId: string, inputs: Parameters<SensoryInputAdapter['createPerceptionFromSensors']>[0]): {
        smell?: import("./sensory-adapter").RawMeasurement;
        taste?: import("./sensory-adapter").RawMeasurement;
        touch?: import("./sensory-adapter").RawMeasurement;
        sight?: StructuredObservation;
        hearing?: import("./sensory-adapter").RawMeasurement;
    };
    morphSymbol(symbolId: string): MessySymbol;
    morphThroughTime(symbolId: string, epochs?: number): MessySymbol[];
    synthesize(): WorldModel;
    fillAllGaps(): GeneratedArtifact[];
    writeCode(requirements: string): string;
    tellStory(theme: string, length?: number): string;
    private renderFolktale;
    createGame(id: string, name: string, genre: GameContext['genre']): GameContext;
    ingestGameplay(gameId: string, session: Parameters<KleinMeshGameEngine['ingestGameplay']>[1]): void;
    switchGame(gameId: string): void;
    blendGames(gameA: string, gameB: string, hybridId: string, alpha?: number): GameContext;
    isPossible(action: string, target: string, gameId?: string): boolean;
    evolveGame(gameId: string, years?: number): GameContext;
    listGames(): {
        id: string;
        name: string;
        genre: string;
        rules: number;
        vqCodes: number;
        links: number;
    }[];
    learnGame(id: string, label: string, domain: 'fps' | 'rpg' | 'platformer' | 'strategy' | 'puzzle' | 'simulation'): EpisodicContext;
    storeEpisode(gameId: string, frameData: Float32Array, gameState: Record<string, any>, action: number, attentionLevel?: number): EpisodicTrace;
    switchAtoGame(gameId: string): void;
    generateGameFrame(previousTrace?: EpisodicTrace): EpisodicTrace;
    completeTrace(trace: EpisodicTrace): EpisodicTrace;
    query(pattern: string): SemanticNode[];
    ask5W(symbolId: string): WhoWhatWhereWhenWhy;
    getStats(): {
        ato: {
            totalContexts: number;
            totalTraces: number;
            activeContext: string;
            blend: {
                contextA: string;
                contextB: string;
                alpha: number;
            } | null;
        } | undefined;
        kleinMesh: {
            id: string;
            name: string;
            genre: string;
            rules: number;
            vqCodes: number;
            links: number;
        }[] | undefined;
        autoNovelMode: "code" | "fiction" | "technical_doc" | "game_design";
        logEntries: number;
        messy: {
            symbols: number;
            morphRules: number;
            modules: number;
            currentEpoch: number;
        };
        modules: string[];
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
    exportWorldModel(): string;
    getLogs(): string[];
}
export declare function demo(): Promise<{
    world: WorldModel;
    fills: GeneratedArtifact[];
    stats: {
        ato: {
            totalContexts: number;
            totalTraces: number;
            activeContext: string;
            blend: {
                contextA: string;
                contextB: string;
                alpha: number;
            } | null;
        } | undefined;
        kleinMesh: {
            id: string;
            name: string;
            genre: string;
            rules: number;
            vqCodes: number;
            links: number;
        }[] | undefined;
        autoNovelMode: "code" | "fiction" | "technical_doc" | "game_design";
        logEntries: number;
        messy: {
            symbols: number;
            morphRules: number;
            modules: number;
            currentEpoch: number;
        };
        modules: string[];
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
}>;
export default IngestGapFillPipeline;
//# sourceMappingURL=pipeline.d.ts.map