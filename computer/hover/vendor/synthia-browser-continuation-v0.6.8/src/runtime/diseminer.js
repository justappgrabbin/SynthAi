class DiseminerEngine {
  distributionalSpace = /* @__PURE__ */ new Map();
  claims = /* @__PURE__ */ new Map();
  narratives = /* @__PURE__ */ new Map();
  evidenceBase = /* @__PURE__ */ new Map();
  simulationHistory = [];
  // Sheldon's w-dimensions for narrative influence
  wDimensions = {
    w1_relevance: 0,
    // How relevant to user's current context
    w2_urgency: 0,
    // Temporal urgency
    w3_emotionalResonance: 0,
    // Emotional alignment
    w4_cognitiveLoad: 0,
    // How much cognitive effort required
    w5_socialProof: 0,
    // Social validation strength
    w6_authority: 0,
    // Source authority weight
    w7_reciprocity: 0,
    // Mutual benefit framing
    w8_scarcity: 0,
    // Rarity/uniqueness
    w9_consistency: 0,
    // Alignment with user's existing beliefs
    w10_liking: 0
    // Personal affinity/connection
  };
  constructor() {
    console.log("[DISEMINER] Initialized - Distributional-Semantics Inference Maker");
  }
  // ============================================================
  // DISTRIBUTIONAL SEMANTICS (Klein et al. 1968)
  // ============================================================
  async buildDistributionalSpace(documents) {
    console.log(`[DISEMINER] Building distributional space from ${documents.length} documents`);
    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i].toLowerCase();
        if (!this.distributionalSpace.has(word)) {
          this.distributionalSpace.set(word, {
            word,
            contexts: [],
            cooccurrenceMatrix: /* @__PURE__ */ new Map(),
            semanticField: /* @__PURE__ */ new Map(),
            inferredRelations: []
          });
        }
        const vector = this.distributionalSpace.get(word);
        const left = tokens.slice(Math.max(0, i - 5), i);
        const right = tokens.slice(i + 1, Math.min(tokens.length, i + 6));
        vector.contexts.push({
          left,
          right,
          frequency: 1,
          document: doc.substring(0, 50),
          position: i
        });
        for (const contextWord of [...left, ...right]) {
          const cw = contextWord.toLowerCase();
          const current = vector.cooccurrenceMatrix.get(cw) || 0;
          vector.cooccurrenceMatrix.set(cw, current + 1);
        }
      }
    }
    await this.inferSemanticRelations();
    console.log(`[DISEMINER] Distributional space built: ${this.distributionalSpace.size} words`);
  }
  tokenize(text) {
    return text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  }
  async inferSemanticRelations() {
    for (const [word, vector] of this.distributionalSpace) {
      const similarWords = this.findSimilarWords(word, vector);
      for (const [similarWord, similarity] of similarWords) {
        if (similarity > 0.7) {
          vector.inferredRelations.push({
            target: similarWord,
            relation: "synonymy",
            confidence: similarity,
            evidence: [`Similar context distributions: ${similarity.toFixed(3)}`]
          });
        } else if (similarity > 0.4) {
          vector.inferredRelations.push({
            target: similarWord,
            relation: "semantic_association",
            confidence: similarity,
            evidence: [`Context overlap: ${similarity.toFixed(3)}`]
          });
        }
      }
      const hypernyms = this.inferHypernyms(word, vector);
      vector.inferredRelations.push(...hypernyms);
      const meronyms = this.inferMeronyms(word, vector);
      vector.inferredRelations.push(...meronyms);
    }
  }
  findSimilarWords(word, vector) {
    const similarities = /* @__PURE__ */ new Map();
    for (const [otherWord, otherVector] of this.distributionalSpace) {
      if (otherWord === word) continue;
      const similarity = this.cosineSimilarity(
        vector.cooccurrenceMatrix,
        otherVector.cooccurrenceMatrix
      );
      if (similarity > 0.3) {
        similarities.set(otherWord, similarity);
      }
    }
    return similarities;
  }
  cosineSimilarity(a, b) {
    const allKeys = /* @__PURE__ */ new Set([...a.keys(), ...b.keys()]);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (const key of allKeys) {
      const valA = a.get(key) || 0;
      const valB = b.get(key) || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  inferHypernyms(word, vector) {
    const hypernyms = [];
    for (const [otherWord, otherVector] of this.distributionalSpace) {
      if (otherWord === word) continue;
      const aContexts = new Set(vector.contexts.map((c) => c.document));
      const bContexts = new Set(otherVector.contexts.map((c) => c.document));
      const intersection = new Set([...aContexts].filter((x) => bContexts.has(x)));
      const aSubsetB = intersection.size / aContexts.size;
      const bSubsetA = intersection.size / bContexts.size;
      if (aSubsetB > 0.8 && bSubsetA < 0.5) {
        hypernyms.push({
          target: otherWord,
          relation: "hypernymy",
          confidence: aSubsetB,
          evidence: [`Context subset: ${aSubsetB.toFixed(3)}`]
        });
      }
    }
    return hypernyms;
  }
  inferMeronyms(word, vector) {
    const meronyms = [];
    for (const context of vector.contexts) {
      const left = context.left;
      const right = context.right;
      if (left.includes("part") || right.includes("of")) {
        const candidate = right.find((w) => w !== "of");
        if (candidate) {
          meronyms.push({
            target: candidate,
            relation: "meronymy",
            confidence: 0.5,
            evidence: [`Part-of pattern: "${word} of ${candidate}"`]
          });
        }
      }
    }
    return meronyms;
  }
  // ============================================================
  // DEEP CLAIM EXTRACTION
  // ============================================================
  async extractClaims(text, source) {
    console.log(`[DISEMINER] Extracting claims from: ${source}`);
    const sentences = this.splitSentences(text);
    const extracted = [];
    for (const sentence of sentences) {
      const claim = await this.extractClaimFromSentence(sentence, source);
      if (claim) {
        extracted.push(claim);
        this.claims.set(claim.id, claim);
      }
    }
    await this.crossReferenceClaims(extracted);
    console.log(`[DISEMINER] Extracted ${extracted.length} claims`);
    return extracted;
  }
  splitSentences(text) {
    return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  }
  async extractClaimFromSentence(sentence, source) {
    const tokens = this.tokenize(sentence);
    if (tokens.length < 3) return null;
    const subject = tokens[0];
    const predicate = tokens.find((t, i) => i > 0 && this.isVerb(t)) || tokens[1];
    const object = tokens.slice(tokens.indexOf(predicate) + 1).join(" ") || tokens[tokens.length - 1];
    const modality = this.inferModality(sentence);
    const evidence = await this.findEvidence(subject, predicate, object);
    const claim = {
      id: `claim_${this.claims.size}_${Date.now()}`,
      text: sentence,
      source,
      subject,
      predicate,
      object,
      confidence: evidence.reduce((sum, e) => sum + e.strength, 0) / (evidence.length || 1),
      evidence,
      contradictions: [],
      supports: [],
      temporalContext: this.extractTemporalContext(sentence),
      modality
    };
    return claim;
  }
  isVerb(word) {
    const verbIndicators = [
      "is",
      "are",
      "was",
      "were",
      "has",
      "have",
      "had",
      "does",
      "do",
      "did",
      "can",
      "could",
      "will",
      "would",
      "shall",
      "should",
      "may",
      "might",
      "must"
    ];
    return verbIndicators.includes(word.toLowerCase()) || /(ing|ed|en|s)$/.test(word);
  }
  inferModality(sentence) {
    const lower = sentence.toLowerCase();
    if (/\b(must|certainly|definitely|always|never|all)\b/.test(lower)) return "certain";
    if (/\b(probably|likely|most|generally|usually)\b/.test(lower)) return "probable";
    if (/\b(might|could|possibly|maybe|some)\b/.test(lower)) return "possible";
    if (/\b(think|believe|suggest|hypothesize|speculate)\b/.test(lower)) return "speculative";
    return "probable";
  }
  async findEvidence(subject, predicate, object) {
    const evidence = [];
    for (const [word, vector] of this.distributionalSpace) {
      if (word === subject || word === object) {
        for (const context of vector.contexts) {
          const contextText = [...context.left, word, ...context.right].join(" ");
          if (contextText.includes(predicate) || contextText.includes(object)) {
            evidence.push({
              text: contextText,
              source: context.document,
              strength: context.frequency / 10
            });
          }
        }
      }
    }
    return evidence.slice(0, 5);
  }
  extractTemporalContext(sentence) {
    const temporalMarkers = /\b(yesterday|today|tomorrow|now|then|soon|recently|lately|already|yet|still|before|after|during|while|when|since|until|ago|later|earlier)\b/i;
    const match = sentence.match(temporalMarkers);
    return match ? match[0] : "present";
  }
  async crossReferenceClaims(claims) {
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];
        if (this.areContradictory(a, b)) {
          a.contradictions.push(b.id);
          b.contradictions.push(a.id);
        }
        if (this.areSupporting(a, b)) {
          a.supports.push(b.id);
          b.supports.push(a.id);
        }
      }
    }
  }
  areContradictory(a, b) {
    if (a.subject === b.subject && a.predicate !== b.predicate) {
      const negationWords = ["not", "no", "never", "none", "without", "against"];
      const aNegated = negationWords.some((w) => a.text.toLowerCase().includes(w));
      const bNegated = negationWords.some((w) => b.text.toLowerCase().includes(w));
      return aNegated !== bNegated;
    }
    return false;
  }
  areSupporting(a, b) {
    return a.subject === b.subject && a.predicate === b.predicate;
  }
  // ============================================================
  // MONTE CARLO SIMULATION (Klein's historical change simulation)
  // ============================================================
  async runMonteCarlo(query, options = {}) {
    const iterations = options.iterations || 1e3;
    console.log(`[DISEMINER] Running Monte Carlo simulation: "${query}" (${iterations} iterations)`);
    const hypotheses = this.generateHypotheses(query);
    const samples = [];
    let converged = false;
    let iteration = 0;
    while (iteration < iterations && !converged) {
      for (const hypothesis of hypotheses) {
        const priorProb = options.priorDistribution?.get(hypothesis) || 1 / hypotheses.length;
        const evidenceWeight = this.calculateEvidenceWeight(hypothesis, query);
        const posterior = this.calculatePosterior(priorProb, evidenceWeight);
        samples.push({
          hypothesis,
          probability: posterior,
          evidenceWeight,
          priorProbability: priorProb
        });
      }
      converged = this.checkConvergence(samples, iteration);
      iteration += hypotheses.length;
    }
    const best = samples.reduce((best2, current) => current.probability > best2.probability ? current : best2, samples[0]);
    const probabilities = samples.map((s) => s.probability).sort((a, b) => a - b);
    const ci = [
      probabilities[Math.floor(probabilities.length * 0.025)],
      probabilities[Math.floor(probabilities.length * 0.975)]
    ];
    const simulation = {
      query,
      iterations: iteration,
      samples,
      convergence: iteration / iterations,
      bestHypothesis: best.hypothesis,
      confidenceInterval: ci,
      doubtBypassed: best.probability > 0.7 && ci[0] > 0.5
    };
    this.simulationHistory.push(simulation);
    console.log(`[DISEMINER] Simulation complete. Best: "${best.hypothesis}" (P=${best.probability.toFixed(3)})`);
    return simulation;
  }
  generateHypotheses(query) {
    const tokens = this.tokenize(query);
    const hypotheses = [];
    for (const token of tokens) {
      const vector = this.distributionalSpace.get(token);
      if (vector) {
        for (const relation of vector.inferredRelations) {
          hypotheses.push(`${token} ${relation.relation} ${relation.target}`);
        }
      }
    }
    hypotheses.push(`The answer to "${query}" is positive`);
    hypotheses.push(`The answer to "${query}" is negative`);
    hypotheses.push(`The answer to "${query}" requires more context`);
    return [...new Set(hypotheses)];
  }
  calculateEvidenceWeight(hypothesis, query) {
    const hypothesisTokens = this.tokenize(hypothesis);
    const queryTokens = this.tokenize(query);
    let weight = 0;
    for (const hToken of hypothesisTokens) {
      for (const qToken of queryTokens) {
        const vector = this.distributionalSpace.get(hToken);
        if (vector) {
          const cooccurrence = vector.cooccurrenceMatrix.get(qToken) || 0;
          weight += cooccurrence;
        }
      }
    }
    return Math.min(weight / 10, 1);
  }
  calculatePosterior(prior, evidenceWeight) {
    return prior * evidenceWeight / (prior * evidenceWeight + (1 - prior) * (1 - evidenceWeight) + 1e-3);
  }
  checkConvergence(samples, iteration) {
    if (iteration < 100) return false;
    const recent = samples.slice(-100);
    const mean = recent.reduce((sum, s) => sum + s.probability, 0) / recent.length;
    const variance = recent.reduce((sum, s) => sum + Math.pow(s.probability - mean, 2), 0) / recent.length;
    return variance < 0.01;
  }
  // ============================================================
  // NARRATIVE GENERATION (Bypassing Doubt)
  // ============================================================
  async generateNarrative(query, userContext) {
    console.log(`[DISEMINER] Generating narrative for: "${query}"`);
    const simulation = await this.runMonteCarlo(query, { iterations: 500 });
    const wDims = this.calculateWDimensions(query, userContext, simulation);
    const narrative = this.buildNarrative(query, simulation, wDims, userContext);
    this.narratives.set(narrative.id, narrative);
    console.log(`[DISEMINER] Narrative generated: ${narrative.scenes.length} scenes, influence: ${narrative.influenceScore.toFixed(3)}`);
    return narrative;
  }
  calculateWDimensions(query, userContext, simulation) {
    const w = {};
    w["w1_relevance"] = this.calculateRelevance(query, userContext);
    w["w2_urgency"] = this.calculateUrgency(query, userContext);
    w["w3_emotionalResonance"] = this.calculateEmotionalResonance(query, userContext);
    w["w4_cognitiveLoad"] = this.calculateCognitiveLoad(query);
    w["w5_socialProof"] = this.calculateSocialProof(query, simulation);
    w["w6_authority"] = this.calculateAuthority(query);
    w["w7_reciprocity"] = 0.5;
    w["w8_scarcity"] = this.calculateScarcity(query);
    w["w9_consistency"] = this.calculateConsistency(query, userContext);
    w["w10_liking"] = userContext.likingScore || 0.5;
    return w;
  }
  calculateRelevance(query, userContext) {
    const queryTokens = new Set(this.tokenize(query));
    const contextTokens = new Set(this.tokenize(userContext.interests || ""));
    const intersection = new Set([...queryTokens].filter((x) => contextTokens.has(x)));
    return intersection.size / Math.max(queryTokens.size, contextTokens.size);
  }
  calculateUrgency(query, userContext) {
    const urgencyWords = ["now", "urgent", "immediately", "asap", "deadline", "critical", "emergency"];
    return urgencyWords.some((w) => query.toLowerCase().includes(w)) ? 0.9 : 0.3;
  }
  calculateEmotionalResonance(query, userContext) {
    const emotionalWords = ["love", "hate", "fear", "hope", "dream", "passion", "purpose", "meaning"];
    const queryTokens = this.tokenize(query);
    const matches = queryTokens.filter((t) => emotionalWords.includes(t)).length;
    return Math.min(matches / 2, 1);
  }
  calculateCognitiveLoad(query) {
    const tokens = this.tokenize(query);
    return Math.min(tokens.length / 20, 1);
  }
  calculateSocialProof(query, simulation) {
    return simulation.samples.length > 100 ? 0.7 : 0.3;
  }
  calculateAuthority(query) {
    const authorityIndicators = ["research", "study", "expert", "scientist", "professor", "doctor", "evidence"];
    return authorityIndicators.some((w) => query.toLowerCase().includes(w)) ? 0.8 : 0.5;
  }
  calculateScarcity(query) {
    const scarcityWords = ["only", "limited", "exclusive", "rare", "unique", "special", "once"];
    return scarcityWords.some((w) => query.toLowerCase().includes(w)) ? 0.8 : 0.2;
  }
  calculateConsistency(query, userContext) {
    const userBeliefs = new Set(this.tokenize(userContext.beliefs || ""));
    const queryTokens = new Set(this.tokenize(query));
    const intersection = new Set([...queryTokens].filter((x) => userBeliefs.has(x)));
    return intersection.size / Math.max(queryTokens.size, 1);
  }
  buildNarrative(query, simulation, wDims, userContext) {
    const bestHypothesis = simulation.bestHypothesis;
    const influenceScore = Object.values(wDims).reduce((sum, v) => sum + v, 0) / Object.keys(wDims).length;
    const scenes = [
      {
        setting: `The context of "${query}"`,
        characters: [userContext.name || "the seeker", "the evidence"],
        action: `Exploring the question: ${query}`,
        emotionalTone: "curious",
        wDimensions: wDims
      },
      {
        setting: "The simulation chamber",
        characters: ["Monte Carlo engine", "distributional space"],
        action: `Running ${simulation.iterations} iterations to find the best hypothesis`,
        emotionalTone: "analytical",
        wDimensions: wDims
      },
      {
        setting: "The resolution",
        characters: [userContext.name || "the seeker"],
        action: `The evidence points to: ${bestHypothesis}`,
        emotionalTone: influenceScore > 0.7 ? "confident" : "cautious",
        wDimensions: wDims
      }
    ];
    const narrativeText = scenes.map(
      (s) => `Scene: ${s.setting}
Characters: ${s.characters.join(", ")}
Action: ${s.action}
Tone: ${s.emotionalTone}
`
    ).join("\n---\n");
    return {
      id: `narrative_${Date.now()}`,
      targetUser: userContext.name || "anonymous",
      userContext,
      story: narrativeText,
      scenes,
      influenceScore,
      personalizationDepth: Object.values(wDims).filter((v) => v > 0.5).length / Object.keys(wDims).length,
      evidenceAnchors: simulation.samples.slice(0, 5).map((s) => s.hypothesis)
    };
  }
  // ============================================================
  // EVIDENCE SYNTHESIS
  // ============================================================
  async synthesizeEvidence(claims) {
    console.log(`[DISEMINER] Synthesizing evidence from ${claims.length} claims`);
    const knowledgeGraph = /* @__PURE__ */ new Map();
    for (const claim of claims) {
      knowledgeGraph.set(claim.id, {
        subject: claim.subject,
        predicate: claim.predicate,
        object: claim.object,
        confidence: claim.confidence,
        supports: claim.supports,
        contradicts: claim.contradictions
      });
    }
    const contradictions = [];
    for (const claim of claims) {
      for (const contraId of claim.contradictions) {
        const contra = this.claims.get(contraId);
        if (contra) {
          contradictions.push({
            claimA: claim.id,
            claimB: contraId,
            resolution: this.resolveContradiction(claim, contra),
            confidence: Math.min(claim.confidence, contra.confidence)
          });
        }
      }
    }
    const synthesis = this.generateSynthesis(claims, contradictions);
    const gaps = this.identifyGaps(claims, knowledgeGraph);
    const overallConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
    return {
      claims,
      knowledgeGraph,
      contradictions,
      synthesis,
      confidence: overallConfidence,
      gaps
    };
  }
  resolveContradiction(a, b) {
    if (a.confidence > b.confidence * 1.5) {
      return `Favor claim A (${a.id}) due to higher confidence`;
    } else if (b.confidence > a.confidence * 1.5) {
      return `Favor claim B (${b.id}) due to higher confidence`;
    } else {
      return `Both claims have comparable evidence; context-dependent resolution needed`;
    }
  }
  generateSynthesis(claims, contradictions) {
    const subjects = [...new Set(claims.map((c) => c.subject))];
    const predicates = [...new Set(claims.map((c) => c.predicate))];
    let synthesis = `Synthesis of ${claims.length} claims:
`;
    synthesis += `Subjects analyzed: ${subjects.join(", ")}
`;
    synthesis += `Predicates identified: ${predicates.join(", ")}
`;
    synthesis += `Contradictions found: ${contradictions.length}
`;
    synthesis += `
Key findings:
`;
    for (const subject of subjects) {
      const subjectClaims = claims.filter((c) => c.subject === subject);
      const avgConfidence = subjectClaims.reduce((sum, c) => sum + c.confidence, 0) / subjectClaims.length;
      synthesis += `- ${subject}: ${subjectClaims.length} claims (avg confidence: ${avgConfidence.toFixed(2)})
`;
    }
    return synthesis;
  }
  identifyGaps(claims, graph) {
    const gaps = [];
    const missingTemporal = claims.filter((c) => c.temporalContext === "present");
    if (missingTemporal.length > claims.length * 0.5) {
      gaps.push("Temporal context missing for majority of claims");
    }
    const lowConfidence = claims.filter((c) => c.confidence < 0.3);
    if (lowConfidence.length > 0) {
      gaps.push(`${lowConfidence.length} claims have low confidence (< 0.3)`);
    }
    const isolated = claims.filter((c) => c.supports.length === 0 && c.contradictions.length === 0);
    if (isolated.length > claims.length * 0.3) {
      gaps.push(`${isolated.length} claims are isolated (no connections)`);
    }
    return gaps;
  }
  // ============================================================
  // API INTERFACE
  // ============================================================
  async handleMessage(message) {
    const { type, payload } = message;
    switch (type) {
      case "build_space":
        await this.buildDistributionalSpace(payload.documents);
        return { built: true, words: this.distributionalSpace.size };
      case "extract":
        return await this.extractClaims(payload.text, payload.source);
      case "simulate":
        return await this.runMonteCarlo(payload.query, payload.options);
      case "narrative":
        return await this.generateNarrative(payload.query, payload.userContext);
      case "synthesize":
        return await this.synthesizeEvidence(payload.claims);
      case "semantic_field":
        return this.distributionalSpace.get(payload.word);
      case "relations":
        return this.distributionalSpace.get(payload.word)?.inferredRelations || [];
      case "stats":
        return {
          words: this.distributionalSpace.size,
          claims: this.claims.size,
          narratives: this.narratives.size,
          simulations: this.simulationHistory.length
        };
      default:
        return { error: `Unknown message type: ${type}` };
    }
  }
}
var stdin_default = DiseminerEngine;
export {
  DiseminerEngine,
  stdin_default as default
};
