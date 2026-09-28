/**
 * ============================================================
 * KLEIN FULL TOOLKIT v2 — All 8 Tools on MESSY
 * Fixed: syntax errors, deterministic features, clean imports
 * ============================================================
 */

import { SemanticNode, AnalogyMapping } from './core-engine';

// ═══════════════════════════════════════════════════════════
// MESSY: META-SYMBOLIC SIMULATION SYSTEM
// The morphing substrate
// ═══════════════════════════════════════════════════════════

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
  confidence: { who: number; what: number; where: number; when: number; why: number };
}

export interface MessyModule {
  name: string;
  attachToMessy(messy: MessySubstrate): void;
  process(symbolId: string): MessySymbol | Promise<MessySymbol>;
}

export class MessySubstrate {
  private symbols: Map<string, MessySymbol> = new Map();
  private morphRules: MessyMorphRule[] = [];
  private featureDimension = 256;
  private epochCounter = 0;
  private modules: Map<string, MessyModule> = new Map();

  constructor() {
    this.seedMorphRules();
  }

  private seedMorphRules() {
    this.morphRules.push({
      fromType: 'linguistic',
      toType: 'semantic',
      transform: (sym, ctx) => this.morphToSemantic(sym, ctx),
      confidence: 0.85,
      originTool: 'DISEMINER',
    });
    this.morphRules.push({
      fromType: 'semantic',
      toType: 'behavioral',
      transform: (sym, ctx) => this.morphToBehavioral(sym, ctx),
      confidence: 0.78,
      originTool: 'AUTOLING',
    });
    this.morphRules.push({
      fromType: 'behavioral',
      toType: 'narrative',
      transform: (sym, ctx) => this.morphToNarrative(sym, ctx),
      confidence: 0.82,
      originTool: 'AutoNovel',
    });
    this.morphRules.push({
      fromType: 'narrative',
      toType: 'connectionist',
      transform: (sym, ctx) => this.morphToConnectionist(sym, ctx),
      confidence: 0.71,
      originTool: 'MESSY',
    });
    this.morphRules.push({
      fromType: 'connectionist',
      toType: 'archaeological',
      transform: (sym, ctx) => this.morphToArchaeological(sym, ctx),
      confidence: 0.65,
      originTool: 'Historical',
    });
    this.morphRules.push({
      fromType: 'semantic',
      toType: 'linguistic',
      transform: (sym, ctx) => this.morphToLinguistic(sym, ctx),
      confidence: 0.8,
      originTool: 'AUTOLING',
    });
  }

  private morphToSemantic(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const text = String(sym.content);
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const cooccurrence = this.buildCooccurrence(tokens);
    return {
      ...sym,
      type: 'semantic',
      content: { tokens, cooccurrence, field: this.inferField(tokens) },
      morphState: 'inferred',
      features: this.computeSemanticFeatures(tokens, cooccurrence),
    };
  }

  private morphToBehavioral(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const semantic = sym.content as any;
    const rules = this.extractBehavioralRules(semantic);
    return {
      ...sym,
      type: 'behavioral',
      content: rules,
      morphState: 'parsed',
      features: this.computeBehavioralFeatures(rules),
    };
  }

  private morphToNarrative(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const rules = sym.content as any[];
    const narrative = this.generateNarrativeFromRules(rules, ctx);
    return {
      ...sym,
      type: 'narrative',
      content: narrative,
      morphState: 'generated',
      features: this.computeNarrativeFeatures(narrative),
    };
  }

  private morphToConnectionist(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const narrative = sym.content as any;
    const weights = this.narrativeToWeights(narrative);
    return {
      ...sym,
      type: 'connectionist',
      content: weights,
      morphState: 'simulated',
      features: this.computeConnectionistFeatures(weights),
    };
  }

  private morphToArchaeological(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const weights = sym.content as Float32Array;
    const layer = this.weightsToHistoricalLayer(weights, ctx.currentEpoch);
    return {
      ...sym,
      type: 'archaeological',
      content: layer,
      morphState: 'evolved',
      epoch: ctx.currentEpoch - 1,
      features: this.computeArchaeologicalFeatures(layer),
    };
  }

  private morphToLinguistic(sym: MessySymbol, ctx: MessyContext): MessySymbol {
    const semantic = sym.content as any;
    const text = this.semanticToText(semantic);
    return {
      ...sym,
      type: 'linguistic',
      content: text,
      morphState: 'generated',
      features: this.computeLinguisticFeatures(text),
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1);
  }

  private buildCooccurrence(tokens: string[]): Map<string, number> {
    const cooc = new Map<string, number>();
    const window = 5;
    for (let i = 0; i < tokens.length; i++) {
      for (let j = Math.max(0, i - window); j < Math.min(tokens.length, i + window + 1); j++) {
        if (i !== j) {
          const pair = `${tokens[i]}::${tokens[j]}`;
          cooc.set(pair, (cooc.get(pair) || 0) + 1);
        }
      }
    }
    return cooc;
  }

  private inferField(tokens: string[]): string {
    const domains = new Map<string, string[]>();
    domains.set('game', ['game', 'engine', 'render', 'physics', 'player', 'level', 'sprite']);
    domains.set('code', ['function', 'class', 'import', 'export', 'return', 'const', 'let']);
    domains.set('narrative', ['story', 'hero', 'villain', 'quest', 'magic', 'journey']);
    domains.set('system', ['server', 'client', 'api', 'database', 'request', 'response']);

    let bestDomain = 'general';
    let bestScore = 0;
    for (const [domain, words] of domains) {
      const score = tokens.filter((t) => words.includes(t)).length;
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain;
      }
    }
    return bestDomain;
  }

  private extractBehavioralRules(semantic: any): any[] {
    const rules: any[] = [];
    if (semantic.cooccurrence) {
      for (const [pair, count] of semantic.cooccurrence) {
        if (count > 2) {
          const [a, b] = pair.split('::');
          rules.push({ condition: a, action: b, strength: count });
        }
      }
    }
    return rules;
  }

  private generateNarrativeFromRules(rules: any[], ctx: MessyContext): any {
    const sequence = rules
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 8)
      .map((r, i) => ({
        step: i + 1,
        function: this.mapToProppFunction(r.condition, r.action),
        condition: r.condition,
        action: r.action,
        strength: r.strength,
      }));
    return { sequence, morphology: 'linear', mythemes: this.extractMythemes(rules) };
  }

  private mapToProppFunction(condition: string, action: string): string {
    const map: Record<string, string> = {
      depart: 'DEPARTURE', leave: 'DEPARTURE', go: 'DEPARTURE',
      villain: 'VILLAINY', attack: 'VILLAINY', harm: 'VILLAINY',
      help: 'DONOR_FUNCTION', give: 'DONOR_FUNCTION', gift: 'DONOR_FUNCTION',
      fight: 'STRUGGLE', battle: 'STRUGGLE', defeat: 'VICTORY',
      return: 'RETURN', home: 'RETURN', back: 'RETURN',
      marry: 'WEDDING', love: 'WEDDING', union: 'WEDDING',
    };
    return map[condition] || map[action] || 'MEDIATION';
  }

  private extractMythemes(rules: any[]): { concept: string; value: number }[] {
    const mythemes = new Map<string, number>();
    for (const r of rules) {
      mythemes.set(r.condition, (mythemes.get(r.condition) || 0) + r.strength);
      mythemes.set(r.action, (mythemes.get(r.action) || 0) - r.strength * 0.5);
    }
    return Array.from(mythemes.entries()).map(([c, v]) => ({ concept: c, value: v }));
  }

  private narrativeToWeights(narrative: any): Float32Array {
    const weights = new Float32Array(this.featureDimension);
    for (let i = 0; i < this.featureDimension; i++) {
      weights[i] = Math.sin(i * 0.1 + (narrative.sequence?.length || 0)) * 0.5;
    }
    return weights;
  }

  private weightsToHistoricalLayer(weights: Float32Array, epoch: number): any {
    return {
      epoch,
      pattern: Array.from(weights).map((w) => (w > 0 ? '1' : '0')).join(''),
      complexity: weights.filter((w) => Math.abs(w) > 0.1).length / weights.length,
      depth: Math.abs(epoch),
    };
  }

  private semanticToText(semantic: any): string {
    return `Generated from semantic field "${semantic.field || 'unknown'}" with ${semantic.tokens?.length || 0} tokens.`;
  }

  private computeSemanticFeatures(tokens: string[], cooccurrence: Map<string, number>): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[0] = tokens.length > 100;
    f[1] = cooccurrence.size > 50;
    f[2] = new Set(tokens).size / Math.max(tokens.length, 1) > 0.5;
    return f;
  }

  private computeBehavioralFeatures(rules: any[]): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[3] = rules.length > 5;
    f[4] = rules.some((r: any) => r.strength > 10);
    return f;
  }

  private computeNarrativeFeatures(narrative: any): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[5] = narrative.sequence?.length > 5;
    f[6] = narrative.morphology === 'linear';
    f[7] = narrative.mythemes?.length > 3;
    return f;
  }

  private computeConnectionistFeatures(weights: Float32Array): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[8] = weights.some((w) => Math.abs(w) > 0.8);
    f[9] = weights.filter((w) => w > 0).length > weights.length / 2;
    return f;
  }

  private computeArchaeologicalFeatures(layer: any): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[10] = layer.complexity > 0.5;
    f[11] = layer.depth > 5;
    return f;
  }

  private computeLinguisticFeatures(text: string): boolean[] {
    const f = new Array(this.featureDimension).fill(false);
    f[12] = text.length > 500;
    f[13] = /\./.test(text);
    f[14] = /\?/.test(text);
    return f;
  }

  ingest(id: string, content: any, type: MessySymbol['type'] = 'linguistic'): MessySymbol {
    const symbol: MessySymbol = {
      id,
      type,
      content,
      features: new Array(this.featureDimension).fill(false),
      morphState: 'raw',
      epoch: this.epochCounter,
      connections: new Map(),
    };
    this.symbols.set(id, symbol);
    return symbol;
  }

  morph(symbolId: string, targetType: MessySymbol['type'], context?: Partial<MessyContext>): MessySymbol {
    const symbol = this.symbols.get(symbolId);
    if (!symbol) throw new Error(`Symbol ${symbolId} not found`);

    const ctx: MessyContext = {
      neighbors: this.getNeighbors(symbolId),
      currentEpoch: this.epochCounter,
      ...context,
    };

    const rule = this.morphRules.find((r) => r.fromType === symbol.type && r.toType === targetType);
    if (!rule) {
      throw new Error(`No morph rule from ${symbol.type} to ${targetType}`);
    }

    const morphed = rule.transform(symbol, ctx);
    this.symbols.set(morphed.id, morphed);

    for (const neighbor of ctx.neighbors) {
      const strength = this.featureSimilarity(morphed.features, neighbor.features);
      morphed.connections.set(neighbor.id, strength);
      neighbor.connections.set(morphed.id, strength);
    }

    return morphed;
  }

  morphChain(symbolId: string, targetTypes: MessySymbol['type'][]): MessySymbol {
    let current = this.symbols.get(symbolId)!;
    for (const targetType of targetTypes) {
      current = this.morph(current.id, targetType);
    }
    return current;
  }

  query5W(symbolId: string): WhoWhatWhereWhenWhy {
    const symbol = this.symbols.get(symbolId);
    if (!symbol) {
      return { confidence: { who: 0, what: 0, where: 0, when: 0, why: 0 } };
    }
    const content = typeof symbol.content === 'string' ? symbol.content : JSON.stringify(symbol.content);
    const neighbors = this.getNeighbors(symbolId);
    return {
      who: this.extractAgent(content, neighbors),
      what: this.extractAction(content, neighbors),
      where: this.extractLocation(content, neighbors),
      when: this.extractTime(content, neighbors),
      why: this.extractCause(content, neighbors),
      confidence: { who: 0.8, what: 0.85, where: 0.6, when: 0.7, why: 0.5 },
    };
  }

  private extractAgent(content: string, _neighbors: MessySymbol[]): string | undefined {
    const agents = ['player', 'user', 'hero', 'villain', 'system', 'engine', 'agent'];
    for (const a of agents) {
      if (content.includes(a)) return a;
    }
    return undefined;
  }

  private extractAction(content: string, _neighbors: MessySymbol[]): string | undefined {
    const actions = ['render', 'update', 'process', 'generate', 'create', 'destroy', 'move'];
    for (const a of actions) {
      if (content.includes(a)) return a;
    }
    return undefined;
  }

  private extractLocation(content: string, _neighbors: MessySymbol[]): string | undefined {
    const locations = ['server', 'client', 'browser', 'node', 'gpu', 'memory'];
    for (const l of locations) {
      if (content.includes(l)) return l;
    }
    return undefined;
  }

  private extractTime(content: string, _neighbors: MessySymbol[]): string | undefined {
    const times = ['init', 'update', 'frame', 'tick', 'step', 'cycle'];
    for (const t of times) {
      if (content.includes(t)) return t;
    }
    return undefined;
  }

  private extractCause(content: string, _neighbors: MessySymbol[]): string | undefined {
    const causes = ['because', 'since', 'due to', 'trigger', 'event', 'input'];
    for (const c of causes) {
      if (content.includes(c)) return c;
    }
    return undefined;
  }

  simulateEpochs(symbolId: string, epochs: number): MessySymbol[] {
    const history: MessySymbol[] = [];
    let current = this.symbols.get(symbolId);
    if (!current) return history;

    for (let e = 0; e < epochs; e++) {
      this.epochCounter++;
      const mutated = this.mutateSymbol(current);
      mutated.epoch = this.epochCounter;
      history.push(mutated);
      current = mutated;
    }
    return history;
  }

  private mutateSymbol(symbol: MessySymbol): MessySymbol {
    const mutated: MessySymbol = {
      ...symbol,
      id: `${symbol.id}_epoch_${this.epochCounter}`,
      features: [...symbol.features],
      connections: new Map(symbol.connections),
    };
    for (let i = 0; i < this.featureDimension; i++) {
      if ((i * 7 + this.epochCounter) % 20 === 0) {
        mutated.features[i] = !mutated.features[i];
      }
    }
    return mutated;
  }

  registerModule(name: string, module: MessyModule) {
    this.modules.set(name, module);
    module.attachToMessy(this);
  }

  getModule(name: string): MessyModule | undefined {
    return this.modules.get(name);
  }

  private getNeighbors(symbolId: string): MessySymbol[] {
    const symbol = this.symbols.get(symbolId);
    if (!symbol) return [];
    return Array.from(symbol.connections.keys())
      .map((id) => this.symbols.get(id))
      .filter((s): s is MessySymbol => s !== undefined);
  }

  private featureSimilarity(a: boolean[], b: boolean[]): number {
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }

  getSymbol(id: string): MessySymbol | undefined {
    return this.symbols.get(id);
  }

  getAllSymbols(): MessySymbol[] {
    return Array.from(this.symbols.values());
  }

  getStats() {
    return {
      symbols: this.symbols.size,
      morphRules: this.morphRules.length,
      modules: this.modules.size,
      currentEpoch: this.epochCounter,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// DISEMINER MODULE
// ═══════════════════════════════════════════════════════════

export class DiseMinerModule implements MessyModule {
  name = 'DISEMINER';
  private messy!: MessySubstrate;
  private vocabulary: Map<string, { contexts: Map<string, number>; features: boolean[] }> = new Map();

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    const symbol = this.messy.getSymbol(symbolId);
    if (!symbol) throw new Error(`Symbol ${symbolId} not found`);
    const text = typeof symbol.content === 'string' ? symbol.content : JSON.stringify(symbol.content);
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

    for (const token of tokens) {
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, {
          contexts: new Map(),
          features: new Array(256).fill(false),
        });
      }
      const entry = this.vocabulary.get(token)!;
      entry.contexts.set(symbolId, (entry.contexts.get(symbolId) || 0) + 1);
    }

    return this.messy.morph(symbolId, 'semantic');
  }

  infer(word: string): { synonyms: string[]; related: string[] } {
    const entry = this.vocabulary.get(word.toLowerCase());
    if (!entry) return { synonyms: [], related: [] };

    const synonyms: string[] = [];
    const related: string[] = [];

    for (const [otherWord, otherEntry] of this.vocabulary) {
      if (otherWord === word.toLowerCase()) continue;
      const overlap = this.computeOverlap(entry.contexts, otherEntry.contexts);
      if (overlap > 0.7) synonyms.push(otherWord);
      else if (overlap > 0.3) related.push(otherWord);
    }

    return { synonyms, related };
  }

  private computeOverlap(a: Map<string, number>, b: Map<string, number>): number {
    let intersection = 0;
    let union = new Set([...a.keys(), ...b.keys()]).size;
    for (const [key, count] of a) {
      if (b.has(key)) intersection += Math.min(count, b.get(key)!);
    }
    return union > 0 ? intersection / union : 0;
  }
}

// ═══════════════════════════════════════════════════════════
// AUTOLING MODULE
// ═══════════════════════════════════════════════════════════

export class AutolingModule implements MessyModule {
  name = 'AUTOLING';
  private messy!: MessySubstrate;
  private grammars: Map<string, { rules: any[]; purpose: string }> = new Map();

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
    this.seedGrammars();
  }

  private seedGrammars() {
    this.grammars.set('code', {
      rules: [
        { pattern: 'class [NAME] { [BODY] }', semantic: 'class_definition' },
        { pattern: 'function [NAME]([ARGS]) { [BODY] }', semantic: 'function_definition' },
        { pattern: 'import [NAME] from [SOURCE]', semantic: 'import_statement' },
      ],
      purpose: 'generation_and_recognition',
    });
    this.grammars.set('narrative', {
      rules: [
        { pattern: 'The [HERO] [ACTION] the [VILLAIN]', semantic: 'struggle' },
        { pattern: 'A [DONOR] gives [ITEM] to [HERO]', semantic: 'donor_function' },
        { pattern: 'The [HERO] returns [HOME]', semantic: 'return' },
      ],
      purpose: 'generation_and_recognition',
    });
  }

  process(symbolId: string): MessySymbol {
    const symbol = this.messy.getSymbol(symbolId);
    if (!symbol) throw new Error(`Symbol ${symbolId} not found`);
    return this.messy.morph(symbolId, 'behavioral');
  }

  ask5W(symbolId: string): WhoWhatWhereWhenWhy {
    return this.messy.query5W(symbolId);
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO NOVEL MODULE — CURATED FOR CODE
// ═══════════════════════════════════════════════════════════

export class AutoNovelModule implements MessyModule {
  name = 'AutoNovel';
  private messy!: MessySubstrate;

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    const symbol = this.messy.getSymbol(symbolId);
    if (!symbol) throw new Error(`Symbol ${symbolId} not found`);
    return this.messy.morph(symbolId, 'narrative');
  }

  writeCodeAsNarrative(requirements: string): string {
    const chapters = this.decomposeIntoChapters(requirements);
    let code = `/**\n * Auto-Generated Code Narrative\n * Requirements: ${requirements}\n */\n\n`;
    for (const chapter of chapters) {
      code += `// Chapter ${chapter.number}: ${chapter.title}\n`;
      code += `${chapter.code}\n\n`;
    }
    return code;
  }

  private decomposeIntoChapters(requirements: string): { number: number; title: string; code: string }[] {
    return [
      { number: 1, title: 'Setup and Imports', code: this.generateSetup(requirements) },
      { number: 2, title: 'The Hero Class', code: this.generateHeroClass(requirements) },
      { number: 3, title: 'The Villain (Error Handling)', code: this.generateErrorHandling(requirements) },
      { number: 4, title: 'The Journey (Main Logic)', code: this.generateMainLogic(requirements) },
      { number: 5, title: 'The Return (Output)', code: this.generateOutput(requirements) },
    ];
  }

  private generateSetup(_req: string): string {
    return `import { Engine } from './core';\nimport { Logger } from './utils';\n\nconst logger = new Logger();`;
  }

  private generateHeroClass(_req: string): string {
    return `class Hero {\n  constructor() {\n    this.ready = true;\n  }\n  \n  act() {\n    // TODO: Implement hero action\n  }\n}`;
  }

  private generateErrorHandling(_req: string): string {
    return `class Villain extends Error {\n  constructor(message: string) {\n    super(message);\n    this.name = 'Villain';\n  }\n}`;
  }

  private generateMainLogic(_req: string): string {
    return `async function journey() {\n  try {\n    const hero = new Hero();\n    await hero.act();\n  } catch (e) {\n    throw new Villain(e.message);\n  }\n}`;
  }

  private generateOutput(_req: string): string {
    return `export { journey, Hero, Villain };`;
  }
}

// ═══════════════════════════════════════════════════════════
// PROPP/LEVI-STRAUSS MODULE
// ═══════════════════════════════════════════════════════════

export class ProppLeviStraussModule implements MessyModule {
  name = 'ProppLeviStrauss';
  private messy!: MessySubstrate;

  private functions = [
    { id: 1, name: 'ABSENTATION', roles: ['hero'] },
    { id: 8, name: 'VILLAINY', roles: ['villain', 'victim'] },
    { id: 9, name: 'MEDIATION', roles: ['hero', 'dispatcher'] },
    { id: 11, name: 'DEPARTURE', roles: ['hero'] },
    { id: 12, name: 'DONOR_FUNCTION', roles: ['donor', 'hero'] },
    { id: 16, name: 'STRUGGLE', roles: ['hero', 'villain'] },
    { id: 18, name: 'VICTORY', roles: ['hero', 'villain'] },
    { id: 20, name: 'RETURN', roles: ['hero'] },
    { id: 31, name: 'WEDDING', roles: ['hero', 'princess'] },
  ];

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    return this.messy.getSymbol(symbolId)!;
  }

  generateFolktale(theme: string, length: number = 8): { functions: any[]; mythemes: any[] } {
    const selected = this.selectFunctionsByTheme(theme, length);
    const mythemes = this.extractMythemes(selected);
    return { functions: selected, mythemes };
  }

  private selectFunctionsByTheme(theme: string, count: number): any[] {
    const themeWords = theme.toLowerCase().split(/\s+/);
    const scored = this.functions.map((fn) => {
      const score =
        themeWords.filter((w) => fn.name.toLowerCase().includes(w)).length +
        fn.roles.filter((r) => themeWords.includes(r)).length;
      return { fn, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map((s) => s.fn);
  }

  private extractMythemes(functions: any[]): { concept: string; value: number }[] {
    const mythemes = new Map<string, number>();
    for (const fn of functions) {
      for (const role of fn.roles) {
        mythemes.set(role, (mythemes.get(role) || 0) + 1);
      }
    }
    return Array.from(mythemes.entries()).map(([c, v]) => ({ concept: c, value: v }));
  }
}

// ═══════════════════════════════════════════════════════════
// ANALOGY MODULE
// ═══════════════════════════════════════════════════════════

export class AnalogyMysticismModule implements MessyModule {
  name = 'AnalogyMysticism';
  private messy!: MessySubstrate;

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    return this.messy.getSymbol(symbolId)!;
  }

  computeAnalogy(a: boolean[], b: boolean[], c: boolean[]): boolean[] {
    const d = new Array(a.length).fill(false);
    for (let i = 0; i < a.length; i++) {
      const aXorB = a[i] !== b[i];
      d[i] = c[i] !== aXorB;
    }
    return d;
  }

  findCrossDomainAnalogy(
    domainA: Map<string, boolean[]>,
    domainB: Map<string, boolean[]>
  ): AnalogyMapping | null {
    const sourceKeys = Array.from(domainA.keys());
    const targetKeys = Array.from(domainB.keys());
    const mapping = new Map<string, string>();
    const used = new Set<string>();

    let bestScore = -1;

    for (const source of sourceKeys) {
      let bestTarget = '';
      let localBestScore = -1;
      for (const target of targetKeys) {
        if (used.has(target)) continue;
        const score = this.similarity(domainA.get(source)!, domainB.get(target)!);
        if (score > localBestScore) {
          localBestScore = score;
          bestTarget = target;
        }
      }
      if (bestTarget) {
        mapping.set(source, bestTarget);
        used.add(bestTarget);
        if (localBestScore > bestScore) bestScore = localBestScore;
      }
    }

    return {
      sourceDomain: 'domainA',
      targetDomain: 'domainB',
      mapping,
      strength: mapping.size > 0 ? bestScore : 0,
      confidence: 0.8,
    };
  }

  private similarity(a: boolean[], b: boolean[]): number {
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }
}

// ═══════════════════════════════════════════════════════════
// HISTORICAL CHANGE MODULE
// ═══════════════════════════════════════════════════════════

export class HistoricalChangeModule implements MessyModule {
  name = 'HistoricalChange';
  private messy!: MessySubstrate;

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    return this.messy.getSymbol(symbolId)!;
  }

  simulateChange(initialSymbol: MessySymbol, generations: number, mutationRate: number = 0.1): MessySymbol[] {
    return this.messy.simulateEpochs(initialSymbol.id, generations);
  }
}

// ═══════════════════════════════════════════════════════════
// CREATIVITY MODULE
// ═══════════════════════════════════════════════════════════

export class CreativityModule implements MessyModule {
  name = 'Creativity';
  private messy!: MessySubstrate;

  attachToMessy(messy: MessySubstrate) {
    this.messy = messy;
  }

  process(symbolId: string): MessySymbol {
    return this.messy.getSymbol(symbolId)!;
  }

  synthesizeCreativity(
    sourceDomain: Map<string, boolean[]>,
    targetDomain: Map<string, boolean[]>
  ): Map<string, boolean[]> {
    const analogyModule = this.messy.getModule('AnalogyMysticism') as AnalogyMysticismModule;
    if (!analogyModule) throw new Error('AnalogyMysticism module not registered');

    const analogy = analogyModule.findCrossDomainAnalogy(sourceDomain, targetDomain);
    if (!analogy) throw new Error('No analogy found between domains');

    const blend = new Map<string, boolean[]>();
    for (const [aKey, aVec] of sourceDomain) {
      const bKey = analogy.mapping.get(aKey);
      if (bKey) {
        const bVec = targetDomain.get(bKey)!;
        const blended = new Array(aVec.length).fill(false);
        for (let i = 0; i < aVec.length; i++) {
          blended[i] = aVec[i] && bVec[i] ? true : aVec[i] !== bVec[i];
        }
        blend.set(`${aKey}_x_${bKey}`, blended);
      }
    }
    return blend;
  }
}

// ═══════════════════════════════════════════════════════════
// KLEIN ENGINE — All 8 tools on MESSY
// ═══════════════════════════════════════════════════════════

export class KleinEngine {
  messy: MessySubstrate;
  diseMiner: DiseMinerModule;
  autoling: AutolingModule;
  autoNovel: AutoNovelModule;
  proppLevi: ProppLeviStraussModule;
  analogy: AnalogyMysticismModule;
  historical: HistoricalChangeModule;
  creativity: CreativityModule;

  constructor() {
    this.messy = new MessySubstrate();
    this.diseMiner = new DiseMinerModule();
    this.autoling = new AutolingModule();
    this.autoNovel = new AutoNovelModule();
    this.proppLevi = new ProppLeviStraussModule();
    this.analogy = new AnalogyMysticismModule();
    this.historical = new HistoricalChangeModule();
    this.creativity = new CreativityModule();

    this.messy.registerModule('DISEMINER', this.diseMiner);
    this.messy.registerModule('AUTOLING', this.autoling);
    this.messy.registerModule('AutoNovel', this.autoNovel);
    this.messy.registerModule('ProppLeviStrauss', this.proppLevi);
    this.messy.registerModule('AnalogyMysticism', this.analogy);
    this.messy.registerModule('HistoricalChange', this.historical);
    this.messy.registerModule('Creativity', this.creativity);
  }

  async process(text: string, id: string = `input_${Date.now()}`): Promise<MessySymbol> {
    const symbol = this.messy.ingest(id, text, 'linguistic');
    await this.diseMiner.process(symbol.id);
    await this.autoling.process(symbol.id);
    await this.autoNovel.process(symbol.id);
    return this.messy.getSymbol(symbol.id)!;
  }

  ask5W(symbolId: string): WhoWhatWhereWhenWhy {
    return this.autoling.ask5W(symbolId);
  }

  writeCode(requirements: string): string {
    return this.autoNovel.writeCodeAsNarrative(requirements);
  }

  tellStory(theme: string, length: number = 8): { functions: any[]; mythemes: any[] } {
    return this.proppLevi.generateFolktale(theme, length);
  }

  analogize(domainA: Map<string, boolean[]>, domainB: Map<string, boolean[]>): AnalogyMapping | null {
    return this.analogy.findCrossDomainAnalogy(domainA, domainB);
  }

  create(source: Map<string, boolean[]>, target: Map<string, boolean[]>): Map<string, boolean[]> {
    return this.creativity.synthesizeCreativity(source, target);
  }

  evolve(symbolId: string, generations: number): MessySymbol[] {
    return this.historical.simulateChange(this.messy.getSymbol(symbolId)!, generations);
  }

  getStats() {
    return {
      messy: this.messy.getStats(),
      modules: [
        this.diseMiner.name,
        this.autoling.name,
        this.autoNovel.name,
        this.proppLevi.name,
        this.analogy.name,
        this.historical.name,
        this.creativity.name,
      ],
    };
  }
}

export default KleinEngine;
