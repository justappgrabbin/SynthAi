// ============================================================
// HUB 2: DISEMINER - Distributional-Semantics Inference Maker
// Based on Sheldon Klein, S.L. Lieman, & G.E. Lindstrom (1968)
// "DISEMINER: A Distributional-Semantics Inference Maker"
// Journal of Computer Studies in the Humanities and Verbal Behavior 1: 10-20
// Modernized: Deep extraction, Monte Carlo simulation, narrative generation
// ============================================================

export interface DistributionalVector {
  word: string;
  contexts: Array<{
    left: string[];
    right: string[];
    frequency: number;
    document: string;
    position: number;
  }>;
  cooccurrenceMatrix: Map<string, number>;
  semanticField: Map<string, number>;  // Weighted semantic associations
  inferredRelations: Array<{
    target: string;
    relation: string;
    confidence: number;
    evidence: string[];
  }>;
}

export interface ExtractedClaim {
  id: string;
  text: string;
  source: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  evidence: Array<{
    text: string;
    source: string;
    strength: number;
  }>;
  contradictions: string[];
  supports: string[];
  temporalContext: string;
  modality: 'certain' | 'probable' | 'possible' | 'speculative';
}

export interface MonteCarloSimulation {
  query: string;
  iterations: number;
  samples: Array<{
    hypothesis: string;
    probability: number;
    evidenceWeight: number;
    priorProbability: number;
  }>;
  convergence: number;
  bestHypothesis: string;
  confidenceInterval: [number, number];
  doubtBypassed: boolean;
}

export interface Narrative {
  id: string;
  targetUser: string;
  userContext: any;
  story: string;
  scenes: Array<{
    setting: string;
    characters: string[];
    action: string;
    emotionalTone: string;
    wDimensions: Record<string, number>;  // Sheldon's w-dimensions
  }>;
  influenceScore: number;
  personalizationDepth: number;
  evidenceAnchors: string[];
}

export interface EvidenceSynthesis {
  claims: ExtractedClaim[];
  knowledgeGraph: Map<string, any>;
  contradictions: Array<{
    claimA: string;
    claimB: string;
    resolution: string;
    confidence: number;
  }>;
  synthesis: string;
  confidence: number;
  gaps: string[];
}

// ============================================================
// DISEMINER ENGINE - Deep Extraction & Inference
// ============================================================

export class DiseminerEngine {
  private distributionalSpace: Map<string, DistributionalVector> = new Map();
  private claims: Map<string, ExtractedClaim> = new Map();
  private narratives: Map<string, Narrative> = new Map();
  private evidenceBase: Map<string, any> = new Map();
  private simulationHistory: MonteCarloSimulation[] = [];

  // Sheldon's w-dimensions for narrative influence
  private wDimensions = {
    w1_relevance: 0.0,      // How relevant to user's current context
    w2_urgency: 0.0,        // Temporal urgency
    w3_emotionalResonance: 0.0,  // Emotional alignment
    w4_cognitiveLoad: 0.0,   // How much cognitive effort required
    w5_socialProof: 0.0,     // Social validation strength
    w6_authority: 0.0,       // Source authority weight
    w7_reciprocity: 0.0,    // Mutual benefit framing
    w8_scarcity: 0.0,       // Rarity/uniqueness
    w9_consistency: 0.0,    // Alignment with user's existing beliefs
    w10_liking: 0.0         // Personal affinity/connection
  };

  constructor() {
    console.log('[DISEMINER] Initialized - Distributional-Semantics Inference Maker');
  }

  // ============================================================
  // DISTRIBUTIONAL SEMANTICS (Klein et al. 1968)
  // ============================================================

  async buildDistributionalSpace(documents: string[]): Promise<void> {
    console.log(`[DISEMINER] Building distributional space from ${documents.length} documents`);

    for (const doc of documents) {
      const tokens = this.tokenize(doc);

      for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i].toLowerCase();

        if (!this.distributionalSpace.has(word)) {
          this.distributionalSpace.set(word, {
            word,
            contexts: [],
            cooccurrenceMatrix: new Map(),
            semanticField: new Map(),
            inferredRelations: []
          });
        }

        const vector = this.distributionalSpace.get(word)!;

        // Context window: 5 words left and right (Klein's distributional analysis)
        const left = tokens.slice(Math.max(0, i - 5), i);
        const right = tokens.slice(i + 1, Math.min(tokens.length, i + 6));

        vector.contexts.push({
          left,
          right,
          frequency: 1,
          document: doc.substring(0, 50),
          position: i
        });

        // Build co-occurrence matrix
        for (const contextWord of [...left, ...right]) {
          const cw = contextWord.toLowerCase();
          const current = vector.cooccurrenceMatrix.get(cw) || 0;
          vector.cooccurrenceMatrix.set(cw, current + 1);
        }
      }
    }

    // Infer semantic relations from co-occurrence patterns
    await this.inferSemanticRelations();

    console.log(`[DISEMINER] Distributional space built: ${this.distributionalSpace.size} words`);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private async inferSemanticRelations(): Promise<void> {
    for (const [word, vector] of this.distributionalSpace) {
      // Words with similar contexts have similar meanings (distributional hypothesis)
      const similarWords = this.findSimilarWords(word, vector);

      for (const [similarWord, similarity] of similarWords) {
        if (similarity > 0.7) {
          vector.inferredRelations.push({
            target: similarWord,
            relation: 'synonymy',
            confidence: similarity,
            evidence: [`Similar context distributions: ${similarity.toFixed(3)}`]
          });
        } else if (similarity > 0.4) {
          vector.inferredRelations.push({
            target: similarWord,
            relation: 'semantic_association',
            confidence: similarity,
            evidence: [`Context overlap: ${similarity.toFixed(3)}`]
          });
        }
      }

      // Infer hypernymy (is-a) from context asymmetry
      const hypernyms = this.inferHypernyms(word, vector);
      vector.inferredRelations.push(...hypernyms);

      // Infer meronymy (part-of) from collocation patterns
      const meronyms = this.inferMeronyms(word, vector);
      vector.inferredRelations.push(...meronyms);
    }
  }

  private findSimilarWords(word: string, vector: DistributionalVector): Map<string, number> {
    const similarities = new Map<string, number>();

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

  private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    const allKeys = new Set([...a.keys(), ...b.keys()]);
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

  private inferHypernyms(word: string, vector: DistributionalVector): any[] {
    const hypernyms: any[] = [];

    // Hypernyms tend to appear in broader contexts
    // If word A's context is a subset of word B's context, B might be a hypernym of A
    for (const [otherWord, otherVector] of this.distributionalSpace) {
      if (otherWord === word) continue;

      const aContexts = new Set(vector.contexts.map(c => c.document));
      const bContexts = new Set(otherVector.contexts.map(c => c.document));

      const intersection = new Set([...aContexts].filter(x => bContexts.has(x)));
      const aSubsetB = intersection.size / aContexts.size;
      const bSubsetA = intersection.size / bContexts.size;

      if (aSubsetB > 0.8 && bSubsetA < 0.5) {
        hypernyms.push({
          target: otherWord,
          relation: 'hypernymy',
          confidence: aSubsetB,
          evidence: [`Context subset: ${aSubsetB.toFixed(3)}`]
        });
      }
    }

    return hypernyms;
  }

  private inferMeronyms(word: string, vector: DistributionalVector): any[] {
    const meronyms: any[] = [];

    // Part-of relations often show in specific collocation patterns
    // "wheel of car", "leg of table", etc.
    for (const context of vector.contexts) {
      const left = context.left;
      const right = context.right;

      // Check for "part of" patterns
      if (left.includes('part') || right.includes('of')) {
        const candidate = right.find((w: string) => w !== 'of');
        if (candidate) {
          meronyms.push({
            target: candidate,
            relation: 'meronymy',
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

  async extractClaims(text: string, source: string): Promise<ExtractedClaim[]> {
    console.log(`[DISEMINER] Extracting claims from: ${source}`);

    const sentences = this.splitSentences(text);
    const extracted: ExtractedClaim[] = [];

    for (const sentence of sentences) {
      const claim = await this.extractClaimFromSentence(sentence, source);
      if (claim) {
        extracted.push(claim);
        this.claims.set(claim.id, claim);
      }
    }

    // Cross-reference claims
    await this.crossReferenceClaims(extracted);

    console.log(`[DISEMINER] Extracted ${extracted.length} claims`);
    return extracted;
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  private async extractClaimFromSentence(sentence: string, source: string): Promise<ExtractedClaim | null> {
    // Identify subject-predicate-object structure
    const tokens = this.tokenize(sentence);
    if (tokens.length < 3) return null;

    // Simple SVO extraction
    const subject = tokens[0];
    const predicate = tokens.find((t: string, i: number) => i > 0 && this.isVerb(t)) || tokens[1];
    const object = tokens.slice(tokens.indexOf(predicate) + 1).join(' ') || tokens[tokens.length - 1];

    // Determine modality
    const modality = this.inferModality(sentence);

    // Find evidence in distributional space
    const evidence = await this.findEvidence(subject, predicate, object);

    const claim: ExtractedClaim = {
      id: `claim_${this.claims.size}_${Date.now()}`,
      text: sentence,
      source,
      subject,
      predicate,
      object,
      confidence: evidence.reduce((sum: number, e: any) => sum + e.strength, 0) / (evidence.length || 1),
      evidence,
      contradictions: [],
      supports: [],
      temporalContext: this.extractTemporalContext(sentence),
      modality
    };

    return claim;
  }

  private isVerb(word: string): boolean {
    const verbIndicators = ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'does', 'do', 'did',
      'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'];
    return verbIndicators.includes(word.toLowerCase()) || /(ing|ed|en|s)$/.test(word);
  }

  private inferModality(sentence: string): ExtractedClaim['modality'] {
    const lower = sentence.toLowerCase();
    if (/\b(must|certainly|definitely|always|never|all)\b/.test(lower)) return 'certain';
    if (/\b(probably|likely|most|generally|usually)\b/.test(lower)) return 'probable';
    if (/\b(might|could|possibly|maybe|some)\b/.test(lower)) return 'possible';
    if (/\b(think|believe|suggest|hypothesize|speculate)\b/.test(lower)) return 'speculative';
    return 'probable';
  }

  private async findEvidence(subject: string, predicate: string, object: string): Promise<any[]> {
    const evidence: any[] = [];

    // Search distributional space for supporting contexts
    for (const [word, vector] of this.distributionalSpace) {
      if (word === subject || word === object) {
        for (const context of vector.contexts) {
          const contextText = [...context.left, word, ...context.right].join(' ');
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

    return evidence.slice(0, 5); // Top 5 evidence pieces
  }

  private extractTemporalContext(sentence: string): string {
    const temporalMarkers = /\b(yesterday|today|tomorrow|now|then|soon|recently|lately|already|yet|still|before|after|during|while|when|since|until|ago|later|earlier)\b/i;
    const match = sentence.match(temporalMarkers);
    return match ? match[0] : 'present';
  }

  private async crossReferenceClaims(claims: ExtractedClaim[]): Promise<void> {
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];

        // Check for contradiction
        if (this.areContradictory(a, b)) {
          a.contradictions.push(b.id);
          b.contradictions.push(a.id);
        }

        // Check for support
        if (this.areSupporting(a, b)) {
          a.supports.push(b.id);
          b.supports.push(a.id);
        }
      }
    }
  }

  private areContradictory(a: ExtractedClaim, b: ExtractedClaim): boolean {
    // Same subject, opposite predicates
    if (a.subject === b.subject && a.predicate !== b.predicate) {
      const negationWords = ['not', 'no', 'never', 'none', 'without', 'against'];
      const aNegated = negationWords.some(w => a.text.toLowerCase().includes(w));
      const bNegated = negationWords.some(w => b.text.toLowerCase().includes(w));
      return aNegated !== bNegated;
    }
    return false;
  }

  private areSupporting(a: ExtractedClaim, b: ExtractedClaim): boolean {
    // Same subject, same or compatible predicates
    return a.subject === b.subject && a.predicate === b.predicate;
  }

  // ============================================================
  // MONTE CARLO SIMULATION (Klein's historical change simulation)
  // ============================================================

  async runMonteCarlo(query: string, options: {
    iterations?: number;
    priorDistribution?: Map<string, number>;
    evidenceWeights?: Map<string, number>;
  } = {}): Promise<MonteCarloSimulation> {
    const iterations = options.iterations || 1000;
    console.log(`[DISEMINER] Running Monte Carlo simulation: "${query}" (${iterations} iterations)`);

    // Generate hypotheses from distributional space
    const hypotheses = this.generateHypotheses(query);

    const samples: MonteCarloSimulation['samples'] = [];
    let converged = false;
    let iteration = 0;

    while (iteration < iterations && !converged) {
      for (const hypothesis of hypotheses) {
        // Sample from prior
        const priorProb = options.priorDistribution?.get(hypothesis) || 1 / hypotheses.length;

        // Weight by evidence
        const evidenceWeight = this.calculateEvidenceWeight(hypothesis, query);

        // Calculate posterior probability
        const posterior = this.calculatePosterior(priorProb, evidenceWeight);

        samples.push({
          hypothesis,
          probability: posterior,
          evidenceWeight,
          priorProbability: priorProb
        });
      }

      // Check convergence (Gelman-Rubin-like statistic)
      converged = this.checkConvergence(samples, iteration);
      iteration += hypotheses.length;
    }

    // Find best hypothesis
    const best = samples.reduce((best, current) => 
      current.probability > best.probability ? current : best, samples[0]);

    // Calculate confidence interval
    const probabilities = samples.map(s => s.probability).sort((a, b) => a - b);
    const ci: [number, number] = [
      probabilities[Math.floor(probabilities.length * 0.025)],
      probabilities[Math.floor(probabilities.length * 0.975)]
    ];

    const simulation: MonteCarloSimulation = {
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

  private generateHypotheses(query: string): string[] {
    // Generate candidate hypotheses from distributional space
    const tokens = this.tokenize(query);
    const hypotheses: string[] = [];

    for (const token of tokens) {
      const vector = this.distributionalSpace.get(token);
      if (vector) {
        for (const relation of vector.inferredRelations) {
          hypotheses.push(`${token} ${relation.relation} ${relation.target}`);
        }
      }
    }

    // Add structural hypotheses
    hypotheses.push(`The answer to "${query}" is positive`);
    hypotheses.push(`The answer to "${query}" is negative`);
    hypotheses.push(`The answer to "${query}" requires more context`);

    return [...new Set(hypotheses)];
  }

  private calculateEvidenceWeight(hypothesis: string, query: string): number {
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

    return Math.min(weight / 10, 1.0);
  }

  private calculatePosterior(prior: number, evidenceWeight: number): number {
    // Bayes-like update
    return (prior * evidenceWeight) / (prior * evidenceWeight + (1 - prior) * (1 - evidenceWeight) + 0.001);
  }

  private checkConvergence(samples: any[], iteration: number): boolean {
    if (iteration < 100) return false;

    const recent = samples.slice(-100);
    const mean = recent.reduce((sum: number, s: any) => sum + s.probability, 0) / recent.length;
    const variance = recent.reduce((sum: number, s: any) => sum + Math.pow(s.probability - mean, 2), 0) / recent.length;

    return variance < 0.01; // Low variance = convergence
  }

  // ============================================================
  // NARRATIVE GENERATION (Bypassing Doubt)
  // ============================================================

  async generateNarrative(query: string, userContext: any): Promise<Narrative> {
    console.log(`[DISEMINER] Generating narrative for: "${query}"`);

    // Run Monte Carlo to find best hypothesis
    const simulation = await this.runMonteCarlo(query, { iterations: 500 });

    // Calculate w-dimensions for this user and query
    const wDims = this.calculateWDimensions(query, userContext, simulation);

    // Generate personalized narrative
    const narrative = this.buildNarrative(query, simulation, wDims, userContext);

    // Store
    this.narratives.set(narrative.id, narrative);

    console.log(`[DISEMINER] Narrative generated: ${narrative.scenes.length} scenes, influence: ${narrative.influenceScore.toFixed(3)}`);
    return narrative;
  }

  private calculateWDimensions(query: string, userContext: any, simulation: MonteCarloSimulation): Record<string, number> {
    const w: Record<string, number> = {};

    // w1: Relevance
    w['w1_relevance'] = this.calculateRelevance(query, userContext);

    // w2: Urgency
    w['w2_urgency'] = this.calculateUrgency(query, userContext);

    // w3: Emotional resonance
    w['w3_emotionalResonance'] = this.calculateEmotionalResonance(query, userContext);

    // w4: Cognitive load
    w['w4_cognitiveLoad'] = this.calculateCognitiveLoad(query);

    // w5: Social proof
    w['w5_socialProof'] = this.calculateSocialProof(query, simulation);

    // w6: Authority
    w['w6_authority'] = this.calculateAuthority(query);

    // w7: Reciprocity
    w['w7_reciprocity'] = 0.5; // Default

    // w8: Scarcity
    w['w8_scarcity'] = this.calculateScarcity(query);

    // w9: Consistency
    w['w9_consistency'] = this.calculateConsistency(query, userContext);

    // w10: Liking
    w['w10_liking'] = userContext.likingScore || 0.5;

    return w;
  }

  private calculateRelevance(query: string, userContext: any): number {
    const queryTokens = new Set(this.tokenize(query));
    const contextTokens = new Set(this.tokenize(userContext.interests || ''));
    const intersection = new Set([...queryTokens].filter(x => contextTokens.has(x)));
    return intersection.size / Math.max(queryTokens.size, contextTokens.size);
  }

  private calculateUrgency(query: string, userContext: any): number {
    const urgencyWords = ['now', 'urgent', 'immediately', 'asap', 'deadline', 'critical', 'emergency'];
    return urgencyWords.some(w => query.toLowerCase().includes(w)) ? 0.9 : 0.3;
  }

  private calculateEmotionalResonance(query: string, userContext: any): number {
    const emotionalWords = ['love', 'hate', 'fear', 'hope', 'dream', 'passion', 'purpose', 'meaning'];
    const queryTokens = this.tokenize(query);
    const matches = queryTokens.filter((t: string) => emotionalWords.includes(t)).length;
    return Math.min(matches / 2, 1.0);
  }

  private calculateCognitiveLoad(query: string): number {
    const tokens = this.tokenize(query);
    // Longer queries = higher cognitive load
    return Math.min(tokens.length / 20, 1.0);
  }

  private calculateSocialProof(query: string, simulation: MonteCarloSimulation): number {
    return simulation.samples.length > 100 ? 0.7 : 0.3;
  }

  private calculateAuthority(query: string): number {
    const authorityIndicators = ['research', 'study', 'expert', 'scientist', 'professor', 'doctor', 'evidence'];
    return authorityIndicators.some(w => query.toLowerCase().includes(w)) ? 0.8 : 0.5;
  }

  private calculateScarcity(query: string): number {
    const scarcityWords = ['only', 'limited', 'exclusive', 'rare', 'unique', 'special', 'once'];
    return scarcityWords.some(w => query.toLowerCase().includes(w)) ? 0.8 : 0.2;
  }

  private calculateConsistency(query: string, userContext: any): number {
    const userBeliefs = new Set(this.tokenize(userContext.beliefs || ''));
    const queryTokens = new Set(this.tokenize(query));
    const intersection = new Set([...queryTokens].filter(x => userBeliefs.has(x)));
    return intersection.size / Math.max(queryTokens.size, 1);
  }

  private buildNarrative(query: string, simulation: MonteCarloSimulation, wDims: Record<string, number>, userContext: any): Narrative {
    const bestHypothesis = simulation.bestHypothesis;
    const influenceScore = Object.values(wDims).reduce((sum, v) => sum + v, 0) / Object.keys(wDims).length;

    // Build narrative structure
    const scenes = [
      {
        setting: `The context of "${query}"`,
        characters: [userContext.name || 'the seeker', 'the evidence'],
        action: `Exploring the question: ${query}`,
        emotionalTone: 'curious',
        wDimensions: wDims
      },
      {
        setting: 'The simulation chamber',
        characters: ['Monte Carlo engine', 'distributional space'],
        action: `Running ${simulation.iterations} iterations to find the best hypothesis`,
        emotionalTone: 'analytical',
        wDimensions: wDims
      },
      {
        setting: 'The resolution',
        characters: [userContext.name || 'the seeker'],
        action: `The evidence points to: ${bestHypothesis}`,
        emotionalTone: influenceScore > 0.7 ? 'confident' : 'cautious',
        wDimensions: wDims
      }
    ];

    const narrativeText = scenes.map(s => 
      `Scene: ${s.setting}\n` +
      `Characters: ${s.characters.join(', ')}\n` +
      `Action: ${s.action}\n` +
      `Tone: ${s.emotionalTone}\n`
    ).join('\n---\n');

    return {
      id: `narrative_${Date.now()}`,
      targetUser: userContext.name || 'anonymous',
      userContext,
      story: narrativeText,
      scenes,
      influenceScore,
      personalizationDepth: Object.values(wDims).filter(v => v > 0.5).length / Object.keys(wDims).length,
      evidenceAnchors: simulation.samples.slice(0, 5).map(s => s.hypothesis)
    };
  }

  // ============================================================
  // EVIDENCE SYNTHESIS
  // ============================================================

  async synthesizeEvidence(claims: ExtractedClaim[]): Promise<EvidenceSynthesis> {
    console.log(`[DISEMINER] Synthesizing evidence from ${claims.length} claims`);

    // Build knowledge graph
    const knowledgeGraph = new Map();
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

    // Find contradictions
    const contradictions: EvidenceSynthesis['contradictions'] = [];
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

    // Generate synthesis
    const synthesis = this.generateSynthesis(claims, contradictions);

    // Find gaps
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

  private resolveContradiction(a: ExtractedClaim, b: ExtractedClaim): string {
    if (a.confidence > b.confidence * 1.5) {
      return `Favor claim A (${a.id}) due to higher confidence`;
    } else if (b.confidence > a.confidence * 1.5) {
      return `Favor claim B (${b.id}) due to higher confidence`;
    } else {
      return `Both claims have comparable evidence; context-dependent resolution needed`;
    }
  }

  private generateSynthesis(claims: ExtractedClaim[], contradictions: any[]): string {
    const subjects = [...new Set(claims.map(c => c.subject))];
    const predicates = [...new Set(claims.map(c => c.predicate))];

    let synthesis = `Synthesis of ${claims.length} claims:\n`;
    synthesis += `Subjects analyzed: ${subjects.join(', ')}\n`;
    synthesis += `Predicates identified: ${predicates.join(', ')}\n`;
    synthesis += `Contradictions found: ${contradictions.length}\n`;
    synthesis += `\nKey findings:\n`;

    for (const subject of subjects) {
      const subjectClaims = claims.filter(c => c.subject === subject);
      const avgConfidence = subjectClaims.reduce((sum, c) => sum + c.confidence, 0) / subjectClaims.length;
      synthesis += `- ${subject}: ${subjectClaims.length} claims (avg confidence: ${avgConfidence.toFixed(2)})\n`;
    }

    return synthesis;
  }

  private identifyGaps(claims: ExtractedClaim[], graph: Map<string, any>): string[] {
    const gaps: string[] = [];

    // Check for missing temporal context
    const missingTemporal = claims.filter(c => c.temporalContext === 'present');
    if (missingTemporal.length > claims.length * 0.5) {
      gaps.push('Temporal context missing for majority of claims');
    }

    // Check for low-confidence claims
    const lowConfidence = claims.filter(c => c.confidence < 0.3);
    if (lowConfidence.length > 0) {
      gaps.push(`${lowConfidence.length} claims have low confidence (< 0.3)`);
    }

    // Check for isolated claims (no supports or contradictions)
    const isolated = claims.filter(c => c.supports.length === 0 && c.contradictions.length === 0);
    if (isolated.length > claims.length * 0.3) {
      gaps.push(`${isolated.length} claims are isolated (no connections)`);
    }

    return gaps;
  }

  // ============================================================
  // API INTERFACE
  // ============================================================

  async handleMessage(message: any): Promise<any> {
    const { type, payload } = message;

    switch (type) {
      case 'build_space':
        await this.buildDistributionalSpace(payload.documents);
        return { built: true, words: this.distributionalSpace.size };

      case 'extract':
        return await this.extractClaims(payload.text, payload.source);

      case 'simulate':
        return await this.runMonteCarlo(payload.query, payload.options);

      case 'narrative':
        return await this.generateNarrative(payload.query, payload.userContext);

      case 'synthesize':
        return await this.synthesizeEvidence(payload.claims);

      case 'semantic_field':
        return this.distributionalSpace.get(payload.word);

      case 'relations':
        return this.distributionalSpace.get(payload.word)?.inferredRelations || [];

      case 'stats':
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

export default DiseminerEngine;
