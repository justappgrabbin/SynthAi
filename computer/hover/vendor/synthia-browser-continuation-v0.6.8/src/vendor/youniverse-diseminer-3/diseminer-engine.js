const BASE_VOICES = {
  1: "I Define",
  2: "I Remember",
  3: "I Am",
  4: "I Design",
  5: "I Think"
};
const BASE_DIMENSIONS = {
  1: "Movement",
  2: "Evolution",
  3: "Being",
  4: "Design",
  5: "Space"
};
const TONE_NATURES = {
  1: "Smell",
  2: "Taste",
  3: "Sound",
  4: "Touch",
  5: "Inner Vision",
  6: "Outer Vision"
};
const COLOR_MOTIVATIONS = {
  1: "Fear",
  2: "Hope",
  3: "Desire",
  4: "Need",
  5: "Guilt",
  6: "Innocence"
};
const PERSPECTIVE_TEMPLATES = {
  who: [
    "{voice} the one shaped by {pressure}, moving through {process}, arriving at {resolution}.",
    "At the Base of {dimension}, expressed through {tone}, responding with {color}.",
    "Your identity crystallizes around {pressure} \u2014 this is the thread that weaves your story."
  ],
  what: [
    "This is a process of {process}, pressured by {pressure}, resolving into {resolution}.",
    "At the Base of {dimension}, modulated by {tone}, colored by {color}.",
    "The field of {pressure} is organizing your experience into {resolution}."
  ],
  when: [
    "This emerges when {resolution} becomes possible, driven by {pressure}, moving through {process}.",
    "At the Base of {dimension}, sensed through {tone}, motivated by {color}.",
    "The timing is governed by {pressure} \u2014 patience is the hidden variable."
  ],
  why: [
    "This exists because of {pressure}, the force that drives {process} toward {resolution}.",
    "At the Base of {dimension}, perceived through {tone}, shaped by {color}.",
    "The deeper reason lives in {pressure} \u2014 it is the gravity well of your meaning."
  ],
  how: [
    "It works through {process}, pressured by {pressure}, arriving at {resolution}.",
    "At the Base of {dimension}, felt as {tone}, guided by {color}.",
    "The mechanism is {process} \u2014 trust the process, not the outcome."
  ]
};
class SemanticNetwork {
  nodes = /* @__PURE__ */ new Map();
  triples = /* @__PURE__ */ new Map();
  nextNodeId = 1;
  nextTripleId = 1;
  clock = 0;
  constructor() {
    this.initializeCoreRelations();
  }
  initializeCoreRelations() {
    const coreRelations = [
      { stem: "break", pos: "verb", valence: -3 },
      { stem: "love", pos: "verb", valence: 9 },
      { stem: "know", pos: "verb", valence: 2 },
      { stem: "feel", pos: "verb", valence: 5 },
      { stem: "create", pos: "verb", valence: 8 },
      { stem: "struggle", pos: "verb", valence: -4 },
      { stem: "accept", pos: "verb", valence: 6 },
      { stem: "resist", pos: "verb", valence: -5 },
      { stem: "transform", pos: "verb", valence: 7 },
      { stem: "in", pos: "prep", valence: 0 },
      { stem: "with", pos: "prep", valence: 0 },
      { stem: "through", pos: "prep", valence: 0 },
      { stem: "toward", pos: "prep", valence: 0 }
    ];
    coreRelations.forEach((rel) => {
      this.createNode("relation", [{
        stem: rel.stem,
        partOfSpeech: rel.pos,
        probability: 1,
        emotionalValence: rel.valence,
        contextualTags: ["core"]
      }]);
    });
  }
  createNode(type, lexicalList) {
    const id = this.nextNodeId++;
    const node = {
      id,
      type,
      lexicalList,
      triplePointers: [],
      numericalValue: null
    };
    this.nodes.set(id, node);
    return id;
  }
  createTriple(alpha, gamma, beta) {
    const id = this.nextTripleId++;
    const triple = {
      alpha,
      gamma: gamma || 0,
      beta: beta || 0,
      timeCreated: this.clock,
      timeDeleted: null,
      lexicalExpressions: [],
      frequencyWeight: 1,
      contextualMarkings: []
    };
    this.triples.set(id, triple);
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
  createDynamicClass(condition) {
    const members = [];
    this.triples.forEach((triple, id) => {
      if (condition(triple) && triple.timeDeleted === null) {
        members.push(id);
      }
    });
    return members;
  }
  // Query: Is there a path between A and B through Rk or Rj but not Rm?
  queryPath(startNode, endNode, allowedRelations, forbiddenRelations) {
    const visited = /* @__PURE__ */ new Set();
    const queue = [
      { node: startNode, path: [] }
    ];
    while (queue.length > 0) {
      const current = queue.shift();
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
        const relationValid = allowedRelations.length === 0 || allowedRelations.includes(triple.gamma);
        const relationForbidden = forbiddenRelations.includes(triple.gamma);
        if (!relationValid || relationForbidden) continue;
        let nextNode = null;
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
  setEmotionalValence(nodeId, valence) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.numericalValue = Math.max(-10, Math.min(10, valence));
    }
  }
  // Get emotional valence of a relation
  getEmotionalValence(tripleId) {
    const triple = this.triples.get(tripleId);
    if (!triple) return 0;
    const relNode = this.nodes.get(triple.gamma);
    return relNode?.numericalValue || 0;
  }
  advanceClock() {
    this.clock++;
  }
  getClock() {
    return this.clock;
  }
  getTriples() {
    return this.triples;
  }
  getNodes() {
    return this.nodes;
  }
}
class GenerativeGrammar {
  rules = [];
  styleWeights = /* @__PURE__ */ new Map();
  dependencyPatterns = /* @__PURE__ */ new Map();
  constructor() {
    this.initializeRules();
  }
  initializeRules() {
    this.rules = [
      {
        id: "S1",
        surfaceStructure: "S \u2192 NP VP",
        semanticForm: "O-R",
        probabilityWeight: 1,
        frequencyOfUse: 0,
        dependencyPattern: "subject-predicate",
        contextualRestrictions: []
      },
      {
        id: "S2",
        surfaceStructure: "S \u2192 NP VP PP",
        semanticForm: "O-R-R-O",
        probabilityWeight: 0.7,
        frequencyOfUse: 0,
        dependencyPattern: "subject-predicate-modifier",
        contextualRestrictions: ["spatial"]
      },
      {
        id: "NP1",
        surfaceStructure: "NP \u2192 Det N",
        semanticForm: "O",
        probabilityWeight: 1,
        frequencyOfUse: 0,
        dependencyPattern: "determiner-noun",
        contextualRestrictions: []
      },
      {
        id: "NP2",
        surfaceStructure: "NP \u2192 NP PP",
        semanticForm: "O-R-O",
        probabilityWeight: 0.6,
        frequencyOfUse: 0,
        dependencyPattern: "noun-modifier",
        contextualRestrictions: ["spatial", "temporal"]
      },
      {
        id: "VP1",
        surfaceStructure: "VP \u2192 V NP",
        semanticForm: "R-O",
        probabilityWeight: 1,
        frequencyOfUse: 0,
        dependencyPattern: "verb-object",
        contextualRestrictions: []
      },
      {
        id: "VP2",
        surfaceStructure: "VP \u2192 V PP",
        semanticForm: "R-R-O",
        probabilityWeight: 0.5,
        frequencyOfUse: 0,
        dependencyPattern: "verb-modifier",
        contextualRestrictions: ["spatial"]
      },
      {
        id: "PP1",
        surfaceStructure: "PP \u2192 Prep NP",
        semanticForm: "R-O",
        probabilityWeight: 1,
        frequencyOfUse: 0,
        dependencyPattern: "preposition-object",
        contextualRestrictions: []
      }
    ];
  }
  // Klein's style control: weight rules by frequency in source text
  adaptStyleFromCorpus(corpus) {
    const structureCounts = /* @__PURE__ */ new Map();
    const total = corpus.length;
    corpus.forEach((sentence) => {
      const structure = this.inferStructure(sentence);
      structureCounts.set(structure, (structureCounts.get(structure) || 0) + 1);
    });
    this.rules.forEach((rule) => {
      const freq = structureCounts.get(rule.surfaceStructure) || 0;
      rule.frequencyOfUse = freq;
      const normalizedFreq = total > 0 ? freq / total : 0.5;
      rule.probabilityWeight = rule.probabilityWeight * 0.3 + normalizedFreq * 0.7;
    });
  }
  inferStructure(sentence) {
    if (sentence.includes("in the") || sentence.includes("with a")) {
      return "S \u2192 NP VP PP";
    }
    return "S \u2192 NP VP";
  }
  // Generate sentence from semantic triple with style control
  generateFromTriple(triple, network, styleProfile) {
    const nodeMap = network.getNodes();
    const alphaNode = nodeMap.get(triple.alpha);
    const gammaNode = nodeMap.get(triple.gamma);
    const betaNode = nodeMap.get(triple.beta);
    if (!alphaNode || !gammaNode || !betaNode) return "";
    const alphaLex = this.selectLexicalItem(alphaNode, styleProfile);
    const gammaLex = this.selectLexicalItem(gammaNode, styleProfile);
    const betaLex = this.selectLexicalItem(betaNode, styleProfile);
    const pronounProbability = styleProfile.pronounFrequency;
    const usePronoun = Math.random() < pronounProbability;
    let subject = alphaLex.stem;
    if (usePronoun && alphaLex.partOfSpeech === "noun") {
      subject = "You";
    }
    const sentence = `${subject} ${gammaLex.stem} ${betaLex.stem}`;
    const valence = gammaNode.numericalValue || 0;
    if (valence > 5) {
      return sentence + ", and this is beautiful";
    } else if (valence < -5) {
      return sentence + ", yet this too shall pass";
    }
    return sentence;
  }
  selectLexicalItem(node, style) {
    const candidates = node.lexicalList.filter(
      (lex) => style.syntacticStructureFrequencies.has(lex.partOfSpeech)
    );
    if (candidates.length === 0) {
      return node.lexicalList[0] || { stem: "something", partOfSpeech: "noun", probability: 1, emotionalValence: 0, contextualTags: [] };
    }
    const weights = candidates.map((lex) => {
      const styleWeight = style.syntacticStructureFrequencies.get(lex.partOfSpeech) || 0.5;
      const emotionalAlignment = 1 - Math.abs(lex.emotionalValence / 10 - style.emotionalValence / 10);
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
  selectRule(ruleType) {
    const candidates = this.rules.filter((r) => r.surfaceStructure.startsWith(ruleType));
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
class MonteCarloSimulator {
  state;
  randomSeed;
  learningRate = 0.1;
  decayRate = 0.05;
  constructor(seed = Date.now()) {
    this.randomSeed = seed;
    this.state = {
      clock: 0,
      speakers: /* @__PURE__ */ new Map(),
      globalNetwork: /* @__PURE__ */ new Map(),
      communityGrammar: [],
      eventQueue: []
    };
  }
  // Seeded random number generator for reproducibility
  random() {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }
  addSpeaker(speaker) {
    this.state.speakers.set(speaker.id, speaker);
  }
  // Simulate conversational interaction between two speakers
  simulateInteraction(speaker1Id, speaker2Id) {
    const s1 = this.state.speakers.get(speaker1Id);
    const s2 = this.state.speakers.get(speaker2Id);
    if (!s1 || !s2) return null;
    const utterance = this.generateUtterance(s1);
    const parsed = this.parseUtterance(utterance, s2);
    const accepted = parsed && this.random() > 0.3;
    const record = {
      speakerId: speaker1Id,
      utterance,
      semanticTriple: parsed || this.createDefaultTriple(),
      timestamp: this.state.clock,
      parsed: !!parsed,
      accepted
    };
    if (!accepted) {
      this.triggerLearning(s2, record);
    }
    this.updateRuleFrequencies(s1, utterance);
    s1.interactionHistory.push(record);
    s2.interactionHistory.push(record);
    return record;
  }
  generateUtterance(speaker) {
    const triples = Array.from(speaker.semanticNetwork.values());
    if (triples.length === 0) return "...";
    const triple = triples[Math.floor(this.random() * triples.length)];
    const grammar = new GenerativeGrammar();
    const style = this.inferStyleFromSpeaker(speaker);
    return grammar.generateFromTriple(triple, speaker.semanticNetwork, style);
  }
  parseUtterance(utterance, speaker) {
    const triples = Array.from(speaker.semanticNetwork.values());
    for (const triple of triples) {
      const nodeMap = speaker.semanticNetwork.getNodes ? /* @__PURE__ */ new Map() : /* @__PURE__ */ new Map();
      if (this.random() > 0.5) {
        return triple;
      }
    }
    return null;
  }
  createDefaultTriple() {
    return {
      alpha: 0,
      gamma: 0,
      beta: 0,
      timeCreated: this.state.clock,
      timeDeleted: null,
      lexicalExpressions: [],
      frequencyWeight: 0.1,
      contextualMarkings: ["unparsed"]
    };
  }
  triggerLearning(speaker, record) {
    const heuristic = this.random();
    if (heuristic < 0.25) {
      this.adoptRule(speaker, record);
    } else if (heuristic < 0.5) {
      this.createSpecificRule(speaker, record);
    } else if (heuristic < 0.75) {
      this.unifyRules(speaker, record);
    } else {
      this.contextualLearning(speaker, record);
    }
  }
  adoptRule(speaker, record) {
    const newRule = {
      id: `R_${this.state.clock}_${speaker.id}`,
      surfaceStructure: this.inferStructure(record.utterance),
      semanticForm: "O-R-O",
      probabilityWeight: this.learningRate,
      frequencyOfUse: 1,
      dependencyPattern: "adopted",
      contextualRestrictions: []
    };
    speaker.grammarRules.push(newRule);
  }
  createSpecificRule(speaker, record) {
    const newRule = {
      id: `S_${this.state.clock}_${speaker.id}`,
      surfaceStructure: record.utterance,
      semanticForm: "O-R-O",
      probabilityWeight: this.learningRate * 2,
      frequencyOfUse: 1,
      dependencyPattern: "specific",
      contextualRestrictions: [`timestamp_${this.state.clock}`]
    };
    speaker.grammarRules.push(newRule);
  }
  unifyRules(speaker, record) {
    const similar = speaker.grammarRules.filter(
      (r) => r.dependencyPattern === this.inferStructure(record.utterance)
    );
    if (similar.length >= 2) {
      const unified = {
        id: `U_${this.state.clock}_${speaker.id}`,
        surfaceStructure: similar[0].surfaceStructure,
        semanticForm: "O-R-O",
        probabilityWeight: similar.reduce((sum, r) => sum + r.probabilityWeight, 0) / similar.length,
        frequencyOfUse: similar.reduce((sum, r) => sum + r.frequencyOfUse, 0),
        dependencyPattern: "unified",
        contextualRestrictions: []
      };
      speaker.grammarRules.push(unified);
    }
  }
  contextualLearning(speaker, record) {
    const context = this.inferContext(speaker, record);
    const newRule = {
      id: `C_${this.state.clock}_${speaker.id}`,
      surfaceStructure: this.inferStructure(record.utterance),
      semanticForm: "O-R-O",
      probabilityWeight: this.learningRate,
      frequencyOfUse: 1,
      dependencyPattern: "contextual",
      contextualRestrictions: [context]
    };
    speaker.grammarRules.push(newRule);
  }
  inferStructure(utterance) {
    const words = utterance.split(" ");
    if (words.length <= 3) return "S \u2192 NP VP";
    if (words.length <= 6) return "S \u2192 NP VP PP";
    return "S \u2192 NP VP PP PP";
  }
  inferContext(speaker, record) {
    return `age_${speaker.age}_status_${speaker.socialStatus}`;
  }
  inferStyleFromSpeaker(speaker) {
    const base = speaker.profile.base;
    const tone = speaker.profile.tone;
    const color = speaker.profile.color;
    return {
      syntacticStructureFrequencies: /* @__PURE__ */ new Map([
        ["noun", 0.3],
        ["verb", 0.25],
        ["adj", 0.15],
        ["prep", 0.15],
        ["pronoun", 0.15]
      ]),
      pronounFrequency: base === 3 ? 0.6 : 0.3,
      // "I Am" uses more pronouns
      emotionalValence: COLOR_MOTIVATIONS[color] === "Hope" ? 7 : COLOR_MOTIVATIONS[color] === "Fear" ? -7 : 0,
      complexityScore: base === 5 ? 0.8 : 0.5,
      // "I Think" is more complex
      baseVoice: BASE_VOICES[base] || "I",
      toneNature: TONE_NATURES[tone] || "Touch",
      colorMotivation: COLOR_MOTIVATIONS[color] || "Hope"
    };
  }
  updateRuleFrequencies(speaker, utterance) {
    speaker.grammarRules.forEach((rule) => {
      if (utterance.includes(rule.surfaceStructure.split("\u2192")[1]?.trim() || "")) {
        rule.frequencyOfUse++;
        rule.probabilityWeight = Math.min(1, rule.probabilityWeight + this.learningRate);
      } else {
        rule.probabilityWeight = Math.max(0.01, rule.probabilityWeight * (1 - this.decayRate));
      }
    });
  }
  // Run full simulation for N generations
  runSimulation(generations, interactionsPerGeneration) {
    const speakerIds = Array.from(this.state.speakers.keys());
    for (let gen = 0; gen < generations; gen++) {
      this.state.clock = gen;
      for (let i = 0; i < interactionsPerGeneration; i++) {
        const s1 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        let s2 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        while (s2 === s1) {
          s2 = speakerIds[Math.floor(this.random() * speakerIds.length)];
        }
        this.simulateInteraction(s1, s2);
      }
      if (gen % 10 === 0) {
        this.handleBirthDeath();
      }
    }
    return this.state;
  }
  handleBirthDeath() {
    if (this.random() < 0.1) {
      const newId = `speaker_${this.state.clock}_${Math.floor(this.random() * 1e3)}`;
      const newSpeaker = {
        id: newId,
        name: `Child_${newId}`,
        semanticNetwork: new SemanticNetwork(),
        grammarRules: [],
        socialStatus: 0.5,
        age: 0,
        emotionalState: /* @__PURE__ */ new Map(),
        interactionHistory: [],
        profile: { base: 3, tone: 4, color: 2, name: "Child", activeGates: [], definedChannels: [] }
      };
      this.state.speakers.set(newId, newSpeaker);
    }
    const speakers = Array.from(this.state.speakers.values());
    const oldSpeakers = speakers.filter((s) => s.age > 70);
    if (oldSpeakers.length > 0 && this.random() < 0.05) {
      const toDie = oldSpeakers[Math.floor(this.random() * oldSpeakers.length)];
      this.state.speakers.delete(toDie.id);
    }
    speakers.forEach((s) => s.age++);
  }
  getState() {
    return this.state;
  }
}
class DiseminerEngine {
  network;
  grammar;
  simulator;
  userProfile;
  narrativeHistory = [];
  gateActivations = /* @__PURE__ */ new Map();
  constructor(profile) {
    this.userProfile = profile;
    this.network = new SemanticNetwork();
    this.grammar = new GenerativeGrammar();
    this.simulator = new MonteCarloSimulator(profile.name.length + profile.base * 100);
    this.initializeUserNetwork();
    this.initializeSimulator();
  }
  initializeUserNetwork() {
    const baseNode = this.network.createNode("object", [{
      stem: BASE_DIMENSIONS[this.userProfile.base],
      partOfSpeech: "noun",
      probability: 1,
      emotionalValence: 5,
      contextualTags: ["base", "identity"]
    }]);
    const toneNode = this.network.createNode("object", [{
      stem: TONE_NATURES[this.userProfile.tone],
      partOfSpeech: "noun",
      probability: 1,
      emotionalValence: 3,
      contextualTags: ["tone", "perception"]
    }]);
    const colorNode = this.network.createNode("object", [{
      stem: COLOR_MOTIVATIONS[this.userProfile.color],
      partOfSpeech: "noun",
      probability: 1,
      emotionalValence: this.userProfile.color === 2 ? 8 : this.userProfile.color === 1 ? -6 : 0,
      contextualTags: ["color", "motivation"]
    }]);
    const isRel = this.network.createNode("relation", [{
      stem: "is",
      partOfSpeech: "verb",
      probability: 1,
      emotionalValence: 0,
      contextualTags: ["identity", "being"]
    }]);
    this.network.createTriple(baseNode, isRel, toneNode);
    this.network.createTriple(toneNode, isRel, colorNode);
    this.network.setEmotionalValence(baseNode, 5);
    this.network.setEmotionalValence(colorNode, this.userProfile.color === 2 ? 8 : -3);
  }
  initializeSimulator() {
    const userSpeaker = {
      id: "user",
      name: this.userProfile.name,
      semanticNetwork: this.network,
      grammarRules: [],
      socialStatus: 0.7,
      age: 30,
      emotionalState: /* @__PURE__ */ new Map(),
      interactionHistory: [],
      profile: this.userProfile
    };
    const mirrorSpeaker = {
      id: "mirror",
      name: "Mirror",
      semanticNetwork: new SemanticNetwork(),
      grammarRules: [],
      socialStatus: 1,
      age: 1e3,
      emotionalState: /* @__PURE__ */ new Map(),
      interactionHistory: [],
      profile: { base: 3, tone: 5, color: 2, name: "Mirror", activeGates: [1, 2, 3, 4, 5], definedChannels: [] }
    };
    this.simulator.addSpeaker(userSpeaker);
    this.simulator.addSpeaker(mirrorSpeaker);
  }
  // Main entry: process user query through DISEMINER pipeline
  processQuery(query) {
    const impulse = this.detectImpulse(query);
    const triples = this.decomposeToTriples(query, impulse);
    const simulation = this.runNarrativeSimulation(triples, impulse);
    const contextualized = this.applyContext(simulation, triples);
    const narrative = this.generateNarrative(contextualized, triples);
    const result = {
      narrative: narrative.text,
      semanticPath: triples,
      confidence: narrative.confidence,
      emotionalTrajectory: narrative.trajectory,
      gateActivations: Array.from(this.gateActivations.keys()).filter((g) => this.gateActivations.get(g) > 0.5),
      styleProfile: narrative.style,
      monteCarloRuns: simulation.runs
    };
    this.narrativeHistory.push(result);
    return result;
  }
  detectImpulse(query) {
    const lower = query.toLowerCase();
    let type = "neutral";
    let valence = 0;
    let intensity = 0.5;
    const fearPatterns = ["fear", "anxiety", "scared", "worried", "afraid"];
    const hopePatterns = ["hope", "dream", "wish", "want", "desire"];
    const lovePatterns = ["love", "care", "connect", "relationship"];
    const strugglePatterns = ["stuck", "struggle", "hard", "difficult", "pain"];
    const powerPatterns = ["power", "energy", "force", "strength"];
    if (fearPatterns.some((p) => lower.includes(p))) {
      type = "fear";
      valence = -7;
      intensity = 0.8;
    } else if (hopePatterns.some((p) => lower.includes(p))) {
      type = "hope";
      valence = 8;
      intensity = 0.7;
    } else if (lovePatterns.some((p) => lower.includes(p))) {
      type = "love";
      valence = 9;
      intensity = 0.6;
    } else if (strugglePatterns.some((p) => lower.includes(p))) {
      type = "struggle";
      valence = -4;
      intensity = 0.9;
    } else if (powerPatterns.some((p) => lower.includes(p))) {
      type = "power";
      valence = 6;
      intensity = 0.7;
    }
    if (lower.includes("who") || lower.includes("am i")) {
      type = "identity";
      valence = 2;
    }
    if (lower.includes("what") || lower.includes("happening")) {
      type = "process";
      valence = 1;
    }
    if (lower.includes("when") || lower.includes("time")) {
      type = "timing";
      valence = 0;
    }
    if (lower.includes("why") || lower.includes("because")) {
      type = "reason";
      valence = 3;
    }
    if (lower.includes("how") || lower.includes("do i")) {
      type = "method";
      valence = 4;
    }
    return { type, valence, intensity };
  }
  decomposeToTriples(query, impulse) {
    const triples = [];
    const subjectNode = this.network.createNode("object", [{
      stem: this.userProfile.name,
      partOfSpeech: "noun",
      probability: 1,
      emotionalValence: 5,
      contextualTags: ["user", "subject"]
    }]);
    const relationNode = this.network.createNode("relation", [{
      stem: this.impulseToRelation(impulse.type),
      partOfSpeech: "verb",
      probability: 1,
      emotionalValence: impulse.valence,
      contextualTags: ["impulse", impulse.type]
    }]);
    const objectNode = this.network.createNode("object", [{
      stem: this.extractObject(query),
      partOfSpeech: "noun",
      probability: 0.8,
      emotionalValence: impulse.valence * 0.5,
      contextualTags: ["object", "query-focus"]
    }]);
    const tripleId = this.network.createTriple(subjectNode, relationNode, objectNode);
    const triple = this.network.getTriples().get(tripleId);
    triples.push(triple);
    this.network.setEmotionalValence(relationNode, impulse.valence);
    const gate = this.impulseToGate(impulse.type);
    this.gateActivations.set(gate, impulse.intensity);
    return triples;
  }
  impulseToRelation(impulseType) {
    const map = {
      fear: "fear",
      hope: "hope",
      love: "love",
      struggle: "struggle",
      power: "empower",
      identity: "become",
      process: "experience",
      timing: "wait",
      reason: "understand",
      method: "navigate",
      neutral: "feel"
    };
    return map[impulseType] || "experience";
  }
  extractObject(query) {
    const words = query.split(" ");
    const nouns = words.filter((w) => w.length > 3);
    return nouns[nouns.length - 1] || "life";
  }
  impulseToGate(impulseType) {
    const map = {
      fear: 49,
      hope: 41,
      love: 59,
      struggle: 28,
      power: 34,
      identity: 10,
      process: 35,
      timing: 5,
      reason: 61,
      method: 48,
      neutral: 6
    };
    return map[impulseType] || 6;
  }
  runNarrativeSimulation(triples, impulse) {
    const numRuns = 50;
    let successfulPaths = 0;
    let totalConfidence = 0;
    for (let run = 0; run < numRuns; run++) {
      const result = this.simulator.simulateInteraction("user", "mirror");
      if (result && result.accepted) {
        successfulPaths++;
        totalConfidence += result.parsed ? 1 : 0.5;
      }
    }
    const confidence = successfulPaths / numRuns;
    return {
      runs: numRuns,
      finalState: this.simulator.getState(),
      confidence: confidence * (totalConfidence / numRuns)
    };
  }
  applyContext(simulation, triples) {
    const base = this.userProfile.base;
    const tone = this.userProfile.tone;
    const color = this.userProfile.color;
    const baseWeight = base === 3 ? 1.2 : 0.8;
    const toneWeight = tone === 4 ? 1.1 : 0.9;
    const colorWeight = color === 2 ? 1.3 : 0.7;
    return {
      ...simulation,
      contextualWeights: { baseWeight, toneWeight, colorWeight },
      profileAlignment: (baseWeight + toneWeight + colorWeight) / 3
    };
  }
  generateNarrative(contextualized, triples) {
    const perspective = this.inferPerspective(triples);
    const gate = this.impulseToGate(this.detectImpulse("").type);
    const gateInfo = this.getGateInfo(gate);
    const voice = BASE_VOICES[this.userProfile.base] || "I";
    const dim = BASE_DIMENSIONS[this.userProfile.base] || "Being";
    const tone = TONE_NATURES[this.userProfile.tone] || "Touch";
    const color = COLOR_MOTIVATIONS[this.userProfile.color] || "Hope";
    const templates = PERSPECTIVE_TEMPLATES[perspective] || PERSPECTIVE_TEMPLATES.what;
    const sentences = templates.map(
      (template) => template.replace("{voice}", voice).replace("{dimension}", dim).replace("{tone}", tone).replace("{color}", color).replace("{pressure}", gateInfo.pressure).replace("{process}", gateInfo.process).replace("{resolution}", gateInfo.resolution)
    );
    const mcInsight = this.generateMCInsight(contextualized);
    sentences.push(mcInsight);
    const artifact = this.generateArtifact(gate);
    sentences.push(`<strong>Artifact:</strong> ${artifact}`);
    const text = sentences.join("\n\n");
    const trajectory = this.calculateEmotionalTrajectory(triples, contextualized);
    const style = {
      syntacticStructureFrequencies: /* @__PURE__ */ new Map([
        ["noun", 0.3],
        ["verb", 0.25],
        ["adj", 0.2],
        ["prep", 0.15],
        ["pronoun", 0.1]
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
  inferPerspective(triples) {
    return "what";
  }
  getGateInfo(gate) {
    const gateMap = {
      1: { pressure: "creative spark", process: "direction", resolution: "initiation" },
      6: { pressure: "friction", process: "boundary testing", resolution: "resolution" },
      10: { pressure: "identity tension", process: "behavior shaping", resolution: "authenticity" },
      28: { pressure: "struggle", process: "risk", resolution: "purpose" },
      34: { pressure: "power", process: "action", resolution: "impact" },
      35: { pressure: "change", process: "experience", resolution: "progress" },
      41: { pressure: "compression", process: "imagination", resolution: "experience" },
      48: { pressure: "depth", process: "resourcefulness", resolution: "solution" },
      49: { pressure: "principles", process: "reaction", resolution: "reformation" },
      59: { pressure: "intimacy", process: "fusion", resolution: "connection" },
      61: { pressure: "mystery", process: "inner truth", resolution: "knowing" }
    };
    return gateMap[gate] || { pressure: "pressure", process: "process", resolution: "resolution" };
  }
  generateMCInsight(simulation) {
    const confidence = simulation.confidence;
    const runs = simulation.runs;
    if (confidence > 0.8) {
      return `Across ${runs} simulations, this pattern converged with high certainty. The field is coherent \u2014 trust what you feel.`;
    } else if (confidence > 0.5) {
      return `After ${runs} runs, the signal is present but mixed. The ambiguity is not noise \u2014 it is the space where choice lives.`;
    } else {
      return `${runs} simulations show divergence. This is not uncertainty \u2014 it is the quantum superposition of your possible selves. Observe without collapsing.`;
    }
  }
  generateArtifact(gate) {
    const artifacts = {
      6: "Have one honest, boundary-clear conversation today. Name what you feel without blaming.",
      10: "Notice one behavior that is not you. Do not judge it \u2014 just witness it.",
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
  calculateEmotionalTrajectory(triples, contextualized) {
    const trajectory = [];
    const startValence = this.userProfile.color === 2 ? 5 : this.userProfile.color === 1 ? -5 : 0;
    trajectory.push(startValence);
    triples.forEach((triple) => {
      const valence = this.network.getEmotionalValence(
        Array.from(this.network.getTriples().keys()).find(
          (k) => this.network.getTriples().get(k) === triple
        ) || 0
      );
      trajectory.push(valence);
    });
    const profileAlignment = contextualized.profileAlignment || 1;
    trajectory.push(trajectory[trajectory.length - 1] * profileAlignment);
    const last = trajectory[trajectory.length - 1];
    if (last < 0) {
      trajectory.push(last * 0.5 + 3);
    }
    return trajectory;
  }
  // Get narrative history
  getHistory() {
    return this.narrativeHistory;
  }
  // Get current gate activations
  getGateActivations() {
    return this.gateActivations;
  }
  // Get semantic network state
  getNetwork() {
    return this.network;
  }
  // Export simulation state for persistence
  exportState() {
    return JSON.stringify({
      profile: this.userProfile,
      history: this.narrativeHistory,
      gateActivations: Array.from(this.gateActivations.entries()),
      clock: this.network.getClock()
    });
  }
}
const GATES_64 = {
  1: {
    pressure: "creative spark",
    process: "direction",
    resolution: "initiation",
    center: "throat",
    line1: "creative role model",
    line2: "the creative genius",
    line3: "the creative martyr",
    line4: "the creative alchemist",
    line5: "the creative leader",
    line6: "the creative expression"
  },
  2: {
    pressure: "receptivity",
    process: "guidance",
    resolution: "orientation",
    center: "sacral",
    line1: "the receptive source",
    line2: "the receptive mystic",
    line3: "the receptive martyr",
    line4: "the receptive opportunist",
    line5: "the receptive heretic",
    line6: "the receptive sage"
  },
  3: {
    pressure: "chaos",
    process: "mutation",
    resolution: "stabilization",
    center: "sacral",
    line1: "the chaotic innovator",
    line2: "the chaotic experimenter",
    line3: "the chaotic martyr",
    line4: "the chaotic opportunist",
    line5: "the chaotic heretic",
    line6: "the chaotic sage"
  },
  4: {
    pressure: "mental pressure",
    process: "logic",
    resolution: "answers",
    center: "ajna",
    line1: "the logical investigator",
    line2: "the logical hermit",
    line3: "the logical martyr",
    line4: "the logical opportunist",
    line5: "the logical heretic",
    line6: "the logical sage"
  },
  5: {
    pressure: "rhythm",
    process: "patterning",
    resolution: "consistency",
    center: "sacral",
    line1: "the rhythmic investigator",
    line2: "the rhythmic hermit",
    line3: "the rhythmic martyr",
    line4: "the rhythmic opportunist",
    line5: "the rhythmic heretic",
    line6: "the rhythmic sage"
  },
  6: {
    pressure: "friction",
    process: "boundary testing",
    resolution: "resolution",
    center: "solar",
    line1: "the frictional investigator",
    line2: "the frictional hermit",
    line3: "the frictional martyr",
    line4: "the frictional opportunist",
    line5: "the frictional heretic",
    line6: "the frictional sage"
  },
  // ... (continuing for all 64 gates would be extensive)
  // Key gates for the narrative engine:
  10: {
    pressure: "identity tension",
    process: "behavior shaping",
    resolution: "authenticity",
    center: "g",
    line1: "the behavioral investigator",
    line2: "the behavioral hermit",
    line3: "the behavioral martyr",
    line4: "the behavioral opportunist",
    line5: "the behavioral heretic",
    line6: "the behavioral sage"
  },
  28: {
    pressure: "struggle",
    process: "risk",
    resolution: "purpose",
    center: "spleen",
    line1: "the struggling investigator",
    line2: "the struggling hermit",
    line3: "the struggling martyr",
    line4: "the struggling opportunist",
    line5: "the struggling heretic",
    line6: "the struggling sage"
  },
  34: {
    pressure: "power",
    process: "action",
    resolution: "impact",
    center: "sacral",
    line1: "the powerful investigator",
    line2: "the powerful hermit",
    line3: "the powerful martyr",
    line4: "the powerful opportunist",
    line5: "the powerful heretic",
    line6: "the powerful sage"
  },
  35: {
    pressure: "change",
    process: "experience",
    resolution: "progress",
    center: "throat",
    line1: "the changing investigator",
    line2: "the changing hermit",
    line3: "the changing martyr",
    line4: "the changing opportunist",
    line5: "the changing heretic",
    line6: "the changing sage"
  },
  41: {
    pressure: "compression",
    process: "imagination",
    resolution: "experience",
    center: "root",
    line1: "the imaginative investigator",
    line2: "the imaginative hermit",
    line3: "the imaginative martyr",
    line4: "the imaginative opportunist",
    line5: "the imaginative heretic",
    line6: "the imaginative sage"
  },
  48: {
    pressure: "depth",
    process: "resourcefulness",
    resolution: "solution",
    center: "spleen",
    line1: "the deep investigator",
    line2: "the deep hermit",
    line3: "the deep martyr",
    line4: "the deep opportunist",
    line5: "the deep heretic",
    line6: "the deep sage"
  },
  49: {
    pressure: "principles",
    process: "reaction",
    resolution: "reformation",
    center: "solar",
    line1: "the principled investigator",
    line2: "the principled hermit",
    line3: "the principled martyr",
    line4: "the principled opportunist",
    line5: "the principled heretic",
    line6: "the principled sage"
  },
  59: {
    pressure: "intimacy",
    process: "fusion",
    resolution: "connection",
    center: "sacral",
    line1: "the intimate investigator",
    line2: "the intimate hermit",
    line3: "the intimate martyr",
    line4: "the intimate opportunist",
    line5: "the intimate heretic",
    line6: "the intimate sage"
  },
  61: {
    pressure: "mystery",
    process: "inner truth",
    resolution: "knowing",
    center: "head",
    line1: "the mysterious investigator",
    line2: "the mysterious hermit",
    line3: "the mysterious martyr",
    line4: "the mysterious opportunist",
    line5: "the mysterious heretic",
    line6: "the mysterious sage"
  }
};
class WDimensionEngine {
  dimensions;
  constructor(profile) {
    this.dimensions = {
      w1: this.mapBaseToW1(profile.base),
      w2: this.mapToneToW2(profile.tone),
      w3: this.mapColorToW3(profile.color),
      w4: this.mapBaseToW4(profile.base),
      w5: this.mapColorToW5(profile.color)
    };
  }
  mapBaseToW1(base) {
    return [0.3, 0.5, 0.8, 0.6, 0.4][base - 1] || 0.5;
  }
  mapToneToW2(tone) {
    return [0.4, 0.5, 0.6, 0.8, 0.7, 0.5][tone - 1] || 0.5;
  }
  mapColorToW3(color) {
    return [0.2, 0.9, 0.6, 0.5, 0.3, 0.8][color - 1] || 0.5;
  }
  mapBaseToW4(base) {
    return base === 3 ? 0.9 : base === 1 ? 0.3 : 0.6;
  }
  mapColorToW5(color) {
    return color === 6 ? 0.9 : color === 2 ? 0.85 : 0.5;
  }
  // Calculate doubt bypass factor
  getDoubtBypassFactor() {
    return this.dimensions.w3 * 0.4 + this.dimensions.w5 * 0.6;
  }
  // Calculate positive influence potential
  getInfluencePotential() {
    return this.dimensions.w1 * 0.2 + this.dimensions.w2 * 0.2 + this.dimensions.w3 * 0.3 + this.dimensions.w4 * 0.1 + this.dimensions.w5 * 0.2;
  }
  getDimensions() {
    return this.dimensions;
  }
  // Update dimensions based on narrative feedback
  updateFromFeedback(narrative, userResponse) {
    const adjustment = userResponse === "positive" ? 0.1 : userResponse === "neutral" ? 0 : -0.05;
    this.dimensions.w1 = Math.min(1, Math.max(0, this.dimensions.w1 + adjustment));
    this.dimensions.w3 = Math.min(1, Math.max(0, this.dimensions.w3 + adjustment * 1.5));
    this.dimensions.w5 = Math.min(1, Math.max(0, this.dimensions.w5 + adjustment * 1.2));
  }
}
function createDiseminerEngine(profile) {
  return new DiseminerEngine(profile);
}
function createWEngine(profile) {
  return new WDimensionEngine(profile);
}
var stdin_default = {
  DiseminerEngine,
  WDimensionEngine,
  SemanticNetwork,
  GenerativeGrammar,
  MonteCarloSimulator,
  GATES_64,
  createDiseminerEngine,
  createWEngine
};
export {
  DiseminerEngine,
  GATES_64,
  WDimensionEngine,
  createDiseminerEngine,
  createWEngine,
  stdin_default as default
};
