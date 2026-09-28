/**
 * DISEMINER — Distributional-Semantics Inference Maker
 * Based on Sheldon Klein's 1965-1973 work:
 *  - Control of Style with a Generative Grammar (Language, 1965)
 *  - Automatic Inference of Semantic Deep Structure Rules (Pisa, 1973)
 *  - Computer Simulation of Language Contact Models (SECOL 8, 1972)
 *  - DISEMINER: A Distributional-Semantics Inference Maker (1968)
 *
 * Integrated into the YOU-N-I-VERSE Living Mirror as a narrative engine
 * that runs Monte Carlo simulations on user queries, bypasses doubt,
 * and positively influences through personalized narratives.
 *
 * 5-Dimensional Stack mapping:
 *   D1 (Impulse)    → User query / emotional trigger
 *   D2 (Polarity)   → Semantic triple decomposition (O-R-O)
 *   D3 (Witness)    → Monte Carlo simulation / narrative generation
 *   D4 (Context)    → User profile (Base/Tone/Color) + HD gate mapping
 *   D5 (Meaning)    → Personalized narrative artifact
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface SemanticTriple {
  alpha: number;      // Object or Relation node ID
  gamma: number;      // Relation (can be empty)
  beta: number;       // Object (can be empty)
  timeCreated: number; // Simulation clock time
  timeDeleted: number | null;
  lexicalExpressions: LexicalExpression[];
  frequencyWeight: number;
  contextualMarkings: string[];
}

interface LexicalExpression {
  stem: string;
  partOfSpeech: string;
  probability: number;
  emotionalValence: number; // -10 to +10 scale per Klein
  contextualTags: string[];
}

interface SemanticNode {
  id: number;
  type: 'object' | 'relation';
  lexicalList: LexicalExpression[];
  triplePointers: number[]; // IDs of triples this node participates in
  numericalValue: number | null; // For dynamic emotion scales
}

interface GenerativeRule {
  id: string;
  surfaceStructure: string;  // Phrase structure rule
  semanticForm: string;     // Canonical semantic triple form
  probabilityWeight: number;
  frequencyOfUse: number;
  dependencyPattern: string;
  contextualRestrictions: string[];
}

interface Speaker {
  id: string;
  name: string;
  semanticNetwork: Map<number, SemanticTriple>;
  grammarRules: GenerativeRule[];
  socialStatus: number;
  age: number;
  emotionalState: Map<number, number>; // node ID -> valence
  interactionHistory: InteractionRecord[];
  profile: UserProfile;
}

interface InteractionRecord {
  speakerId: string;
  utterance: string;
  semanticTriple: SemanticTriple;
  timestamp: number;
  parsed: boolean;
  accepted: boolean;
}

interface UserProfile {
  base: number;   // 1-5 (Movement, Evolution, Being, Design, Space)
  tone: number;   // 1-6 (Smell, Taste, Sound, Touch, Inner Vision, Outer Vision)
  color: number;  // 1-6 (Fear, Hope, Desire, Need, Guilt, Innocence)
  name: string;
  activeGates: number[];
  definedChannels: number[];
}

interface SimulationState {
  clock: number;
  speakers: Map<string, Speaker>;
  globalNetwork: Map<number, SemanticTriple>;
  communityGrammar: GenerativeRule[];
  eventQueue: SimulationEvent[];
}

interface SimulationEvent {
  type: 'interaction' | 'birth' | 'death' | 'learning' | 'rule_modification';
  timestamp: number;
  participants: string[];
  probability: number;
  payload: any;
}

interface NarrativeResult {
  narrative: string;
  semanticPath: SemanticTriple[];
  confidence: number;
  emotionalTrajectory: number[];
  gateActivations: number[];
  styleProfile: StyleProfile;
  monteCarloRuns: number;
}

interface StyleProfile {
  syntacticStructureFrequencies: Map<string, number>;
  pronounFrequency: number;
  emotionalValence: number;
  complexityScore: number;
  baseVoice: string;
  toneNature: string;
  colorMotivation: string;
}

// ============================================================
// CONSTANTS — Klein's Framework mapped to HD
// ============================================================

const BASE_VOICES: Record<number, string> = {
  1: "I Define", 2: "I Remember", 3: "I Am", 4: "I Design", 5: "I Think"
};

const BASE_DIMENSIONS: Record<number, string> = {
  1: "Movement", 2: "Evolution", 3: "Being", 4: "Design", 5: "Space"
};

const TONE_NATURES: Record<number, string> = {
  1: "Smell", 2: "Taste", 3: "Sound", 4: "Touch", 5: "Inner Vision", 6: "Outer Vision"
};

const COLOR_MOTIVATIONS: Record<number, string> = {
  1: "Fear", 2: "Hope", 3: "Desire", 4: "Need", 5: "Guilt", 6: "Innocence"
};

const PERSPECTIVE_TEMPLATES: Record<string, string[]> = {
  who: [
    "{voice} the one shaped by {pressure}, moving through {process}, arriving at {resolution}.",
    "At the Base of {dimension}, expressed through {tone}, responding with {color}.",
    "Your identity crystallizes around {pressure} — this is the thread that weaves your story."
  ],
  what: [
    "This is a process of {process}, pressured by {pressure}, resolving into {resolution}.",
    "At the Base of {dimension}, modulated by {tone}, colored by {color}.",
    "The field of {pressure} is organizing your experience into {resolution}."
  ],
  when: [
    "This emerges when {resolution} becomes possible, driven by {pressure}, moving through {process}.",
    "At the Base of {dimension}, sensed through {tone}, motivated by {color}.",
    "The timing is governed by {pressure} — patience is the hidden variable."
  ],
  why: [
    "This exists because of {pressure}, the force that drives {process} toward {resolution}.",
    "At the Base of {dimension}, perceived through {tone}, shaped by {color}.",
    "The deeper reason lives in {pressure} — it is the gravity well of your meaning."
  ],
  how: [
    "It works through {process}, pressured by {pressure}, arriving at {resolution}.",
    "At the Base of {dimension}, felt as {tone}, guided by {color}.",
    "The mechanism is {process} — trust the process, not the outcome."
  ]
};

// ============================================================
// SEMANTIC TRIPLE NETWORK — Core of Klein's 1973 System
// ============================================================

class SemanticNetwork {
  private nodes: Map<number, SemanticNode> = new Map();
  private triples: Map<number, SemanticTriple> = new Map();
  private nextNodeId: number = 1;
  private nextTripleId: number = 1;
  private clock: number = 0;

  constructor() {
    this.initializeCoreRelations();
  }

  private initializeCoreRelations() {
    // Core semantic relations per Klein's framework
    const coreRelations = [
      { stem: 'break', pos: 'verb', valence: -3 },
      { stem: 'love', pos: 'verb', valence: 9 },
      { stem: 'know', pos: 'verb', valence: 2 },
      { stem: 'feel', pos: 'verb', valence: 5 },
      { stem: 'create', pos: 'verb', valence: 8 },
      { stem: 'struggle', pos: 'verb', valence: -4 },
      { stem: 'accept', pos: 'verb', valence: 6 },
      { stem: 'resist', pos: 'verb', valence: -5 },
      { stem: 'transform', pos: 'verb', valence: 7 },
      { stem: 'in', pos: 'prep', valence: 0 },
      { stem: 'with', pos: 'prep', valence: 0 },
      { stem: 'through', pos: 'prep', valence: 0 },
      { stem: 'toward', pos: 'prep', valence: 0 }
    ];

    coreRelations.forEach(rel => {
      this.createNode('relation', [{
        stem: rel.stem,
        partOfSpeech: rel.pos,
        probability: 1.0,
        emotionalValence: rel.valence,
        contextualTags: ['core']
      }]);
    });
  }

  createNode(type: 'object' | 'relation', lexicalList: LexicalExpression[]): number {
    const id = this.nextNodeId++;
    const node: SemanticNode = {
      id,
      type,
      lexicalList,
      triplePointers: [],
      numericalValue: null
    };
    this.nodes.set(id, node);
    return id;
  }

  createTriple(alpha: number, gamma: number | null, beta: number | null): number {
    const id = this.nextTripleId++;
    const triple: SemanticTriple = {
      alpha,
      gamma: gamma || 0,
      beta: beta || 0,
      timeCreated: this.clock,
      timeDeleted: null,
      lexicalExpressions: [],
      frequencyWeight: 1.0,
      contextualMarkings: []
    };
    this.triples.set(id, triple);

    // Link to nodes
    const alphaNode = this.nodes.get(alpha);
    if (alphaNode) alphaNode.triplePointers.push(id);
    if (gamma) {
      const gammaNode = this.nodes.get(gamma);
      if (gammaNode) gammaNode.triplePointers.push(id);
    }
    if (beta) {
      const betaNode = this.nodes.get(beta);
      if (betaNode) betaNode.triplePointers.push(id);
    }

    return id;
  }

  // Klein's dynamic class creation: "set of all men who have kissed Mary"
  createDynamicClass(condition: (triple: SemanticTriple) => boolean): number[] {
    const members: number[] = [];
    this.triples.forEach((triple, id) => {
      if (condition(triple) && triple.timeDeleted === null) {
        members.push(id);
      }
    });
    return members;
  }

  // Query: Is there a path between A and B through Rk or Rj but not Rm?
  queryPath(
    startNode: number,
    endNode: number,
    allowedRelations: number[],
    forbiddenRelations: number[]
  ): SemanticTriple[] | null {
    const visited = new Set<number>();
    const queue: { node: number; path: SemanticTriple[] }[] = [
      { node: startNode, path: [] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === endNode && current.path.length > 0) {
        return current.path;
      }

      if (visited.has(current.node)) continue;
      visited.add(current.node);

      const node = this.nodes.get(current.node);
      if (!node) continue;

      for (const tripleId of node.triplePointers) {
        const triple = this.triples.get(tripleId);
        if (!triple || triple.timeDeleted !== null) continue;

        // Check relation constraints
        const relationValid = allowedRelations.length === 0 ||
          allowedRelations.includes(triple.gamma);
        const relationForbidden = forbiddenRelations.includes(triple.gamma);

        if (!relationValid || relationForbidden) continue;

        // Find next node
        let nextNode: number | null = null;
        if (triple.alpha === current.node) nextNode = triple.beta;
        else if (triple.beta === current.node) nextNode = triple.alpha;

        if (nextNode !== null && !visited.has(nextNode)) {
          queue.push({
            node: nextNode,
            path: [...current.path, triple]
          });
        }
      }
    }

    return null;
  }

  // Emotional valence modification per Klein's +10 to -10 scale
  setEmotionalValence(nodeId: number, valence: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.numericalValue = Math.max(-10, Math.min(10, valence));
    }
  }

  // Get emotional valence of a relation
  getEmotionalValence(tripleId: number): number {
    const triple = this.triples.get(tripleId);
    if (!triple) return 0;
    const relNode = this.nodes.get(triple.gamma);
    return relNode?.numericalValue || 0;
  }

  advanceClock(): void {
    this.clock++;
  }

  getClock(): number {
    return this.clock;
  }

  getTriples(): Map<number, SemanticTriple> {
    return this.triples;
  }

  getNodes(): Map<number, SemanticNode> {
    return this.nodes;
  }
}

// ============================================================
// GENERATIVE GRAMMAR ENGINE — Klein 1965 Style Control
// ============================================================

class GenerativeGrammar {
  private rules: GenerativeRule[] = [];
  private styleWeights: Map<string, number> = new Map();
  private dependencyPatterns: Map<string, string[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Phrase structure rules with semantic mappings (Klein's S → NP VP // O-R)
    this.rules = [
      {
        id: 'S1',
        surfaceStructure: 'S → NP VP',
        semanticForm: 'O-R',
        probabilityWeight: 1.0,
        frequencyOfUse: 0,
        dependencyPattern: 'subject-predicate',
        contextualRestrictions: []
      },
      {
        id: 'S2',
        surfaceStructure: 'S → NP VP PP',
        semanticForm: 'O-R-R-O',
        probabilityWeight: 0.7,
        frequencyOfUse: 0,
        dependencyPattern: 'subject-predicate-modifier',
        contextualRestrictions: ['spatial']
      },
      {
        id: 'NP1',
        surfaceStructure: 'NP → Det N',
        semanticForm: 'O',
        probabilityWeight: 1.0,
        frequencyOfUse: 0,
        dependencyPattern: 'determiner-noun',
        contextualRestrictions: []
      },
      {
        id: 'NP2',
        surfaceStructure: 'NP → NP PP',
        semanticForm: 'O-R-O',
        probabilityWeight: 0.6,
        frequencyOfUse: 0,
        dependencyPattern: 'noun-modifier',
        contextualRestrictions: ['spatial', 'temporal']
      },
      {
        id: 'VP1',
        surfaceStructure: 'VP → V NP',
        semanticForm: 'R-O',
        probabilityWeight: 1.0,
        frequencyOfUse: 0,
        dependencyPattern: 'verb-object',
        contextualRestrictions: []
      },
      {
        id: 'VP2',
        surfaceStructure: 'VP → V PP',
        semanticForm: 'R-R-O',
        probabilityWeight: 0.5,
        frequencyOfUse: 0,
        dependencyPattern: 'verb-modifier',
        contextualRestrictions: ['spatial']
      },
      {
        id: 'PP1',
        surfaceStructure: 'PP → Prep NP',
        semanticForm: 'R-O',
        probabilityWeight: 1.0,
        frequencyOfUse: 0,
        dependencyPattern: 'preposition-object',
        contextualRestrictions: []
      }
    ];
  }

  // Klein's style control: weight rules by frequency in source text
  adaptStyleFromCorpus(corpus: string[]): void {
    const structureCounts = new Map<string, number>();
    const total = corpus.length;

    corpus.forEach(sentence => {
      const structure = this.inferStructure(sentence);
      structureCounts.set(structure, (structureCounts.get(structure) || 0) + 1);
    });

    this.rules.forEach(rule => {
      const freq = structureCounts.get(rule.surfaceStructure) || 0;
      rule.frequencyOfUse = freq;
      // Weight = normalized frequency + base probability
      const normalizedFreq = total > 0 ? freq / total : 0.5;
      rule.probabilityWeight = (rule.probabilityWeight * 0.3) + (normalizedFreq * 0.7);
    });
  }

  private inferStructure(sentence: string): string {
    // Simplified structure inference
    if (sentence.includes('in the') || sentence.includes('with a')) {
      return 'S → NP VP PP';
    }
    return 'S → NP VP';
  }

  // Generate sentence from semantic triple with style control
  generateFromTriple(
    triple: SemanticTriple,
    network: SemanticNetwork,
    styleProfile: StyleProfile
  ): string {
    const nodeMap = network.getNodes();
    const alphaNode = nodeMap.get(triple.alpha);
    const gammaNode = nodeMap.get(triple.gamma);
    const betaNode = nodeMap.get(triple.beta);

    if (!alphaNode || !gammaNode || !betaNode) return '';

    // Select lexical items based on emotional valence and style
    const alphaLex = this.selectLexicalItem(alphaNode, styleProfile);
    const gammaLex = this.selectLexicalItem(gammaNode, styleProfile);
    const betaLex = this.selectLexicalItem(betaNode, styleProfile);

    // Apply pronoun frequency control (Klein 1965)
    const pronounProbability = styleProfile.pronounFrequency;
    const usePronoun = Math.random() < pronounProbability;

    let subject = alphaLex.stem;
    if (usePronoun && alphaLex.partOfSpeech === 'noun') {
      subject = 'You'; // Personalized for Living Mirror
    }

    // Build sentence with dependency-aware ordering
    const sentence = `${subject} ${gammaLex.stem} ${betaLex.stem}`;

    // Apply emotional valence coloring
    const valence = gammaNode.numericalValue || 0;
    if (valence > 5) {
      return sentence + ', and this is beautiful';
    } else if (valence < -5) {
      return sentence + ', yet this too shall pass';
    }

    return sentence;
  }

  private selectLexicalItem(node: SemanticNode, style: StyleProfile): LexicalExpression {
    // Weighted selection based on style profile and emotional valence
    const candidates = node.lexicalList.filter(lex =>
      style.syntacticStructureFrequencies.has(lex.partOfSpeech)
    );

    if (candidates.length === 0) {
      return node.lexicalList[0] || { stem: 'something', partOfSpeech: 'noun', probability: 1, emotionalValence: 0, contextualTags: [] };
    }

    // Weight by probability and emotional alignment
    const weights = candidates.map(lex => {
      const styleWeight = style.syntacticStructureFrequencies.get(lex.partOfSpeech) || 0.5;
      const emotionalAlignment = 1 - Math.abs((lex.emotionalValence / 10) - (style.emotionalValence / 10));
      return lex.probability * styleWeight * emotionalAlignment;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      random -= weights[i];
      if (random <= 0) return candidates[i];
    }

    return candidates[candidates.length - 1];
  }

  // Get weighted random rule (Klein's Monte Carlo selection)
  selectRule(ruleType: string): GenerativeRule | null {
    const candidates = this.rules.filter(r => r.surfaceStructure.startsWith(ruleType));
    if (candidates.length === 0) return null;

    const totalWeight = candidates.reduce((sum, r) => sum + r.probabilityWeight, 0);
    let random = Math.random() * totalWeight;

    for (const rule of candidates) {
      random -= rule.probabilityWeight;
      if (random <= 0) return rule;
    }

    return candidates[candidates.length - 1];
  }
}

// ============================================================
// MONTE CARLO SIMULATION ENGINE — Klein 1972
// ============================================================

class MonteCarloSimulator {
  private state: SimulationState;
  private randomSeed: number;
  private learningRate: number = 0.1;
  private decayRate: number = 0.05;

  constructor(seed: number = Date.now()) {
    this.randomSeed = seed;
    this.state = {
      clock: 0,
      speakers: new Map(),
      globalNetwork: new Map(),
      communityGrammar: [],
      eventQueue: []
    };
  }

  // Seeded random number generator for reproducibility
  private random(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  addSpeaker(speaker: Speaker): void {
    this.state.speakers.set(speaker.id, speaker);
  }

  // Simulate conversational interaction between two speakers
  simulateInteraction(speaker1Id: string, speaker2Id: string): InteractionRecord | null {
    const s1 = this.state.speakers.get(speaker1Id);
    const s2 = this.state.speakers.get(speaker2Id);
    if (!s1 || !s2) return null;

    // Speaker 1 generates an utterance
    const utterance = this.generateUtterance(s1);

    // Speaker 2 attempts to parse it
    const parsed = this.parseUtterance(utterance, s2);
    const accepted = parsed && this.random() > 0.3; // 70% acceptance rate

    const record: InteractionRecord = {
      speakerId: speaker1Id,
      utterance,
      semanticTriple: parsed || this.createDefaultTriple(),
      timestamp: this.state.clock,
      parsed: !!parsed,
      accepted
    };

    // Learning: if not parsed/accepted, trigger rule synthesis
    if (!accepted) {
      this.triggerLearning(s2, record);
    }

    // Update frequencies
    this.updateRuleFrequencies(s1, utterance);

    s1.interactionHistory.push(record);
    s2.interactionHistory.push(record);

    return record;
  }

  private generateUtterance(speaker: Speaker): string {
    // Select a random triple from speaker's network
    const triples = Array.from(speaker.semanticNetwork.values());
    if (triples.length === 0) return "...";

    const triple = triples[Math.floor(this.random() * triples.length)];

    // Generate using grammar with style control
    const grammar = new GenerativeGrammar();
    const style = this.inferStyleFromSpeaker(speaker);

    return grammar.generateFromTriple(triple, speaker.semanticNetwork, style);
  }

  private parseUtterance(utterance: string, speaker: Speaker): SemanticTriple | null {
    // Simplified parsing: check if utterance maps to known triples
    const triples = Array.from(speaker.semanticNetwork.values());
    for (const triple of triples) {
      // Check lexical match
      const nodeMap = speaker.semanticNetwork.getNodes ? new Map() : new Map();
      // In real implementation, would do full dependency parse
      if (this.random() > 0.5) {
        return triple;
      }
    }
    return null;
  }

  private createDefaultTriple(): SemanticTriple {
    return {
      alpha: 0, gamma: 0, beta: 0,
      timeCreated: this.state.clock,
      timeDeleted: null,
      lexicalExpressions: [],
      frequencyWeight: 0.1,
      contextualMarkings: ['unparsed']
    };
  }

  private triggerLearning(speaker: Speaker, record: InteractionRecord): void {
    // Klein's learning heuristics:
    // (a) Maximum generalization from data
    // (b) Minimum generalization from data
    // (c) Unification and generalization of existing rules
    // (d) Different degrees for different portions

    const heuristic = this.random();
    if (heuristic < 0.25) {
      // Maximum generalization: adopt rule directly
      this.adoptRule(speaker, record);
    } else if (heuristic < 0.5) {
      // Minimum generalization: create specific rule
      this.createSpecificRule(speaker, record);
    } else if (heuristic < 0.75) {
      // Unify existing rules
      this.unifyRules(speaker, record);
    } else {
      // Context-dependent learning
      this.contextualLearning(speaker, record);
    }
  }

  private adoptRule(speaker: Speaker, record: InteractionRecord): void {
    // "Outright theft of relevant rules from other grammars"
    const newRule: GenerativeRule = {
      id: `R_${this.state.clock}_${speaker.id}`,
      surfaceStructure: this.inferStructure(record.utterance),
      semanticForm: 'O-R-O',
      probabilityWeight: this.learningRate,
      frequencyOfUse: 1,
      dependencyPattern: 'adopted',
      contextualRestrictions: []
    };
    speaker.grammarRules.push(newRule);
  }

  private createSpecificRule(speaker: Speaker, record: InteractionRecord): void {
    // Create highly specific rule for this exact context
    const newRule: GenerativeRule = {
      id: `S_${this.state.clock}_${speaker.id}`,
      surfaceStructure: record.utterance,
      semanticForm: 'O-R-O',
      probabilityWeight: this.learningRate * 2,
      frequencyOfUse: 1,
      dependencyPattern: 'specific',
      contextualRestrictions: [`timestamp_${this.state.clock}`]
    };
    speaker.grammarRules.push(newRule);
  }

  private unifyRules(speaker: Speaker, record: InteractionRecord): void {
    // Find similar rules and merge them
    const similar = speaker.grammarRules.filter(r =>
      r.dependencyPattern === this.inferStructure(record.utterance)
    );

    if (similar.length >= 2) {
      // Merge into more general rule
      const unified: GenerativeRule = {
        id: `U_${this.state.clock}_${speaker.id}`,
        surfaceStructure: similar[0].surfaceStructure,
        semanticForm: 'O-R-O',
        probabilityWeight: similar.reduce((sum, r) => sum + r.probabilityWeight, 0) / similar.length,
        frequencyOfUse: similar.reduce((sum, r) => sum + r.frequencyOfUse, 0),
        dependencyPattern: 'unified',
        contextualRestrictions: []
      };
      speaker.grammarRules.push(unified);
    }
  }

  private contextualLearning(speaker: Speaker, record: InteractionRecord): void {
    // Link rule to specific social context
    const context = this.inferContext(speaker, record);
    const newRule: GenerativeRule = {
      id: `C_${this.state.clock}_${speaker.id}`,
      surfaceStructure: this.inferStructure(record.utterance),
      semanticForm: 'O-R-O',
      probabilityWeight: this.learningRate,
      frequencyOfUse: 1,
      dependencyPattern: 'contextual',
      contextualRestrictions: [context]
    };
    speaker.grammarRules.push(newRule);
  }

  private inferStructure(utterance: string): string {
    const words = utterance.split(' ');
    if (words.length <= 3) return 'S → NP VP';
    if (words.length <= 6) return 'S → NP VP PP';
    return 'S → NP VP PP PP';
  }

  private inferContext(speaker: Speaker, record: InteractionRecord): string {
    return `age_${speaker.age}_status_${speaker.socialStatus}`;
  }

  private inferStyleFromSpeaker(speaker: Speaker): StyleProfile {
    const base = speaker.profile.base;
    const tone = speaker.profile.tone;
    const color = speaker.profile.color;

    return {
      syntacticStructureFrequencies: new Map([
        ['noun', 0.3], ['verb', 0.25], ['adj', 0.15], ['prep', 0.15], ['pronoun', 0.15]
      ]),
      pronounFrequency: base === 3 ? 0.6 : 0.3, // "I Am" uses more pronouns
      emotionalValence: COLOR_MOTIVATIONS[color] === 'Hope' ? 7 : COLOR_MOTIVATIONS[color] === 'Fear' ? -7 : 0,
      complexityScore: base === 5 ? 0.8 : 0.5, // "I Think" is more complex
      baseVoice: BASE_VOICES[base] || "I",
      toneNature: TONE_NATURES[tone] || "Touch",
      colorMotivation: COLOR_MOTIVATIONS[color] || "Hope"
    };
  }

  private updateRuleFrequencies(speaker: Speaker, utterance: string): void {
    speaker.grammarRules.forEach(rule => {
      if (utterance.includes(rule.surfaceStructure.split('→')[1]?.trim() || '')) {
        rule.frequencyOfUse++;
        rule.probabilityWeight = Math.min(1.0, rule.probabilityWeight + this.learningRate);
      } else {
        // Decay unused rules
        rule.probabilityWeight = Math.max(0.01, rule.probabilityWeight * (1 - this.decayRate));
      }
    });
  }

  // Run full simulation for N generations
  runSimulation(generations: number, interactionsPerGeneration: number): SimulationState {
    const speakerIds = Array.from(this.state.speakers.keys());

    for (let gen = 0; gen < generations; gen++) {
      this.state.clock = gen;

      for (let i = 0; i < interactionsPerGeneration; i++) {
        // Select speakers based on social interaction rules
        const s1 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        let s2 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        while (s2 === s1) {
          s2 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        }

        this.simulateInteraction(s1, s2);
      }

      // Birth/death events
      if (gen % 10 === 0) {
        this.handleBirthDeath();
      }
    }

    return this.state;
  }

  private handleBirthDeath(): void {
    // Simulate birth: new speaker with empty grammar
    if (this.random() < 0.1) {
      const newId = `speaker_${this.state.clock}_${Math.floor(this.random() * 1000)}`;
      const newSpeaker: Speaker = {
        id: newId,
        name: `Child_${newId}`,
        semanticNetwork: new SemanticNetwork(),
        grammarRules: [],
        socialStatus: 0.5,
        age: 0,
        emotionalState: new Map(),
        interactionHistory: [],
        profile: { base: 3, tone: 4, color: 2, name: 'Child', activeGates: [], definedChannels: [] }
      };
      this.state.speakers.set(newId, newSpeaker);
    }

    // Simulate death
    const speakers = Array.from(this.state.speakers.values());
    const oldSpeakers = speakers.filter(s => s.age > 70);
    if (oldSpeakers.length > 0 && this.random() < 0.05) {
      const toDie = oldSpeakers[Math.floor(this.random() * oldSpeakers.length)];
      this.state.speakers.delete(toDie.id);
    }

    // Age everyone
    speakers.forEach(s => s.age++);
  }

  getState(): SimulationState {
    return this.state;
  }
}

// ============================================================
// DISEMINER NARRATIVE ENGINE — Integration with Living Mirror
// ============================================================

export class DiseminerEngine {
  private network: SemanticNetwork;
  private grammar: GenerativeGrammar;
  private simulator: MonteCarloSimulator;
  private userProfile: UserProfile;
  private narrativeHistory: NarrativeResult[] = [];
  private gateActivations: Map<number, number> = new Map();

  constructor(profile: UserProfile) {
    this.userProfile = profile;
    this.network = new SemanticNetwork();
    this.grammar = new GenerativeGrammar();
    this.simulator = new MonteCarloSimulator(profile.name.length + profile.base * 100);

    this.initializeUserNetwork();
    this.initializeSimulator();
  }

  private initializeUserNetwork() {
    // Create semantic nodes for user's HD profile
    const baseNode = this.network.createNode('object', [{
      stem: BASE_DIMENSIONS[this.userProfile.base],
      partOfSpeech: 'noun',
      probability: 1.0,
      emotionalValence: 5,
      contextualTags: ['base', 'identity']
    }]);

    const toneNode = this.network.createNode('object', [{
      stem: TONE_NATURES[this.userProfile.tone],
      partOfSpeech: 'noun',
      probability: 1.0,
      emotionalValence: 3,
      contextualTags: ['tone', 'perception']
    }]);

    const colorNode = this.network.createNode('object', [{
      stem: COLOR_MOTIVATIONS[this.userProfile.color],
      partOfSpeech: 'noun',
      probability: 1.0,
      emotionalValence: this.userProfile.color === 2 ? 8 : this.userProfile.color === 1 ? -6 : 0,
      contextualTags: ['color', 'motivation']
    }]);

    // Create relation: user IS their base dimension
    const isRel = this.network.createNode('relation', [{
      stem: 'is',
      partOfSpeech: 'verb',
      probability: 1.0,
      emotionalValence: 0,
      contextualTags: ['identity', 'being']
    }]);

    this.network.createTriple(baseNode, isRel, toneNode);
    this.network.createTriple(toneNode, isRel, colorNode);

    // Set emotional valences
    this.network.setEmotionalValence(baseNode, 5);
    this.network.setEmotionalValence(colorNode, this.userProfile.color === 2 ? 8 : -3);
  }

  private initializeSimulator() {
    // Create user as primary speaker
    const userSpeaker: Speaker = {
      id: 'user',
      name: this.userProfile.name,
      semanticNetwork: this.network,
      grammarRules: [],
      socialStatus: 0.7,
      age: 30,
      emotionalState: new Map(),
      interactionHistory: [],
      profile: this.userProfile
    };

    // Create "universe" speaker (the mirror)
    const mirrorSpeaker: Speaker = {
      id: 'mirror',
      name: 'Mirror',
      semanticNetwork: new SemanticNetwork(),
      grammarRules: [],
      socialStatus: 1.0,
      age: 1000,
      emotionalState: new Map(),
      interactionHistory: [],
      profile: { base: 3, tone: 5, color: 2, name: 'Mirror', activeGates: [1, 2, 3, 4, 5], definedChannels: [] }
    };

    this.simulator.addSpeaker(userSpeaker);
    this.simulator.addSpeaker(mirrorSpeaker);
  }

  // Main entry: process user query through DISEMINER pipeline
  processQuery(query: string): NarrativeResult {
    // D1: Impulse — detect the emotional trigger
    const impulse = this.detectImpulse(query);

    // D2: Polarity — decompose into semantic triples
    const triples = this.decomposeToTriples(query, impulse);

    // D3: Witness — run Monte Carlo simulation
    const simulation = this.runNarrativeSimulation(triples, impulse);

    // D4: Context — apply user profile
    const contextualized = this.applyContext(simulation, triples);

    // D5: Meaning — generate final narrative
    const narrative = this.generateNarrative(contextualized, triples);

    const result: NarrativeResult = {
      narrative: narrative.text,
      semanticPath: triples,
      confidence: narrative.confidence,
      emotionalTrajectory: narrative.trajectory,
      gateActivations: Array.from(this.gateActivations.keys()).filter(g => this.gateActivations.get(g)! > 0.5),
      styleProfile: narrative.style,
      monteCarloRuns: simulation.runs
    };

    this.narrativeHistory.push(result);
    return result;
  }

  private detectImpulse(query: string): { type: string; valence: number; intensity: number } {
    const lower = query.toLowerCase();
    let type = 'neutral';
    let valence = 0;
    let intensity = 0.5;

    // Detect emotional patterns
    const fearPatterns = ['fear', 'anxiety', 'scared', 'worried', 'afraid'];
    const hopePatterns = ['hope', 'dream', 'wish', 'want', 'desire'];
    const lovePatterns = ['love', 'care', 'connect', 'relationship'];
    const strugglePatterns = ['stuck', 'struggle', 'hard', 'difficult', 'pain'];
    const powerPatterns = ['power', 'energy', 'force', 'strength'];

    if (fearPatterns.some(p => lower.includes(p))) { type = 'fear'; valence = -7; intensity = 0.8; }
    else if (hopePatterns.some(p => lower.includes(p))) { type = 'hope'; valence = 8; intensity = 0.7; }
    else if (lovePatterns.some(p => lower.includes(p))) { type = 'love'; valence = 9; intensity = 0.6; }
    else if (strugglePatterns.some(p => lower.includes(p))) { type = 'struggle'; valence = -4; intensity = 0.9; }
    else if (powerPatterns.some(p => lower.includes(p))) { type = 'power'; valence = 6; intensity = 0.7; }

    // Detect question type (perspective)
    if (lower.includes('who') || lower.includes('am i')) { type = 'identity'; valence = 2; }
    if (lower.includes('what') || lower.includes('happening')) { type = 'process'; valence = 1; }
    if (lower.includes('when') || lower.includes('time')) { type = 'timing'; valence = 0; }
    if (lower.includes('why') || lower.includes('because')) { type = 'reason'; valence = 3; }
    if (lower.includes('how') || lower.includes('do i')) { type = 'method'; valence = 4; }

    return { type, valence, intensity };
  }

  private decomposeToTriples(
    query: string,
    impulse: { type: string; valence: number; intensity: number }
  ): SemanticTriple[] {
    const triples: SemanticTriple[] = [];

    // Map impulse to semantic objects and relations
    const subjectNode = this.network.createNode('object', [{
      stem: this.userProfile.name,
      partOfSpeech: 'noun',
      probability: 1.0,
      emotionalValence: 5,
      contextualTags: ['user', 'subject']
    }]);

    const relationNode = this.network.createNode('relation', [{
      stem: this.impulseToRelation(impulse.type),
      partOfSpeech: 'verb',
      probability: 1.0,
      emotionalValence: impulse.valence,
      contextualTags: ['impulse', impulse.type]
    }]);

    const objectNode = this.network.createNode('object', [{
      stem: this.extractObject(query),
      partOfSpeech: 'noun',
      probability: 0.8,
      emotionalValence: impulse.valence * 0.5,
      contextualTags: ['object', 'query-focus']
    }]);

    const tripleId = this.network.createTriple(subjectNode, relationNode, objectNode);
    const triple = this.network.getTriples().get(tripleId)!;
    triples.push(triple);

    // Set emotional valence on the relation
    this.network.setEmotionalValence(relationNode, impulse.valence);

    // Activate corresponding HD gate
    const gate = this.impulseToGate(impulse.type);
    this.gateActivations.set(gate, impulse.intensity);

    return triples;
  }

  private impulseToRelation(impulseType: string): string {
    const map: Record<string, string> = {
      fear: 'fear', hope: 'hope', love: 'love', struggle: 'struggle',
      power: 'empower', identity: 'become', process: 'experience',
      timing: 'wait', reason: 'understand', method: 'navigate', neutral: 'feel'
    };
    return map[impulseType] || 'experience';
  }

  private extractObject(query: string): string {
    // Simple extraction: last noun phrase
    const words = query.split(' ');
    const nouns = words.filter(w => w.length > 3);
    return nouns[nouns.length - 1] || 'life';
  }

  private impulseToGate(impulseType: string): number {
    const map: Record<string, number> = {
      fear: 49, hope: 41, love: 59, struggle: 28, power: 34,
      identity: 10, process: 35, timing: 5, reason: 61, method: 48, neutral: 6
    };
    return map[impulseType] || 6;
  }

  private runNarrativeSimulation(
    triples: SemanticTriple[],
    impulse: { type: string; valence: number; intensity: number }
  ): { runs: number; finalState: any; confidence: number } {
    // Run multiple Monte Carlo simulations
    const numRuns = 50; // Klein's methodology: multiple runs for determinism
    let successfulPaths = 0;
    let totalConfidence = 0;

    for (let run = 0; run < numRuns; run++) {
      // Simulate interaction between user and mirror
      const result = this.simulator.simulateInteraction('user', 'mirror');
      if (result && result.accepted) {
        successfulPaths++;
        totalConfidence += result.parsed ? 1.0 : 0.5;
      }
    }

    const confidence = successfulPaths / numRuns;

    return {
      runs: numRuns,
      finalState: this.simulator.getState(),
      confidence: confidence * (totalConfidence / numRuns)
    };
  }

  private applyContext(
    simulation: { runs: number; finalState: any; confidence: number },
    triples: SemanticTriple[]
  ): any {
    // Apply user's Base/Tone/Color to the simulation results
    const base = this.userProfile.base;
    const tone = this.userProfile.tone;
    const color = this.userProfile.color;

    // Weight by profile alignment
    const baseWeight = base === 3 ? 1.2 : 0.8; // "I Am" gets stronger weighting
    const toneWeight = tone === 4 ? 1.1 : 0.9; // "Touch" is more grounded
    const colorWeight = color === 2 ? 1.3 : 0.7; // "Hope" amplifies positive outcomes

    return {
      ...simulation,
      contextualWeights: { baseWeight, toneWeight, colorWeight },
      profileAlignment: (baseWeight + toneWeight + colorWeight) / 3
    };
  }

  private generateNarrative(
    contextualized: any,
    triples: SemanticTriple[]
  ): { text: string; confidence: number; trajectory: number[]; style: StyleProfile } {
    // Determine perspective from query analysis
    const perspective = this.inferPerspective(triples);

    // Get gate information
    const gate = this.impulseToGate(this.detectImpulse('').type);
    const gateInfo = this.getGateInfo(gate);

    // Build narrative using templates
    const voice = BASE_VOICES[this.userProfile.base] || "I";
    const dim = BASE_DIMENSIONS[this.userProfile.base] || "Being";
    const tone = TONE_NATURES[this.userProfile.tone] || "Touch";
    const color = COLOR_MOTIVATIONS[this.userProfile.color] || "Hope";

    const templates = PERSPECTIVE_TEMPLATES[perspective] || PERSPECTIVE_TEMPLATES.what;

    // Generate narrative sentences
    const sentences = templates.map(template =>
      template
        .replace('{voice}', voice)
        .replace('{dimension}', dim)
        .replace('{tone}', tone)
        .replace('{color}', color)
        .replace('{pressure}', gateInfo.pressure)
        .replace('{process}', gateInfo.process)
        .replace('{resolution}', gateInfo.resolution)
    );

    // Add Monte Carlo insight
    const mcInsight = this.generateMCInsight(contextualized);
    sentences.push(mcInsight);

    // Add artifact
    const artifact = this.generateArtifact(gate);
    sentences.push(`<strong>Artifact:</strong> ${artifact}`);

    const text = sentences.join('\n\n');

    // Calculate emotional trajectory
    const trajectory = this.calculateEmotionalTrajectory(triples, contextualized);

    // Build style profile
    const style: StyleProfile = {
      syntacticStructureFrequencies: new Map([
        ['noun', 0.3], ['verb', 0.25], ['adj', 0.2], ['prep', 0.15], ['pronoun', 0.1]
      ]),
      pronounFrequency: this.userProfile.base === 3 ? 0.6 : 0.3,
      emotionalValence: trajectory[trajectory.length - 1] || 0,
      complexityScore: this.userProfile.base === 5 ? 0.8 : 0.5,
      baseVoice: voice,
      toneNature: tone,
      colorMotivation: color
    };

    return {
      text,
      confidence: contextualized.confidence * contextualized.profileAlignment,
      trajectory,
      style
    };
  }

  private inferPerspective(triples: SemanticTriple[]): string {
    // Default to 'what' if no clear perspective
    return 'what';
  }

  private getGateInfo(gate: number): { pressure: string; process: string; resolution: string } {
    const gateMap: Record<number, { pressure: string; process: string; resolution: string }> = {
      1: { pressure: 'creative spark', process: 'direction', resolution: 'initiation' },
      6: { pressure: 'friction', process: 'boundary testing', resolution: 'resolution' },
      10: { pressure: 'identity tension', process: 'behavior shaping', resolution: 'authenticity' },
      28: { pressure: 'struggle', process: 'risk', resolution: 'purpose' },
      34: { pressure: 'power', process: 'action', resolution: 'impact' },
      35: { pressure: 'change', process: 'experience', resolution: 'progress' },
      41: { pressure: 'compression', process: 'imagination', resolution: 'experience' },
      48: { pressure: 'depth', process: 'resourcefulness', resolution: 'solution' },
      49: { pressure: 'principles', process: 'reaction', resolution: 'reformation' },
      59: { pressure: 'intimacy', process: 'fusion', resolution: 'connection' },
      61: { pressure: 'mystery', process: 'inner truth', resolution: 'knowing' }
    };
    return gateMap[gate] || { pressure: 'pressure', process: 'process', resolution: 'resolution' };
  }

  private generateMCInsight(simulation: any): string {
    const confidence = simulation.confidence;
    const runs = simulation.runs;

    if (confidence > 0.8) {
      return `Across ${runs} simulations, this pattern converged with high certainty. The field is coherent — trust what you feel.`;
    } else if (confidence > 0.5) {
      return `After ${runs} runs, the signal is present but mixed. The ambiguity is not noise — it is the space where choice lives.`;
    } else {
      return `${runs} simulations show divergence. This is not uncertainty — it is the quantum superposition of your possible selves. Observe without collapsing.`;
    }
  }

  private generateArtifact(gate: number): string {
    const artifacts: Record<number, string> = {
      6: "Have one honest, boundary-clear conversation today. Name what you feel without blaming.",
      10: "Notice one behavior that is not you. Do not judge it — just witness it.",
      28: "Name one struggle that has shaped you. Thank it for the strength it gave.",
      34: "Take one action that uses your power without forcing it. Let it be effortless.",
      35: "Change one small thing in your routine today. Notice how the field responds.",
      41: "Start the smallest version of the dream. One tiny seed is enough.",
      48: "Go one layer deeper than you usually go. The answer is always further down.",
      49: "Say no once today where your body wants to. Let the principle protect you.",
      59: "Share one truth with someone you trust. Intimacy is the highest form of courage.",
      61: "Sit in silence for 3 minutes and let a truth arrive without chasing it."
    };
    return artifacts[gate] || "Sit for 60 seconds and feel where this lives in your body.";
  }

  private calculateEmotionalTrajectory(
    triples: SemanticTriple[],
    contextualized: any
  ): number[] {
    const trajectory: number[] = [];

    // Start with user's color motivation
    const startValence = this.userProfile.color === 2 ? 5 : this.userProfile.color === 1 ? -5 : 0;
    trajectory.push(startValence);

    // Add valence from each triple
    triples.forEach(triple => {
      const valence = this.network.getEmotionalValence(
        Array.from(this.network.getTriples().keys()).find(
          k => this.network.getTriples().get(k) === triple
        ) || 0
      );
      trajectory.push(valence);
    });

    // Apply contextual weights
    const profileAlignment = contextualized.profileAlignment || 1;
    trajectory.push(trajectory[trajectory.length - 1] * profileAlignment);

    // Ensure trajectory ends positive (positive influence)
    const last = trajectory[trajectory.length - 1];
    if (last < 0) {
      trajectory.push(last * 0.5 + 3); // Gentle upward correction
    }

    return trajectory;
  }

  // Get narrative history
  getHistory(): NarrativeResult[] {
    return this.narrativeHistory;
  }

  // Get current gate activations
  getGateActivations(): Map<number, number> {
    return this.gateActivations;
  }

  // Get semantic network state
  getNetwork(): SemanticNetwork {
    return this.network;
  }

  // Export simulation state for persistence
  exportState(): string {
    return JSON.stringify({
      profile: this.userProfile,
      history: this.narrativeHistory,
      gateActivations: Array.from(this.gateActivations.entries()),
      clock: this.network.getClock()
    });
  }
}

// ============================================================
// HD GATE DATA — 64 Gates with Klein-style semantic mapping
// ============================================================

export const GATES_64: Record<number, {
  pressure: string;
  process: string;
  resolution: string;
  center: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
  line6: string;
}> = {
  1: {
    pressure: "creative spark", process: "direction", resolution: "initiation",
    center: "throat", line1: "creative role model", line2: "the creative genius", line3: "the creative martyr",
    line4: "the creative alchemist", line5: "the creative leader", line6: "the creative expression"
  },
  2: {
    pressure: "receptivity", process: "guidance", resolution: "orientation",
    center: "sacral", line1: "the receptive source", line2: "the receptive mystic", line3: "the receptive martyr",
    line4: "the receptive opportunist", line5: "the receptive heretic", line6: "the receptive sage"
  },
  3: {
    pressure: "chaos", process: "mutation", resolution: "stabilization",
    center: "sacral", line1: "the chaotic innovator", line2: "the chaotic experimenter", line3: "the chaotic martyr",
    line4: "the chaotic opportunist", line5: "the chaotic heretic", line6: "the chaotic sage"
  },
  4: {
    pressure: "mental pressure", process: "logic", resolution: "answers",
    center: "ajna", line1: "the logical investigator", line2: "the logical hermit", line3: "the logical martyr",
    line4: "the logical opportunist", line5: "the logical heretic", line6: "the logical sage"
  },
  5: {
    pressure: "rhythm", process: "patterning", resolution: "consistency",
    center: "sacral", line1: "the rhythmic investigator", line2: "the rhythmic hermit", line3: "the rhythmic martyr",
    line4: "the rhythmic opportunist", line5: "the rhythmic heretic", line6: "the rhythmic sage"
  },
  6: {
    pressure: "friction", process: "boundary testing", resolution: "resolution",
    center: "solar", line1: "the frictional investigator", line2: "the frictional hermit", line3: "the frictional martyr",
    line4: "the frictional opportunist", line5: "the frictional heretic", line6: "the frictional sage"
  },
  // ... (continuing for all 64 gates would be extensive)
  // Key gates for the narrative engine:
  10: {
    pressure: "identity tension", process: "behavior shaping", resolution: "authenticity",
    center: "g", line1: "the behavioral investigator", line2: "the behavioral hermit", line3: "the behavioral martyr",
    line4: "the behavioral opportunist", line5: "the behavioral heretic", line6: "the behavioral sage"
  },
  28: {
    pressure: "struggle", process: "risk", resolution: "purpose",
    center: "spleen", line1: "the struggling investigator", line2: "the struggling hermit", line3: "the struggling martyr",
    line4: "the struggling opportunist", line5: "the struggling heretic", line6: "the struggling sage"
  },
  34: {
    pressure: "power", process: "action", resolution: "impact",
    center: "sacral", line1: "the powerful investigator", line2: "the powerful hermit", line3: "the powerful martyr",
    line4: "the powerful opportunist", line5: "the powerful heretic", line6: "the powerful sage"
  },
  35: {
    pressure: "change", process: "experience", resolution: "progress",
    center: "throat", line1: "the changing investigator", line2: "the changing hermit", line3: "the changing martyr",
    line4: "the changing opportunist", line5: "the changing heretic", line6: "the changing sage"
  },
  41: {
    pressure: "compression", process: "imagination", resolution: "experience",
    center: "root", line1: "the imaginative investigator", line2: "the imaginative hermit", line3: "the imaginative martyr",
    line4: "the imaginative opportunist", line5: "the imaginative heretic", line6: "the imaginative sage"
  },
  48: {
    pressure: "depth", process: "resourcefulness", resolution: "solution",
    center: "spleen", line1: "the deep investigator", line2: "the deep hermit", line3: "the deep martyr",
    line4: "the deep opportunist", line5: "the deep heretic", line6: "the deep sage"
  },
  49: {
    pressure: "principles", process: "reaction", resolution: "reformation",
    center: "solar", line1: "the principled investigator", line2: "the principled hermit", line3: "the principled martyr",
    line4: "the principled opportunist", line5: "the principled heretic", line6: "the principled sage"
  },
  59: {
    pressure: "intimacy", process: "fusion", resolution: "connection",
    center: "sacral", line1: "the intimate investigator", line2: "the intimate hermit", line3: "the intimate martyr",
    line4: "the intimate opportunist", line5: "the intimate heretic", line6: "the intimate sage"
  },
  61: {
    pressure: "mystery", process: "inner truth", resolution: "knowing",
    center: "head", line1: "the mysterious investigator", line2: "the mysterious hermit", line3: "the mysterious martyr",
    line4: "the mysterious opportunist", line5: "the mysterious heretic", line6: "the mysterious sage"
  }
};

// ============================================================
// W-DIMENSIONS FRAMEWORK — For narrative bypass of doubt
// ============================================================

export interface WDimensions {
  w1: number; // Willingness to receive
  w2: number; // Willingness to act
  w3: number; // Willingness to trust
  w4: number; // Willingness to surrender
  w5: number; // Willingness to become
}

export class WDimensionEngine {
  private dimensions: WDimensions;

  constructor(profile: UserProfile) {
    // Initialize based on user's Base/Tone/Color
    this.dimensions = {
      w1: this.mapBaseToW1(profile.base),
      w2: this.mapToneToW2(profile.tone),
      w3: this.mapColorToW3(profile.color),
      w4: this.mapBaseToW4(profile.base),
      w5: this.mapColorToW5(profile.color)
    };
  }

  private mapBaseToW1(base: number): number {
    // Movement(1)=0.3, Evolution(2)=0.5, Being(3)=0.8, Design(4)=0.6, Space(5)=0.4
    return [0.3, 0.5, 0.8, 0.6, 0.4][base - 1] || 0.5;
  }

  private mapToneToW2(tone: number): number {
    // Smell(1)=0.4, Taste(2)=0.5, Sound(3)=0.6, Touch(4)=0.8, Inner Vision(5)=0.7, Outer Vision(6)=0.5
    return [0.4, 0.5, 0.6, 0.8, 0.7, 0.5][tone - 1] || 0.5;
  }

  private mapColorToW3(color: number): number {
    // Fear(1)=0.2, Hope(2)=0.9, Desire(3)=0.6, Need(4)=0.5, Guilt(5)=0.3, Innocence(6)=0.8
    return [0.2, 0.9, 0.6, 0.5, 0.3, 0.8][color - 1] || 0.5;
  }

  private mapBaseToW4(base: number): number {
    // Being(3) has highest surrender capacity
    return base === 3 ? 0.9 : base === 1 ? 0.3 : 0.6;
  }

  private mapColorToW5(color: number): number {
    // Innocence(6) and Hope(2) have highest becoming capacity
    return color === 6 ? 0.9 : color === 2 ? 0.85 : 0.5;
  }

  // Calculate doubt bypass factor
  getDoubtBypassFactor(): number {
    // Higher w3 (trust) and w5 (becoming) = stronger bypass
    return (this.dimensions.w3 * 0.4 + this.dimensions.w5 * 0.6);
  }

  // Calculate positive influence potential
  getInfluencePotential(): number {
    return (this.dimensions.w1 * 0.2 + this.dimensions.w2 * 0.2 +
            this.dimensions.w3 * 0.3 + this.dimensions.w4 * 0.1 +
            this.dimensions.w5 * 0.2);
  }

  getDimensions(): WDimensions {
    return this.dimensions;
  }

  // Update dimensions based on narrative feedback
  updateFromFeedback(narrative: NarrativeResult, userResponse: 'positive' | 'neutral' | 'resistant'): void {
    const adjustment = userResponse === 'positive' ? 0.1 : userResponse === 'neutral' ? 0.0 : -0.05;

    this.dimensions.w1 = Math.min(1, Math.max(0, this.dimensions.w1 + adjustment));
    this.dimensions.w3 = Math.min(1, Math.max(0, this.dimensions.w3 + adjustment * 1.5));
    this.dimensions.w5 = Math.min(1, Math.max(0, this.dimensions.w5 + adjustment * 1.2));
  }
}

// ============================================================
// EXPORT: Integration function for YOU-N-I-VERSE
// ============================================================

export function createDiseminerEngine(profile: UserProfile): DiseminerEngine {
  return new DiseminerEngine(profile);
}

export function createWEngine(profile: UserProfile): WDimensionEngine {
  return new WDimensionEngine(profile);
}

// Default export for module
export default {
  DiseminerEngine,
  WDimensionEngine,
  SemanticNetwork,
  GenerativeGrammar,
  MonteCarloSimulator,
  GATES_64,
  createDiseminerEngine,
  createWEngine
};
