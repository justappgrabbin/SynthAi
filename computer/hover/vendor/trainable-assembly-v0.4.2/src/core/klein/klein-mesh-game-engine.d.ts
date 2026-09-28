/**
 * ============================================================
 * KLEIN-MESH MULTI-GAME ENGINE v2
 * Fixed: DISEMINER directLinks, provenance blending, AUTOLING importRule,
 *        sensory observation ingestion, stray comment characters removed
 * ============================================================
 */
import { StructuredObservation } from './sensory-adapter';
export type GameCode = 'NOUN' | 'VERB' | 'ADJ' | 'ADV' | 'ART' | 'PREP' | 'CONJC' | 'CONJR' | 'PN' | 'AXV' | 'VERB-IS' | '/ING/' | '/ED/' | '/HAVE/' | 'NUM' | 'MISC';
export interface GameElement {
    token: string;
    rawValue: any;
    codes: GameCode[];
    confidence: number;
}
export interface ContextTriad {
    leftCode: GameCode;
    rightCode: GameCode;
    middleCount: number;
    permittedSequences: GameCode[][];
}
export declare class CompGramCoder {
    private contextTriads;
    private functionElements;
    private suffixRules;
    private codeCount;
    constructor();
    private seedFunctionElements;
    private seedSuffixRules;
    classify(element: string, context?: {
        left?: string;
        right?: string;
    }): GameElement;
    private lookupFunctionElement;
    private suffixTest;
    private contextFrameTest;
    private logicalMultiply;
    learnFromSequence(sequence: GameElement[]): void;
    private addTriad;
    getTriadCount(): number;
}
export interface StemEntry {
    stem: string;
    partOfSpeech: number;
    word: string;
    transitive: boolean;
}
export interface DependencyLink {
    from: string;
    to: string;
    transitive: boolean;
    source?: string;
    weight: number;
}
export interface DependencyMatrices {
    T: number[][];
    I: number[][];
    M: number[][];
    dimension: number;
}
export declare class DiseMinerEngine {
    private stemDictionary;
    private directLinks;
    private matrices;
    private stemIndex;
    private nextIndex;
    constructor(initialDimension?: number);
    private createMatrix;
    registerStem(stem: string, pos: number, word: string, transitive: boolean): void;
    /**
     * Add a dependency link to the canonical store.
     * T, I, M are RENDERINGS, not source of truth.
     */
    addLink(from: string, to: string, transitive: boolean, source?: string, weight?: number): void;
    /**
     * Ingest a structured observation from the sensory adapter.
     * DISEMINER now has eyes: it learns from objects, relations, and changes.
     */
    ingestObservation(obs: StructuredObservation, sourceContext?: string): void;
    /**
     * Merge dependency links from another DISEMINER engine.
     * Preserves provenance: each link remembers which game it came from.
     */
    mergeFrom(other: DiseMinerEngine, sourceContext: string, weight?: number): void;
    exportStems(): StemEntry[];
    exportDirectLinks(): DependencyLink[];
    private rebuildMatrices;
    computeTransitiveClosure(): void;
    isPossible(from: string, to: string): boolean;
    getReachable(from: string): string[];
    getDistance(from: string, to: string): number;
    exportMatrices(): {
        T: number[][];
        I: number[][];
        M: number[][];
        stems: string[];
    };
}
export interface GrammarRule {
    id: string;
    lhs: string;
    rhs: string[];
    isRecursive: boolean;
    isSentenceRule: boolean;
    frequency: number;
    sourceContext?: string;
}
export interface IllegalSequence {
    sequence: string[];
    frame: number;
}
export declare class AutolingGrammar {
    private gameName;
    private rules;
    private illegals;
    private currentFrame;
    private recycleDepth;
    private maxRecycleDepth;
    private inputHistory;
    private heuristic1Count;
    private heuristic2Count;
    private heuristic3Count;
    private heuristic4Count;
    constructor(gameName: string);
    heuristic1(sequence: string[]): GrammarRule | null;
    heuristic2(envLeft: string[], envRight: string[], m1: string, m2: string): GrammarRule | null;
    heuristic4(lhs: string, x: string[], a: string, y: string[]): GrammarRule | null;
    /**
     * IMPORT a rule from another grammar with provenance.
     * Preserves frequency, recursive status, and source context.
     * If rule already exists, merges frequencies.
     */
    importRule(rule: GrammarRule, sourceContext: string, weight?: number): void;
    /**
     * Merge all rules from another grammar.
     */
    mergeFrom(other: AutolingGrammar, sourceContext: string, weight?: number): void;
    canYouSay(sequence: string[]): boolean;
    private parse;
    private isNonTerminal;
    informantSaysNo(sequence: string[]): void;
    private recycle;
    learnFromSequence(sequence: string[]): void;
    getRules(): GrammarRule[];
    getStats(): {
        game: string;
        rules: number;
        illegals: number;
        recycles: number;
        heuristics: {
            h1: number;
            h2: number;
            h3: number;
            h4: number;
        };
    };
}
export interface GameAgent {
    id: string;
    age: number;
    status: number;
    grammar: AutolingGrammar;
    recognitionMatrices: DiseMinerEngine;
    generationMatrices: DiseMinerEngine;
    ruleFrequencies: Map<string, number>;
}
export interface StochasticRule {
    description: string;
    probability: number;
    parameter: string;
}
export declare class HistoricalChangeEngine {
    private communitySize;
    private population;
    private time;
    private stochasticRules;
    private conversationLog;
    constructor(communitySize?: number);
    private seedStochasticRules;
    initializePopulation(seedGame: string, seedSequences: string[][]): void;
    private createAgent;
    simulateYear(): void;
    private shouldInteract;
    private shouldBorrowRule;
    private monteCarloDecision;
    private generateSequence;
    private increaseRuleFrequency;
    private borrowRule;
    private handleBirthDeath;
    private takeCensus;
    getPopulation(): GameAgent[];
    getTime(): number;
}
export interface GameContext {
    id: string;
    name: string;
    genre: 'fps' | 'rpg' | 'platformer' | 'strategy' | 'puzzle' | 'simulation';
    coder: CompGramCoder;
    diseMiner: DiseMinerEngine;
    grammar: AutolingGrammar;
    historical: HistoricalChangeEngine;
    vqCodebook: number[];
}
export declare class KleinMeshGameEngine {
    private contexts;
    private activeContext;
    private vqCodebookSize;
    private generationCounter;
    constructor(vqCodebookSize?: number);
    createGame(id: string, name: string, genre: GameContext['genre']): GameContext;
    /**
     * Ingest gameplay data into a game context.
     * Now supports both traditional action/state AND structured observations.
     */
    ingestGameplay(gameId: string, session: {
        frames?: Float32Array[];
        actions?: string[];
        states?: Record<string, any>[];
        observations?: StructuredObservation[];
    }): void;
    switchGame(gameId: string): void;
    generateNextAction(sourceContext?: string): string[];
    isPossible(action: string, target: string, gameId?: string): boolean;
    /**
     * Blend two games into a hybrid using provenance-aware merging.
     */
    blendGames(gameA: string, gameB: string, hybridId: string, alpha?: number): GameContext;
    evolveGame(gameId: string, years?: number): GameContext;
    private compressFrames;
    listGames(): {
        id: string;
        name: string;
        genre: string;
        rules: number;
        vqCodes: number;
        links: number;
    }[];
    getActiveGame(): GameContext | null;
}
export default KleinMeshGameEngine;
//# sourceMappingURL=klein-mesh-game-engine.d.ts.map