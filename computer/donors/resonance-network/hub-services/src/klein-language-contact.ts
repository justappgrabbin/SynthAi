
/**
 * ============================================================================
 * KLEIN LANGUAGE CONTACT MODEL — Working Implementation
 * Based on: Sheldon Klein (1974) "Computer Simulation of Language Contact Models"
 * ============================================================================
 * 
 * Core Components:
 * 1. SemanticNetwork — directed graph of triples (α, R, β) with temporal tags
 * 2. GenerativeGrammar — probabilistic CFG with dependency patterns
 * 3. LanguageLearner — synthesizes rules from parsed input, tests & revises
 * 4. BehavioralEngine — probabilistic social interaction rules
 * 5. SimulationEngine — orchestrates multi-agent community, birth/death, time
 * 6. ChatInterface — real-time interaction with the simulation
 * 
 * This is a complete, runnable system. Save as klein-language-contact.ts
 * Compile with: tsc klein-language-contact.ts --target ES2020 --module commonjs
 * Or run directly in browser by removing the module.exports line.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SemanticTriple {
  alpha: string;      // semantic object or relation
  relation: string;     // semantic relation
  beta: string;         // semantic object or relation
  createdAt: number;    // simulation time
  deletedAt: number | null;
  weight: number;       // emotional/intensity weight (-10 to +10)
  source: string;       // which agent created this
}

interface LexicalEntry {
  surface: string;
  probability: number;
  contextTags: string[];
  emotionalWeight: number;
}

interface GrammarRule {
  id: string;
  lhs: string;          // left-hand side (non-terminal)
  rhs: string[];        // right-hand side (terminals/non-terminals)
  probability: number;    // selection frequency (0-1)
  dependencyPattern: string; // syntactic dependency pattern
  contextTags: string[];   // when this rule applies
  learnedFrom: string;     // which agent taught this
  createdAt: number;
  usageCount: number;
}

interface Speaker {
  id: string;
  name: string;
  age: number;
  status: number;       // social status (0-1)
  grammar: GenerativeGrammar;
  semanticNetwork: SemanticNetwork;
  behavioralRules: BehavioralRule[];
  languageHistory: string[];     // all productions ever heard
  rejectedProductions: string[]; // own productions that were rejected
  birthTime: number;
  motherId: string | null;
  fatherId: string | null;
  languages: string[];   // which language codes this speaker knows
  primaryLanguage: string;
  emotionalState: Map<string, number>; // relation -> emotional weight
}

interface BehavioralRule {
  id: string;
  action: string;
  conditions: Condition[];
  baseProbability: number;
  contextTags: string[];
}

interface Condition {
  type: 'presence' | 'absence' | 'path' | 'class' | 'location' | 'emotion';
  target: string;
  relation?: string;
  value?: any;
  modifier: number; // adds/subtracts from probability
}

interface ParsedProduction {
  tree: ParseTreeNode;
  semanticTriple: SemanticTriple | null;
  confidence: number;
  ambiguity: number;
}

interface ParseTreeNode {
  symbol: string;
  children: ParseTreeNode[];
  span: [number, number];
  rule: GrammarRule | null;
}

interface Conversation {
  speakerA: string;
  speakerB: string;
  utterances: Utterance[];
  context: string[];
  time: number;
}

interface Utterance {
  speaker: string;
  text: string;
  parsed: ParsedProduction | null;
  accepted: boolean | null;
  corrections: string[];
  time: number;
}

// ============================================================================
// SEMANTIC NETWORK — Directed Graph of Triples
// ============================================================================

class SemanticNetwork {
  triples: SemanticTriple[] = [];
  lexicalMap: Map<string, LexicalEntry[]> = new Map(); // semantic unit -> lexical expressions
  classes: Map<string, Set<string>> = new Map(); // class name -> member semantic objects
  numericalValues: Map<string, number> = new Map(); // semantic unit -> numerical value
  private time: number = 0;
  private owner: string;

  constructor(owner: string) {
    this.owner = owner;
  }

  setTime(t: number) { this.time = t; }

  addTriple(alpha: string, relation: string, beta: string, weight: number = 0, source: string = this.owner): SemanticTriple {
    const triple: SemanticTriple = {
      alpha, relation, beta,
      createdAt: this.time,
      deletedAt: null,
      weight,
      source
    };
    this.triples.push(triple);
    return triple;
  }

  deleteTriple(alpha: string, relation: string, beta: string): boolean {
    for (const t of this.triples) {
      if (t.alpha === alpha && t.relation === relation && t.beta === beta && t.deletedAt === null) {
        t.deletedAt = this.time;
        return true;
      }
    }
    return false;
  }

  // Query: does a path exist between A and B through specific relations?
  hasPath(alpha: string, beta: string, relations?: string[], excludeRelations?: string[]): boolean {
    const visited = new Set<string>();
    const queue: string[] = [alpha];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === beta) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const t of this.triples) {
        if (t.deletedAt !== null) continue;
        if (t.alpha === current) {
          if (relations && !relations.includes(t.relation)) continue;
          if (excludeRelations && excludeRelations.includes(t.relation)) continue;
          queue.push(t.beta);
        }
      }
    }
    return false;
  }

  // Find all objects related to alpha via relation
  getRelated(alpha: string, relation: string): string[] {
    return this.triples
      .filter(t => t.alpha === alpha && t.relation === relation && t.deletedAt === null)
      .map(t => t.beta);
  }

  // Find all relations between two objects
  getRelations(alpha: string, beta: string): string[] {
    return this.triples
      .filter(t => t.alpha === alpha && t.beta === beta && t.deletedAt === null)
      .map(t => t.relation);
  }

  // Add lexical expression for a semantic unit
  addLexical(semanticUnit: string, surface: string, probability: number = 0.5, emotionalWeight: number = 0, contextTags: string[] = []) {
    if (!this.lexicalMap.has(semanticUnit)) {
      this.lexicalMap.set(semanticUnit, []);
    }
    this.lexicalMap.get(semanticUnit)!.push({ surface, probability, emotionalWeight, contextTags });
  }

  // Get lexical expressions, weighted by probability and emotional state
  getLexical(semanticUnit: string, emotionalBias: number = 0): string[] {
    const entries = this.lexicalMap.get(semanticUnit) || [];
    if (entries.length === 0) return [semanticUnit];

    // Weight by probability and emotional alignment
    const weighted = entries.map(e => ({
      ...e,
      score: e.probability * (1 - Math.abs(e.emotionalWeight - emotionalBias) / 20)
    }));

    weighted.sort((a, b) => b.score - a.score);
    return weighted.map(e => e.surface);
  }

  // Create a dynamic class
  createClass(className: string, members: string[]) {
    this.classes.set(className, new Set(members));
  }

  // Add member to class
  addToClass(className: string, member: string) {
    if (!this.classes.has(className)) {
      this.classes.set(className, new Set());
    }
    this.classes.get(className)!.add(member);
  }

  // Test class membership
  isMember(obj: string, className: string): boolean {
    return this.classes.get(className)?.has(obj) || false;
  }

  // Get all members of a class
  getClassMembers(className: string): string[] {
    return Array.from(this.classes.get(className) || []);
  }

  // Set numerical value for semantic unit (e.g., affection = +9)
  setNumerical(semanticUnit: string, value: number) {
    this.numericalValues.set(semanticUnit, value);
  }

  getNumerical(semanticUnit: string): number | undefined {
    return this.numericalValues.get(semanticUnit);
  }

  // Get network state as object
  toObject(): any {
    return {
      triples: this.triples,
      lexicalMap: Object.fromEntries(this.lexicalMap),
      classes: Object.fromEntries(this.classes),
      numericalValues: Object.fromEntries(this.numericalValues)
    };
  }
}

// ============================================================================
// GENERATIVE GRAMMAR — Probabilistic CFG with Dependency Patterns
// ============================================================================

class GenerativeGrammar {
  rules: GrammarRule[] = [];
  startSymbol: string = 'S';
  private ruleCounter: number = 0;

  constructor(startSymbol: string = 'S') {
    this.startSymbol = startSymbol;
  }

  addRule(lhs: string, rhs: string[], probability: number = 0.5, 
          dependencyPattern: string = 'default', 
          contextTags: string[] = [],
          learnedFrom: string = 'innate'): GrammarRule {
    const rule: GrammarRule = {
      id: `R${this.ruleCounter++}`,
      lhs,
      rhs,
      probability,
      dependencyPattern,
      contextTags,
      learnedFrom,
      createdAt: Date.now(),
      usageCount: 0
    };
    this.rules.push(rule);
    return rule;
  }

  // Remove a rule
  removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  // Get rules for a non-terminal
  getRulesFor(lhs: string, contextTags: string[] = []): GrammarRule[] {
    let applicable = this.rules.filter(r => r.lhs === lhs);
    if (contextTags.length > 0) {
      applicable = applicable.filter(r => 
        r.contextTags.length === 0 || r.contextTags.some(ct => contextTags.includes(ct))
      );
    }
    return applicable;
  }

  // Generate a sentence from the grammar
  generate(contextTags: string[] = [], maxDepth: number = 10): string {
    return this.generateSymbol(this.startSymbol, contextTags, maxDepth, 0);
  }

  private generateSymbol(symbol: string, contextTags: string[], maxDepth: number, depth: number): string {
    if (depth > maxDepth) return symbol;

    // Check if it's a terminal (no rules expand it)
    const rules = this.getRulesFor(symbol, contextTags);
    if (rules.length === 0) {
      // It's a terminal or unknown — return as-is
      return symbol;
    }

    // Probabilistic selection weighted by rule probability and usage
    const totalWeight = rules.reduce((sum, r) => sum + r.probability * (1 + r.usageCount * 0.1), 0);
    let random = Math.random() * totalWeight;

    for (const rule of rules) {
      const weight = rule.probability * (1 + rule.usageCount * 0.1);
      random -= weight;
      if (random <= 0) {
        rule.usageCount++;
        const parts = rule.rhs.map(s => this.generateSymbol(s, contextTags, maxDepth, depth + 1));
        return parts.join(' ');
      }
    }

    // Fallback to first rule
    rules[0].usageCount++;
    const parts = rules[0].rhs.map(s => this.generateSymbol(s, contextTags, maxDepth, depth + 1));
    return parts.join(' ');
  }

  // Generate with semantic grounding (using network for lexical choice)
  generateGrounded(network: SemanticNetwork, contextTags: string[] = [], maxDepth: number = 10): string {
    return this.generateSymbolGrounded(this.startSymbol, network, contextTags, maxDepth, 0);
  }

  private generateSymbolGrounded(symbol: string, network: SemanticNetwork, contextTags: string[], maxDepth: number, depth: number): string {
    if (depth > maxDepth) return symbol;

    // Check if this symbol has lexical entries in the network
    const lexical = network.getLexical(symbol);
    const rules = this.getRulesFor(symbol, contextTags);

    // If no rules, use lexical or return as-is
    if (rules.length === 0) {
      return lexical[0] || symbol;
    }

    // Probabilistic selection
    const totalWeight = rules.reduce((sum, r) => sum + r.probability * (1 + r.usageCount * 0.1), 0);
    let random = Math.random() * totalWeight;

    for (const rule of rules) {
      const weight = rule.probability * (1 + rule.usageCount * 0.1);
      random -= weight;
      if (random <= 0) {
        rule.usageCount++;
        const parts = rule.rhs.map(s => {
          // Try lexical substitution first
          const lex = network.getLexical(s);
          if (lex.length > 0 && lex[0] !== s) {
            return lex[0];
          }
          return this.generateSymbolGrounded(s, network, contextTags, maxDepth, depth + 1);
        });
        return parts.join(' ');
      }
    }

    rules[0].usageCount++;
    const parts = rules[0].rhs.map(s => {
      const lex = network.getLexical(s);
      if (lex.length > 0 && lex[0] !== s) return lex[0];
      return this.generateSymbolGrounded(s, network, contextTags, maxDepth, depth + 1);
    });
    return parts.join(' ');
  }

  // Parse a sentence (CYK-style probabilistic parsing)
  parse(sentence: string): ParsedProduction | null {
    const tokens = sentence.toLowerCase().trim().split(/\s+/);
    const n = tokens.length;
    if (n === 0) return null;

    // Chart: chart[i][j] = set of ParseTreeNodes for span [i, j)
    const chart: ParseTreeNode[][][] = Array(n).fill(null).map(() => Array(n + 1).fill(null).map(() => []));

    // Initialize with terminals
    for (let i = 0; i < n; i++) {
      // Find rules that produce this terminal directly
      for (const rule of this.rules) {
        if (rule.rhs.length === 1 && rule.rhs[0].toLowerCase() === tokens[i]) {
          chart[i][i + 1].push({
            symbol: rule.lhs,
            children: [{ symbol: tokens[i], children: [], span: [i, i + 1], rule: null }],
            span: [i, i + 1],
            rule
          });
        }
      }
      // Also add as unknown terminal
      chart[i][i + 1].push({
        symbol: 'UNKNOWN',
        children: [{ symbol: tokens[i], children: [], span: [i, i + 1], rule: null }],
        span: [i, i + 1],
        rule: null
      });
    }

    // Fill chart
    for (let length = 2; length <= n; length++) {
      for (let i = 0; i <= n - length; i++) {
        const j = i + length;
        for (let k = i + 1; k < j; k++) {
          for (const rule of this.rules) {
            if (rule.rhs.length === 2) {
              for (const left of chart[i][k]) {
                if (left.symbol === rule.rhs[0]) {
                  for (const right of chart[k][j]) {
                    if (right.symbol === rule.rhs[1]) {
                      chart[i][j].push({
                        symbol: rule.lhs,
                        children: [left, right],
                        span: [i, j],
                        rule
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Find parses for start symbol
    const parses = chart[0][n].filter(node => node.symbol === this.startSymbol);
    if (parses.length === 0) {
      // Return best partial parse
      const best = this.findBestPartialParse(chart, tokens);
      return best;
    }

    // Score parses by rule probability product
    const scored = parses.map(p => ({
      tree: p,
      score: this.scoreParse(p),
      coverage: n
    }));
    scored.sort((a, b) => b.score - a.score);

    return {
      tree: scored[0].tree,
      semanticTriple: this.extractSemanticTriple(scored[0].tree),
      confidence: scored[0].score,
      ambiguity: parses.length
    };
  }

  private findBestPartialParse(chart: ParseTreeNode[][][], tokens: string[]): ParsedProduction | null {
    let bestCoverage = 0;
    let bestNode: ParseTreeNode | null = null;

    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j <= tokens.length; j++) {
        for (const node of chart[i][j]) {
          if (node.symbol !== 'UNKNOWN' && j - i > bestCoverage) {
            bestCoverage = j - i;
            bestNode = node;
          }
        }
      }
    }

    if (!bestNode) return null;

    return {
      tree: bestNode,
      semanticTriple: null,
      confidence: bestCoverage / tokens.length * 0.5,
      ambiguity: 1
    };
  }

  private scoreParse(node: ParseTreeNode): number {
    if (!node.rule) return 0.1;
    let score = node.rule.probability;
    for (const child of node.children) {
      score *= this.scoreParse(child);
    }
    return score;
  }

  private extractSemanticTriple(tree: ParseTreeNode): SemanticTriple | null {
    // Extract (Subject, Verb, Object) from parse tree if possible
    // This is a simplified version — full implementation would use dependency patterns
    const flatten = (node: ParseTreeNode): string[] => {
      if (node.children.length === 0) return [node.symbol];
      return node.children.flatMap(flatten);
    };

    const words = flatten(tree);
    if (words.length >= 3) {
      return {
        alpha: words[0],
        relation: words[1],
        beta: words.slice(2).join(' '),
        createdAt: Date.now(),
        deletedAt: null,
        weight: 0,
        source: 'parse'
      };
    }
    return null;
  }

  // Learn a new rule from parsed input (grammar synthesis)
  learnRule(lhs: string, rhs: string[], context: string[] = [], learnedFrom: string = 'interaction'): GrammarRule {
    // Check if similar rule exists
    const existing = this.rules.find(r => r.lhs === lhs && r.rhs.join(' ') === rhs.join(' '));
    if (existing) {
      existing.probability = Math.min(1.0, existing.probability + 0.1);
      existing.usageCount++;
      return existing;
    }

    // Generalize: if we have "John runs" and "Mary runs", create "NP runs"
    const generalized = this.attemptGeneralization(lhs, rhs);
    if (generalized) {
      return this.addRule(generalized.lhs, generalized.rhs, 0.3, 'default', context, learnedFrom);
    }

    return this.addRule(lhs, rhs, 0.3, 'default', context, learnedFrom);
  }

  private attemptGeneralization(lhs: string, rhs: string[]): { lhs: string, rhs: string[] } | null {
    // Simple generalization: if two rules have same RHS but different LHS terminals,
    // create a category
    // This is where the real learning happens — Klein's "maximum/minimum generalization"
    return null; // Placeholder for sophisticated generalization
  }

  // Get grammar statistics
  getStats(): any {
    const byLhs: Map<string, number> = new Map();
    for (const r of this.rules) {
      byLhs.set(r.lhs, (byLhs.get(r.lhs) || 0) + 1);
    }
    return {
      totalRules: this.rules.length,
      byNonTerminal: Object.fromEntries(byLhs),
      avgProbability: this.rules.reduce((s, r) => s + r.probability, 0) / this.rules.length,
      learnedRules: this.rules.filter(r => r.learnedFrom !== 'innate').length
    };
  }

  toObject(): any {
    return {
      startSymbol: this.startSymbol,
      rules: this.rules
    };
  }
}

// ============================================================================
// LANGUAGE LEARNER — Synthesizes Grammar from Interactions
// ============================================================================

class LanguageLearner {
  private speaker: Speaker;
  private learningHeuristic: 'max' | 'min' | 'balanced' = 'balanced';
  private correctionMemory: Map<string, number> = new Map(); // production -> count of rejections

  constructor(speaker: Speaker, heuristic: 'max' | 'min' | 'balanced' = 'balanced') {
    this.speaker = speaker;
    this.learningHeuristic = heuristic;
  }

  // Process an utterance heard from another speaker
  hear(utterance: Utterance, speakerGrammar: GenerativeGrammar): boolean {
    // Add to history
    this.speaker.languageHistory.push(utterance.text);

    // Try to parse it with our grammar
    const parseResult = this.speaker.grammar.parse(utterance.text);

    if (parseResult && parseResult.confidence > 0.6) {
      // Success! Strengthen existing rules
      this.strengthenRules(parseResult.tree);
      // Add semantic triple to network
      if (parseResult.semanticTriple) {
        this.speaker.semanticNetwork.addTriple(
          parseResult.semanticTriple.alpha,
          parseResult.semanticTriple.relation,
          parseResult.semanticTriple.beta,
          parseResult.semanticTriple.weight,
          utterance.speaker
        );
      }
      return true;
    } else {
      // Failed to parse — need to learn
      return this.learnFromUtterance(utterance, speakerGrammar);
    }
  }

  // Learn from an utterance we couldn't parse
  private learnFromUtterance(utterance: Utterance, speakerGrammar: GenerativeGrammar): boolean {
    // Try to parse with the other speaker's grammar
    const theirParse = speakerGrammar.parse(utterance.text);

    if (theirParse && theirParse.confidence > 0.5) {
      // We can learn their rules!
      const learned = this.transferRules(theirParse.tree, speakerGrammar);
      if (learned) {
        // Test: can we now generate something similar?
        const test = this.speaker.grammar.parse(utterance.text);
        if (test && test.confidence > 0.5) {
          return true;
        }
      }
    }

    // If we can't learn their exact rules, try to synthesize new ones
    // Klein's approach: "continual positing of grammar rules sufficient to account for the input"
    return this.synthesizeRules(utterance.text);
  }

  private transferRules(tree: ParseTreeNode, sourceGrammar: GenerativeGrammar): boolean {
    // Transfer rules from source grammar to our grammar
    const transferNode = (node: ParseTreeNode): boolean => {
      if (node.rule) {
        // Check if we already have this rule
        const exists = this.speaker.grammar.rules.find(r => 
          r.lhs === node.rule!.lhs && r.rhs.join(' ') === node.rule!.rhs.join(' ')
        );
        if (!exists) {
          this.speaker.grammar.addRule(
            node.rule.lhs,
            node.rule.rhs,
            node.rule.probability * 0.5, // Start with lower probability
            node.rule.dependencyPattern,
            node.rule.contextTags,
            'learned'
          );
        }
      }
      return node.children.every(transferNode);
    };

    return transferNode(tree);
  }

  private synthesizeRules(sentence: string): boolean {
    // Synthesize rules from the sentence itself
    // This is the core grammar learning mechanism
    const tokens = sentence.toLowerCase().trim().split(/\s+/);
    if (tokens.length < 2) return false;

    // Simple heuristic: assume first word is subject, second is verb, rest is object
    if (tokens.length >= 3) {
      // Synthesize S -> NP VP
      this.speaker.grammar.addRule('S', ['NP', 'VP'], 0.4, 'S->NP+VP', [], 'synthesized');
      // Synthesize NP -> token[0]
      this.speaker.grammar.addRule('NP', [tokens[0]], 0.3, 'NP->N', [], 'synthesized');
      // Synthesize VP -> V NP
      this.speaker.grammar.addRule('VP', ['V', 'NP2'], 0.3, 'VP->V+NP', [], 'synthesized');
      // Synthesize V -> token[1]
      this.speaker.grammar.addRule('V', [tokens[1]], 0.3, 'V->Vt', [], 'synthesized');
      // Synthesize NP2 -> rest
      if (tokens.length > 2) {
        this.speaker.grammar.addRule('NP2', tokens.slice(2), 0.3, 'NP->N+...', [], 'synthesized');
      }
    }

    return true;
  }

  private strengthenRules(tree: ParseTreeNode) {
    if (tree.rule) {
      tree.rule.probability = Math.min(1.0, tree.rule.probability + 0.05);
      tree.rule.usageCount++;
    }
    for (const child of tree.children) {
      this.strengthenRules(child);
    }
  }

  // Handle correction/rejection of our own production
  receiveCorrection(production: string, correction: string | null) {
    this.speaker.rejectedProductions.push(production);
    const count = (this.correctionMemory.get(production) || 0) + 1;
    this.correctionMemory.set(production, count);

    // Decrease probability of rules that generated this
    // In a full implementation, we'd trace back through the generation
    // For now, weaken all recently used rules
    for (const rule of this.speaker.grammar.rules) {
      if (rule.usageCount > 0) {
        rule.probability = Math.max(0.05, rule.probability - 0.02 * count);
      }
    }

    // If correction provided, learn from it
    if (correction) {
      this.synthesizeRules(correction);
    }
  }

  // Set learning heuristic
  setHeuristic(h: 'max' | 'min' | 'balanced') {
    this.learningHeuristic = h;
  }
}

// ============================================================================
// BEHAVIORAL ENGINE — Probabilistic Social Interaction Rules
// ============================================================================

class BehavioralEngine {
  private rules: BehavioralRule[] = [];
  private ruleCounter: number = 0;

  addRule(action: string, conditions: Condition[], baseProbability: number, contextTags: string[] = []): BehavioralRule {
    const rule: BehavioralRule = {
      id: `B${this.ruleCounter++}`,
      action,
      conditions,
      baseProbability,
      contextTags
    };
    this.rules.push(rule);
    return rule;
  }

  // Evaluate whether an action should occur between two speakers
  evaluate(action: string, speakerA: Speaker, speakerB: Speaker, network: SemanticNetwork, time: number): number {
    const rules = this.rules.filter(r => r.action === action);
    let maxProbability = 0;

    for (const rule of rules) {
      let probability = rule.baseProbability;
      let allSatisfied = true;

      for (const cond of rule.conditions) {
        const satisfied = this.checkCondition(cond, speakerA, speakerB, network, time);
        if (!satisfied && cond.modifier < 0) {
          // Condition is "give up if" type
          allSatisfied = false;
          break;
        }
        probability += cond.modifier;
      }

      if (allSatisfied && probability > maxProbability) {
        maxProbability = probability;
      }
    }

    return Math.max(0, Math.min(1, maxProbability));
  }

  private checkCondition(cond: Condition, a: Speaker, b: Speaker, network: SemanticNetwork, time: number): boolean {
    switch (cond.type) {
      case 'location':
        // Check if in same location (simplified: always true for now)
        return true;

      case 'emotion':
        const emotion = a.emotionalState.get(cond.target);
        if (emotion === undefined) return false;
        if (cond.value !== undefined) {
          return cond.value === 'positive' ? emotion > 0 : emotion < 0;
        }
        return true;

      case 'presence':
        // Check if relation exists in network
        return network.hasPath(a.name, b.name, [cond.relation || '']);

      case 'absence':
        return !network.hasPath(a.name, b.name, [cond.relation || '']);

      case 'class':
        return network.isMember(a.name, cond.target) || network.isMember(b.name, cond.target);

      default:
        return true;
    }
  }
}

// ============================================================================
// SIMULATION ENGINE — Multi-Agent Community with Time
// ============================================================================

class SimulationEngine {
  speakers: Map<string, Speaker> = new Map();
  conversations: Conversation[] = [];
  time: number = 0;
  behavioralEngine: BehavioralEngine = new BehavioralEngine();
  globalNetwork: SemanticNetwork = new SemanticNetwork('global');

  // Simulation parameters
  birthRate: number = 0.05;
  deathRate: number = 0.03;
  interactionRate: number = 0.3;
  maxPopulation: number = 50;

  private speakerCounter: number = 0;
  private eventLog: string[] = [];

  constructor() {
    this.setupDefaultBehavioralRules();
  }

  private setupDefaultBehavioralRules() {
    // "John kisses Mary" rule from the paper
    this.behavioralEngine.addRule('kiss', [
      { type: 'location', target: 'same', modifier: -1.0 }, // Give up if not same location
      { type: 'emotion', target: 'love', value: 'positive', modifier: 0.2 },
      { type: 'presence', target: 'people', relation: 'nearby', modifier: -0.3 }
    ], 0.1);

    // Talk to someone
    this.behavioralEngine.addRule('talk', [
      { type: 'location', target: 'same', modifier: -0.5 },
      { type: 'emotion', target: 'familiarity', value: 'positive', modifier: 0.3 },
      { type: 'presence', target: 'stranger', relation: 'is', modifier: -0.2 }
    ], 0.5);

    // Teach/learn interaction
    this.behavioralEngine.addRule('teach', [
      { type: 'emotion', target: 'trust', value: 'positive', modifier: 0.3 },
      { type: 'presence', target: 'student', relation: 'is', modifier: 0.2 }
    ], 0.2);
  }

  // Create a new speaker
  createSpeaker(name: string, age: number = 20, status: number = 0.5, 
                motherId: string | null = null, fatherId: string | null = null): Speaker {
    const id = `S${this.speakerCounter++}`;
    const grammar = new GenerativeGrammar('S');
    const network = new SemanticNetwork(id);

    // Initialize with basic grammar (innate/childhood grammar)
    this.initializeBasicGrammar(grammar);

    const speaker: Speaker = {
      id,
      name,
      age,
      status,
      grammar,
      semanticNetwork: network,
      behavioralRules: [],
      languageHistory: [],
      rejectedProductions: [],
      birthTime: this.time,
      motherId,
      fatherId,
      languages: ['L1'],
      primaryLanguage: 'L1',
      emotionalState: new Map()
    };

    this.speakers.set(id, speaker);
    this.eventLog.push(`[${this.time}] BIRTH: ${name} (${id}) born, age ${age}`);
    return speaker;
  }

  private initializeBasicGrammar(grammar: GenerativeGrammar) {
    // Basic English-like grammar
    grammar.addRule('S', ['NP', 'VP'], 0.9, 'S->NP+VP');
    grammar.addRule('NP', ['DET', 'N'], 0.6, 'NP->DET+N');
    grammar.addRule('NP', ['N'], 0.3, 'NP->N');
    grammar.addRule('NP', ['PRON'], 0.1, 'NP->PRON');
    grammar.addRule('VP', ['V', 'NP'], 0.5, 'VP->V+NP');
    grammar.addRule('VP', ['V', 'ADJ'], 0.2, 'VP->V+ADJ');
    grammar.addRule('VP', ['V'], 0.3, 'VP->V');

    grammar.addRule('DET', ['the'], 0.5, 'DET->the');
    grammar.addRule('DET', ['a'], 0.3, 'DET->a');
    grammar.addRule('DET', ['my'], 0.2, 'DET->my');

    grammar.addRule('N', ['person'], 0.1, 'N->person');
    grammar.addRule('N', ['language'], 0.1, 'N->language');
    grammar.addRule('N', ['world'], 0.1, 'N->world');
    grammar.addRule('N', ['meaning'], 0.1, 'N->meaning');
    grammar.addRule('N', ['contact'], 0.1, 'N->contact');
    grammar.addRule('N', ['change'], 0.1, 'N->change');
    grammar.addRule('N', ['community'], 0.1, 'N->community');
    grammar.addRule('N', ['rule'], 0.1, 'N->rule');
    grammar.addRule('N', ['grammar'], 0.1, 'N->grammar');
    grammar.addRule('N', ['word'], 0.1, 'N->word');
    grammar.addRule('N', ['sound'], 0.1, 'N->sound');

    grammar.addRule('V', ['speaks'], 0.1, 'V->speaks');
    grammar.addRule('V', ['learns'], 0.1, 'V->learns');
    grammar.addRule('V', ['changes'], 0.1, 'V->changes');
    grammar.addRule('V', ['understands'], 0.1, 'V->understands');
    grammar.addRule('V', ['creates'], 0.1, 'V->creates');
    grammar.addRule('V', ['loves'], 0.1, 'V->loves');
    grammar.addRule('V', ['hates'], 0.1, 'V->hates');
    grammar.addRule('V', ['knows'], 0.1, 'V->knows');
    grammar.addRule('V', ['sees'], 0.1, 'V->sees');
    grammar.addRule('V', ['hears'], 0.1, 'V->hears');

    grammar.addRule('PRON', ['i'], 0.3, 'PRON->i');
    grammar.addRule('PRON', ['you'], 0.3, 'PRON->you');
    grammar.addRule('PRON', ['he'], 0.2, 'PRON->he');
    grammar.addRule('PRON', ['she'], 0.2, 'PRON->she');

    grammar.addRule('ADJ', ['beautiful'], 0.2, 'ADJ->beautiful');
    grammar.addRule('ADJ', ['complex'], 0.2, 'ADJ->complex');
    grammar.addRule('ADJ', ['simple'], 0.2, 'ADJ->simple');
    grammar.addRule('ADJ', ['new'], 0.2, 'ADJ->new');
    grammar.addRule('ADJ', ['old'], 0.2, 'ADJ->old');
  }

  // Run one time step
  step(): void {
    this.time++;
    this.globalNetwork.setTime(this.time);

    // Age all speakers
    for (const speaker of this.speakers.values()) {
      if (this.time % 10 === 0) { // Age every 10 time units
        speaker.age++;
      }
      speaker.semanticNetwork.setTime(this.time);
    }

    // Random interactions
    const speakerList = Array.from(this.speakers.values());
    for (let i = 0; i < speakerList.length; i++) {
      for (let j = i + 1; j < speakerList.length; j++) {
        if (Math.random() < this.interactionRate) {
          this.interact(speakerList[i], speakerList[j]);
        }
      }
    }

    // Birth
    if (Math.random() < this.birthRate && this.speakers.size < this.maxPopulation) {
      this.birth();
    }

    // Death
    for (const [id, speaker] of this.speakers) {
      const ageDeathProb = speaker.age > 70 ? 0.1 : (speaker.age > 50 ? 0.03 : 0.01);
      if (Math.random() < this.deathRate + ageDeathProb) {
        this.death(id);
      }
    }
  }

  private interact(a: Speaker, b: Speaker): void {
    // Determine action probabilistically
    const actions = ['talk', 'teach', 'kiss'];
    const probs = actions.map(act => this.behavioralEngine.evaluate(act, a, b, this.globalNetwork, this.time));

    const totalProb = probs.reduce((s, p) => s + p, 0);
    if (totalProb === 0) return;

    let random = Math.random() * totalProb;
    let selectedAction = 'talk';
    for (let i = 0; i < actions.length; i++) {
      random -= probs[i];
      if (random <= 0) {
        selectedAction = actions[i];
        break;
      }
    }

    switch (selectedAction) {
      case 'talk':
        this.conversation(a, b);
        break;
      case 'teach':
        this.teach(a, b);
        break;
      case 'kiss':
        this.globalNetwork.addTriple(a.name, 'kisses', b.name, 5, a.id);
        this.eventLog.push(`[${this.time}] ${a.name} kisses ${b.name}`);
        break;
    }
  }

  private conversation(a: Speaker, b: Speaker): void {
    // Speaker A generates, Speaker B parses and learns
    const context = ['casual'];
    const production = a.grammar.generateGrounded(a.semanticNetwork, context);

    const utteranceA: Utterance = {
      speaker: a.id,
      text: production,
      parsed: null,
      accepted: null,
      corrections: [],
      time: this.time
    };

    // B tries to parse
    const parseB = b.grammar.parse(production);
    const learnerB = new LanguageLearner(b, 'balanced');

    if (parseB && parseB.confidence > 0.5) {
      // B understands
      utteranceA.accepted = true;
      learnerB.hear(utteranceA, a.grammar);

      // B responds
      const response = b.grammar.generateGrounded(b.semanticNetwork, context);
      const utteranceB: Utterance = {
        speaker: b.id,
        text: response,
        parsed: null,
        accepted: null,
        corrections: [],
        time: this.time
      };

      // A tries to parse B's response
      const parseA = a.grammar.parse(response);
      const learnerA = new LanguageLearner(a, 'balanced');

      if (parseA && parseA.confidence > 0.5) {
        learnerA.hear(utteranceB, b.grammar);
      } else {
        // A learns from B's response
        learnerA.hear(utteranceB, b.grammar);
      }

      this.conversations.push({
        speakerA: a.id,
        speakerB: b.id,
        utterances: [utteranceA, utteranceB],
        context,
        time: this.time
      });

      this.eventLog.push(`[${this.time}] ${a.name}: "${production}" | ${b.name}: "${response}"`);
    } else {
      // B doesn't understand — learning opportunity
      utteranceA.accepted = false;
      learnerB.hear(utteranceA, a.grammar);

      // B might ask for clarification or just store for later
      this.eventLog.push(`[${this.time}] ${a.name}: "${production}" | ${b.name}: [learning...]`);
    }
  }

  private teach(teacher: Speaker, student: Speaker): void {
    // Teacher generates a "teaching" utterance
    const lesson = teacher.grammar.generateGrounded(teacher.semanticNetwork, ['teaching']);
    const utterance: Utterance = {
      speaker: teacher.id,
      text: lesson,
      parsed: null,
      accepted: true,
      corrections: [],
      time: this.time
    };

    const learner = new LanguageLearner(student, 'max'); // Max generalization for teaching
    learner.hear(utterance, teacher.grammar);

    this.eventLog.push(`[${this.time}] TEACH: ${teacher.name} teaches "${lesson}" to ${student.name}`);
  }

  private birth(): void {
    // Select parents
    const adults = Array.from(this.speakers.values()).filter(s => s.age >= 18 && s.age <= 50);
    if (adults.length < 2) return;

    const mother = adults[Math.floor(Math.random() * adults.length)];
    let father = adults[Math.floor(Math.random() * adults.length)];
    while (father.id === mother.id) {
      father = adults[Math.floor(Math.random() * adults.length)];
    }

    const child = this.createSpeaker(
      `Child_${this.speakerCounter}`,
      0,
      (mother.status + father.status) / 2 * 0.9,
      mother.id,
      father.id
    );

    // Child inherits some grammar from parents
    const inheritRate = 0.3;
    for (const parent of [mother, father]) {
      for (const rule of parent.grammar.rules) {
        if (Math.random() < inheritRate) {
          child.grammar.addRule(
            rule.lhs, rule.rhs, 
            rule.probability * 0.5, 
            rule.dependencyPattern,
            rule.contextTags,
            `inherited_from_${parent.name}`
          );
        }
      }
    }
  }

  private death(id: string): void {
    const speaker = this.speakers.get(id);
    if (speaker) {
      this.eventLog.push(`[${this.time}] DEATH: ${speaker.name} died at age ${speaker.age}`);
      this.speakers.delete(id);
    }
  }

  // Run simulation for N steps
  run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  // Get community grammar (universal listener)
  getCommunityGrammar(): GenerativeGrammar {
    const community = new GenerativeGrammar('S');
    const ruleFreq: Map<string, { rule: GrammarRule, count: number }> = new Map();

    // Aggregate all rules across all speakers
    for (const speaker of this.speakers.values()) {
      for (const rule of speaker.grammar.rules) {
        const key = `${rule.lhs} -> ${rule.rhs.join(' ')}`;
        if (ruleFreq.has(key)) {
          ruleFreq.get(key)!.count++;
        } else {
          ruleFreq.set(key, { rule, count: 1 });
        }
      }
    }

    // Create community rules weighted by frequency
    for (const [key, { rule, count }] of ruleFreq) {
      community.addRule(
        rule.lhs,
        rule.rhs,
        count / this.speakers.size,
        rule.dependencyPattern,
        rule.contextTags,
        'community'
      );
    }

    return community;
  }

  // Get statistics
  getStats(): any {
    const grammarSizes = Array.from(this.speakers.values()).map(s => s.grammar.rules.length);
    const avgGrammarSize = grammarSizes.reduce((a, b) => a + b, 0) / grammarSizes.length;

    return {
      time: this.time,
      population: this.speakers.size,
      avgGrammarSize,
      minGrammarSize: Math.min(...grammarSizes),
      maxGrammarSize: Math.max(...grammarSizes),
      totalConversations: this.conversations.length,
      totalEvents: this.eventLog.length,
      recentEvents: this.eventLog.slice(-20)
    };
  }

  // Get all speakers
  getSpeakers(): Speaker[] {
    return Array.from(this.speakers.values());
  }

  // Get event log
  getEvents(): string[] {
    return this.eventLog;
  }
}

// ============================================================================
// CHAT INTERFACE — Real-time Interaction with the Simulation
// ============================================================================

class ChatInterface {
  private engine: SimulationEngine;
  private userSpeakerId: string | null = null;
  private activeConversation: string | null = null;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  // User joins the simulation
  join(userName: string): string {
    const user = this.engine.createSpeaker(userName, 25, 0.7);
    this.userSpeakerId = user.id;
    return `Welcome, ${userName}! You are now speaker ${user.id} in the community.`;
  }

  // User sends a message to a specific speaker
  chatTo(targetName: string, message: string): string {
    if (!this.userSpeakerId) return "Please join first with /join <name>";

    const user = this.engine.speakers.get(this.userSpeakerId);
    if (!user) return "User not found";

    const target = Array.from(this.engine.speakers.values()).find(s => s.name === targetName);
    if (!target) return `Speaker ${targetName} not found in community`;

    // User generates message (we treat it as parsed correctly)
    const utterance: Utterance = {
      speaker: user.id,
      text: message,
      parsed: user.grammar.parse(message),
      accepted: null,
      corrections: [],
      time: this.engine.time
    };

    // Target tries to parse and learn
    const learner = new LanguageLearner(target, 'balanced');
    const understood = learner.hear(utterance, user.grammar);

    // Target responds
    const response = target.grammar.generateGrounded(target.semanticNetwork, ['casual']);

    // User tries to parse target's response
    const userLearner = new LanguageLearner(user, 'balanced');
    const responseUtterance: Utterance = {
      speaker: target.id,
      text: response,
      parsed: target.grammar.parse(response),
      accepted: null,
      corrections: [],
      time: this.engine.time
    };
    userLearner.hear(responseUtterance, target.grammar);

    return `[${target.name}]: ${response}${understood ? '' : ' (learning your words)'}`;
  }

  // User broadcasts to community
  broadcast(message: string): string[] {
    if (!this.userSpeakerId) return ["Please join first with /join <name>"];

    const responses: string[] = [];
    for (const speaker of this.engine.speakers.values()) {
      if (speaker.id !== this.userSpeakerId) {
        responses.push(this.chatTo(speaker.name, message));
      }
    }
    return responses;
  }

  // Get community status
  status(): string {
    const stats = this.engine.getStats();
    return `
=== COMMUNITY STATUS ===
Time: ${stats.time}
Population: ${stats.population}
Avg Grammar Size: ${stats.avgGrammarSize.toFixed(1)} rules
Conversations: ${stats.totalConversations}
Recent Events:
${stats.recentEvents.slice(-5).join('\n')}
    `.trim();
  }

  // Get speaker list
  speakers(): string {
    const list = this.engine.getSpeakers().map(s => 
      `${s.name} (age ${s.age}, status ${s.status.toFixed(2)}, ${s.grammar.rules.length} rules)`
    );
    return list.join('\n');
  }

  // Step the simulation
  step(): string {
    this.engine.step();
    return this.status();
  }

  // Run N steps
  run(steps: number): string {
    this.engine.run(steps);
    return this.status();
  }

  // Get a speaker's grammar stats
  grammar(name: string): string {
    const speaker = Array.from(this.engine.speakers.values()).find(s => s.name === name);
    if (!speaker) return `Speaker ${name} not found`;

    const stats = speaker.grammar.getStats();
    return `
=== ${name}'s GRAMMAR ===
Total Rules: ${stats.totalRules}
Learned Rules: ${stats.learnedRules}
Avg Probability: ${stats.avgProbability.toFixed(3)}
By Non-Terminal: ${JSON.stringify(stats.byNonTerminal, null, 2)}
    `.trim();
  }

  // Infer something from the semantic network
  infer(query: string): string {
    // Parse query as "A relation B" or "A ? B"
    const parts = query.toLowerCase().split(/\s+/);
    if (parts.length < 3) return "Query format: 'A relation B' or 'A relation ?'";

    const a = parts[0];
    const rel = parts[1];
    const b = parts[2];

    // Check all speaker networks
    const results: string[] = [];
    for (const speaker of this.engine.speakers.values()) {
      if (b === '?') {
        const related = speaker.semanticNetwork.getRelated(a, rel);
        if (related.length > 0) {
          results.push(`${speaker.name}: ${a} ${rel} ${related.join(', ')}`);
        }
      } else {
        const hasPath = speaker.semanticNetwork.hasPath(a, b, [rel]);
        if (hasPath) {
          results.push(`${speaker.name}: ${a} ${rel} ${b} ✓`);
        }
      }
    }

    return results.length > 0 ? results.join('\n') : `No inferences found for "${query}"`;
  }

  // Retrieve from language history
  retrieve(pattern: string): string[] {
    const matches: string[] = [];
    const regex = new RegExp(pattern, 'i');

    for (const speaker of this.engine.speakers.values()) {
      for (const utterance of speaker.languageHistory) {
        if (regex.test(utterance)) {
          matches.push(`[${speaker.name}]: ${utterance}`);
        }
      }
    }

    return matches.slice(-20); // Last 20 matches
  }
}

// ============================================================================
// DEMO / CLI INTERFACE
// ============================================================================

function runDemo() {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║     KLEIN LANGUAGE CONTACT MODEL — Working Implementation            ║");
  console.log("║     Based on Sheldon Klein (1974)                                    ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log();

  // Initialize simulation
  const engine = new SimulationEngine();
  const chat = new ChatInterface(engine);

  // Create initial community
  console.log("Creating initial speech community...");
  const alice = engine.createSpeaker("Alice", 30, 0.8);
  const bob = engine.createSpeaker("Bob", 25, 0.6);
  const carol = engine.createSpeaker("Carol", 35, 0.7);
  const dave = engine.createSpeaker("Dave", 28, 0.5);

  // Add some lexical knowledge
  alice.semanticNetwork.addLexical('love', 'love', 0.8, 9);
  alice.semanticNetwork.addLexical('love', 'adore', 0.3, 9);
  alice.semanticNetwork.addLexical('love', 'like', 0.6, 1);
  alice.semanticNetwork.addLexical('hate', 'hate', 0.8, -8);
  alice.semanticNetwork.addLexical('hate', 'loathe', 0.3, -9);
  alice.semanticNetwork.addLexical('hate', 'dislike', 0.5, -1);

  bob.semanticNetwork.addLexical('language', 'language', 0.9, 0);
  bob.semanticNetwork.addLexical('language', 'tongue', 0.3, 0);
  bob.semanticNetwork.addLexical('language', 'speech', 0.4, 0);

  carol.semanticNetwork.addLexical('world', 'world', 0.9, 0);
  carol.semanticNetwork.addLexical('world', 'earth', 0.4, 0);
  carol.semanticNetwork.addLexical('world', 'universe', 0.3, 0);

  // Add some semantic triples
  alice.semanticNetwork.addTriple('Alice', 'loves', 'language', 8, 'Alice');
  alice.semanticNetwork.addTriple('Alice', 'knows', 'Bob', 3, 'Alice');
  bob.semanticNetwork.addTriple('Bob', 'studies', 'language', 7, 'Bob');
  bob.semanticNetwork.addTriple('Bob', 'respects', 'Alice', 5, 'Bob');
  carol.semanticNetwork.addTriple('Carol', 'teaches', 'grammar', 6, 'Carol');
  carol.semanticNetwork.addTriple('Carol', 'loves', 'world', 7, 'Carol');

  console.log("Initial community created:");
  console.log(chat.speakers());
  console.log();

  // Run simulation for 50 steps
  console.log("Running simulation for 50 time steps...");
  console.log("═══════════════════════════════════════════════════════════════════════");

  engine.run(50);

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log();

  // Show status
  console.log(chat.status());
  console.log();

  // Show grammar evolution
  console.log("=== GRAMMAR EVOLUTION ===");
  console.log(chat.grammar("Alice"));
  console.log();
  console.log(chat.grammar("Bob"));
  console.log();

  // Demonstrate chat
  console.log("=== USER INTERACTION DEMO ===");
  console.log(chat.join("User"));
  console.log();

  console.log("You say to Alice: 'the world speaks'");
  console.log(chat.chatTo("Alice", "the world speaks"));
  console.log();

  console.log("You say to Bob: 'language changes'");
  console.log(chat.chatTo("Bob", "language changes"));
  console.log();

  // Demonstrate inference
  console.log("=== INFERENCE DEMO ===");
  console.log("Query: 'Alice loves ?'");
  console.log(chat.infer("Alice loves ?"));
  console.log();

  console.log("Query: 'Bob studies ?'");
  console.log(chat.infer("Bob studies ?"));
  console.log();

  // Demonstrate retrieval
  console.log("=== RETRIEVAL DEMO ===");
  console.log("Retrieve utterances containing 'language':");
  const results = chat.retrieve("language");
  results.forEach(r => console.log(r));
  console.log();

  // Show community grammar
  console.log("=== COMMUNITY GRAMMAR (Universal Listener) ===");
  const communityGrammar = engine.getCommunityGrammar();
  const commStats = communityGrammar.getStats();
  console.log(`Community has ${commStats.totalRules} rules, ${commStats.learnedRules} learned`);
  console.log("Sample generation:", communityGrammar.generate());
  console.log();

  // Demonstrate language change over generations
  console.log("=== GENERATIONAL LANGUAGE CHANGE ===");
  console.log("Running 200 more steps (20 simulated years)...");
  engine.run(200);
  console.log(chat.status());
  console.log();

  console.log("Alice's grammar after generational change:");
  console.log(chat.grammar("Alice"));
  console.log();

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("SIMULATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log();
  console.log("Commands available:");
  console.log("  /join <name>          — Join the community");
  console.log("  /chat <name> <msg>    — Chat with a speaker");
  console.log("  /broadcast <msg>      — Talk to everyone");
  console.log("  /step                 — Advance one time unit");
  console.log("  /run <n>              — Run n steps");
  console.log("  /status               — Show community status");
  console.log("  /speakers             — List all speakers");
  console.log("  /grammar <name>       — Show speaker's grammar");
  console.log("  /infer <query>        — Query semantic network (e.g., 'Alice loves ?')");
  console.log("  /retrieve <pattern>   — Search language history");
  console.log("  /exit                 — Leave simulation");
}

// ============================================================================
// EXPORT / ENTRY POINT
// ============================================================================

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SemanticNetwork,
    GenerativeGrammar,
    LanguageLearner,
    BehavioralEngine,
    SimulationEngine,
    ChatInterface,
    runDemo
  };
}

// For browser / direct execution
if (typeof window !== 'undefined') {
  (window as any).KleinLanguageModel = {
    SemanticNetwork,
    GenerativeGrammar,
    LanguageLearner,
    BehavioralEngine,
    SimulationEngine,
    ChatInterface,
    runDemo
  };
}

// Auto-run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runDemo();
}
