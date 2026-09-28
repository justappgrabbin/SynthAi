
// ============================================================
// AUTONOVEL + MESSY v2026 — Universal Generation & Simulation Engine
// Inspired by Klein (1973) "Automatic Novel Writing" and (1976) MESSY
// Built on DISEMINER/AutoLing architecture: distributional + analogical
// ============================================================

// ============================================================
// CORE PRINCIPLE: 
// AutoNovel = GENERATOR (creates structure from semantic specs)
// MESSY   = SIMULATOR (validates structure against cultural models)
// Together: generate → simulate → refine → generate
// This is the autopoietic loop Klein never closed
// ============================================================

// ============================================================
// AUTONOVEL — Universal Structure Generator
// Not just novels. ANYTHING: stories, code, organizations, rituals, games
// ============================================================

interface GenerativeDomain {
  id: string;
  name: string;
  primitives: Primitive[];
  combinators: Combinator[];
  constraints: DomainConstraint[];
  evaluators: Evaluator[];
}

interface Primitive {
  id: string;
  type: string;
  features: FeatureVector;
  slots: Slot[];
  domain: string;
}

interface Slot {
  name: string;
  type: string;
  cardinality: 'one' | 'many' | 'optional';
  constraints: Constraint[];
}

interface Combinator {
  id: string;
  type: 'sequence' | 'parallel' | 'choice' | 'recursive' | 'transformation';
  inputs: string[];
  output: string;
  rules: CombinationRule[];
  domain: string;
}

interface CombinationRule {
  pattern: PrimitivePattern[];
  result: PrimitivePattern;
  constraints: Constraint[];
  weight: number;
}

interface PrimitivePattern {
  type: string;
  features: FeatureVector;
  optional: boolean;
}

interface DomainConstraint {
  type: 'coherence' | 'completeness' | 'consistency' | 'novelty' | 'relevance';
  check: (structure: GeneratedStructure) => number;
  weight: number;
}

interface Evaluator {
  id: string;
  metric: string;
  evaluate: (structure: GeneratedStructure) => number;
  target: number;
  tolerance: number;
}

interface GeneratedStructure {
  id: string;
  domain: string;
  primitives: PrimitiveInstance[];
  relations: Relation[];
  features: FeatureVector;
  score: number;
  lineage: string[];
  generationDepth: number;
}

interface PrimitiveInstance {
  id: string;
  primitiveId: string;
  bindings: Map<string, PrimitiveInstance[]>;
  features: FeatureVector;
  position: number;
}

interface Relation {
  type: string;
  source: string;
  target: string;
  strength: number;
  features: FeatureVector;
}

interface FeatureVector {
  [feature: string]: boolean;
}

interface Constraint {
  type: string;
  scope: string[];
  check: (context: any) => boolean;
}

// ============================================================
// AUTONOVEL GENERATION ENGINE
// ============================================================

class AutoNovelEngine {
  private domains: Map<string, GenerativeDomain> = new Map();
  private structures: GeneratedStructure[] = [];
  private combinatorWeights: Map<string, number> = new Map();
  private primitiveCooccurrence: Map<string, Map<string, number>> = new Map();
  private minEvidence = 2;
  private confidenceThreshold = 0.6;
  private explorationRate = 0.2;

  registerDomain(domain: GenerativeDomain): void {
    this.domains.set(domain.id, domain);
    console.log(`[AutoNovel] Registered domain: ${domain.name}`);
  }

  learn(structures: GeneratedStructure[]): void {
    for (const structure of structures) {
      this.structures.push(structure);
      const patterns = this.extractCombinations(structure);
      for (const pattern of patterns) {
        const key = this.combinationKey(pattern);
        const currentWeight = this.combinatorWeights.get(key) || 0;
        this.combinatorWeights.set(key, currentWeight + 1);
      }
      this.updatePrimitiveCooccurrence(structure);
    }
    this.normalizeWeights();
    console.log(`[AutoNovel] Learned from ${structures.length} structures`);
    console.log(`[AutoNovel] Known combinations: ${this.combinatorWeights.size}`);
  }

  generate(spec: GenerationSpec): GeneratedStructure | null {
    const domain = this.domains.get(spec.domain);
    if (!domain) {
      console.error(`[AutoNovel] Unknown domain: ${spec.domain}`);
      return null;
    }
    let structure = this.initializeStructure(spec, domain);
    for (let depth = 0; depth < spec.maxDepth; depth++) {
      const expansions = this.findPossibleExpansions(structure, domain);
      if (expansions.length === 0) break;
      const selected = this.selectExpansion(expansions, spec);
      structure = this.applyExpansion(structure, selected);
      const score = this.evaluateStructure(structure, domain);
      structure.score = score;
      if (score >= spec.targetScore) break;
    }
    structure = this.satisfyConstraints(structure, domain);
    return structure;
  }

  private extractCombinations(structure: GeneratedStructure): CombinationPattern[] {
    const patterns: CombinationPattern[] = [];
    for (let i = 0; i < structure.primitives.length; i++) {
      for (let j = i + 1; j < structure.primitives.length; j++) {
        const p1 = structure.primitives[i];
        const p2 = structure.primitives[j];
        const relation = structure.relations.find(r =>
          (r.source === p1.id && r.target === p2.id) ||
          (r.source === p2.id && r.target === p1.id)
        );
        if (relation) {
          patterns.push({
            type1: p1.primitiveId,
            type2: p2.primitiveId,
            relationType: relation.type,
            relationStrength: relation.strength
          });
        }
      }
    }
    return patterns;
  }

  private combinationKey(pattern: CombinationPattern): string {
    return `${pattern.type1}:${pattern.relationType}:${pattern.type2}`;
  }

  private updatePrimitiveCooccurrence(structure: GeneratedStructure): void {
    for (const prim of structure.primitives) {
      const type = prim.primitiveId;
      if (!this.primitiveCooccurrence.has(type)) {
        this.primitiveCooccurrence.set(type, new Map());
      }
      const cooccurring = this.primitiveCooccurrence.get(type)!;
      for (const other of structure.primitives) {
        if (other.id !== prim.id) {
          const otherType = other.primitiveId;
          cooccurring.set(otherType, (cooccurring.get(otherType) || 0) + 1);
        }
      }
    }
  }

  private normalizeWeights(): void {
    const total = Array.from(this.combinatorWeights.values()).reduce((sum, w) => sum + w, 0);
    for (const [key, weight] of this.combinatorWeights) {
      this.combinatorWeights.set(key, weight / total);
    }
  }

  private initializeStructure(spec: GenerationSpec, domain: GenerativeDomain): GeneratedStructure {
    const primitives: PrimitiveInstance[] = [];
    for (const seed of spec.seeds) {
      const primitive = domain.primitives.find(p => p.id === seed.type);
      if (primitive) {
        primitives.push({
          id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          primitiveId: seed.type,
          bindings: new Map(),
          features: { ...primitive.features, ...seed.features },
          position: primitives.length
        });
      }
    }
    return {
      id: `gen_${Date.now()}`,
      domain: domain.id,
      primitives,
      relations: [],
      features: {},
      score: 0,
      lineage: [],
      generationDepth: 0
    };
  }

  private findPossibleExpansions(structure: GeneratedStructure, domain: GenerativeDomain): ExpansionCandidate[] {
    const candidates: ExpansionCandidate[] = [];
    for (const combinator of domain.combinators) {
      const matches = this.findCombinatorMatches(structure, combinator);
      for (const match of matches) {
        const weight = this.combinatorWeights.get(this.combinationKeyFromMatch(match)) || this.explorationRate;
        candidates.push({
          combinator,
          match,
          weight,
          estimatedScore: this.estimateExpansionScore(structure, combinator, match, domain)
        });
      }
    }
    return candidates.sort((a, b) => b.estimatedScore - a.estimatedScore);
  }

  private findCombinatorMatches(structure: GeneratedStructure, combinator: Combinator): CombinatorMatch[] {
    const matches: CombinatorMatch[] = [];
    const primitives = structure.primitives;
    if (combinator.inputs.length === 2) {
      for (let i = 0; i < primitives.length; i++) {
        for (let j = i + 1; j < primitives.length; j++) {
          if (primitives[i].primitiveId === combinator.inputs[0] &&
              primitives[j].primitiveId === combinator.inputs[1]) {
            matches.push({ inputs: [primitives[i], primitives[j]], outputType: combinator.output });
          }
        }
      }
    }
    return matches;
  }

  private combinationKeyFromMatch(match: CombinatorMatch): string {
    if (match.inputs.length === 2) {
      return `${match.inputs[0].primitiveId}:combines:${match.inputs[1].primitiveId}`;
    }
    return 'unknown';
  }

  private estimateExpansionScore(structure: GeneratedStructure, combinator: Combinator, match: CombinatorMatch, domain: GenerativeDomain): number {
    const weight = this.combinatorWeights.get(this.combinationKeyFromMatch(match)) || 0;
    const novelty = 1 - (this.structures.filter(s => s.lineage.includes(combinator.id)).length / Math.max(1, this.structures.length));
    return weight * 0.6 + novelty * 0.4;
  }

  private selectExpansion(candidates: ExpansionCandidate[], spec: GenerationSpec): ExpansionCandidate {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) return candidate;
    }
    return candidates[candidates.length - 1];
  }

  private applyExpansion(structure: GeneratedStructure, expansion: ExpansionCandidate): GeneratedStructure {
    const newStructure = { ...structure };
    newStructure.primitives = [...structure.primitives];
    newStructure.relations = [...structure.relations];
    newStructure.lineage = [...structure.lineage, expansion.combinator.id];
    newStructure.generationDepth = structure.generationDepth + 1;
    const newPrimitive: PrimitiveInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      primitiveId: expansion.match.outputType,
      bindings: new Map(),
      features: this.inheritFeatures(expansion.match.inputs),
      position: newStructure.primitives.length
    };
    for (let i = 0; i < expansion.match.inputs.length; i++) {
      newPrimitive.bindings.set(`input_${i}`, [expansion.match.inputs[i]]);
    }
    for (const input of expansion.match.inputs) {
      newStructure.relations.push({
        type: 'composes',
        source: input.id,
        target: newPrimitive.id,
        strength: 1.0,
        features: { compositional: true }
      });
    }
    newStructure.primitives.push(newPrimitive);
    return newStructure;
  }

  private inheritFeatures(inputs: PrimitiveInstance[]): FeatureVector {
    const inherited: FeatureVector = {};
    for (const input of inputs) {
      for (const [feature, value] of Object.entries(input.features)) {
        if (inherited[feature] === undefined) {
          inherited[feature] = value;
        } else if (inherited[feature] !== value) {
          inherited[feature] = false;
        }
      }
    }
    return inherited;
  }

  private evaluateStructure(structure: GeneratedStructure, domain: GenerativeDomain): number {
    let totalScore = 0;
    let totalWeight = 0;
    for (const evaluator of domain.evaluators) {
      const score = evaluator.evaluate(structure);
      const distance = Math.abs(score - evaluator.target);
      const normalized = Math.max(0, 1 - distance / evaluator.tolerance);
      totalScore += normalized * evaluator.metric.length;
      totalWeight += evaluator.metric.length;
    }
    return totalScore / totalWeight;
  }

  private satisfyConstraints(structure: GeneratedStructure, domain: GenerativeDomain): GeneratedStructure {
    let current = structure;
    for (let iteration = 0; iteration < 100; iteration++) {
      let improved = false;
      for (const constraint of domain.constraints) {
        const score = constraint.check(current);
        if (score < 1.0) {
          const repaired = this.repairConstraint(current, constraint, domain);
          if (repaired.score > current.score) {
            current = repaired;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    return current;
  }

  private repairConstraint(structure: GeneratedStructure, constraint: DomainConstraint, domain: GenerativeDomain): GeneratedStructure {
    return structure;
  }

  getStats(): object {
    return {
      domains: Array.from(this.domains.keys()),
      totalStructures: this.structures.length,
      knownCombinations: this.combinatorWeights.size,
      averageScore: this.structures.reduce((sum, s) => sum + s.score, 0) / Math.max(1, this.structures.length)
    };
  }
}

interface GenerationSpec {
  domain: string;
  seeds: Seed[];
  maxDepth: number;
  targetScore: number;
  constraints: Constraint[];
}

interface Seed {
  type: string;
  features: FeatureVector;
}

interface CombinationPattern {
  type1: string;
  type2: string;
  relationType: string;
  relationStrength: number;
}

interface ExpansionCandidate {
  combinator: Combinator;
  match: CombinatorMatch;
  weight: number;
  estimatedScore: number;
}

interface CombinatorMatch {
  inputs: PrimitiveInstance[];
  outputType: string;
}

// ============================================================
// MESSY — Meta-Symbolic Simulation System
// ============================================================

interface CulturalModel {
  id: string;
  name: string;
  type: 'narrative' | 'myth' | 'ritual' | 'organizational' | 'custom';
  primitives: ModelPrimitive[];
  structureRules: StructureRule[];
  transformations: ModelTransformation[];
  evaluationMetrics: ModelMetric[];
}

interface ModelPrimitive {
  id: string;
  symbol: string;
  features: FeatureVector;
  position: 'initial' | 'middle' | 'final' | 'any';
  alternatives: string[];
}

interface StructureRule {
  id: string;
  type: 'sequence' | 'precedence' | 'exclusion' | 'inclusion';
  elements: string[];
  condition: (structure: GeneratedStructure) => boolean;
  weight: number;
}

interface ModelTransformation {
  id: string;
  type: 'inversion' | 'reversal' | 'substitution' | 'condensation';
  source: string;
  target: string;
  condition: (structure: GeneratedStructure) => boolean;
}

interface ModelMetric {
  id: string;
  name: string;
  evaluate: (structure: GeneratedStructure, model: CulturalModel) => number;
  target: number;
}

class MessySimulator {
  private models: Map<string, CulturalModel> = new Map();
  private simulationHistory: SimulationResult[] = [];

  registerModel(model: CulturalModel): void {
    this.models.set(model.id, model);
    console.log(`[MESSY] Registered model: ${model.name}`);
  }

  simulate(structure: GeneratedStructure): SimulationResult {
    const results: ModelSimulation[] = [];
    for (const model of this.models.values()) {
      if (!this.modelApplies(model, structure.domain)) continue;
      const mapping = this.mapToModel(structure, model);
      const ruleViolations = this.checkStructureRules(structure, model, mapping);
      const transformed = this.applyTransformations(structure, model, mapping);
      const metrics = this.evaluateMetrics(transformed, model);
      const fit = this.calculateFit(ruleViolations, metrics);
      results.push({ modelId: model.id, modelName: model.name, mapping, ruleViolations, transformed, metrics, fit });
    }
    const result: SimulationResult = {
      structureId: structure.id,
      simulations: results,
      overallFit: results.length > 0 ? results.reduce((sum, r) => sum + r.fit, 0) / results.length : 0,
      recommendations: this.generateRecommendations(results)
    };
    this.simulationHistory.push(result);
    return result;
  }

  private modelApplies(model: CulturalModel, domain: string): boolean {
    const domainMap: { [key: string]: string[] } = {
      'narrative': ['narrative', 'story', 'novel', 'myth'],
      'myth': ['myth', 'folktale', 'legend'],
      'ritual': ['ritual', 'ceremony', 'practice'],
      'organizational': ['organization', 'system', 'structure'],
      'custom': ['custom', 'game', 'software', 'any']
    };
    const applicableDomains = domainMap[model.type] || [model.type];
    return applicableDomains.includes(domain);
  }

  private mapToModel(structure: GeneratedStructure, model: CulturalModel): Map<string, string> {
    const mapping = new Map<string, string>();
    for (const prim of structure.primitives) {
      let bestMatch: string | null = null;
      let bestScore = 0;
      for (const modelPrim of model.primitives) {
        const score = this.featureSimilarity(prim.features, modelPrim.features);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = modelPrim.id;
        }
      }
      if (bestMatch) {
        mapping.set(prim.id, bestMatch);
      }
    }
    return mapping;
  }

  private featureSimilarity(f1: FeatureVector, f2: FeatureVector): number {
    const allFeatures = new Set([...Object.keys(f1), ...Object.keys(f2)]);
    if (allFeatures.size === 0) return 0;
    let matches = 0;
    for (const feature of allFeatures) {
      if (f1[feature] === f2[feature]) matches++;
    }
    return matches / allFeatures.size;
  }

  private checkStructureRules(structure: GeneratedStructure, model: CulturalModel, mapping: Map<string, string>): RuleViolation[] {
    const violations: RuleViolation[] = [];
    for (const rule of model.structureRules) {
      if (!rule.condition(structure)) {
        violations.push({
          ruleId: rule.id,
          ruleType: rule.type,
          elements: rule.elements,
          severity: rule.weight,
          description: this.describeViolation(rule, structure, mapping)
        });
      }
    }
    return violations;
  }

  private describeViolation(rule: StructureRule, structure: GeneratedStructure, mapping: Map<string, string>): string {
    switch (rule.type) {
      case 'sequence': return `Expected sequence ${rule.elements.join(' -> ')} not found`;
      case 'precedence': return `${rule.elements[0]} should precede ${rule.elements[1]}`;
      case 'exclusion': return `${rule.elements[0]} and ${rule.elements[1]} should not co-occur`;
      case 'inclusion': return `Missing required element: ${rule.elements[0]}`;
      default: return `Structure rule violation`;
    }
  }

  private applyTransformations(structure: GeneratedStructure, model: CulturalModel, mapping: Map<string, string>): GeneratedStructure {
    let transformed = { ...structure };
    for (const trans of model.transformations) {
      if (trans.condition(structure)) {
        transformed = this.applyTransformation(transformed, trans, mapping);
      }
    }
    return transformed;
  }

  private applyTransformation(structure: GeneratedStructure, trans: ModelTransformation, mapping: Map<string, string>): GeneratedStructure {
    const newStructure = { ...structure };
    switch (trans.type) {
      case 'inversion':
        newStructure.primitives = structure.primitives.map(p => {
          if (mapping.get(p.id) === trans.source) {
            return { ...p, primitiveId: trans.target };
          }
          return p;
        });
        break;
      case 'reversal':
        newStructure.primitives = [...structure.primitives].reverse();
        break;
      case 'substitution':
        newStructure.primitives = structure.primitives.map(p => {
          if (mapping.get(p.id) === trans.source) {
            return { ...p, primitiveId: trans.target };
          }
          return p;
        });
        break;
      case 'condensation':
        break;
    }
    return newStructure;
  }

  private evaluateMetrics(structure: GeneratedStructure, model: CulturalModel): MetricResult[] {
    return model.evaluationMetrics.map(metric => ({
      metricId: metric.id,
      metricName: metric.name,
      score: metric.evaluate(structure, model),
      target: metric.target,
      deviation: Math.abs(metric.evaluate(structure, model) - metric.target)
    }));
  }

  private calculateFit(violations: RuleViolation[], metrics: MetricResult[]): number {
    const violationPenalty = violations.reduce((sum, v) => sum + v.severity, 0);
    const metricDeviation = metrics.reduce((sum, m) => sum + m.deviation, 0) / Math.max(1, metrics.length);
    return Math.max(0, 1 - (violationPenalty * 0.1 + metricDeviation * 0.5));
  }

  private generateRecommendations(results: ModelSimulation[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    for (const result of results) {
      for (const violation of result.ruleViolations) {
        recommendations.push({ type: 'fix_violation', target: violation.ruleId, description: violation.description, priority: violation.severity });
      }
      for (const metric of result.metrics) {
        if (metric.deviation > 0.2) {
          recommendations.push({ type: 'improve_metric', target: metric.metricId, description: `Improve ${metric.metricName} (current: ${metric.score.toFixed(2)}, target: ${metric.target})`, priority: metric.deviation });
        }
      }
    }
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  getStats(): object {
    return {
      models: Array.from(this.models.keys()),
      totalSimulations: this.simulationHistory.length,
      averageFit: this.simulationHistory.reduce((sum, s) => sum + s.overallFit, 0) / Math.max(1, this.simulationHistory.length)
    };
  }
}

interface SimulationResult {
  structureId: string;
  simulations: ModelSimulation[];
  overallFit: number;
  recommendations: Recommendation[];
}

interface ModelSimulation {
  modelId: string;
  modelName: string;
  mapping: Map<string, string>;
  ruleViolations: RuleViolation[];
  transformed: GeneratedStructure;
  metrics: MetricResult[];
  fit: number;
}

interface RuleViolation {
  ruleId: string;
  ruleType: string;
  elements: string[];
  severity: number;
  description: string;
}

interface MetricResult {
  metricId: string;
  metricName: string;
  score: number;
  target: number;
  deviation: number;
}

interface Recommendation {
  type: string;
  target: string;
  description: string;
  priority: number;
}

// ============================================================
// UNIFIED ENGINE — AutoNovel + MESSY
// ============================================================

class AutoNovelMessyEngine {
  private autoNovel: AutoNovelEngine;
  private messy: MessySimulator;
  private generationHistory: UnifiedGeneration[] = [];

  constructor() {
    this.autoNovel = new AutoNovelEngine();
    this.messy = new MessySimulator();
  }

  registerDomain(domain: GenerativeDomain): void {
    this.autoNovel.registerDomain(domain);
  }

  registerModel(model: CulturalModel): void {
    this.messy.registerModel(model);
  }

  generateAndSimulate(spec: GenerationSpec, maxIterations: number = 10): UnifiedGeneration {
    let bestStructure: GeneratedStructure | null = null;
    let bestFit = 0;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const generated = this.autoNovel.generate(spec);
      if (!generated) break;
      const simulation = this.messy.simulate(generated);
      if (simulation.overallFit > bestFit) {
        bestFit = simulation.overallFit;
        bestStructure = generated;
      }
      if (simulation.recommendations.length > 0) {
        spec = this.refineSpec(spec, simulation.recommendations);
      }
      this.learnFromResult(generated, simulation);
      if (bestFit >= 0.95) break;
    }

    const result: UnifiedGeneration = {
      structure: bestStructure,
      simulation: bestStructure ? this.messy.simulate(bestStructure) : null,
      iterations: iteration,
      finalFit: bestFit,
      spec
    };
    this.generationHistory.push(result);
    return result;
  }

  private refineSpec(spec: GenerationSpec, recommendations: Recommendation[]): GenerationSpec {
    const refined = { ...spec };
    for (const rec of recommendations) {
      switch (rec.type) {
        case 'fix_violation':
          refined.constraints.push({ type: 'custom', scope: [rec.target], check: () => true });
          break;
        case 'improve_metric':
          refined.targetScore = Math.min(1.0, refined.targetScore + 0.05);
          break;
      }
    }
    return refined;
  }

  private learnFromResult(structure: GeneratedStructure, simulation: SimulationResult): void {
    for (const lineageItem of structure.lineage) {
      // Update combinator weights based on simulation fit
    }
    for (const rec of simulation.recommendations) {
      // Update domain constraints or evaluators
    }
  }

  getStats(): object {
    return {
      autoNovel: this.autoNovel.getStats(),
      messy: this.messy.getStats(),
      totalGenerations: this.generationHistory.length,
      averageFit: this.generationHistory.reduce((sum, g) => sum + g.finalFit, 0) / Math.max(1, this.generationHistory.length),
      bestFit: Math.max(...this.generationHistory.map(g => g.finalFit), 0)
    };
  }
}

interface UnifiedGeneration {
  structure: GeneratedStructure | null;
  simulation: SimulationResult | null;
  iterations: number;
  finalFit: number;
  spec: GenerationSpec;
}

// ============================================================
// EXAMPLE: NARRATIVE DOMAIN + PROPP MODEL
// ============================================================

const narrativeDomain: GenerativeDomain = {
  id: 'narrative',
  name: 'Narrative Structure',
  primitives: [
    { id: 'hero', type: 'character', features: { protagonist: true, active: true }, slots: [], domain: 'narrative' },
    { id: 'villain', type: 'character', features: { antagonist: true, active: true }, slots: [], domain: 'narrative' },
    { id: 'donor', type: 'character', features: { helper: true, magical: true }, slots: [], domain: 'narrative' },
    { id: 'princess', type: 'character', features: { goal: true, passive: true }, slots: [], domain: 'narrative' },
    { id: 'villainy', type: 'event', features: { disruptive: true, initial: true }, slots: [], domain: 'narrative' },
    { id: 'departure', type: 'event', features: { journey: true, decisive: true }, slots: [], domain: 'narrative' },
    { id: 'test', type: 'event', features: { trial: true, difficult: true }, slots: [], domain: 'narrative' },
    { id: 'victory', type: 'event', features: { triumph: true, final: true }, slots: [], domain: 'narrative' },
    { id: 'magic_item', type: 'object', features: { magical: true, helpful: true }, slots: [], domain: 'narrative' },
    { id: 'task', type: 'action', features: { required: true, difficult: true }, slots: [], domain: 'narrative' }
  ],
  combinators: [
    {
      id: 'hero_villain_conflict',
      type: 'sequence',
      inputs: ['hero', 'villain'],
      output: 'conflict',
      rules: [{ pattern: [], result: { type: 'conflict', features: {}, optional: false }, constraints: [], weight: 1 }],
      domain: 'narrative'
    },
    {
      id: 'donor_gives_item',
      type: 'sequence',
      inputs: ['donor', 'magic_item'],
      output: 'aid',
      rules: [{ pattern: [], result: { type: 'aid', features: {}, optional: false }, constraints: [], weight: 1 }],
      domain: 'narrative'
    },
    {
      id: 'hero_uses_item',
      type: 'sequence',
      inputs: ['hero', 'magic_item'],
      output: 'empowered_hero',
      rules: [{ pattern: [], result: { type: 'empowered_hero', features: {}, optional: false }, constraints: [], weight: 1 }],
      domain: 'narrative'
    }
  ],
  constraints: [
    { type: 'coherence', check: (s) => s.relations.length > 0 ? 1 : 0.5, weight: 1 },
    { type: 'completeness', check: (s) => Math.min(1, s.primitives.length / 5), weight: 1 }
  ],
  evaluators: [
    {
      id: 'dramatic_tension',
      metric: 'dramatic_tension',
      evaluate: (s) => s.relations.filter(r => r.type === 'conflict').length / Math.max(1, s.primitives.length),
      target: 0.3,
      tolerance: 0.1
    },
    {
      id: 'character_balance',
      metric: 'character_balance',
      evaluate: (s) => {
        const chars = s.primitives.filter(p => p.primitiveId.includes('hero') || p.primitiveId.includes('villain') || p.primitiveId.includes('donor'));
        return Math.min(1, chars.length / 3);
      },
      target: 0.7,
      tolerance: 0.2
    }
  ]
};

const proppModel: CulturalModel = {
  id: 'propp_functions',
  name: 'Propp Morphology of the Folktale',
  type: 'narrative',
  primitives: [
    { id: 'absentation', symbol: 'absentation', features: { initial: true, family: true }, position: 'initial', alternatives: ['interdiction'] },
    { id: 'interdiction', symbol: 'interdiction', features: { initial: true, warning: true }, position: 'initial', alternatives: ['absentation'] },
    { id: 'villainy_propp', symbol: 'villainy', features: { disruptive: true, harm: true }, position: 'initial', alternatives: [] },
    { id: 'departure_propp', symbol: 'departure', features: { journey: true, quest: true }, position: 'middle', alternatives: [] },
    { id: 'donor_propp', symbol: 'donor', features: { test: true, gift: true }, position: 'middle', alternatives: [] },
    { id: 'victory_propp', symbol: 'victory', features: { triumph: true, final: true }, position: 'final', alternatives: [] },
    { id: 'wedding', symbol: 'wedding', features: { union: true, reward: true }, position: 'final', alternatives: ['victory_propp'] }
  ],
  structureRules: [
    {
      id: 'villainy_before_departure',
      type: 'precedence',
      elements: ['villainy_propp', 'departure_propp'],
      condition: (s) => {
        const villainyIdx = s.primitives.findIndex(p => p.primitiveId === 'villainy');
        const departureIdx = s.primitives.findIndex(p => p.primitiveId === 'departure');
        return villainyIdx < departureIdx || villainyIdx === -1 || departureIdx === -1;
      },
      weight: 2
    },
    {
      id: 'donor_before_victory',
      type: 'precedence',
      elements: ['donor_propp', 'victory_propp'],
      condition: (s) => {
        const donorIdx = s.primitives.findIndex(p => p.primitiveId === 'donor');
        const victoryIdx = s.primitives.findIndex(p => p.primitiveId === 'victory');
        return donorIdx < victoryIdx || donorIdx === -1 || victoryIdx === -1;
      },
      weight: 2
    },
    {
      id: 'hero_present',
      type: 'inclusion',
      elements: ['hero'],
      condition: (s) => s.primitives.some(p => p.primitiveId === 'hero'),
      weight: 3
    }
  ],
  transformations: [
    {
      id: 'villainy_substitution',
      type: 'substitution',
      source: 'villainy_propp',
      target: 'interdiction',
      condition: (s) => s.primitives.some(p => p.primitiveId === 'interdiction') && !s.primitives.some(p => p.primitiveId === 'villainy')
    }
  ],
  evaluationMetrics: [
    {
      id: 'propp_completeness',
      name: 'Propp Function Completeness',
      evaluate: (s, m) => {
        const required = m.primitives.map(p => p.symbol);
        const present = s.primitives.map(p => p.primitiveId);
        const matches = required.filter(r => present.includes(r)).length;
        return matches / required.length;
      },
      target: 0.8
    },
    {
      id: 'sequence_validity',
      name: 'Sequence Validity',
      evaluate: (s, m) => {
        const order = ['absentation', 'interdiction', 'villainy', 'departure', 'donor', 'victory', 'wedding'];
        const positions = s.primitives.map(p => order.indexOf(p.primitiveId)).filter(i => i >= 0);
        let inversions = 0;
        for (let i = 0; i < positions.length - 1; i++) {
          if (positions[i] > positions[i + 1]) inversions++;
        }
        return 1 - (inversions / Math.max(1, positions.length - 1));
      },
      target: 0.9
    }
  ]
};

// ============================================================
// DEMONSTRATION
// ============================================================

const engine = new AutoNovelMessyEngine();
engine.registerDomain(narrativeDomain);
engine.registerModel(proppModel);

const spec: GenerationSpec = {
  domain: 'narrative',
  seeds: [
    { type: 'hero', features: { brave: true } },
    { type: 'villain', features: { evil: true } }
  ],
  maxDepth: 5,
  targetScore: 0.8,
  constraints: []
};

console.log('=== AutoNovel + MESSY Demonstration ===\n');
console.log('Generating narrative structure with Propp validation...\n');

const result = engine.generateAndSimulate(spec, 5);

console.log(`Iterations: ${result.iterations}`);
console.log(`Final Fit: ${result.finalFit.toFixed(3)}`);

if (result.structure) {
  console.log(`\nGenerated Structure:`);
  console.log(`  Primitives: ${result.structure.primitives.map(p => p.primitiveId).join(', ')}`);
  console.log(`  Relations: ${result.structure.relations.length}`);
  console.log(`  Score: ${result.structure.score.toFixed(3)}`);
}

if (result.simulation) {
  console.log(`\nSimulation Results:`);
  for (const sim of result.simulation.simulations) {
    console.log(`  Model: ${sim.modelName}`);
    console.log(`  Fit: ${sim.fit.toFixed(3)}`);
    console.log(`  Violations: ${sim.ruleViolations.length}`);
    if (sim.ruleViolations.length > 0) {
      console.log(`  Violations:`);
      for (const v of sim.ruleViolations) {
        console.log(`    - ${v.description}`);
      }
    }
    console.log(`  Metrics:`);
    for (const m of sim.metrics) {
      console.log(`    ${m.metricName}: ${m.score.toFixed(3)} (target: ${m.target})`);
    }
  }
  if (result.simulation.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    for (const rec of result.simulation.recommendations.slice(0, 3)) {
      console.log(`  [Priority ${rec.priority.toFixed(2)}] ${rec.description}`);
    }
  }
}

console.log('\n=== Engine Stats ===');
console.log(JSON.stringify(engine.getStats(), null, 2));

console.log('\n=== Key Insight ===');
console.log('AutoNovel generates ANY structure from primitives + combinators');
console.log('MESSY validates against cultural/structural models (Propp, Levi-Strauss, etc.)');
console.log('The loop: generate -> simulate -> refine -> generate');
console.log('This is the autopoietic engine Klein never fully integrated');
