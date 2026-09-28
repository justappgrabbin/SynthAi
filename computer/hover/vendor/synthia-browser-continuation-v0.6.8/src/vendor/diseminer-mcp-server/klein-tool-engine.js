import { atoXNOR, TRIGRAMS, HEXAGRAMS } from "./ato-engine.js";
class KleinToolRegistry {
  tools = /* @__PURE__ */ new Map();
  gateTools = /* @__PURE__ */ new Map();
  register(tool) {
    this.tools.set(tool.toolId, tool);
    if (!this.gateTools.has(tool.gateId)) {
      this.gateTools.set(tool.gateId, /* @__PURE__ */ new Set());
    }
    this.gateTools.get(tool.gateId).add(tool.toolId);
  }
  get(toolId) {
    return this.tools.get(toolId);
  }
  getByGate(gateId) {
    const ids = this.gateTools.get(gateId);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.tools.get(id)).filter(Boolean);
  }
  getAll() {
    return Array.from(this.tools.values());
  }
  // Initialize default Klein Tools for all 64 gates
  // Each gate gets 1 primary tool based on its hexagram/trigram
  initializeDefaultTools() {
    for (let gateId = 1; gateId <= 64; gateId++) {
      const hex = HEXAGRAMS[gateId];
      if (!hex) continue;
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
      const upperTri = hex.upperTrigram;
      const upperData = TRIGRAMS[upperTri];
      this.register({
        toolId: `gate-${gateId}-secondary`,
        name: `${upperData.name} Crown`,
        gateId,
        trigram: upperTri,
        decomposable: true,
        relationBias: this.computeRelationBias(upperTri) * -1,
        // inverse
        intensitySignature: this.computeIntensity(upperTri) * 0.8,
        directionTendency: (this.computeDirection(upperTri) + 180) % 360
      });
    }
  }
  computeRelationBias(trigram) {
    const element = TRIGRAMS[trigram]?.element || "earth";
    const map = { wood: 0.5, fire: 0.3, earth: 0, metal: -0.3, water: -0.5 };
    return map[element] || 0;
  }
  computeIntensity(trigram) {
    const ones = (trigram.match(/1/g) || []).length;
    return ones / 3;
  }
  computeDirection(trigram) {
    const dir = TRIGRAMS[trigram]?.direction || "center";
    const map = {
      east: 90,
      southeast: 135,
      south: 180,
      southwest: 225,
      west: 270,
      northwest: 315,
      north: 0,
      northeast: 45,
      center: -1
    };
    return map[dir] ?? -1;
  }
}
class ContextEvaluator {
  registry;
  constructor(registry) {
    this.registry = registry;
  }
  /**
   * Evaluate a single tool in isolation (degenerate context).
   * This is the LEAST informative evaluation a tool can have.
   */
  evaluateSingle(toolId) {
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
  evaluateContext(context) {
    const tools = context.activeToolIds.map((id) => this.registry.get(id)).filter(Boolean);
    if (tools.length === 0) {
      return { relation: "null", intensity: 0, direction: "none" };
    }
    if (tools.length === 1) {
      return this.evaluateSingle(tools[0].toolId);
    }
    const relation = this.computeEmergentRelation(tools);
    const intensity = this.computeEmergentIntensity(tools);
    const direction = this.computeEmergentDirection(tools);
    return { relation, intensity, direction };
  }
  /**
   * Compute emergent relation from tool interaction.
   * Uses XNOR-like logic on the trigrams to find the "third quality."
   */
  computeEmergentRelation(tools) {
    if (tools.length < 2) return this.inferRelation(tools);
    let combinedTrigram = tools[0].trigram;
    for (let i = 1; i < tools.length; i++) {
      combinedTrigram = atoXNOR(combinedTrigram, tools[i].trigram);
    }
    const tri = TRIGRAMS[combinedTrigram];
    if (!tri) return "unknown";
    const elements = tools.map((t) => TRIGRAMS[t.trigram]?.element).filter(Boolean);
    const uniqueElements = [...new Set(elements)];
    if (uniqueElements.length === 1) {
      return `resonant-${tri.element}`;
    }
    if (uniqueElements.length === 2) {
      return `transform-${tri.element}`;
    }
    return `complex-${tri.element}`;
  }
  /**
   * Emergent intensity: NOT the average, but the "field strength"
   * of the interaction. Tools that complement each other amplify.
   */
  computeEmergentIntensity(tools) {
    if (tools.length === 0) return 0;
    if (tools.length === 1) return tools[0].intensitySignature;
    const biases = tools.map((t) => t.relationBias);
    const avgBias = biases.reduce((a, b) => a + b, 0) / biases.length;
    const variance = biases.reduce((sum, b) => sum + Math.pow(b - avgBias, 2), 0) / biases.length;
    const baseIntensity = tools.reduce((sum, t) => sum + t.intensitySignature, 0) / tools.length;
    return Math.min(1, baseIntensity * (1 + variance * 2));
  }
  /**
   * Emergent direction: the vector sum of direction tendencies,
   * but weighted by intensity (stronger tools pull harder).
   */
  computeEmergentDirection(tools) {
    if (tools.length === 0) return "none";
    const vectors = tools.filter((t) => t.directionTendency >= 0).map((t) => ({
      x: Math.cos(t.directionTendency * Math.PI / 180) * t.intensitySignature,
      y: Math.sin(t.directionTendency * Math.PI / 180) * t.intensitySignature
    }));
    if (vectors.length === 0) return "center";
    const sumX = vectors.reduce((s, v) => s + v.x, 0);
    const sumY = vectors.reduce((s, v) => s + v.y, 0);
    const angle = Math.atan2(sumY, sumX) * 180 / Math.PI;
    const normalizedAngle = (angle % 360 + 360) % 360;
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.round(normalizedAngle / 45) % 8;
    return directions[idx];
  }
  inferRelation(tools) {
    if (tools.length === 0) return "null";
    const tri = TRIGRAMS[tools[0].trigram];
    return tri ? `singular-${tri.element}` : "unknown";
  }
  formatDirection(deg) {
    if (deg < 0) return "center";
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  }
}
class DecompositionEngine {
  registry;
  constructor(registry) {
    this.registry = registry;
  }
  /**
   * Decompose a Klein Tool into 2-3 sub-tools.
   * Each sub-tool is itself a valid Klein Tool.
   */
  decompose(toolId) {
    const tool = this.registry.get(toolId);
    if (!tool) throw new Error(`Unknown tool: ${toolId}`);
    if (!tool.decomposable) return [tool];
    const trigram = tool.trigram;
    const subTools = [];
    for (let i = 0; i < 3; i++) {
      const line = trigram[i];
      const lineName = line === "1" ? "Yang" : "Yin";
      const position = i === 0 ? "bottom" : i === 1 ? "middle" : "top";
      subTools.push({
        toolId: `${toolId}-sub-${i}`,
        name: `${tool.name} \u2014 ${position} ${lineName}`,
        gateId: tool.gateId,
        trigram: line.repeat(3),
        // e.g., '000' for yin, '111' for yang
        decomposable: true,
        // Can decompose further
        relationBias: line === "1" ? 0.5 : -0.5,
        intensitySignature: tool.intensitySignature * (line === "1" ? 0.7 : 0.3),
        directionTendency: this.subDirection(tool.directionTendency, i)
      });
    }
    return subTools;
  }
  /**
   * Recursive decomposition to specified depth.
   * Depth 0 = no decomposition. Depth 1 = one level, etc.
   */
  decomposeRecursive(toolId, depth) {
    if (depth <= 0) {
      const tool = this.registry.get(toolId);
      return tool ? [tool] : [];
    }
    const immediate = this.decompose(toolId);
    const results = [];
    for (const sub of immediate) {
      if (sub.decomposable) {
        results.push(...this.decomposeRecursive(sub.toolId, depth - 1));
      } else {
        results.push(sub);
      }
    }
    return results;
  }
  subDirection(parentDir, lineIndex) {
    if (parentDir < 0) return -1;
    const shift = (lineIndex - 1) * 15;
    return (parentDir + shift + 360) % 360;
  }
}
class EvaluationLedger {
  entries = [];
  contextIndex = /* @__PURE__ */ new Map();
  // context hash → entries
  append(result) {
    this.entries.push(result);
    const hash = this.hashContext(result.context);
    if (!this.contextIndex.has(hash)) {
      this.contextIndex.set(hash, []);
    }
    this.contextIndex.get(hash).push(result);
  }
  /**
   * Check if a context has been evaluated before.
   * Returns all entries for that exact context.
   */
  lookup(context) {
    const hash = this.hashContext(context);
    return this.contextIndex.get(hash) || [];
  }
  /**
   * Has this exact combination been witnessed before?
   */
  hasBeenWitnessed(context) {
    return this.lookup(context).length > 0;
  }
  /**
   * Get the most recent evaluation for a context.
   */
  getLatest(context) {
    const entries = this.lookup(context);
    if (entries.length === 0) return void 0;
    return entries[entries.length - 1];
  }
  /**
   * Classify a new result against prior context.
   * If prior exists and differs by exactly one tool:
   *   - serves trajectory = mutation
   *   - obstructs trajectory = interference
   */
  classifyAgainstPrior(context, result, priorContext) {
    if (!priorContext) return "null";
    const diff = this.contextDiff(context, priorContext);
    if (diff.added.length + diff.removed.length !== 1) return "null";
    const priorEntries = this.lookup(priorContext);
    if (priorEntries.length === 0) return "null";
    const priorResult = priorEntries[priorEntries.length - 1].result;
    if (result.intensity > priorResult.intensity) return "mutation";
    if (result.intensity < priorResult.intensity) return "interference";
    return "neutral";
  }
  getAllEntries() {
    return [...this.entries];
  }
  hashContext(context) {
    const sorted = [...context.activeToolIds].sort();
    return `${context.nodeId}::${sorted.join(",")}`;
  }
  contextDiff(a, b) {
    const setA = new Set(a.activeToolIds);
    const setB = new Set(b.activeToolIds);
    return {
      added: [...setA].filter((x) => !setB.has(x)),
      removed: [...setB].filter((x) => !setA.has(x))
    };
  }
}
class KleinToolSystem {
  registry;
  evaluator;
  decomposer;
  ledger;
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
  evaluateNode(nodeId, activeToolIds) {
    const context = {
      nodeId,
      activeToolIds: [...activeToolIds],
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const prior = this.ledger.getLatest(context);
    const output = this.evaluator.evaluateContext(context);
    const classification = this.ledger.classifyAgainstPrior(context, output, prior?.context);
    const result = {
      evaluationId: this.generateUUID(),
      context,
      result: output,
      classification,
      evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      contributingTools: [...activeToolIds]
    };
    this.ledger.append(result);
    return result;
  }
  /**
   * Decompose a tool and register sub-tools.
   */
  decomposeAndRegister(toolId, depth = 1) {
    const subTools = this.decomposer.decomposeRecursive(toolId, depth);
    for (const tool of subTools) {
      if (!this.registry.get(tool.toolId)) {
        this.registry.register(tool);
      }
    }
    return subTools;
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
}
export {
  ContextEvaluator,
  DecompositionEngine,
  EvaluationLedger,
  KleinToolRegistry,
  KleinToolSystem
};
