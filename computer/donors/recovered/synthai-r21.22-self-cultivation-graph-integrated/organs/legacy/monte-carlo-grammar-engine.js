class MonteCarloGrammarEngine {
  rules = /* @__PURE__ */ new Map();
  lexicon = /* @__PURE__ */ new Map();
  styleProfile;
  temperature = 1;
  maxDepth = 20;
  beamWidth = 5;
  constructor(styleProfile) {
    this.styleProfile = styleProfile;
    this.initializeGrammar();
    this.initializeLexicon();
  }
  initializeGrammar() {
    this.addRule({
      id: "S-declarative",
      lhs: "S",
      rhs: ["NP", "VP", "."],
      probability: 0.45,
      styleMask: { formal: 0.5, poetic: 0.3, terse: 0.4, elaborate: 0.5, archaic: 0.3, technical: 0.5 },
      features: { declarative: true, statement: true }
    });
    this.addRule({
      id: "S-interrogative",
      lhs: "S",
      rhs: ["Aux", "NP", "VP", "?"],
      probability: 0.15,
      styleMask: { formal: 0.6, poetic: 0.2, terse: 0.5, elaborate: 0.4, archaic: 0.4, technical: 0.5 },
      features: { interrogative: true, question: true }
    });
    this.addRule({
      id: "S-imperative",
      lhs: "S",
      rhs: ["VP", "."],
      probability: 0.1,
      styleMask: { formal: 0.3, poetic: 0.2, terse: 0.8, elaborate: 0.2, archaic: 0.3, technical: 0.3 },
      features: { imperative: true, command: true }
    });
    this.addRule({
      id: "S-exclamatory",
      lhs: "S",
      rhs: ["Wh", "NP", "VP", "!"],
      probability: 0.08,
      styleMask: { formal: 0.2, poetic: 0.7, terse: 0.3, elaborate: 0.6, archaic: 0.4, technical: 0.2 },
      features: { exclamatory: true, emotion: true }
    });
    this.addRule({
      id: "S-conditional",
      lhs: "S",
      rhs: ["If", "S", "then", "S"],
      probability: 0.12,
      styleMask: { formal: 0.7, poetic: 0.3, terse: 0.4, elaborate: 0.7, archaic: 0.5, technical: 0.7 },
      features: { conditional: true, hypothetical: true }
    });
    this.addRule({
      id: "S-relative",
      lhs: "S",
      rhs: ["NP", "Rel", "S", "VP", "."],
      probability: 0.1,
      styleMask: { formal: 0.8, poetic: 0.5, terse: 0.2, elaborate: 0.9, archaic: 0.6, technical: 0.6 },
      features: { relative: true, embedded: true }
    });
    this.addRule({
      id: "NP-det-noun",
      lhs: "NP",
      rhs: ["Det", "N"],
      probability: 0.3,
      styleMask: { formal: 0.5, poetic: 0.3, terse: 0.7, elaborate: 0.3, archaic: 0.4, technical: 0.5 },
      features: { simple: true, definite: true }
    });
    this.addRule({
      id: "NP-det-adj-noun",
      lhs: "NP",
      rhs: ["Det", "Adj", "N"],
      probability: 0.25,
      styleMask: { formal: 0.5, poetic: 0.5, terse: 0.5, elaborate: 0.5, archaic: 0.4, technical: 0.5 },
      features: { descriptive: true }
    });
    this.addRule({
      id: "NP-det-adj-adj-noun",
      lhs: "NP",
      rhs: ["Det", "Adj", "Adj", "N"],
      probability: 0.1,
      styleMask: { formal: 0.4, poetic: 0.7, terse: 0.2, elaborate: 0.8, archaic: 0.5, technical: 0.3 },
      features: { descriptive: true, elaborate: true }
    });
    this.addRule({
      id: "NP-proper",
      lhs: "NP",
      rhs: ["PropN"],
      probability: 0.2,
      styleMask: { formal: 0.6, poetic: 0.4, terse: 0.8, elaborate: 0.2, archaic: 0.5, technical: 0.5 },
      features: { proper: true, named: true }
    });
    this.addRule({
      id: "NP-pronoun",
      lhs: "NP",
      rhs: ["Pro"],
      probability: 0.15,
      styleMask: { formal: 0.4, poetic: 0.3, terse: 0.9, elaborate: 0.1, archaic: 0.4, technical: 0.4 },
      features: { pronominal: true, anaphoric: true }
    });
    this.addRule({
      id: "VP-transitive",
      lhs: "VP",
      rhs: ["V", "NP"],
      probability: 0.35,
      styleMask: { formal: 0.5, poetic: 0.4, terse: 0.6, elaborate: 0.4, archaic: 0.4, technical: 0.5 },
      features: { transitive: true, action: true }
    });
    this.addRule({
      id: "VP-intransitive",
      lhs: "VP",
      rhs: ["V"],
      probability: 0.2,
      styleMask: { formal: 0.5, poetic: 0.5, terse: 0.7, elaborate: 0.3, archaic: 0.4, technical: 0.4 },
      features: { intransitive: true }
    });
    this.addRule({
      id: "VP-ditransitive",
      lhs: "VP",
      rhs: ["V", "NP", "NP"],
      probability: 0.15,
      styleMask: { formal: 0.6, poetic: 0.3, terse: 0.4, elaborate: 0.6, archaic: 0.5, technical: 0.5 },
      features: { ditransitive: true, giving: true }
    });
    this.addRule({
      id: "VP-adverbial",
      lhs: "VP",
      rhs: ["V", "Adv"],
      probability: 0.15,
      styleMask: { formal: 0.4, poetic: 0.6, terse: 0.5, elaborate: 0.5, archaic: 0.5, technical: 0.3 },
      features: { adverbial: true, manner: true }
    });
    this.addRule({
      id: "VP-copula",
      lhs: "VP",
      rhs: ["Cop", "Adj"],
      probability: 0.15,
      styleMask: { formal: 0.6, poetic: 0.5, terse: 0.5, elaborate: 0.5, archaic: 0.5, technical: 0.5 },
      features: { copular: true, stative: true }
    });
    this.addRule({
      id: "PP",
      lhs: "PP",
      rhs: ["P", "NP"],
      probability: 1,
      styleMask: { formal: 0.5, poetic: 0.5, terse: 0.4, elaborate: 0.6, archaic: 0.5, technical: 0.5 },
      features: { prepositional: true, locative: true }
    });
    this.addRule({
      id: "NP-pp",
      lhs: "NP",
      rhs: ["NP", "PP"],
      probability: 0.15,
      styleMask: { formal: 0.6, poetic: 0.5, terse: 0.3, elaborate: 0.7, archaic: 0.5, technical: 0.5 },
      features: { modified: true, locative: true }
    });
    this.addRule({
      id: "VP-pp",
      lhs: "VP",
      rhs: ["VP", "PP"],
      probability: 0.2,
      styleMask: { formal: 0.5, poetic: 0.5, terse: 0.3, elaborate: 0.7, archaic: 0.5, technical: 0.5 },
      features: { modified: true, locative: true }
    });
  }
  addRule(rule) {
    if (!this.rules.has(rule.lhs)) {
      this.rules.set(rule.lhs, []);
    }
    this.rules.get(rule.lhs).push(rule);
  }
  initializeLexicon() {
    this.addLexicalEntry("the", "Det", { definite: true, specific: true }, 0.4);
    this.addLexicalEntry("a", "Det", { indefinite: true, nonspecific: true }, 0.3);
    this.addLexicalEntry("an", "Det", { indefinite: true, vowelInitial: true }, 0.15);
    this.addLexicalEntry("this", "Det", { demonstrative: true, proximal: true }, 0.08);
    this.addLexicalEntry("that", "Det", { demonstrative: true, distal: true }, 0.07);
    this.addLexicalEntry("man", "N", { animate: true, human: true, male: true, singular: true }, 0.08);
    this.addLexicalEntry("woman", "N", { animate: true, human: true, female: true, singular: true }, 0.08);
    this.addLexicalEntry("child", "N", { animate: true, human: true, young: true, singular: true }, 0.06);
    this.addLexicalEntry("king", "N", { animate: true, human: true, male: true, royal: true, singular: true }, 0.04);
    this.addLexicalEntry("queen", "N", { animate: true, human: true, female: true, royal: true, singular: true }, 0.04);
    this.addLexicalEntry("warrior", "N", { animate: true, human: true, martial: true, singular: true }, 0.03);
    this.addLexicalEntry("scholar", "N", { animate: true, human: true, intellectual: true, singular: true }, 0.03);
    this.addLexicalEntry("merchant", "N", { animate: true, human: true, commercial: true, singular: true }, 0.03);
    this.addLexicalEntry("sailor", "N", { animate: true, human: true, maritime: true, singular: true }, 0.03);
    this.addLexicalEntry("artist", "N", { animate: true, human: true, creative: true, singular: true }, 0.03);
    this.addLexicalEntry("sword", "N", { inanimate: true, weapon: true, metallic: true, singular: true }, 0.05);
    this.addLexicalEntry("book", "N", { inanimate: true, knowledge: true, written: true, singular: true }, 0.05);
    this.addLexicalEntry("ship", "N", { inanimate: true, vehicle: true, maritime: true, singular: true }, 0.04);
    this.addLexicalEntry("mountain", "N", { inanimate: true, geographic: true, large: true, singular: true }, 0.04);
    this.addLexicalEntry("river", "N", { inanimate: true, geographic: true, flowing: true, singular: true }, 0.04);
    this.addLexicalEntry("city", "N", { inanimate: true, urban: true, populated: true, singular: true }, 0.04);
    this.addLexicalEntry("garden", "N", { inanimate: true, cultivated: true, natural: true, singular: true }, 0.03);
    this.addLexicalEntry("tower", "N", { inanimate: true, structure: true, tall: true, singular: true }, 0.03);
    this.addLexicalEntry("mirror", "N", { inanimate: true, reflective: true, singular: true }, 0.03);
    this.addLexicalEntry("flame", "N", { inanimate: true, fire: true, ephemeral: true, singular: true }, 0.03);
    this.addLexicalEntry("truth", "N", { abstract: true, epistemic: true, singular: true }, 0.04);
    this.addLexicalEntry("beauty", "N", { abstract: true, aesthetic: true, singular: true }, 0.03);
    this.addLexicalEntry("justice", "N", { abstract: true, moral: true, singular: true }, 0.03);
    this.addLexicalEntry("wisdom", "N", { abstract: true, epistemic: true, singular: true }, 0.03);
    this.addLexicalEntry("chaos", "N", { abstract: true, disorder: true, singular: true }, 0.03);
    this.addLexicalEntry("harmony", "N", { abstract: true, order: true, musical: true, singular: true }, 0.03);
    this.addLexicalEntry("sees", "V", { transitive: true, perception: true, thirdPerson: true, present: true }, 0.06);
    this.addLexicalEntry("finds", "V", { transitive: true, discovery: true, thirdPerson: true, present: true }, 0.05);
    this.addLexicalEntry("takes", "V", { transitive: true, acquisition: true, thirdPerson: true, present: true }, 0.05);
    this.addLexicalEntry("holds", "V", { transitive: true, possession: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("creates", "V", { transitive: true, creation: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("destroys", "V", { transitive: true, destruction: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("transforms", "V", { transitive: true, change: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("discovers", "V", { transitive: true, discovery: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("protects", "V", { transitive: true, defense: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("challenges", "V", { transitive: true, conflict: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("arrives", "V", { intransitive: true, motion: true, thirdPerson: true, present: true }, 0.05);
    this.addLexicalEntry("departs", "V", { intransitive: true, motion: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("sleeps", "V", { intransitive: true, rest: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("waits", "V", { intransitive: true, patience: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("shines", "V", { intransitive: true, emission: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("falls", "V", { intransitive: true, motion: true, downward: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("rises", "V", { intransitive: true, motion: true, upward: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("sings", "V", { intransitive: true, musical: true, thirdPerson: true, present: true }, 0.03);
    this.addLexicalEntry("gives", "V", { ditransitive: true, transfer: true, thirdPerson: true, present: true }, 0.06);
    this.addLexicalEntry("shows", "V", { ditransitive: true, demonstration: true, thirdPerson: true, present: true }, 0.05);
    this.addLexicalEntry("teaches", "V", { ditransitive: true, instruction: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("sends", "V", { ditransitive: true, transfer: true, thirdPerson: true, present: true }, 0.04);
    this.addLexicalEntry("is", "Cop", { copular: true, thirdPerson: true, present: true, singular: true }, 0.7);
    this.addLexicalEntry("becomes", "Cop", { copular: true, inchoative: true, thirdPerson: true, present: true }, 0.2);
    this.addLexicalEntry("remains", "Cop", { copular: true, continuative: true, thirdPerson: true, present: true }, 0.1);
    this.addLexicalEntry("ancient", "Adj", { descriptive: true, temporal: true, old: true }, 0.06);
    this.addLexicalEntry("bright", "Adj", { descriptive: true, visual: true, luminous: true }, 0.05);
    this.addLexicalEntry("dark", "Adj", { descriptive: true, visual: true, shadow: true }, 0.05);
    this.addLexicalEntry("golden", "Adj", { descriptive: true, visual: true, metallic: true, valuable: true }, 0.05);
    this.addLexicalEntry("silent", "Adj", { descriptive: true, auditory: true, quiet: true }, 0.05);
    this.addLexicalEntry("swift", "Adj", { descriptive: true, motion: true, fast: true }, 0.04);
    this.addLexicalEntry("wise", "Adj", { descriptive: true, epistemic: true, knowledgeable: true }, 0.05);
    this.addLexicalEntry("fierce", "Adj", { descriptive: true, intensity: true, aggressive: true }, 0.04);
    this.addLexicalEntry("gentle", "Adj", { descriptive: true, intensity: true, mild: true }, 0.04);
    this.addLexicalEntry("hidden", "Adj", { descriptive: true, visibility: true, concealed: true }, 0.04);
    this.addLexicalEntry("eternal", "Adj", { descriptive: true, temporal: true, infinite: true }, 0.03);
    this.addLexicalEntry("fragile", "Adj", { descriptive: true, physical: true, delicate: true }, 0.03);
    this.addLexicalEntry("slowly", "Adv", { adverbial: true, manner: true, speed: true, slow: true }, 0.15);
    this.addLexicalEntry("quickly", "Adv", { adverbial: true, manner: true, speed: true, fast: true }, 0.15);
    this.addLexicalEntry("silently", "Adv", { adverbial: true, manner: true, auditory: true, quiet: true }, 0.12);
    this.addLexicalEntry("carefully", "Adv", { adverbial: true, manner: true, caution: true }, 0.12);
    this.addLexicalEntry("suddenly", "Adv", { adverbial: true, manner: true, unexpected: true }, 0.12);
    this.addLexicalEntry("gracefully", "Adv", { adverbial: true, manner: true, elegance: true }, 0.1);
    this.addLexicalEntry("fiercely", "Adv", { adverbial: true, manner: true, intensity: true }, 0.1);
    this.addLexicalEntry("eternally", "Adv", { adverbial: true, manner: true, temporal: true, infinite: true }, 0.07);
    this.addLexicalEntry("secretly", "Adv", { adverbial: true, manner: true, concealment: true }, 0.07);
    this.addLexicalEntry("in", "P", { preposition: true, locative: true, containment: true }, 0.25);
    this.addLexicalEntry("on", "P", { preposition: true, locative: true, surface: true }, 0.2);
    this.addLexicalEntry("through", "P", { preposition: true, locative: true, traversal: true }, 0.15);
    this.addLexicalEntry("beneath", "P", { preposition: true, locative: true, below: true }, 0.12);
    this.addLexicalEntry("beyond", "P", { preposition: true, locative: true, distant: true }, 0.13);
    this.addLexicalEntry("within", "P", { preposition: true, locative: true, interior: true }, 0.15);
    this.addLexicalEntry("he", "Pro", { pronominal: true, animate: true, human: true, male: true, thirdPerson: true, singular: true }, 0.25);
    this.addLexicalEntry("she", "Pro", { pronominal: true, animate: true, human: true, female: true, thirdPerson: true, singular: true }, 0.25);
    this.addLexicalEntry("it", "Pro", { pronominal: true, inanimate: true, thirdPerson: true, singular: true }, 0.2);
    this.addLexicalEntry("they", "Pro", { pronominal: true, plural: true, thirdPerson: true }, 0.2);
    this.addLexicalEntry("we", "Pro", { pronominal: true, firstPerson: true, plural: true }, 0.1);
    this.addLexicalEntry("Aldric", "PropN", { proper: true, animate: true, human: true, male: true, singular: true }, 0.08);
    this.addLexicalEntry("Seraphina", "PropN", { proper: true, animate: true, human: true, female: true, singular: true }, 0.08);
    this.addLexicalEntry("Thorne", "PropN", { proper: true, animate: true, human: true, male: true, singular: true }, 0.07);
    this.addLexicalEntry("Elena", "PropN", { proper: true, animate: true, human: true, female: true, singular: true }, 0.07);
    this.addLexicalEntry("Kael", "PropN", { proper: true, animate: true, human: true, male: true, singular: true }, 0.07);
    this.addLexicalEntry("Lyra", "PropN", { proper: true, animate: true, human: true, female: true, singular: true }, 0.07);
    this.addLexicalEntry("Orion", "PropN", { proper: true, animate: true, human: true, male: true, singular: true }, 0.06);
    this.addLexicalEntry("Isolde", "PropN", { proper: true, animate: true, human: true, female: true, singular: true }, 0.06);
    this.addLexicalEntry("Valdris", "PropN", { proper: true, animate: true, human: true, male: true, singular: true }, 0.05);
    this.addLexicalEntry("Mira", "PropN", { proper: true, animate: true, human: true, female: true, singular: true }, 0.05);
    this.addLexicalEntry("Atlantis", "PropN", { proper: true, inanimate: true, place: true, legendary: true, singular: true }, 0.06);
    this.addLexicalEntry("Eldoria", "PropN", { proper: true, inanimate: true, place: true, fictional: true, singular: true }, 0.06);
    this.addLexicalEntry("Synthia", "PropN", { proper: true, inanimate: true, entity: true, artificial: true, singular: true }, 0.05);
    this.addLexicalEntry("does", "Aux", { auxiliary: true, doSupport: true, thirdPerson: true, present: true }, 0.4);
    this.addLexicalEntry("will", "Aux", { auxiliary: true, future: true, modal: true }, 0.3);
    this.addLexicalEntry("can", "Aux", { auxiliary: true, ability: true, modal: true }, 0.2);
    this.addLexicalEntry("must", "Aux", { auxiliary: true, necessity: true, modal: true }, 0.1);
    this.addLexicalEntry("what", "Wh", { wh: true, interrogative: true, object: true }, 0.35);
    this.addLexicalEntry("who", "Wh", { wh: true, interrogative: true, animate: true, subject: true }, 0.3);
    this.addLexicalEntry("where", "Wh", { wh: true, interrogative: true, locative: true }, 0.2);
    this.addLexicalEntry("why", "Wh", { wh: true, interrogative: true, causal: true }, 0.15);
    this.addLexicalEntry("who", "Rel", { relative: true, animate: true, human: true }, 0.5);
    this.addLexicalEntry("which", "Rel", { relative: true, inanimate: true }, 0.3);
    this.addLexicalEntry("that", "Rel", { relative: true, general: true }, 0.2);
  }
  addLexicalEntry(word, category, features, probability) {
    if (!this.lexicon.has(category)) {
      this.lexicon.set(category, []);
    }
    this.lexicon.get(category).push({ category, features, probability });
    if (!this.lexicon.has(word)) {
      this.lexicon.set(word, []);
    }
    this.lexicon.get(word).push({ category, features, probability });
  }
  generate(numSentences = 1) {
    const sentences = [];
    for (let i = 0; i < numSentences; i++) {
      const tree = this.monteCarloGenerate("S", 0);
      const text = this.renderTree(tree);
      sentences.push(text);
    }
    return sentences;
  }
  monteCarloGenerate(symbol, depth) {
    const node = {
      symbol,
      children: [],
      features: {},
      probability: 1,
      depth,
      startPos: 0,
      endPos: 0
    };
    if (this.isTerminal(symbol)) {
      const entries = this.lexicon.get(symbol);
      if (entries && entries.length > 0) {
        const selected = this.sampleLexicalEntry(symbol, entries);
        node.features = { ...selected.features };
        node.probability = selected.probability;
        // Prefer the word carried by sampleLexicalEntry; fall back to lookup
        node.word = selected.word || this.getWordForEntry(symbol, selected) || symbol.toLowerCase();
      } else {
        // Punctuation / bare terminals
        node.word = symbol.length <= 1 ? symbol : symbol.toLowerCase();
      }
      return node;
    }
    const rules = this.rules.get(symbol);
    if (!rules || rules.length === 0) return node;
    const selectedRule = this.sampleRule(rules);
    node.rule = selectedRule;
    node.probability = selectedRule.probability;
    let currentPos = 0;
    for (const childSymbol of selectedRule.rhs) {
      const child = this.monteCarloGenerate(childSymbol, depth + 1);
      child.startPos = currentPos;
      child.endPos = currentPos + 1;
      currentPos++;
      node.children.push(child);
    }
    node.features = this.inheritFeatures(node);
    return node;
  }
  sampleRule(rules) {
    const scores = rules.map((rule) => {
      const styleScore = this.calculateStyleScore(rule.styleMask);
      return rule.probability * Math.pow(styleScore, this.temperature);
    });
    const total = scores.reduce((a, b) => a + b, 0);
    const normalized = scores.map((s) => s / total);
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < normalized.length; i++) {
      cumulative += normalized[i];
      if (rand <= cumulative) return rules[i];
    }
    return rules[rules.length - 1];
  }
  calculateStyleScore(mask) {
    const target = this.styleProfile.target;
    const diffs = [
      Math.abs(mask.formal - target.formal),
      Math.abs(mask.poetic - target.poetic),
      Math.abs(mask.terse - target.terse),
      Math.abs(mask.elaborate - target.elaborate),
      Math.abs(mask.archaic - target.archaic),
      Math.abs(mask.technical - target.technical)
    ];
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return Math.max(0, 1 - avgDiff / this.styleProfile.tolerance);
  }
  sampleLexicalEntry(symbol, entries) {
    const wordEntries = [];
    for (const [word, wordCats] of this.lexicon.entries()) {
      for (const entry of wordCats) {
        if (entry.category === symbol) {
          const styleScore = this.calculateLexicalStyleScore(entry.features);
          const combinedScore = entry.probability * Math.pow(styleScore, this.temperature);
          wordEntries.push({ word, entry, score: combinedScore });
        }
      }
    }
    if (wordEntries.length === 0) return entries[0];
    const total = wordEntries.reduce((a, b) => a + b.score, 0);
    const rand = Math.random() * total;
    let cumulative = 0;
    for (const we of wordEntries) {
      cumulative += we.score;
      if (rand <= cumulative) return { ...we.entry, word: we.word };
    }
    return { ...wordEntries[wordEntries.length - 1].entry, word: wordEntries[wordEntries.length - 1].word };
  }
  calculateLexicalStyleScore(features) {
    let score = 1;
    const target = this.styleProfile.target;
    if (features.poetic || features.metaphorical || features.emotional) {
      score *= 0.5 + 0.5 * target.poetic;
    }
    if (features.technical || features.scientific || features.precise) {
      score *= 0.5 + 0.5 * target.technical;
    }
    if (features.archaic || features.old || features.historical) {
      score *= 0.5 + 0.5 * target.archaic;
    }
    return score;
  }
  getWordForEntry(symbol, entry) {
    for (const [word, entries] of this.lexicon.entries()) {
      for (const e of entries) {
        if (e.category === symbol && e === entry) return word;
      }
    }
    return symbol.toLowerCase();
  }
  inheritFeatures(node) {
    const features = { ...node.features };
    for (const child of node.children) {
      for (const [key, value] of Object.entries(child.features)) {
        if (value && !features[key]) features[key] = true;
      }
    }
    if (node.rule) {
      for (const [key, value] of Object.entries(node.rule.features)) {
        if (value) features[key] = true;
      }
    }
    return features;
  }
  isTerminal(symbol) {
    const terminals = ["Det", "N", "V", "Adj", "Adv", "P", "Pro", "PropN", "Cop", "Aux", "Wh", "Rel", ".", "?", "!", "If", "then"];
    // Only true terminals — never treat nonterminal categories (S, NP, VP, PP) as terminals
    if (["S", "NP", "VP", "PP"].includes(symbol)) return false;
    return terminals.includes(symbol) || (symbol.length <= 1 && !/[A-Z]/.test(symbol));
  }
  renderTree(node) {
    if (node.word) return node.word;
    const parts = node.children.map((child) => this.renderTree(child));
    let text = parts.join(" ");
    text = text.replace(/\s+([.?!,;:])/g, "$1");
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
    return text;
  }
  parse(input) {
    const tokens = this.tokenize(input);
    const results = [];
    let beams = [
      { node: this.createRootNode(), tokens, pos: 0 }
    ];
    for (let step = 0; step < this.maxDepth && beams.length > 0; step++) {
      const newBeams = [];
      for (const beam of beams) {
        if (beam.pos >= beam.tokens.length) {
          results.push(beam.node);
          continue;
        }
        const expansions = this.expandBeam(beam);
        newBeams.push(...expansions);
      }
      beams = this.pruneBeams(newBeams);
    }
    return results;
  }
  tokenize(input) {
    return input.toLowerCase().replace(/([.?!,;:])/g, " $1 ").split(/\s+/).filter((t) => t.length > 0);
  }
  createRootNode() {
    return { symbol: "S", children: [], features: {}, probability: 1, depth: 0, startPos: 0, endPos: 0 };
  }
  expandBeam(beam) {
    const expansions = [];
    const token = beam.tokens[beam.pos];
    for (const [category, entries] of this.lexicon.entries()) {
      for (const entry of entries) {
        for (const [word, wordEntries] of this.lexicon.entries()) {
          if (word.toLowerCase() === token && wordEntries.some((e) => e.category === category)) {
            const childNode = {
              symbol: category,
              children: [],
              features: entry.features,
              probability: entry.probability,
              depth: beam.node.depth + 1,
              startPos: beam.pos,
              endPos: beam.pos + 1
            };
            childNode.word = word;
            const newNode = { ...beam.node, children: [...beam.node.children, childNode] };
            expansions.push({ node: newNode, tokens: beam.tokens, pos: beam.pos + 1 });
          }
        }
      }
    }
    return expansions;
  }
  pruneBeams(beams) {
    if (beams.length <= this.beamWidth) return beams;
    const scored = beams.map((b) => ({ ...b, score: this.scoreBeam(b) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.beamWidth).map(({ score, ...rest }) => rest);
  }
  scoreBeam(beam) {
    const coverage = beam.pos / beam.tokens.length;
    const prob = beam.node.children.reduce((p, c) => p * c.probability, 1);
    return coverage * 0.5 + prob * 0.5;
  }
  setStyleProfile(profile) {
    this.styleProfile = profile;
  }
  setTemperature(temp) {
    this.temperature = temp;
  }
  setBeamWidth(width) {
    this.beamWidth = width;
  }
  getGrammarStats() {
    let ruleCount = 0;
    const categories = [];
    for (const [cat, rules] of this.rules.entries()) {
      ruleCount += rules.length;
      categories.push(cat);
    }
    return { rules: ruleCount, lexicon: this.lexicon.size, categories };
  }
}
export {
  MonteCarloGrammarEngine
};
