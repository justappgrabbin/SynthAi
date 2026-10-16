/**
 * SemNet — Semantic Network engine.
 * Sub-tool 2 of AutoLing (Trigram-level tool).
 *
 * Inspired by Klein's relational calculus and implicit semantic networks (1973–2002).
 * Key Klein principles:
 *   - Semantic units are OBJECTS and RELATIONS
 *   - Objects may be atoms, classes, or contain relational structures
 *   - Relations may be logical operators
 *   - All units carry Boolean feature vectors
 *   - Inheritance is bidirectional (up AND down the network)
 *
 * In the generative hierarchy this operates at Level 4 (Trigram).
 * SemNet provides the knowledge substrate that MorphoAnalyzer and AutoDev draw from.
 */

import { v4 as uuidv4 } from 'uuid';

// ── Relation types (Klein: "relations may be logical operators") ───────────────
export const RELATION_TYPES = {
  // Logical / structural
  IS_A:       { directed: true,  logical: true,  symbol: '⊆' },
  HAS_A:      { directed: true,  logical: true,  symbol: '∋' },
  PART_OF:    { directed: true,  logical: true,  symbol: '∈' },
  CAUSES:     { directed: true,  logical: true,  symbol: '→' },
  ENABLES:    { directed: true,  logical: false, symbol: '⇒' },
  OPPOSES:    { directed: false, logical: false, symbol: '⊥' },
  ANALOGOUS:  { directed: false, logical: false, symbol: '≅' },
  TRANSFORMS: { directed: true,  logical: true,  symbol: '↦' },
  // I Ching specific
  CHANGES_TO: { directed: true,  logical: true,  symbol: '⚡' },
  NUCLEAR_OF: { directed: true,  logical: true,  symbol: '⊙' },
  COMPLEMENTS:{ directed: false, logical: false, symbol: '↔' },
  // Code specific
  CALLS:      { directed: true,  logical: true,  symbol: '()' },
  IMPORTS:    { directed: true,  logical: true,  symbol: '⤵' },
  EXTENDS:    { directed: true,  logical: true,  symbol: '↑' },
  IMPLEMENTS: { directed: true,  logical: true,  symbol: '⊃' },
};

// ── SemNode — an object in the semantic network ───────────────────────────────
class SemNode {
  constructor(id, label, features = {}) {
    this.id = id;
    this.label = label;
    this.features = features; // Boolean feature vector
    this.weight = 1;
    this.createdAt = Date.now();
    this.inheritedFeatures = {}; // accumulated via bidirectional propagation
  }

  featureVector() {
    return { ...this.features, ...this.inheritedFeatures };
  }

  // Analogy score — how similar is this node to another (Klein: analogical reasoning)
  analogyScore(other) {
    const a = this.featureVector();
    const b = other.featureVector();
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let matches = 0;
    keys.forEach(k => {
      if (((a[k] || 0) > 0.5) === ((b[k] || 0) > 0.5)) matches++;
    });
    return matches / keys.size;
  }
}

// ── SemEdge — a relation in the network ──────────────────────────────────────
class SemEdge {
  constructor(sourceId, targetId, type, weight = 1, features = {}) {
    this.id = uuidv4();
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type;
    this.relDef = RELATION_TYPES[type] || { directed: false, logical: false };
    this.weight = weight;
    this.features = features;
    this.activationCount = 0;
  }

  activate() {
    this.activationCount++;
    this.weight = Math.min(3, this.weight + 0.05);
  }
}

// ── SemNet ────────────────────────────────────────────────────────────────────
export class SemNet {
  constructor(id = null) {
    this.id = id || uuidv4();
    this.nodes = new Map();   // id → SemNode
    this.edges = [];          // SemEdge[]
    this.edgeIndex = new Map(); // sourceId → SemEdge[]
    this.learnCount = 0;
    this.level = 4; // Trigram level
    this.originAddress = null;

    this._seedKnowledge();
    console.log(`[SemNet:${this.id.slice(0,8)}] initialized`);
  }

  _seedKnowledge() {
    // Seed with I Ching / HD core ontology
    const seeds = [
      ['hexagram', 'Hexagram', { isConcrete: 1, isHexagram: 1 }],
      ['trigram',  'Trigram',  { isConcrete: 1, isTrigram: 1 }],
      ['line',     'Line',     { isLine: 1 }],
      ['gate',     'Gate (HD)',{ isGate: 1 }],
      ['channel',  'Channel',  { isChannel: 1 }],
      ['yang',     'Yang',     { isYang: 1, isAction: 1 }],
      ['yin',      'Yin',      { isYin: 1, isState: 1 }],
      ['changing', 'Changing Line', { isChanging: 1, isAction: 1 }],
      // Code ontology
      ['function', 'Function', { isFunction: 1, isAction: 1 }],
      ['class',    'Class',    { isClass: 1, hasState: 1 }],
      ['event',    'Event',    { emitsEvent: 1, isAction: 1 }],
      ['stream',   'Stream',   { isGenerator: 1, hasState: 1 }],
      ['grammar',  'Grammar',  { isAbstract: 1 }],
      ['morpheme', 'Morpheme', { isConcrete: 1 }],
      // NL ontology
      ['noun',    'Noun',   { isNoun: 1, isConcrete: 1 }],
      ['verb',    'Verb',   { isVerb: 1, isAction: 1 }],
      ['concept', 'Concept',{ isAbstract: 1 }],
    ];
    seeds.forEach(([id, label, features]) => this.addNode(id, label, features));

    // Seed structural relations
    this.addEdge('trigram',  'hexagram', 'PART_OF', 1.5);
    this.addEdge('line',     'trigram',  'PART_OF', 1.5);
    this.addEdge('gate',     'hexagram', 'IS_A',    1.5);
    this.addEdge('channel',  'gate',     'HAS_A',   1.5);
    this.addEdge('yang',     'yin',      'OPPOSES', 1.5);
    this.addEdge('changing', 'line',     'IS_A',    1.5);
    this.addEdge('morpheme', 'grammar',  'PART_OF', 1.5);
    this.addEdge('function', 'class',    'PART_OF', 1);
  }

  addNode(id, label, features = {}) {
    const node = new SemNode(id, label, features);
    this.nodes.set(id, node);
    return node;
  }

  addEdge(sourceId, targetId, type = 'IS_A', weight = 1, features = {}) {
    const edge = new SemEdge(sourceId, targetId, type, weight, features);
    this.edges.push(edge);
    if (!this.edgeIndex.has(sourceId)) this.edgeIndex.set(sourceId, []);
    this.edgeIndex.get(sourceId).push(edge);

    // Bidirectional feature inheritance (Klein: "inheritance of features is bi-directional")
    this._propagateFeatures(sourceId, targetId, type);

    return edge;
  }

  _propagateFeatures(sourceId, targetId, type) {
    const src = this.nodes.get(sourceId);
    const tgt = this.nodes.get(targetId);
    if (!src || !tgt) return;
    const relDef = RELATION_TYPES[type] || {};

    if (relDef.logical) {
      // Downward: target inherits from source
      Object.entries(src.features).forEach(([k, v]) => {
        tgt.inheritedFeatures[k] = Math.max(tgt.inheritedFeatures[k] || 0, v * 0.7);
      });
      // Upward: source inherits from target (bidirectional)
      Object.entries(tgt.features).forEach(([k, v]) => {
        src.inheritedFeatures[k] = Math.max(src.inheritedFeatures[k] || 0, v * 0.5);
      });
    }
  }

  /**
   * Learn from text or code — extract subject-relation-object triples.
   */
  learn(tokens, language = 'english') {
    this.learnCount++;
    let newNodes = 0, newEdges = 0;

    // Simple co-occurrence learning: adjacent tokens create ANALOGOUS relations
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i], b = tokens[i + 1];
      if (!a || !b || a.length < 2 || b.length < 2) continue;

      // Add nodes if new
      if (!this.nodes.has(a)) { this.addNode(a, a, { learned: 1 }); newNodes++; }
      if (!this.nodes.has(b)) { this.addNode(b, b, { learned: 1 }); newNodes++; }

      // Determine relation type from context
      const relType = this._inferRelation(a, b, language);
      const existing = (this.edgeIndex.get(a) || []).find(
        e => e.targetId === b && e.type === relType
      );
      if (existing) {
        existing.activate();
      } else {
        this.addEdge(a, b, relType, 0.5, { learned: 1 });
        newEdges++;
      }
    }

    return { learnCount: this.learnCount, nodes: this.nodes.size, edges: this.edges.length, newNodes, newEdges };
  }

  _inferRelation(a, b, language) {
    // Code-aware relation inference
    if (/^(extends|inherits|class)$/.test(a)) return 'EXTENDS';
    if (/^(import|require)$/.test(a))          return 'IMPORTS';
    if (/^(implements|interface)$/.test(a))    return 'IMPLEMENTS';
    if (/^(calls?|invokes?)$/.test(a))         return 'CALLS';
    if (/^(causes?|leads?)$/.test(a))          return 'CAUSES';
    if (/^(is|are|was|were)$/.test(a))         return 'IS_A';
    if (/^(has|have|contains?)$/.test(a))      return 'HAS_A';
    if (/^(transforms?|changes?|becomes?)$/.test(a)) return 'TRANSFORMS';
    return 'ANALOGOUS';
  }

  /**
   * Find analogies — given a node, find the top-N most analogous nodes.
   * Klein's analogical reasoning: the engine of creativity.
   */
  findAnalogies(nodeId, topN = 5) {
    const target = this.nodes.get(nodeId);
    if (!target) return [];
    return [...this.nodes.values()]
      .filter(n => n.id !== nodeId)
      .map(n => ({ node: n, score: target.analogyScore(n) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Traverse from a node following activated edges — returns reachable subgraph.
   */
  traverse(startId, depth = 2, relationFilter = null) {
    const visited = new Map([[startId, 0]]);
    const queue = [startId];
    const subgraph = { nodes: [], edges: [] };

    while (queue.length > 0) {
      const curr = queue.shift();
      const currDepth = visited.get(curr);
      const node = this.nodes.get(curr);
      if (node) subgraph.nodes.push(node);
      if (currDepth >= depth) continue;

      (this.edgeIndex.get(curr) || []).forEach(edge => {
        if (relationFilter && edge.type !== relationFilter) return;
        if (!visited.has(edge.targetId)) {
          visited.set(edge.targetId, currDepth + 1);
          queue.push(edge.targetId);
          subgraph.edges.push(edge);
        }
      });
    }
    return subgraph;
  }

  /**
   * Generate a semantic description by traversing from a concept.
   * Klein: "script-like world knowledge rules encoded in the same notation"
   */
  generateDescription(startId) {
    const subgraph = this.traverse(startId, 2);
    const sentences = subgraph.edges.slice(0, 5).map(e => {
      const src = this.nodes.get(e.sourceId);
      const tgt = this.nodes.get(e.targetId);
      const rel = RELATION_TYPES[e.type];
      if (!src || !tgt) return '';
      return `${src.label} ${rel?.symbol || e.type} ${tgt.label}`;
    });
    return sentences.filter(Boolean).join('; ');
  }

  receiveFromMesh(data) {
    if (!data.nodes) return;
    data.nodes.forEach(([id, label, features]) => {
      if (!this.nodes.has(id)) this.addNode(id, label, features);
      else {
        const n = this.nodes.get(id);
        Object.assign(n.features, features);
      }
    });
    (data.edges || []).forEach(([srcId, tgtId, type, weight]) => {
      const existing = (this.edgeIndex.get(srcId) || []).find(
        e => e.targetId === tgtId && e.type === type
      );
      if (!existing) this.addEdge(srcId, tgtId, type, weight);
      else existing.weight = Math.max(existing.weight, weight);
    });
  }

  toMeshPayload() {
    const topNodes = [...this.nodes.values()]
      .sort((a, b) => b.weight - a.weight).slice(0, 30);
    const topEdges = this.edges
      .sort((a, b) => b.weight - a.weight).slice(0, 50);
    return {
      type: 'semnet_update',
      id: this.id,
      nodes: topNodes.map(n => [n.id, n.label, n.features]),
      edges: topEdges.map(e => [e.sourceId, e.targetId, e.type, e.weight]),
    };
  }

  toJSON() {
    return {
      id: this.id,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      learnCount: this.learnCount,
      level: this.level,
      originAddress: this.originAddress,
      topNodes: [...this.nodes.values()]
        .sort((a, b) => b.weight - a.weight).slice(0, 10)
        .map(n => ({ id: n.id, label: n.label, weight: n.weight })),
    };
  }
}
