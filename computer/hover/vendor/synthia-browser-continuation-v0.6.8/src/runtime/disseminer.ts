/**
 * DISEMINER - Distributional-Semantics Inference Maker
 * Based on Klein & Lieman & Lindstrom (1968)
 * 
 * Core principle: Meaning emerges from distributional patterns.
 * Recovers correct text from corrupted/noisy input via distributional evidence.
 */

import { FeatureVector } from './monte-carlo-grammar-engine';

export interface SemanticVector {
  word: string;
  vector: number[];
  contexts: ContextRecord[];
  frequency: number;
  entropy: number;
}

export interface ContextRecord {
  left: string[];
  right: string[];
  position: number;
  source: string;
}

export interface InferenceResult {
  input: string;
  corrected: string;
  confidence: number;
  alternatives: { text: string; score: number }[];
  semanticPath: string[];
  features: FeatureVector;
}

export interface DistributionalField {
  word: string;
  neighbors: { word: string; similarity: number; sharedContexts: number }[];
  semanticClass: string;
  centroid: number[];
}

export interface InferenceRule {
  pattern: RegExp;
  replacement: string;
  confidence: number;
  semanticJustification: string;
}

export class DISEMINER {
  private corpus: Map<string, SemanticVector> = new Map();
  private contextWindow: number = 5;
  private vectorDimension: number = 128;
  private inferenceRules: InferenceRule[] = [];
  private semanticFields: Map<string, DistributionalField> = new Map();
  private cooccurrenceMatrix: Map<string, Map<string, number>> = new Map();
  private totalTokens: number = 0;
  private vocabulary: Set<string> = new Set();

  constructor(options: { contextWindow?: number; vectorDimension?: number } = {}) {
    this.contextWindow = options.contextWindow || 5;
    this.vectorDimension = options.vectorDimension || 128;
    this.initializeInferenceRules();
    this.initializeSemanticFields();
  }

  private initializeSemanticFields(): void {
    const fields = [
      {
        name: 'ANIMATE_HUMAN',
        seedWords: ['man', 'woman', 'child', 'king', 'queen', 'warrior', 'scholar', 'merchant', 'sailor', 'artist'],
        contextualTriggers: ['walks', 'speaks', 'thinks', 'feels', 'dreams', 'loves', 'fears', 'hopes']
      },
      {
        name: 'INANIMATE_OBJECT',
        seedWords: ['sword', 'book', 'ship', 'mountain', 'river', 'city', 'garden', 'tower', 'mirror', 'flame'],
        contextualTriggers: ['lies', 'stands', 'burns', 'flows', 'reflects', 'contains', 'supports']
      },
      {
        name: 'ABSTRACT_CONCEPT',
        seedWords: ['truth', 'beauty', 'justice', 'wisdom', 'chaos', 'harmony'],
        contextualTriggers: ['is', 'represents', 'embodies', 'reveals', 'conceals', 'transcends']
      },
      {
        name: 'ACTION_VIOLENT',
        seedWords: ['destroys', 'attacks', 'fights', 'strikes', 'slays'],
        contextualTriggers: ['sword', 'enemy', 'battle', 'war', 'conflict', 'blood']
      },
      {
        name: 'ACTION_CREATIVE',
        seedWords: ['creates', 'builds', 'crafts', 'shapes', 'weaves', 'composes'],
        contextualTriggers: ['art', 'music', 'story', 'world', 'vision', 'dream']
      },
      {
        name: 'ACTION_PERCEPTUAL',
        seedWords: ['sees', 'hears', 'finds', 'discovers', 'observes', 'notices'],
        contextualTriggers: ['light', 'sound', 'path', 'truth', 'secret', 'pattern']
      },
      {
        name: 'QUALITY_POSITIVE',
        seedWords: ['bright', 'golden', 'wise', 'gentle', 'beautiful', 'noble'],
        contextualTriggers: ['light', 'sun', 'king', 'heart', 'soul', 'spirit']
      },
      {
        name: 'QUALITY_NEGATIVE',
        seedWords: ['dark', 'silent', 'fierce', 'hidden', 'fragile', 'broken'],
        contextualTriggers: ['night', 'shadow', 'storm', 'secret', 'past', 'memory']
      },
      {
        name: 'SPATIAL_CONTAINER',
        seedWords: ['in', 'within', 'inside', 'beneath', 'under'],
        contextualTriggers: ['room', 'cave', 'heart', 'mind', 'world', 'shell']
      },
      {
        name: 'SPATIAL_TRAVERSAL',
        seedWords: ['through', 'across', 'beyond', 'over', 'into'],
        contextualTriggers: ['door', 'gate', 'path', 'river', 'sky', 'horizon']
      },
      {
        name: 'TEMPORAL_ETERNAL',
        seedWords: ['eternal', 'ancient', 'timeless', 'forever', 'always'],
        contextualTriggers: ['stars', 'mountain', 'ocean', 'truth', 'love', 'soul']
      },
      {
        name: 'TEMPORAL_MOMENTARY',
        seedWords: ['suddenly', 'now', 'today', 'moment', 'instant'],
        contextualTriggers: ['flash', 'breath', 'blink', 'heartbeat', 'spark']
      }
    ];

    for (const field of fields) {
      const centroid = new Array(this.vectorDimension).fill(0);
      for (let i = 0; i < this.vectorDimension; i++) {
        centroid[i] = Math.sin(field.name.length * (i + 1) * 0.1) * 0.5 + 0.5;
      }
      this.semanticFields.set(field.name, {
        word: field.name,
        neighbors: field.seedWords.map(w => ({
          word: w,
          similarity: 0.7 + Math.random() * 0.3,
          sharedContexts: Math.floor(Math.random() * 20) + 5
        })),
        semanticClass: field.name,
        centroid
      });
    }
  }

  private initializeInferenceRules(): void {
    this.inferenceRules = [
      { pattern: /rn/g, replacement: 'm', confidence: 0.85, semanticJustification: 'rn -> m is common OCR error' },
      { pattern: /cl/g, replacement: 'd', confidence: 0.80, semanticJustification: 'cl -> d is common OCR error' },
      { pattern: /([a-z])\1{2,}/g, replacement: '$1$1', confidence: 0.75, semanticJustification: 'Triple letters are almost always OCR errors' },
      { pattern: /0/g, replacement: 'o', confidence: 0.70, semanticJustification: '0 -> o in text context' },
      { pattern: /1/g, replacement: 'l', confidence: 0.65, semanticJustification: '1 -> l in text context' },
      { pattern: /5/g, replacement: 's', confidence: 0.65, semanticJustification: '5 -> s in text context' },
      { pattern: /8/g, replacement: 'B', confidence: 0.60, semanticJustification: '8 -> B at word start' },
      { pattern: /\b([a-z])\b/g, replacement: '', confidence: 0.50, semanticJustification: 'Single letters in text are likely OCR noise' }
    ];
  }

  public ingest(text: string, source: string = 'unknown'): void {
    const tokens = this.tokenize(text);
    this.totalTokens += tokens.length;

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i].toLowerCase();
      this.vocabulary.add(word);

      const left = tokens.slice(Math.max(0, i - this.contextWindow), i);
      const right = tokens.slice(i + 1, Math.min(tokens.length, i + 1 + this.contextWindow));

      if (!this.corpus.has(word)) {
        this.corpus.set(word, {
          word,
          vector: this.initializeVector(word),
          contexts: [],
          frequency: 0,
          entropy: 0
        });
      }

      const sv = this.corpus.get(word)!;
      sv.contexts.push({ left, right, position: i, source });
      sv.frequency++;

      for (const ctxWord of [...left, ...right]) {
        const ctx = ctxWord.toLowerCase();
        if (!this.cooccurrenceMatrix.has(word)) {
          this.cooccurrenceMatrix.set(word, new Map());
        }
        const cooc = this.cooccurrenceMatrix.get(word)!;
        cooc.set(ctx, (cooc.get(ctx) || 0) + 1);
      }

      this.updateVectorFromContext(sv, left, right);
    }

    this.calculateEntropies();
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
  }

  private initializeVector(word: string): number[] {
    const vector = new Array(this.vectorDimension).fill(0);
    for (let i = 0; i < Math.min(word.length, 32); i++) {
      const charCode = word.charCodeAt(i) % 64;
      vector[charCode] += 0.5;
      if (i < word.length - 1) {
        const bigramCode = (word.charCodeAt(i) + word.charCodeAt(i + 1)) % 64;
        vector[64 + bigramCode] += 0.3;
      }
    }
    vector[127] = Math.min(word.length / 20, 1.0);
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
    if (norm > 0) return vector.map(v => v / norm);
    return vector;
  }

  private updateVectorFromContext(sv: SemanticVector, left: string[], right: string[]): void {
    const contextWords = [...left, ...right];
    const learningRate = 0.01;
    for (const ctxWord of contextWords) {
      const ctx = ctxWord.toLowerCase();
      const ctxVector = this.corpus.get(ctx)?.vector;
      if (ctxVector) {
        for (let i = 0; i < this.vectorDimension; i++) {
          sv.vector[i] += learningRate * (ctxVector[i] - sv.vector[i]);
        }
      }
    }
    const norm = Math.sqrt(sv.vector.reduce((a, b) => a + b * b, 0));
    if (norm > 0) sv.vector = sv.vector.map(v => v / norm);
  }

  private calculateEntropies(): void {
    for (const [word, sv] of this.corpus) {
      const cooc = this.cooccurrenceMatrix.get(word);
      if (!cooc || cooc.size === 0) { sv.entropy = 0; continue; }
      const total = Array.from(cooc.values()).reduce((a, b) => a + b, 0);
      let entropy = 0;
      for (const count of cooc.values()) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
      sv.entropy = entropy;
    }
  }

  public similarity(word1: string, word2: string): number {
    const v1 = this.corpus.get(word1.toLowerCase())?.vector;
    const v2 = this.corpus.get(word2.toLowerCase())?.vector;
    if (!v1 || !v2) return 0;
    let dot = 0;
    for (let i = 0; i < this.vectorDimension; i++) dot += v1[i] * v2[i];
    return dot;
  }

  public nearestNeighbors(word: string, k: number = 10): { word: string; similarity: number }[] {
    const target = this.corpus.get(word.toLowerCase());
    if (!target) return [];
    const neighbors: { word: string; similarity: number }[] = [];
    for (const [otherWord, otherSv] of this.corpus) {
      if (otherWord !== word.toLowerCase()) {
        const sim = this.cosineSimilarity(target.vector, otherSv.vector);
        neighbors.push({ word: otherWord, similarity: sim });
      }
    }
    neighbors.sort((a, b) => b.similarity - a.similarity);
    return neighbors.slice(0, k);
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dot = 0;
    for (let i = 0; i < v1.length; i++) dot += v1[i] * v2[i];
    return dot;
  }

  public infer(input: string): InferenceResult {
    const semanticPath: string[] = [];
    semanticPath.push('Applying OCR error correction rules...');
    let corrected = this.applyOCRRules(input);
    semanticPath.push(`After OCR correction: "${corrected}"`);

    const tokens = this.tokenize(corrected);
    semanticPath.push(`Tokenized into ${tokens.length} tokens`);

    const inferredTokens: string[] = [];
    const alternatives: { text: string; score: number }[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      if (this.corpus.has(token)) {
        inferredTokens.push(token);
        semanticPath.push(`Known word: "${token}" (freq=${this.corpus.get(token)!.frequency})`);
      } else {
        semanticPath.push(`Unknown word: "${token}" - inferring from context...`);
        const context = [
          ...tokens.slice(Math.max(0, i - 3), i),
          ...tokens.slice(i + 1, Math.min(tokens.length, i + 4))
        ];
        const inference = this.inferWordFromContext(token, context);
        inferredTokens.push(inference.bestMatch);
        semanticPath.push(`Inferred "${token}" -> "${inference.bestMatch}" (confidence=${inference.confidence.toFixed(2)})`);
        for (const alt of inference.alternatives.slice(0, 3)) {
          const altTokens = [...tokens];
          altTokens[i] = alt.word;
          alternatives.push({ text: altTokens.join(' '), score: alt.score });
        }
      }
    }

    semanticPath.push('Checking semantic coherence...');
    const coherence = this.checkSemanticCoherence(inferredTokens);
    semanticPath.push(`Semantic coherence score: ${coherence.toFixed(3)}`);

    const finalText = this.reconstructText(inferredTokens);
    semanticPath.push(`Final reconstruction: "${finalText}"`);

    const confidence = this.calculateConfidence(corrected, finalText, coherence);
    alternatives.sort((a, b) => b.score - a.score);

    return {
      input,
      corrected: finalText,
      confidence,
      alternatives: alternatives.slice(0, 5),
      semanticPath,
      features: this.extractFeatures(inferredTokens)
    };
  }

  private applyOCRRules(text: string): string {
    let corrected = text;
    for (const rule of this.inferenceRules) {
      if (rule.pattern.test(corrected)) {
        corrected = corrected.replace(rule.pattern, rule.replacement);
      }
    }
    return corrected;
  }

  private inferWordFromContext(unknown: string, context: string[]): { bestMatch: string; confidence: number; alternatives: { word: string; score: number }[] } {
    const contextVector = new Array(this.vectorDimension).fill(0);
    let contextWeight = 0;

    for (const ctxWord of context) {
      const ctxSv = this.corpus.get(ctxWord.toLowerCase());
      if (ctxSv) {
        for (let i = 0; i < this.vectorDimension; i++) {
          contextVector[i] += ctxSv.vector[i] * ctxSv.frequency;
        }
        contextWeight += ctxSv.frequency;
      }
    }

    if (contextWeight === 0) {
      return this.inferFromCharacterSimilarity(unknown);
    }

    for (let i = 0; i < this.vectorDimension; i++) {
      contextVector[i] /= contextWeight;
    }

    const candidates: { word: string; score: number }[] = [];
    for (const [word, sv] of this.corpus) {
      const sim = this.cosineSimilarity(contextVector, sv.vector);
      const charSim = this.characterSimilarity(unknown, word);
      const combinedScore = sim * 0.7 + charSim * 0.3;
      if (combinedScore > 0.1) {
        candidates.push({ word, score: combinedScore });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) {
      return { bestMatch: unknown, confidence: 0.1, alternatives: [] };
    }

    const best = candidates[0];
    const confidence = Math.min(best.score * 1.5, 1.0);
    return { bestMatch: best.word, confidence, alternatives: candidates.slice(1, 5) };
  }

  private inferFromCharacterSimilarity(unknown: string): { bestMatch: string; confidence: number; alternatives: { word: string; score: number }[] } {
    const candidates: { word: string; score: number }[] = [];
    for (const [word, sv] of this.corpus) {
      const score = this.characterSimilarity(unknown, word);
      if (score > 0.3) {
        candidates.push({ word, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) {
      return { bestMatch: unknown, confidence: 0.05, alternatives: [] };
    }
    return { bestMatch: candidates[0].word, confidence: candidates[0].score, alternatives: candidates.slice(1, 5) };
  }

  private characterSimilarity(s1: string, s2: string): number {
    const len = Math.max(s1.length, s2.length);
    if (len === 0) return 1.0;
    const distance = this.ocrAwareEditDistance(s1.toLowerCase(), s2.toLowerCase());
    return Math.max(0, 1 - distance / len);
  }

  private ocrAwareEditDistance(s1: string, s2: string): number {
    const m = s1.length, n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = this.ocrSubstitutionCost(s1[i - 1], s2[j - 1]);
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  private ocrSubstitutionCost(c1: string, c2: string): number {
    if (c1 === c2) return 0;
    const confusions: { [key: string]: string[] } = {
      'r': ['n', 'm'], 'n': ['r', 'm', 'h'], 'm': ['rn', 'nn'],
      'c': ['e', 'o'], 'l': ['1', 'i', 'I'], 'o': ['0', 'c', 'e'],
      '0': ['o', 'O'], '1': ['l', 'I'], 's': ['5', 'S'],
      '5': ['s', 'S'], 'i': ['l', '1', 'j'], 'f': ['t'],
      'b': ['h', '6'], 'd': ['cl', 'ol'], 'h': ['b', 'n'],
      'u': ['n', 'v'], 'v': ['u', 'y']
    };
    if (confusions[c1]?.includes(c2) || confusions[c2]?.includes(c1)) {
      return 0.3;
    }
    return 1.0;
  }

  private checkSemanticCoherence(tokens: string[]): number {
    if (tokens.length < 2) return 1.0;
    let totalSim = 0, pairs = 0;
    for (let i = 0; i < tokens.length - 1; i++) {
      for (let j = i + 1; j < Math.min(tokens.length, i + 4); j++) {
        const sim = this.similarity(tokens[i], tokens[j]);
        totalSim += sim;
        pairs++;
      }
    }
    return pairs > 0 ? totalSim / pairs : 0;
  }

  private reconstructText(tokens: string[]): string {
    let text = tokens.join(' ');
    text = text.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    text = text.replace(/\s+([.!?,:;])/g, '$1');
    return text;
  }

  private calculateConfidence(original: string, corrected: string, coherence: number): number {
    const editDistance = this.ocrAwareEditDistance(original, corrected);
    const maxLen = Math.max(original.length, corrected.length);
    const similarity = maxLen > 0 ? 1 - editDistance / maxLen : 1;
    return similarity * 0.4 + coherence * 0.4 + 0.2;
  }

  private extractFeatures(tokens: string[]): FeatureVector {
    const features: FeatureVector = {};
    for (const token of tokens) {
      const sv = this.corpus.get(token);
      if (sv) {
        for (const [fieldName, field] of this.semanticFields) {
          const sim = this.cosineSimilarity(sv.vector, field.centroid);
          if (sim > 0.5) {
            features[fieldName.toLowerCase()] = true;
          }
        }
      }
    }
    return features;
  }

  public solveAnalogy(a: string, b: string, c: string): { answer: string; confidence: number }[] {
    const va = this.corpus.get(a.toLowerCase())?.vector;
    const vb = this.corpus.get(b.toLowerCase())?.vector;
    const vc = this.corpus.get(c.toLowerCase())?.vector;
    if (!va || !vb || !vc) return [];

    const target = new Array(this.vectorDimension);
    for (let i = 0; i < this.vectorDimension; i++) {
      target[i] = vb[i] - va[i] + vc[i];
    }

    const candidates: { answer: string; confidence: number }[] = [];
    for (const [word, sv] of this.corpus) {
      if (word !== a && word !== b && word !== c) {
        const sim = this.cosineSimilarity(target, sv.vector);
        if (sim > 0.3) {
          candidates.push({ answer: word, confidence: sim });
        }
      }
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates.slice(0, 5);
  }

  public classify(word: string): { field: string; strength: number }[] {
    const sv = this.corpus.get(word.toLowerCase());
    if (!sv) return [];
    const classifications: { field: string; strength: number }[] = [];
    for (const [fieldName, field] of this.semanticFields) {
      const sim = this.cosineSimilarity(sv.vector, field.centroid);
      if (sim > 0.3) {
        classifications.push({ field: fieldName, strength: sim });
      }
    }
    classifications.sort((a, b) => b.strength - a.strength);
    return classifications;
  }

  public getStats(): {
    vocabularySize: number;
    totalTokens: number;
    averageFrequency: number;
    topWords: { word: string; frequency: number }[];
  } {
    const freqs = Array.from(this.corpus.entries())
      .map(([w, sv]) => ({ word: w, frequency: sv.frequency }))
      .sort((a, b) => b.frequency - a.frequency);
    return {
      vocabularySize: this.vocabulary.size,
      totalTokens: this.totalTokens,
      averageFrequency: this.totalTokens / Math.max(this.vocabulary.size, 1),
      topWords: freqs.slice(0, 20)
    };
  }

  public getCorpus(): Map<string, SemanticVector> {
    return this.corpus;
  }
}

export type { SemanticVector, ContextRecord, InferenceResult, DistributionalField, InferenceRule };
