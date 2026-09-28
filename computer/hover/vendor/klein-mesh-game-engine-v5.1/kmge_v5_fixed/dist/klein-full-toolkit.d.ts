/**
 * ============================================================
 * KLEIN FULL TOOLKIT v2 — All 8 Tools on MESSY
 * Fixed: syntax errors, deterministic features, clean imports
 * ============================================================
 */
import { AnalogyMapping } from './core-engine';
export interface MessySymbol {
    id: string;
    type: 'linguistic' | 'semantic' | 'narrative' | 'behavioral' | 'connectionist' | 'archaeological';
    content: any;
    features: boolean[];
    morphState: 'raw' | 'parsed' | 'inferred' | 'generated' | 'simulated' | 'evolved';
    epoch: number;
    connections: Map<string, number>;
}
export interface MessyMorphRule {
    fromType: MessySymbol['type'];
    toType: MessySymbol['type'];
    transform: (symbol: MessySymbol, context: MessyContext) => MessySymbol;
    confidence: number;
    originTool: string;
}
export interface MessyContext {
    neighbors: MessySymbol[];
    currentEpoch: number;
    activeAnalogy?: AnalogyMapping;
    query?: WhoWhatWhereWhenWhy;
}
export interface WhoWhatWhereWhenWhy {
    who?: string;
    what?: string;
    where?: string;
    when?: string;
    why?: string;
    confidence: {
        who: number;
        what: number;
        where: number;
        when: number;
        why: number;
    };
}
export interface MessyModule {
    name: string;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol | Promise<MessySymbol>;
}
export declare class MessySubstrate {
    private symbols;
    private morphRules;
    private featureDimension;
    private epochCounter;
    private modules;
    constructor();
    private seedMorphRules;
    private morphToSemantic;
    private morphToBehavioral;
    private morphToNarrative;
    private morphToConnectionist;
    private morphToArchaeological;
    private morphToLinguistic;
    private tokenize;
    private buildCooccurrence;
    private inferField;
    private extractBehavioralRules;
    private generateNarrativeFromRules;
    private mapToProppFunction;
    private extractMythemes;
    private narrativeToWeights;
    private weightsToHistoricalLayer;
    private semanticToText;
    private computeSemanticFeatures;
    private computeBehavioralFeatures;
    private computeNarrativeFeatures;
    private computeConnectionistFeatures;
    private computeArchaeologicalFeatures;
    private computeLinguisticFeatures;
    ingest(id: string, content: any, type?: MessySymbol['type']): MessySymbol;
    morph(symbolId: string, targetType: MessySymbol['type'], context?: Partial<MessyContext>): MessySymbol;
    morphChain(symbolId: string, targetTypes: MessySymbol['type'][]): MessySymbol;
    query5W(symbolId: string): WhoWhatWhereWhenWhy;
    private extractAgent;
    private extractAction;
    private extractLocation;
    private extractTime;
    private extractCause;
    simulateEpochs(symbolId: string, epochs: number): MessySymbol[];
    private mutateSymbol;
    registerModule(name: string, module: MessyModule): void;
    getModule(name: string): MessyModule | undefined;
    private getNeighbors;
    private featureSimilarity;
    getSymbol(id: string): MessySymbol | undefined;
    getAllSymbols(): MessySymbol[];
    getStats(): {
        symbols: number;
        morphRules: number;
        modules: number;
        currentEpoch: number;
    };
}
export declare class DiseMinerModule implements MessyModule {
    name: string;
    private messy;
    private vocabulary;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    infer(word: string): {
        synonyms: string[];
        related: string[];
    };
    private computeOverlap;
}
export declare class AutolingModule implements MessyModule {
    name: string;
    private messy;
    private grammars;
    attachToMessy(messy: MessySubstrate): void;
    private seedGrammars;
    process(symbolId: string): MessySymbol;
    ask5W(symbolId: string): WhoWhatWhereWhenWhy;
}
export declare class AutoNovelModule implements MessyModule {
    name: string;
    private messy;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    writeCodeAsNarrative(requirements: string): string;
    private decomposeIntoChapters;
    private generateSetup;
    private generateHeroClass;
    private generateErrorHandling;
    private generateMainLogic;
    private generateOutput;
}
export declare class ProppLeviStraussModule implements MessyModule {
    name: string;
    private messy;
    private functions;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    generateFolktale(theme: string, length?: number): {
        functions: any[];
        mythemes: any[];
    };
    private selectFunctionsByTheme;
    private extractMythemes;
}
export declare class AnalogyMysticismModule implements MessyModule {
    name: string;
    private messy;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    computeAnalogy(a: boolean[], b: boolean[], c: boolean[]): boolean[];
    findCrossDomainAnalogy(domainA: Map<string, boolean[]>, domainB: Map<string, boolean[]>): AnalogyMapping | null;
    private similarity;
}
export declare class HistoricalChangeModule implements MessyModule {
    name: string;
    private messy;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    simulateChange(initialSymbol: MessySymbol, generations: number, mutationRate?: number): MessySymbol[];
}
export declare class CreativityModule implements MessyModule {
    name: string;
    private messy;
    attachToMessy(messy: MessySubstrate): void;
    process(symbolId: string): MessySymbol;
    synthesizeCreativity(sourceDomain: Map<string, boolean[]>, targetDomain: Map<string, boolean[]>): Map<string, boolean[]>;
}
export declare class KleinEngine {
    messy: MessySubstrate;
    diseMiner: DiseMinerModule;
    autoling: AutolingModule;
    autoNovel: AutoNovelModule;
    proppLevi: ProppLeviStraussModule;
    analogy: AnalogyMysticismModule;
    historical: HistoricalChangeModule;
    creativity: CreativityModule;
    constructor();
    process(text: string, id?: string): Promise<MessySymbol>;
    ask5W(symbolId: string): WhoWhatWhereWhenWhy;
    writeCode(requirements: string): string;
    tellStory(theme: string, length?: number): {
        functions: any[];
        mythemes: any[];
    };
    analogize(domainA: Map<string, boolean[]>, domainB: Map<string, boolean[]>): AnalogyMapping | null;
    create(source: Map<string, boolean[]>, target: Map<string, boolean[]>): Map<string, boolean[]>;
    evolve(symbolId: string, generations: number): MessySymbol[];
    getStats(): {
        messy: {
            symbols: number;
            morphRules: number;
            modules: number;
            currentEpoch: number;
        };
        modules: string[];
    };
}
export default KleinEngine;
//# sourceMappingURL=klein-full-toolkit.d.ts.map