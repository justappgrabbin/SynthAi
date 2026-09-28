// ============================================================
// DISEMINER MCP Server — Klein Tool Engine
// Context-Dependent Emergent Behavior Primitive
// SPEC-2 Compliant Implementation
// ============================================================

import { atoXNOR, TRIGRAMS, Hexagram, HEXAGRAMS } from './ato-engine';

// ─────────────────────────────────────────────────────────────
// SECTION 1: KLEIN TOOL DEFINITION
// ─────────────────────────────────────────────────────────────

/**
 * A Klein Tool is the minimal unit of emergent behavior attached to a Gate.
 * It is NOT a fixed function — it is a generative operator whose output
 * depends entirely on which other Klein Tools are co-active at the same node.
 * 
 * Formal: K(context) → { relation, intensity, direction }
 * where context = set of other active Klein Tools at that node
 */
export interface KleinTool {
  toolId: string;
  name: string;
  gateId: number;           // 1-64
  trigram: string;          // 3-bit binary
  decomposable: boolean;
  // The tool's "personality" — how it contributes to joint evaluation
  relationBias: number;     // -1 to 1 (attracts/repels)
  intensitySignature: number; // 0 to 1 (how strongly it asserts)
  directionTendency: number;  // 0 to 360 (degrees, if applicable)
}

/**
 * Evaluation output: what a Klein Tool (or combination) produces
 */
export interface KleinToolOutput {
  relation: string;         // what kind of edge is produced
  intensity: number;        // 0 to 1, strength of edge
  direction: string;        // which way the edge points
}

/**
 * Context = the set of all active Klein Tools at a node
 */
export interface KleinToolContext {
  nodeId: string;
  activeToolIds: string[];
  timestamp: string;        // ISO-8601
}

/**
 * Evaluation result — append-only ledger entry
 */
export interface EvaluationResult {
  evaluationId: string;     // UUID
  context: KleinToolContext;
  result: KleinToolOutput;
  classification: 'mutation' | 'interference' | 'neutral' | 'null';
  evaluatedAt: string;
  // Trace: which tools contributed, in what order
  contributingTools: string[];
  // The ATO operator that was active during this evaluation
  activeAtoOperator?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION 2: KLEIN TOOL REGISTRY
// ─────────────────────────────────────────────────────────────

export class KleinToolRegistry {
  private tools: Map<string, KleinTool> = new Map();
  private gateTools: Map<number, Set<string>> = new Map();

  register(tool: KleinTool): void {
    this.tools.set(tool.toolId, tool);
    if (!this.gateTools.has(tool.gateId)) {
      this.gateTools.set(tool.gateId, new Set());
    }
    this.gateTools.get(tool.gateId)!.add(tool.toolId);
  }

  get(toolId: string): KleinTool | undefined {
    return this.tools.get(toolId);
  }

  getByGate(gateId: number): KleinTool[] {
    const ids = this.gateTools.get(gateId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.tools.get(id)!).filter(Boolean);
  }

  getAll(): KleinTool[] {
    return Array.from(this.tools.values());
  }

  // Initialize default Klein Tools for all 64 gates
  // Each gate gets 1 primary tool based on its hexagram/trigram
  initializeDefaultTools(): void {
    for (let gateId = 1; gateId <= 64; gateId++) {
      const hex = HEXAGRAMS[gateId];
      if (!hex) continue;

      // Primary tool: based on lower trigram (the "root" of the gate)
      const trigram = hex.lowerTrigram;
      const triData = TRIGRAMS[trigram];

      this.register({
        toolId: `gate-${gateId}-primary`,
        name: `${triData.name} Root`,
        gateId,
        trigram,
        decomposable: true,
        relationBias: this.computeRelationBias(trigram),
        intensitySignature: this.computeIntensity(trigram),
        directionTendency: this.computeDirection(trigram)
      });

      // Secondary tool: based on upper trigram (the "crown" of the gate)
      const upperTri = hex.upperTrigram;
      const upperData = TRIGRAMS[upperTri];

      this.register({
        toolId: `gate-${gateId}-secondary`,
        name: `${upperData.name} Crown`,
        gateId,
        trigram: upperTri,
        decomposable: true,
        relationBias: this.computeRelationBias(upperTri) * -1, // inverse
        intensitySignature: this.computeIntensity(upperTri) * 0.8,
        directionTendency: (this.computeDirection(upperTri) + 180) % 360
      });
    }
  }

  private computeRelationBias(trigram: string): number {
    // Based on element: wood=+0.5, fire=+0.3, earth=0, metal=-0.3, water=-0.5
    const element = TRIGRAMS[trigram]?.element || 'earth';
    const map: Record<string, number> = { wood: 0.5, fire: 0.3, earth: 0, metal: -0.3, water: -0.5 };
    return map[element] || 0;
  }

  private computeIntensity(trigram: string): number {
    // Yang lines (1) are more intense than Yin (0)
    const ones = (trigram.match(/1/g) || []).length;
    return ones / 3; // 0, 0.33, 0.67, 1
  }

  private computeDirection(trigram: string): number {
    // Map trigram to compass direction
    const dir = TRIGRAMS[trigram]?.direction || 'center';
    const map: Record<string, number> = {
      east: 90, southeast: 135, south: 180, southwest: 225,
      west: 270, northwest: 315, north: 0, northeast: 45, center: -1
    };
    return map[dir] ?? -1;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 3: CONTEXT EVALUATOR (JOINT EVALUATION ENGINE)
// ─────────────────────────────────────────────────────────────

/**
 * The core engine: evaluates Klein Tools in context.
 * CRITICAL: joint evaluation is NOT the sum of individual evaluations.
 * Two tools evaluated together produce a third quality neither produces alone.
 */
export class ContextEvaluator {
  private registry: KleinToolRegistry;

  constructor(registry: KleinToolRegistry) {
    this.registry = registry;
  }

  /**
   * Evaluate a single tool in isolation (degenerate context).
   * This is the LEAST informative evaluation a tool can have.
   */
  evaluateSingle(toolId: string): KleinToolOutput {
    const tool = this.registry.get(toolId);
    if (!tool) throw new Error(`Unknown Klein Tool: ${toolId}`);

    return {
      relation: this.inferRelation([tool]),
      intensity: tool.intensitySignature,
      direction: this.formatDirection(tool.directionTendency)
    };
  }

  /**
   * JOINT EVALUATION: the heart of the Klein Tool system.
   * Evaluates ALL active tools together, producing an emergent output
   * that is NOT derivable from summing individual outputs.
   */
  evaluateContext(context: KleinToolContext): KleinToolOutput {
    const tools = context.activeToolIds
      .map(id => this.registry.get(id))
      .filter(Boolean) as KleinTool[];

    if (tools.length === 0) {
      return { relation: 'null', intensity: 0, direction: 'none' };
    }

    if (tools.length === 1) {
      return this.evaluateSingle(tools[0].toolId);
    }

    // JOINT EVALUATION: compute emergent quality
    // This is NOT summing individual outputs
    // It is computing a new quality from the interaction
    const relation = this.computeEmergentRelation(tools);
    const intensity = this.computeEmergentIntensity(tools);
    const direction = this.computeEmergentDirection(tools);

    return { relation, intensity, direction };
  }

  /**
   * Compute emergent relation from tool interaction.
   * Uses XNOR-like logic on the trigrams to find the "third quality."
   */
  private computeEmergentRelation(tools: KleinTool[]): string {
    if (tools.length < 2) return this.inferRelation(tools);

    // Pairwise XNOR on trigrams to find emergent quality
    let combinedTrigram = tools[0].trigram;
    for (let i = 1; i < tools.length; i++) {
      combinedTrigram = atoXNOR(combinedTrigram, tools[i].trigram);
    }

    // Map combined trigram to relation type
    const tri = TRIGRAMS[combinedTrigram];
    if (!tri) return 'unknown';

    // Relation depends on element interaction
    const elements = tools.map(t => TRIGRAMS[t.trigram]?.element).filter(Boolean);
    const uniqueElements = [...new Set(elements)];

    if (uniqueElements.length === 1) {
      return `resonant-${tri.element}`; // Same element: resonance
    }
    if (uniqueElements.length === 2) {
      return `transform-${tri.element}`; // Two elements: transformation
    }
    return `complex-${tri.element}`; // Three+ elements: complex emergence
  }

  /**
   * Emergent intensity: NOT the average, but the "field strength"
   * of the interaction. Tools that complement each other amplify.
   */
  private computeEmergentIntensity(tools: KleinTool[]): number {
    if (tools.length === 0) return 0;
    if (tools.length === 1) return tools[0].intensitySignature;

    // Complementary tools (opposite relationBias) amplify
    const biases = tools.map(t => t.relationBias);
    const avgBias = biases.reduce((a, b) => a + b, 0) / biases.length;
    const variance = biases.reduce((sum, b) => sum + Math.pow(b - avgBias, 2), 0) / biases.length;

    // High variance = tension = higher emergent intensity
    const baseIntensity = tools.reduce((sum, t) => sum + t.intensitySignature, 0) / tools.length;
    return Math.min(1, baseIntensity * (1 + variance * 2));
  }

  /**
   * Emergent direction: the vector sum of direction tendencies,
   * but weighted by intensity (stronger tools pull harder).
   */
  private computeEmergentDirection(tools: KleinTool[]): string {
    if (tools.length === 0) return 'none';

    const vectors = tools
      .filter(t => t.directionTendency >= 0)
      .map(t => ({
        x: Math.cos(t.directionTendency * Math.PI / 180) * t.intensitySignature,
        y: Math.sin(t.directionTendency * Math.PI / 180) * t.intensitySignature
      }));

    if (vectors.length === 0) return 'center';

    const sumX = vectors.reduce((s, v) => s + v.x, 0);
    const sumY = vectors.reduce((s, v) => s + v.y, 0);
    const angle = Math.atan2(sumY, sumX) * 180 / Math.PI;
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // Map to cardinal/intercardinal
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(normalizedAngle / 45) % 8;
    return directions[idx];
  }

  private inferRelation(tools: KleinTool[]): string {
    if (tools.length === 0) return 'null';
    const tri = TRIGRAMS[tools[0].trigram];
    return tri ? `singular-${tri.element}` : 'unknown';
  }

  private formatDirection(deg: number): string {
    if (deg < 0) return 'center';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: DECOMPOSITION ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * Decomposes a Klein Tool into sub-tools at finer resolution.
 * Optional — invoked only when finer resolution is explicitly required.
 * No fixed floor: sub-tools can themselves decompose.
 */
export class DecompositionEngine {
  private registry: KleinToolRegistry;

  constructor(registry: KleinToolRegistry) {
    this.registry = registry;
  }

  /**
   * Decompose a Klein Tool into 2-3 sub-tools.
   * Each sub-tool is itself a valid Klein Tool.
   */
  decompose(toolId: string): KleinTool[] {
    const tool = this.registry.get(toolId);
    if (!tool) throw new Error(`Unknown tool: ${toolId}`);
    if (!tool.decomposable) return [tool]; // Cannot decompose

    const trigram = tool.trigram;
    const subTools: KleinTool[] = [];

    // Decompose by line position: each line becomes a sub-tool
    for (let i = 0; i < 3; i++) {
      const line = trigram[i]; // '0' or '1'
      const lineName = line === '1' ? 'Yang' : 'Yin';
      const position = i === 0 ? 'bottom' : i === 1 ? 'middle' : 'top';

      subTools.push({
        toolId: `${toolId}-sub-${i}`,
        name: `${tool.name} — ${position} ${lineName}`,
        gateId: tool.gateId,
        trigram: line.repeat(3), // e.g., '000' for yin, '111' for yang
        decomposable: true, // Can decompose further
        relationBias: line === '1' ? 0.5 : -0.5,
        intensitySignature: tool.intensitySignature * (line === '1' ? 0.7 : 0.3),
        directionTendency: this.subDirection(tool.directionTendency, i)
      });
    }

    return subTools;
  }

  /**
   * Recursive decomposition to specified depth.
   * Depth 0 = no decomposition. Depth 1 = one level, etc.
   */
  decomposeRecursive(toolId: string, depth: number): KleinTool[] {
    if (depth <= 0) {
      const tool = this.registry.get(toolId);
      return tool ? [tool] : [];
    }

    const immediate = this.decompose(toolId);
    const results: KleinTool[] = [];

    for (const sub of immediate) {
      if (sub.decomposable) {
        results.push(...this.decomposeRecursive(sub.toolId, depth - 1));
      } else {
        results.push(sub);
      }
    }

    return results;
  }

  private subDirection(parentDir: number, lineIndex: number): number {
    if (parentDir < 0) return -1;
    // Each line slightly shifts direction
    const shift = (lineIndex - 1) * 15; // -15, 0, +15
    return (parentDir + shift + 360) % 360;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: EVALUATION LEDGER (APPEND-ONLY)
// ─────────────────────────────────────────────────────────────

/**
 * Append-only ledger of all evaluations.
 * Determinism after collapse: same context → same result, logged as new entry.
 */
export class EvaluationLedger {
  private entries: EvaluationResult[] = [];
  private contextIndex: Map<string, EvaluationResult[]> = new Map(); // context hash → entries

  append(result: EvaluationResult): void {
    this.entries.push(result);
    const hash = this.hashContext(result.context);
    if (!this.contextIndex.has(hash)) {
      this.contextIndex.set(hash, []);
    }
    this.contextIndex.get(hash)!.push(result);
  }

  /**
   * Check if a context has been evaluated before.
   * Returns all entries for that exact context.
   */
  lookup(context: KleinToolContext): EvaluationResult[] {
    const hash = this.hashContext(context);
    return this.contextIndex.get(hash) || [];
  }

  /**
   * Has this exact combination been witnessed before?
   */
  hasBeenWitnessed(context: KleinToolContext): boolean {
    return this.lookup(context).length > 0;
  }

  /**
   * Get the most recent evaluation for a context.
   */
  getLatest(context: KleinToolContext): EvaluationResult | undefined {
    const entries = this.lookup(context);
    if (entries.length === 0) return undefined;
    return entries[entries.length - 1];
  }

  /**
   * Classify a new result against prior context.
   * If prior exists and differs by exactly one tool:
   *   - serves trajectory = mutation
   *   - obstructs trajectory = interference
   */
  classifyAgainstPrior(
    context: KleinToolContext,
    result: KleinToolOutput,
    priorContext?: KleinToolContext
  ): 'mutation' | 'interference' | 'neutral' | 'null' {
    if (!priorContext) return 'null';

    const diff = this.contextDiff(context, priorContext);
    if (diff.added.length + diff.removed.length !== 1) return 'null';

    // Compare results: if new intensity > old, it's mutation (serves)
    // if new intensity < old, it's interference (obstructs)
    const priorEntries = this.lookup(priorContext);
    if (priorEntries.length === 0) return 'null';

    const priorResult = priorEntries[priorEntries.length - 1].result;
    if (result.intensity > priorResult.intensity) return 'mutation';
    if (result.intensity < priorResult.intensity) return 'interference';
    return 'neutral';
  }

  getAllEntries(): EvaluationResult[] {
    return [...this.entries];
  }

  private hashContext(context: KleinToolContext): string {
    const sorted = [...context.activeToolIds].sort();
    return `${context.nodeId}::${sorted.join(',')}`;
  }

  private contextDiff(a: KleinToolContext, b: KleinToolContext): { added: string[]; removed: string[] } {
    const setA = new Set(a.activeToolIds);
    const setB = new Set(b.activeToolIds);
    return {
      added: [...setA].filter(x => !setB.has(x)),
      removed: [...setB].filter(x => !setA.has(x))
    };
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 6: FULL KLEIN TOOL SYSTEM (Orchestrator)
// ─────────────────────────────────────────────────────────────

export class KleinToolSystem {
  registry: KleinToolRegistry;
  evaluator: ContextEvaluator;
  decomposer: DecompositionEngine;
  ledger: EvaluationLedger;

  constructor() {
    this.registry = new KleinToolRegistry();
    this.evaluator = new ContextEvaluator(this.registry);
    this.decomposer = new DecompositionEngine(this.registry);
    this.ledger = new EvaluationLedger();
    this.registry.initializeDefaultTools();
  }

  /**
   * Evaluate a node with active tools.
   * Returns the emergent output + logs to ledger.
   */
  evaluateNode(nodeId: string, activeToolIds: string[]): EvaluationResult {
    const context: KleinToolContext = {
      nodeId,
      activeToolIds: [...activeToolIds],
      timestamp: new Date().toISOString()
    };

    // Check if witnessed before
    const prior = this.ledger.getLatest(context);

    // Perform joint evaluation
    const output = this.evaluator.evaluateContext(context);

    // Classify against prior if exists
    const classification = this.ledger.classifyAgainstPrior(context, output, prior?.context);

    const result: EvaluationResult = {
      evaluationId: this.generateUUID(),
      context,
      result: output,
      classification,
      evaluatedAt: new Date().toISOString(),
      contributingTools: [...activeToolIds]
    };

    // Append to ledger (determinism after collapse)
    this.ledger.append(result);

    return result;
  }

  /**
   * Decompose a tool and register sub-tools.
   */
  decomposeAndRegister(toolId: string, depth: number = 1): KleinTool[] {
    const subTools = this.decomposer.decomposeRecursive(toolId, depth);
    for (const tool of subTools) {
      if (!this.registry.get(tool.toolId)) {
        this.registry.register(tool);
      }
    }
    return subTools;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
