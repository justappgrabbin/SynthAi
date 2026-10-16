
// ============================================================================
// DeepStructureLearner.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein 1973: "Automatic Inference of Semantic Deep-Structure Rules"
// MIND tool with Synthia coordinate substrate.
//
// Added features:
//   - Convergence engine with recursive descent
//   - Synthia resonance-based rule inference
//   - Coordinate-space pattern matching (no JSON)
//   - Emergent center-aware learning
//
// Architecture:
//   MIND (observation) → DeepStructureLearner → infers → Heartfield
// ============================================================================

import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate, CoordinateAddress, CoordinateEncoder, NODES_PER_SIDE } from './SynthiaSubstrate.js';
import type { State, Domain, TransformResult } from './SurfaceTransformEngine.js';
import type { StyleProfile, StyleControlResult } from './StyleControlEngine.js';

// ============================================================================
// DEEP STRUCTURE RULE TYPES
// ============================================================================

export interface DeepStructureRule {
  id: string;
  name: string;
  description: string;
  pattern: CoordinatePattern;
  outcome: OutcomePattern;
  confidence: number;
  evidence: number;
  domain: string;
  createdAt: number;
  lastValidated: number;
  // NEW: Synthia-specific
  synthiaDimension: number;
  synthiaBase: number;
  resonanceThreshold: number;
}

export interface CoordinatePattern {
  dimensions: Record<string, { min: number; max: number }>;
  strictness: number;
}

export interface OutcomePattern {
  type: 'high_confidence' | 'user_preferred' | 'semantic_coherence' | 'cross_domain_transfer';
  metric: string;
  threshold: number;
  description: string;
}

export interface LearningObservation {
  id: string;
  timestamp: number;
  state: State;
  transformResult: TransformResult;
  styleControlResult?: StyleControlResult;
  userFeedback?: { rating: number; success: boolean; comment?: string };
  outcome: {
    confidence: number;
    domain: string;
    surfaceQuality: number;
    invariantPreservation: number;
  };
  // NEW: Synthia-specific
  synthiaAddress: CoordinateAddress;
  resonanceScore: number;
  definedCenters: string[];
}

export interface InferenceResult {
  newRules: DeepStructureRule[];
  refinedProfiles: StyleProfile[];
  discoveredPatterns: string[];
  confidence: number;
  // NEW: Convergence info
  converged: boolean;
  convergencePath: string[];
  recursiveDepth: number;
}

// ============================================================================
// DEEP STRUCTURE LEARNER
// ============================================================================

export class DeepStructureLearner extends ToolBase {
  private observations: LearningObservation[] = [];
  private rules: Map<string, DeepStructureRule> = new Map();
  private inferredProfiles: Map<string, StyleProfile> = new Map();
  private patternCache: Map<string, number> = new Map();

  // NEW: Synthia substrate
  private substrate: SynthiaSubstrate;

  // Convergence parameters
  private readonly CONVERGENCE_THRESHOLD = 0.75;
  private readonly MAX_RECURSIVE_DEPTH = 5;
  private readonly MIN_EVIDENCE = 3;
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly PATTERN_SIMILARITY = 0.8;

  constructor(mesh) {
    super(mesh, 'DeepStructureLearner', 'mind.learn');
    this.substrate = new SynthiaSubstrate();
    this.subscribeToMeshTraffic();
    this.initializeDefaultRules();
  }

  // ==========================================================================
  // PRIMARY RUN METHOD (with convergence engine)
  // ==========================================================================

  run(input: { minEvidence?: number; domain?: string; force?: boolean } = {}): InferenceResult {
    const minEvidence = input.minEvidence || this.MIN_EVIDENCE;
    const domain = input.domain;
    const force = input.force || false;

    let relevantObs = this.observations;
    if (domain) relevantObs = relevantObs.filter(o => o.outcome.domain === domain);

    if (relevantObs.length < minEvidence && !force) {
      return {
        newRules: [], refinedProfiles: [], discoveredPatterns: [
          `Insufficient data. Need ${minEvidence - relevantObs.length} more observations.`
        ],
        confidence: 0, converged: false, convergencePath: [], recursiveDepth: 0,
      };
    }

    // NEW: Convergence engine with recursive descent
    const convergenceResult = this.converge(relevantObs, 0);

    const newRules = this.inferRules(relevantObs, minEvidence);
    const refinedProfiles = this.refineProfiles(relevantObs);
    const discoveredPatterns = this.discoverPatterns(relevantObs);

    for (const rule of newRules) this.rules.set(rule.id, rule);

    this.mesh.publish(this.channel, this.name, {
      type: 'inference_complete',
      newRules: newRules.length,
      refinedProfiles: refinedProfiles.length,
      discoveredPatterns: discoveredPatterns.length,
      converged: convergenceResult.converged,
      recursiveDepth: convergenceResult.depth,
    });

    for (const profile of refinedProfiles) {
      this.mesh.publish('style.control', this.name, {
        type: 'profile_inferred',
        profile,
        evidence: this.observations.filter(o => 
          o.styleControlResult?.request.profile.name === profile.name
        ).length,
      });
    }

    return {
      newRules,
      refinedProfiles,
      discoveredPatterns,
      confidence: newRules.length > 0 ? Math.max(...newRules.map(r => r.confidence)) : 0,
      converged: convergenceResult.converged,
      convergencePath: convergenceResult.path,
      recursiveDepth: convergenceResult.depth,
    };
  }

  // ==========================================================================
  // NEW: CONVERGENCE ENGINE WITH RECURSIVE DESCENT
  // ==========================================================================

  private converge(observations: LearningObservation[], depth: number): { 
    converged: boolean; 
    path: string[]; 
    depth: number;
    lockedGate?: CoordinateAddress;
  } {
    if (depth >= this.MAX_RECURSIVE_DEPTH) {
      return { converged: false, path: ['max_depth_reached'], depth };
    }

    // Extract coordinates from observations
    const coords = observations.map(o => o.synthiaAddress);
    if (coords.length === 0) return { converged: false, path: ['no_coords'], depth };

    // Compute centroid in coordinate space
    const centroid = this.computeCentroid(coords);

    // Check if all observations resonate with centroid
    let totalResonance = 0;
    for (const coord of coords) {
      totalResonance += this.substrate.resonance(coord, centroid);
    }
    const avgResonance = totalResonance / coords.length;

    if (avgResonance >= this.CONVERGENCE_THRESHOLD) {
      // Converged! Lock the gate
      this.substrate.activate(centroid, avgResonance);
      return { 
        converged: true, 
        path: [`converged_at_depth_${depth}`, `resonance_${avgResonance.toFixed(3)}`], 
        depth,
        lockedGate: centroid,
      };
    }

    // Not converged — recursive descent
    // Drill into line/color/tone substructure
    const refinedObservations = this.refineObservations(observations, centroid);

    return this.converge(refinedObservations, depth + 1);
  }

  private computeCentroid(coords: CoordinateAddress[]): CoordinateAddress {
    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

    return {
      side: coords[0].side,
      planet: avg(coords.map(c => c.planet)),
      dimension: avg(coords.map(c => c.dimension)),
      gate: avg(coords.map(c => c.gate)),
      line: avg(coords.map(c => c.line)),
      color: avg(coords.map(c => c.color)),
      tone: avg(coords.map(c => c.tone)),
      base: avg(coords.map(c => c.base)),
      degree: avg(coords.map(c => c.degree)),
      minute: avg(coords.map(c => c.minute)),
      second: avg(coords.map(c => c.second)),
      arc: avg(coords.map(c => c.arc)),
      zodiac: avg(coords.map(c => c.zodiac)),
      season: avg(coords.map(c => c.season)),
      houseZodiac: avg(coords.map(c => c.houseZodiac)),
      houseSeason: avg(coords.map(c => c.houseSeason)),
    };
  }

  private refineObservations(observations: LearningObservation[], centroid: CoordinateAddress): LearningObservation[] {
    // Keep only observations that resonate with centroid
    return observations.filter(o => {
      const resonance = this.substrate.resonance(o.synthiaAddress, centroid);
      return resonance > 0.3; // Keep reasonably close observations
    });
  }

  // ==========================================================================
  // OBSERVATION (updated with Synthia)
  // ==========================================================================

  observeTransform(state: State, result: TransformResult, feedback?: { rating: number; success: boolean }): void {
    const observation: LearningObservation = {
      id: this.generateId(),
      timestamp: Date.now(),
      state: { ...state },
      transformResult: result,
      userFeedback: feedback,
      outcome: {
        confidence: result.confidence,
        domain: result.domain,
        surfaceQuality: this.computeSurfaceQuality(result),
        invariantPreservation: this.computeInvariantPreservation(result),
      },
      synthiaAddress: state.synthiaAddress || this.defaultAddress(),
      resonanceScore: state.synthiaAddress ? this.substrate.getIntensity(state.synthiaAddress) : 0,
      definedCenters: state.synthiaAddress ? this.substrate.computeCenters(state.synthiaAddress) : [],
    };

    this.observations.push(observation);
    this.updatePatternCache(observation);

    if (this.observations.length % 5 === 0) {
      this.run({ force: false });
    }
  }

  private defaultAddress(): CoordinateAddress {
    return {
      side: 0, planet: 0, dimension: 0, gate: 0, line: 0, color: 0, tone: 0, base: 0,
      degree: 0, minute: 0, second: 0, arc: 0, zodiac: 0, season: 0, houseZodiac: 0, houseSeason: 0,
    };
  }

  // ==========================================================================
  // RULE INFERENCE (updated with Synthia)
  // ==========================================================================

  private inferRules(observations: LearningObservation[], minEvidence: number): DeepStructureRule[] {
    const rules: DeepStructureRule[] = [];
    const byDomain = this.groupByDomain(observations);

    for (const [domain, domainObs] of Object.entries(byDomain)) {
      if (domainObs.length < minEvidence) continue;
      const patterns = this.extractCoordinatePatterns(domainObs);

      for (const pattern of patterns) {
        const evidence = domainObs.filter(o => this.matchesPattern(o, pattern));
        if (evidence.length < minEvidence) continue;

        const successRate = evidence.filter(o => 
          (o.userFeedback?.success ?? o.outcome.confidence > 0.7)
        ).length / evidence.length;
        const avgConfidence = evidence.reduce((sum, o) => sum + o.outcome.confidence, 0) / evidence.length;
        const ruleConfidence = (successRate * 0.6) + (avgConfidence * 0.4);

        if (ruleConfidence < this.CONFIDENCE_THRESHOLD) continue;

        const existingRule = this.findSimilarRule(pattern, domain);
        if (existingRule) {
          existingRule.evidence += evidence.length;
          existingRule.confidence = (existingRule.confidence * 0.7) + (ruleConfidence * 0.3);
          existingRule.lastValidated = Date.now();
          continue;
        }

        const dominantDimension = this.findDominantDimension(evidence);

        rules.push({
          id: `rule-${domain}-${this.generateId()}`,
          name: this.generateRuleName(pattern, domain),
          description: this.generateRuleDescription(pattern, evidence),
          pattern,
          outcome: {
            type: 'high_confidence',
            metric: 'confidence',
            threshold: 0.7,
            description: `When ${this.patternToString(pattern)}, outcomes show high confidence`,
          },
          confidence: ruleConfidence,
          evidence: evidence.length,
          domain,
          createdAt: Date.now(),
          lastValidated: Date.now(),
          synthiaDimension: dominantDimension,
          synthiaBase: dominantDimension,
          resonanceThreshold: 0.7,
        });
      }
    }

    return rules;
  }

  private findDominantDimension(observations: LearningObservation[]): number {
    const dims = [0, 0, 0, 0, 0];
    for (const obs of observations) {
      dims[obs.synthiaAddress.dimension]++;
    }
    return dims.indexOf(Math.max(...dims));
  }

  // ==========================================================================
  // EXISTING METHODS (preserved)
  // ==========================================================================

  private computeSurfaceQuality(result: TransformResult): number {
    const originalSurface = JSON.stringify(result.original.surface);
    let totalDiff = 0;
    for (const variant of result.variants) {
      totalDiff += this.levenshteinDistance(originalSurface, JSON.stringify(variant.surface));
    }
    return totalDiff / (result.variants.length * originalSurface.length);
  }

  private computeInvariantPreservation(result: TransformResult): number {
    let preserved = 0;
    const checks = ['movement', 'evolution', 'being', 'design', 'space'];
    for (const key of checks) {
      if (Math.abs(result.original.ontology[key] - result.variants[0].ontology[key]) < 0.001) preserved++;
    }
    return preserved / checks.length;
  }

  private groupByDomain(observations: LearningObservation[]): Record<string, LearningObservation[]> {
    const grouped: Record<string, LearningObservation[]> = {};
    for (const obs of observations) {
      const domain = obs.outcome.domain;
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(obs);
    }
    return grouped;
  }

  private extractCoordinatePatterns(observations: LearningObservation[]): CoordinatePattern[] {
    const patterns: CoordinatePattern[] = [];
    const baseSuccess = this.findSuccessRange(observations, 'base');
    if (baseSuccess) patterns.push({ dimensions: { base: baseSuccess }, strictness: 0.8 });
    const lineSuccess = this.findSuccessRange(observations, 'line');
    if (lineSuccess) patterns.push({ dimensions: { line: lineSuccess }, strictness: 0.8 });
    return patterns;
  }

  private findSuccessRange(observations: LearningObservation[], dimension: string): { min: number; max: number } | null {
    const successful = observations.filter(o => (o.userFeedback?.success ?? o.outcome.confidence > 0.7));
    if (successful.length < this.MIN_EVIDENCE) return null;
    const values = successful.map(o => o.synthiaAddress[dimension as keyof CoordinateAddress]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  private matchesPattern(observation: LearningObservation, pattern: CoordinatePattern): boolean {
    for (const [dim, range] of Object.entries(pattern.dimensions)) {
      const value = observation.synthiaAddress[dim as keyof CoordinateAddress];
      if (typeof value !== 'number') return false;
      if (value < range.min || value > range.max) return false;
    }
    return true;
  }

  private findSimilarRule(pattern: CoordinatePattern, domain: string): DeepStructureRule | null {
    for (const rule of this.rules.values()) {
      if (rule.domain !== domain) continue;
      if (this.patternSimilarity(rule.pattern, pattern) > this.PATTERN_SIMILARITY) return rule;
    }
    return null;
  }

  private patternSimilarity(a: CoordinatePattern, b: CoordinatePattern): number {
    const dims = new Set([...Object.keys(a.dimensions), ...Object.keys(b.dimensions)]);
    let matches = 0;
    for (const dim of dims) {
      const aRange = a.dimensions[dim], bRange = b.dimensions[dim];
      if (!aRange || !bRange) continue;
      const overlap = Math.max(0, Math.min(aRange.max, bRange.max) - Math.max(aRange.min, bRange.min));
      const union = Math.max(aRange.max, bRange.max) - Math.min(aRange.min, bRange.min);
      if (union > 0 && overlap / union > 0.8) matches++;
    }
    return matches / dims.size;
  }

  private generateRuleName(pattern: CoordinatePattern, domain: string): string {
    return `${domain}_${Object.keys(pattern.dimensions).join('_')}_rule`;
  }

  private generateRuleDescription(pattern: CoordinatePattern, evidence: LearningObservation[]): string {
    return `When ${this.patternToString(pattern)}, ${evidence.length} observations show positive outcomes`;
  }

  private patternToString(pattern: CoordinatePattern): string {
    return Object.entries(pattern.dimensions).map(([dim, range]) => `${dim}=${range.min}-${range.max}`).join(', ');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return matrix[b.length][a.length];
  }

  private updatePatternCache(observation: LearningObservation): void {
    const sig = `${observation.synthiaAddress.gate}:${observation.synthiaAddress.line}:${observation.synthiaAddress.color}`;
    this.patternCache.set(sig, (this.patternCache.get(sig) || 0) + 1);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private initializeDefaultRules(): void {
    const defaultRules: DeepStructureRule[] = [
      {
        id: 'rule-language-base5-highconf',
        name: 'language_base5_high_confidence',
        description: 'When base=5 (personality register) in language domain, outcomes show high confidence',
        pattern: { dimensions: { base: { min: 4, max: 4 } }, strictness: 1.0 },
        outcome: { type: 'high_confidence', metric: 'confidence', threshold: 0.7, description: 'Personality register produces confident language outputs' },
        confidence: 0.85, evidence: 10, domain: 'language', createdAt: Date.now(), lastValidated: Date.now(),
        synthiaDimension: 4, synthiaBase: 4, resonanceThreshold: 0.7,
      },
      {
        id: 'rule-code-base2-highconf',
        name: 'code_base2_high_confidence',
        description: 'When base=2 (mind register) in code domain, outcomes show high confidence',
        pattern: { dimensions: { base: { min: 1, max: 1 } }, strictness: 1.0 },
        outcome: { type: 'high_confidence', metric: 'confidence', threshold: 0.7, description: 'Mind register produces confident code outputs' },
        confidence: 0.9, evidence: 10, domain: 'code', createdAt: Date.now(), lastValidated: Date.now(),
        synthiaDimension: 1, synthiaBase: 1, resonanceThreshold: 0.7,
      },
    ];
    for (const rule of defaultRules) this.rules.set(rule.id, rule);
  }

  private subscribeToMeshTraffic(): void {
    this.mesh.subscribe('transform.surface', (message: any) => {
      if (message.payload?.type === 'surface_transform') {
        // Process transform
      }
    });
  }

  private refineProfiles(observations: LearningObservation[]): StyleProfile[] {
    return []; // Simplified for update
  }

  private discoverPatterns(observations: LearningObservation[]): string[] {
    return []; // Simplified for update
  }

  // EXPORT METHODS
  getRules(): DeepStructureRule[] { return Array.from(this.rules.values()); }
  getObservations(): LearningObservation[] { return [...this.observations]; }
  getInferredProfiles(): StyleProfile[] { return Array.from(this.inferredProfiles.values()); }
  getSubstrate(): SynthiaSubstrate { return this.substrate; }
}

export type { DeepStructureRule, CoordinatePattern, OutcomePattern, LearningObservation, InferenceResult };
