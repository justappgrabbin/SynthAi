class AutolingEngine {
  grammar = [];
  transformations = [];
  morphologicalRules = /* @__PURE__ */ new Map();
  frame = 0;
  illegalSet = [];
  recycleDepth = 0;
  maxRecycleDepth = 3;
  savedStates = /* @__PURE__ */ new Map();
  featureVectors = /* @__PURE__ */ new Map();
  // Klein's heuristic counters
  heuristicCounters = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0
  };
  constructor() {
    console.log("[AUTOLING] Initialized - Sheldon Klein inspired linguistic fieldworker");
  }
  // ============================================================
  // MORPHOLOGICAL ANALYZER (Klein Section 2.0)
  // ============================================================
  async analyzeMorphology(input) {
    const segments = this.segmentInput(input);
    const morphemes = [];
    for (const segment of segments) {
      const features = this.extractFeatures(segment);
      const isPrimary = this.isPrimaryGloss(segment, features);
      morphemes.push({
        segment,
        gloss: this.generateGloss(segment, features),
        features,
        isAllomorph: this.detectAllomorph(segment, morphemes),
        primaryGloss: isPrimary,
        secondaryGloss: !isPrimary
      });
    }
    return {
      morphemes,
      segmentationAlgorithm: this.deriveSegmentationAlgorithm(segments),
      confidence: this.calculateMorphologicalConfidence(morphemes)
    };
  }
  segmentInput(input) {
    const basic = input.split(/\s+/).filter(Boolean);
    const recombined = this.recombineOvercuts(basic);
    return recombined;
  }
  extractFeatures(segment) {
    const features = {};
    features["1st_person"] = /^(I|me|my|we|us|our)$/i.test(segment);
    features["2nd_person"] = /^(you|your|yours)$/i.test(segment);
    features["3rd_person"] = /^(he|she|it|they|him|her|them|his|her|its|their)$/i.test(segment);
    features["singular"] = /^(I|you|he|she|it|me|him|her)$/i.test(segment);
    features["plural"] = /^(we|they|us|them)$/i.test(segment);
    features["present"] = /^(eat|run|walk|talk|is|are|am)$/i.test(segment);
    features["past"] = /^(ate|ran|walked|talked|was|were)$/i.test(segment);
    features["animate"] = /^(I|you|he|she|we|they|man|woman|dog|cat)$/i.test(segment);
    features["human"] = /^(I|you|he|she|we|they|man|woman|person)$/i.test(segment);
    features["noun"] = /^(the|a|an)\s+\w+$/i.test(`the ${segment}`) || /^(man|woman|dog|cat|fish|book|table|car|house|tree)$/i.test(segment);
    features["verb"] = /^(eat|run|walk|talk|read|write|sleep|think|love|hate|is|are|am|was|were)$/i.test(segment);
    features["determiner"] = /^(the|a|an|this|that|these|those)$/i.test(segment);
    features["adjective"] = /^(big|small|red|blue|happy|sad|good|bad|old|new)$/i.test(segment);
    features["adverb"] = /^(quickly|slowly|happily|sadly|very|quite|rather)$/i.test(segment);
    features["preposition"] = /^(in|on|at|by|with|from|to|for|of|about)$/i.test(segment);
    return features;
  }
  generateGloss(segment, features) {
    const activeFeatures = Object.entries(features).filter(([_, v]) => v).map(([k, _]) => k);
    return activeFeatures.join(", ");
  }
  isPrimaryGloss(segment, features) {
    const uniqueAssociations = ["1st_person", "2nd_person", "3rd_person"];
    return uniqueAssociations.some((f) => features[f]);
  }
  detectAllomorph(segment, existing) {
    const features = this.extractFeatures(segment);
    return existing.some((m) => {
      const mFeatures = m.features;
      const overlap = Object.keys(features).filter((k) => features[k] && mFeatures[k]);
      return overlap.length > 2;
    });
  }
  recombineOvercuts(segments) {
    const result = [];
    let i = 0;
    while (i < segments.length) {
      if (i < segments.length - 1) {
        const combined = segments[i] + segments[i + 1];
        const f1 = this.extractFeatures(segments[i]);
        const f2 = this.extractFeatures(segments[i + 1]);
        const fCombined = this.extractFeatures(combined);
        const coherence1 = Object.values(f1).filter(Boolean).length;
        const coherence2 = Object.values(f2).filter(Boolean).length;
        const coherenceCombined = Object.values(fCombined).filter(Boolean).length;
        if (coherenceCombined > coherence1 + coherence2 - 2) {
          result.push(combined);
          i += 2;
          continue;
        }
      }
      result.push(segments[i]);
      i++;
    }
    return result;
  }
  deriveSegmentationAlgorithm(segments) {
    return `distributional-cut(${segments.length}-segments)`;
  }
  calculateMorphologicalConfidence(morphemes) {
    const totalFeatures = morphemes.reduce((sum, m) => sum + Object.values(m.features).filter(Boolean).length, 0);
    return Math.min(totalFeatures / (morphemes.length * 5), 1);
  }
  // ============================================================
  // PHRASE STRUCTURE HEURISTIC LEARNING (Klein Section 3.0)
  // ============================================================
  async learnPhraseStructure(sentence) {
    this.frame++;
    console.log(`[AUTOLING] Frame ${this.frame}: Learning from "${sentence}"`);
    const tokens = sentence.split(/\s+/).filter(Boolean);
    const parse = this.multiPathParse(tokens);
    if (parse.complete) {
      console.log(`[AUTOLING] PARSED OK - Frame ${this.frame}`);
      return this.grammar;
    }
    const newRules = this.applyHeuristics(parse.incompleteTopNodes, tokens);
    for (const rule of newRules) {
      await this.testRule(rule);
    }
    if (this.frame % 5 === 0) {
      await this.parseAllIllegals();
    }
    return this.grammar;
  }
  multiPathParse(tokens) {
    const parses = [];
    const result = this.attemptParse(tokens);
    if (result.complete) {
      return { complete: true, incompleteTopNodes: [] };
    }
    const topNodes = result.partialTrees.map((tree) => ({
      topNode: tree.top,
      uncombinedNodes: tree.uncombined,
      depth: tree.depth
    }));
    topNodes.sort((a, b) => a.uncombinedNodes - b.uncombinedNodes);
    return { complete: false, incompleteTopNodes: topNodes };
  }
  attemptParse(tokens) {
    let canParse = false;
    for (const rule of this.grammar) {
      if (rule.isSentenceRule && this.ruleMatches(rule, tokens)) {
        canParse = true;
        break;
      }
    }
    if (canParse) {
      return { complete: true, partialTrees: [] };
    }
    return {
      complete: false,
      partialTrees: [{ top: "S", uncombined: tokens.length, depth: 0 }]
    };
  }
  ruleMatches(rule, tokens) {
    return rule.rhs.join(" ") === tokens.join(" ");
  }
  applyHeuristics(topNodes, tokens) {
    const newRules = [];
    if (this.grammar.length === 0 || topNodes.length === 0) {
      this.heuristicCounters.h1++;
      const rule = {
        lhs: `S_${this.heuristicCounters.h1}`,
        rhs: tokens,
        isSentenceRule: true,
        isContextSensitive: false,
        testHistory: [],
        confidence: 0.5
      };
      this.grammar.push(rule);
      newRules.push(rule);
      console.log(`[AUTOLING] H1 coined: ${rule.lhs} -> ${rule.rhs.join(" ")}`);
      return newRules;
    }
    const h2Rules = this.applyHeuristic2(topNodes, tokens);
    newRules.push(...h2Rules);
    const h3Rules = this.applyHeuristic3(topNodes, tokens);
    newRules.push(...h3Rules);
    const h4Rules = this.applyHeuristic4(topNodes, tokens);
    newRules.push(...h4Rules);
    const h5Rules = this.applyHeuristic5(topNodes, tokens);
    newRules.push(...h5Rules);
    return newRules;
  }
  applyHeuristic2(topNodes, tokens) {
    const rules = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const env1 = tokens.slice(0, i).concat(tokens.slice(i + 1));
        const env2 = tokens.slice(0, j).concat(tokens.slice(j + 1));
        if (JSON.stringify(env1) === JSON.stringify(env2)) {
          this.heuristicCounters.h2++;
          const className = `Class_${this.heuristicCounters.h2}`;
          const rule = {
            lhs: className,
            rhs: [tokens[i], tokens[j]],
            isSentenceRule: false,
            isContextSensitive: false,
            testHistory: [],
            confidence: 0.6
          };
          this.grammar.push(rule);
          rules.push(rule);
        }
      }
    }
    return rules;
  }
  applyHeuristic3(topNodes, tokens) {
    const rules = [];
    return rules;
  }
  applyHeuristic4(topNodes, tokens) {
    const rules = [];
    return rules;
  }
  applyHeuristic5(topNodes, tokens) {
    const rules = [];
    return rules;
  }
  async testRule(rule) {
    const testSentence = this.generateTestSentence(rule);
    console.log(`[AUTOLING] CAN YOU SAY: ${testSentence}`);
    const accepted = this.validateTestSentence(testSentence, rule);
    rule.testHistory.push({
      accepted,
      frame: this.frame
    });
    if (!accepted) {
      this.illegalSet.push(testSentence);
    }
    rule.confidence = rule.testHistory.filter((h) => h.accepted).length / rule.testHistory.length;
  }
  generateTestSentence(rule) {
    const sentenceRules = this.grammar.filter((r) => r.isSentenceRule);
    if (sentenceRules.length === 0) {
      return rule.rhs.join(" ");
    }
    const testRule = sentenceRules[0];
    return testRule.rhs.join(" ");
  }
  validateTestSentence(sentence, rule) {
    const tokens = sentence.split(/\s+/);
    const features = tokens.map((t) => this.extractFeatures(t));
    for (let i = 0; i < features.length - 1; i++) {
      const f1 = features[i];
      const f2 = features[i + 1];
      if (f1["singular"] && f2["plural"] && f2["verb"]) {
        return false;
      }
    }
    return true;
  }
  async parseAllIllegals() {
    console.log(`[AUTOLING] Parsing illegals from all frames...`);
    for (const illegal of this.illegalSet) {
      const tokens = illegal.split(/\s+/);
      const parse = this.multiPathParse(tokens);
      if (parse.complete) {
        console.log(`[AUTOLING] ILLEGAL PARSED: "${illegal}" - Entering recycle mode`);
        await this.recycle();
        break;
      }
    }
  }
  async recycle() {
    if (this.recycleDepth >= this.maxRecycleDepth) {
      console.log("[AUTOLING] MAX RECYCLE DEPTH REACHED - Giving up on analysis");
      return;
    }
    this.recycleDepth++;
    console.log(`[AUTOLING] RECYCLE MODE (depth ${this.recycleDepth})`);
    const savedInputs = this.grammar.map((r) => r.rhs.join(" "));
    this.grammar = [];
    const reordered = [...savedInputs.slice(-5), ...savedInputs.slice(0, -5)];
    for (const input of reordered) {
      await this.learnPhraseStructure(input);
    }
    this.recycleDepth--;
  }
  // ============================================================
  // TRANSFORMATION LEARNING (Klein Section 4.0)
  // ============================================================
  async learnTransformation(sourceTree, targetString) {
    const rule = {
      id: `T_${this.transformations.length + 1}`,
      sourcePattern: this.serializeTree(sourceTree),
      targetPattern: targetString,
      context: "",
      isBilingual: false,
      isMonolingual: true,
      testHistory: [],
      generality: 0,
      status: "provisional"
    };
    const commonElements = this.findCommonElements(sourceTree, targetString);
    rule.generality = commonElements.length;
    await this.testTransformation(rule);
    this.transformations.push(rule);
    return rule;
  }
  serializeTree(tree) {
    const root = tree.nodes.get(tree.root);
    if (!root) return "";
    return this.serializeNode(tree, tree.root);
  }
  serializeNode(tree, nodeId) {
    const node = tree.nodes.get(nodeId);
    if (!node) return "";
    if (node.children.length === 0) {
      return node.surface;
    }
    const children = node.children.map((c) => this.serializeNode(tree, c)).join(" ");
    return `${node.lemma}(${children})`;
  }
  findCommonElements(tree, target) {
    const common = [];
    const targetTokens = new Set(target.split(/\s+/));
    for (const [_, node] of tree.nodes) {
      if (targetTokens.has(node.surface)) {
        common.push(node.surface);
      }
    }
    return common;
  }
  async testTransformation(rule) {
    const testCases = this.generateTransformationTests(rule);
    for (const test of testCases) {
      const accepted = this.validateTransformation(test, rule);
      rule.testHistory.push({ sentence: test, accepted, frame: this.frame });
      if (!accepted) {
        rule.generality--;
      }
    }
    rule.status = rule.testHistory.every((h) => h.accepted) ? "confirmed" : "provisional";
  }
  generateTransformationTests(rule) {
    return [
      rule.targetPattern
      // More general versions...
    ];
  }
  validateTransformation(sentence, rule) {
    return true;
  }
  // ============================================================
  // SEMANTIC PARSING (Modern Extension)
  // ============================================================
  async parseSemantic(input) {
    const morphAnalysis = await this.analyzeMorphology(input);
    const tokens = input.split(/\s+/).filter(Boolean);
    const tree = {
      root: "SENT",
      nodes: /* @__PURE__ */ new Map(),
      edges: [],
      illegalSet: [],
      frame: this.frame
    };
    for (let i = 0; i < tokens.length; i++) {
      const token = {
        id: `t_${i}`,
        surface: tokens[i],
        lemma: tokens[i].toLowerCase(),
        pos: this.inferPOS(tokens[i]),
        features: this.extractFeatures(tokens[i]),
        depth: 0,
        children: [],
        gloss: morphAnalysis.morphemes[i]?.gloss || "",
        confidence: morphAnalysis.morphemes[i] ? 0.8 : 0.5,
        ambiguityScore: this.calculateAmbiguity(tokens[i])
      };
      tree.nodes.set(token.id, token);
      if (i > 0) {
        tree.edges.push({
          from: `t_${i - 1}`,
          to: `t_${i}`,
          label: "next"
        });
      }
    }
    this.buildHierarchy(tree);
    return tree;
  }
  inferPOS(token) {
    const features = this.extractFeatures(token);
    if (features["noun"]) return "NOUN";
    if (features["verb"]) return "VERB";
    if (features["determiner"]) return "DET";
    if (features["adjective"]) return "ADJ";
    if (features["adverb"]) return "ADV";
    if (features["preposition"]) return "PREP";
    return "UNKNOWN";
  }
  calculateAmbiguity(token) {
    const features = this.extractFeatures(token);
    const activeCount = Object.values(features).filter(Boolean).length;
    return Math.min(activeCount / 3, 1);
  }
  buildHierarchy(tree) {
    const tokens = Array.from(tree.nodes.values());
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i].pos === "DET") {
        const npStart = i;
        i++;
        while (i < tokens.length && (tokens[i].pos === "ADJ" || tokens[i].pos === "NOUN")) {
          i++;
        }
        if (i > npStart + 1) {
          const npId = `NP_${npStart}`;
          const npNode = {
            id: npId,
            surface: tokens.slice(npStart, i).map((t) => t.surface).join(" "),
            lemma: "NP",
            pos: "NP",
            features: {},
            depth: 1,
            children: tokens.slice(npStart, i).map((t) => t.id),
            gloss: "noun phrase",
            confidence: 0.7,
            ambiguityScore: 0.3
          };
          tree.nodes.set(npId, npNode);
          for (let j = npStart; j < i; j++) {
            tokens[j].parent = npId;
            tokens[j].depth = 2;
          }
        }
      } else {
        i++;
      }
    }
  }
  // ============================================================
  // PIPELINE ORCHESTRATION
  // ============================================================
  async runPipeline(input) {
    console.log(`[AUTOLING] Running full pipeline on: "${input}"`);
    const morphology = await this.analyzeMorphology(input);
    const grammar = await this.learnPhraseStructure(input);
    const parseTree = await this.parseSemantic(input);
    this.propagateFeatures(parseTree);
    return {
      morphology,
      grammar,
      parseTree,
      frame: this.frame,
      confidence: this.calculateOverallConfidence(parseTree)
    };
  }
  propagateFeatures(tree) {
    const nodes = Array.from(tree.nodes.values());
    for (const node of nodes) {
      if (node.children.length > 0) {
        for (const childId of node.children) {
          const child = tree.nodes.get(childId);
          if (child) {
            for (const [key, value] of Object.entries(child.features)) {
              if (value && !node.features[key]) {
                node.features[key] = true;
              }
            }
          }
        }
      }
    }
    for (const node of nodes) {
      if (node.parent) {
        const parent = tree.nodes.get(node.parent);
        if (parent) {
          for (const [key, value] of Object.entries(parent.features)) {
            if (value && !node.features[key]) {
              node.features[key] = true;
            }
          }
        }
      }
    }
  }
  calculateOverallConfidence(tree) {
    const nodes = Array.from(tree.nodes.values());
    if (nodes.length === 0) return 0;
    const avgConfidence = nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length;
    return avgConfidence;
  }
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  saveState(slot) {
    this.savedStates.set(slot, {
      grammar: [...this.grammar],
      transformations: [...this.transformations],
      frame: this.frame,
      illegalSet: [...this.illegalSet],
      heuristicCounters: { ...this.heuristicCounters }
    });
    console.log(`[AUTOLING] State saved to slot ${slot}`);
  }
  loadState(slot) {
    const state = this.savedStates.get(slot);
    if (state) {
      this.grammar = state.grammar;
      this.transformations = state.transformations;
      this.frame = state.frame;
      this.illegalSet = state.illegalSet;
      this.heuristicCounters = state.heuristicCounters;
      console.log(`[AUTOLING] State loaded from slot ${slot}`);
    }
  }
  getGrammar() {
    return this.grammar;
  }
  getTransformations() {
    return this.transformations;
  }
  getStats() {
    return {
      frames: this.frame,
      grammarRules: this.grammar.length,
      transformations: this.transformations.length,
      illegals: this.illegalSet.length,
      heuristics: this.heuristicCounters,
      recycleDepth: this.recycleDepth
    };
  }
}
class AutolingServer {
  engine;
  messageQueue = [];
  constructor() {
    this.engine = new AutolingEngine();
  }
  async handleMessage(message) {
    const { type, payload } = message;
    switch (type) {
      case "parse":
        return await this.engine.parseSemantic(payload.text);
      case "morphology":
        return await this.engine.analyzeMorphology(payload.text);
      case "learn":
        return await this.engine.learnPhraseStructure(payload.text);
      case "pipeline":
        return await this.engine.runPipeline(payload.text);
      case "transform":
        return await this.engine.learnTransformation(payload.tree, payload.target);
      case "stats":
        return this.engine.getStats();
      case "save":
        this.engine.saveState(payload.slot);
        return { saved: true };
      case "load":
        this.engine.loadState(payload.slot);
        return { loaded: true };
      default:
        return { error: `Unknown message type: ${type}` };
    }
  }
  getEngine() {
    return this.engine;
  }
}
var stdin_default = AutolingEngine;
export {
  AutolingEngine,
  AutolingServer,
  stdin_default as default
};
