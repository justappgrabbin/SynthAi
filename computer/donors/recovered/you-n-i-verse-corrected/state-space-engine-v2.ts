/**
 * YOU-N-I-VERSE STATE SPACE MODEL v2 — CORRECTED
 * 
 * Architecture: Nested graph structure with sequential dimensional operators
 * 
 * Core principle: The 5 dimensions are NOT parallel amplitudes.
 * They are SEQUENTIAL TRANSFORMATIONS:
 *   Movement → Evolution → Being → Design → Space
 * 
 * Each dimension is an operator: f(state) → new_state
 * The full pipeline: Space(Design(Being(Evolution(Movement(state)))))
 * 
 * State is a GRAPH, not a flat vector.
 * Each node carries its own nested coordinate structure.
 * Planets, zodiac, houses are CONTEXTUAL attributes of nodes, not global banks.
 * 
 * NO external dependencies. NO precomputed lookup tables.
 * Semantics are GENERATED through transformations and relational edges.
 * 
 * State Space Definition:
 *   S = { nodes, edges, dimensions, coherence }
 *   nodes: Array<Node>
 *   edges: Array<Edge>
 *   dimensions: { Movement, Evolution, Being, Design, Space } — each is an operator
 *   coherence: number — emergent property of the graph
 * 
 * Node = {
 *   id: string
 *   gate: number (1-64)
 *   line: number (1-6)
 *   color: number (1-6)
 *   tone: number (1-6)
 *   base: number (1-6)
 *   degree: number (0-360)
 *   minute: number (0-60)
 *   second: number (0-60)
 *   axis: string
 *   zodiac: string — contextual, not global
 *   house: number — contextual, not global
 *   planet: string — contextual, not global
 *   dimension: Dimension — which operator created this node
 *   amplitude: number (0-1)
 *   phase: number (0-2π)
 *   children: Node[]
 *   parent: Node | null
 * }
 * 
 * Edge = {
 *   from: Node
 *   to: Node
 *   weight: number — resonance/coupling strength
 *   type: 'channel' | 'harmonic' | 'transit' | 'dimensional'
 *   coherence: number — edge-specific coherence
 * }
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type Dimension = 'Movement' | 'Evolution' | 'Being' | 'Design' | 'Space';

export interface Node {
  id: string;
  gate: number;      // 1-64
  line: number;      // 1-6
  color: number;     // 1-6
  tone: number;      // 1-6
  base: number;      // 1-6
  degree: number;    // 0-360
  minute: number;    // 0-60
  second: number;    // 0-60 (standard second)
  arcSecond: number;  // 0-99 (arcsecond, finer precision)
  axis: string;
  zodiac: string;    // contextual astrological sign
  house: number;     // contextual house (1-12)
  planet: string;    // contextual planetary ruler
  dimension: Dimension; // which operator created this node
  amplitude: number;  // 0-1 activation level
  phase: number;     // 0-2π
  children: Node[];
  parent: Node | null;
  timestamp: number;
}

export interface Edge {
  from: string;      // node id
  to: string;        // node id
  weight: number;    // -1 to 1 (negative = destructive interference)
  type: 'channel' | 'harmonic' | 'transit' | 'dimensional' | 'feedback';
  coherence: number; // 0-1
}

export interface StateSpace {
  nodes: Map<string, Node>;
  edges: Edge[];
  dimensions: Record<Dimension, DimensionOperator>;
  coherence: number;
  timestamp: number;
  history: StateSnapshot[];
}

export interface StateSnapshot {
  nodes: Node[];
  edges: Edge[];
  coherence: number;
  timestamp: number;
}

// ============================================================================
// DIMENSIONAL OPERATORS
// ============================================================================

/**
 * Each dimension is an operator: f(state) → new_state
 * 
 * Movement:   Creates impulse. Seeds the state with initial energy.
 * Evolution:    Applies polarity. Splits state into positive/negative components.
 * Being:        Creates witness. The node where the universe becomes self-measuring.
 * Design:       Adds context. Embeds the node in relational structure.
 * Space:        Generates meaning. Emergent closure from the full pipeline.
 */

export interface DimensionOperator {
  name: Dimension;
  keynote: string;
  element: string;
  apply: (node: Node, state: StateSpace) => Node;
}

export const MovementOperator: DimensionOperator = {
  name: 'Movement',
  keynote: 'I Define',
  element: 'Fire',

  apply(node: Node, state: StateSpace): Node {
    // Movement creates impulse.
    // It sets the initial amplitude and phase of the node.
    // The gate number determines the impulse frequency.
    // The line determines the impulse waveform.

    const impulseFrequency = node.gate / 64;  // 0.015 to 1.0
    const impulseWaveform = Math.sin(node.line * Math.PI / 6);  // 6 line phases

    return {
      ...node,
      amplitude: impulseFrequency * 0.5 + 0.5,  // Map to 0.5-1.0
      phase: impulseWaveform * Math.PI,
      dimension: 'Movement',
      children: []
    };
  }
};

export const EvolutionOperator: DimensionOperator = {
  name: 'Evolution',
  keynote: 'I Remember',
  element: 'Water',

  apply(node: Node, state: StateSpace): Node {
    // Evolution applies polarity.
    // It splits the impulse into positive (exaltation) and negative (detriment) components.
    // The color determines the polarity ratio.
    // The tone determines the polarity frequency.

    const polarityRatio = node.color / 6;  // 1/6 to 1
    const polarityFrequency = node.tone / 6;  // 1/6 to 1

    // Exaltation = positive component
    const exaltation = node.amplitude * polarityRatio;
    // Detriment = negative component  
    const detriment = node.amplitude * (1 - polarityRatio);

    // The evolved amplitude is the interference pattern
    const evolvedAmplitude = Math.sqrt(exaltation**2 + detriment**2 + 
      2 * exaltation * detriment * Math.cos(polarityFrequency * Math.PI));

    return {
      ...node,
      amplitude: Math.min(1, evolvedAmplitude),
      phase: node.phase + polarityFrequency * Math.PI,
      dimension: 'Evolution',
      children: [{
        ...node,
        id: `${node.id}_exaltation`,
        amplitude: exaltation,
        phase: node.phase,
        dimension: 'Movement',
        parent: node,
        children: []
      }, {
        ...node,
        id: `${node.id}_detriment`,
        amplitude: detriment,
        phase: node.phase + Math.PI,
        dimension: 'Movement',
        parent: node,
        children: []
      }]
    };
  }
};

export const BeingOperator: DimensionOperator = {
  name: 'Being',
  keynote: 'I Am',
  element: 'Earth',

  apply(node: Node, state: StateSpace): Node {
    // Being creates witness.
    // This is the D3 hinge where the universe becomes locally self-measuring.
    // The base determines the witness perspective.
    // The node becomes aware of its own existence in the graph.

    const witnessPerspective = node.base / 6;  // 1/6 to 1

    // The witness amplitude is the self-interference of the node
    // A node witnessing itself creates a standing wave
    const selfInterference = node.amplitude * Math.cos(node.phase);

    // The witness creates a child node that observes the parent
    const witnessNode: Node = {
      ...node,
      id: `${node.id}_witness`,
      amplitude: Math.abs(selfInterference),
      phase: node.phase + Math.PI / 2,  // Quadrature phase
      dimension: 'Being',
      parent: node,
      children: []
    };

    // Connect witness to parent via feedback edge
    state.edges.push({
      from: witnessNode.id,
      to: node.id,
      weight: witnessPerspective,
      type: 'feedback',
      coherence: Math.abs(selfInterference)
    });

    return {
      ...node,
      amplitude: Math.abs(selfInterference),
      phase: node.phase * witnessPerspective,
      dimension: 'Being',
      children: [witnessNode, ...node.children]
    };
  }
};

export const DesignOperator: DimensionOperator = {
  name: 'Design',
  keynote: 'I Design',
  element: 'Air',

  apply(node: Node, state: StateSpace): Node {
    // Design adds context.
    // It embeds the node in relational structure by creating edges to other nodes.
    // The zodiac and house are CONTEXTUAL attributes determined by the node's position in the graph.
    // The planet is determined by the node's gate and line.

    // Find harmonic partners (nodes with harmonic gates)
    const harmonicGate = ((node.gate + 31) % 64) || 64;
    const harmonicPartners = Array.from(state.nodes.values())
      .filter(n => n.gate === harmonicGate && n.id !== node.id);

    // Create edges to harmonic partners
    for (const partner of harmonicPartners) {
      const edgeWeight = node.amplitude * partner.amplitude * 
        Math.cos(node.phase - partner.phase);

      state.edges.push({
        from: node.id,
        to: partner.id,
        weight: edgeWeight,
        type: 'harmonic',
        coherence: Math.abs(edgeWeight)
      });
    }

    // Contextual zodiac: determined by the node's phase
    const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const zodiacIndex = Math.floor((node.phase / (2 * Math.PI)) * 12) % 12;

    // Contextual house: determined by the node's line
    const house = node.line;

    // Contextual planet: determined by the node's gate
    const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 
                     'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node', 'Earth'];
    const planetIndex = (node.gate - 1) % 13;

    return {
      ...node,
      zodiac: zodiacSigns[zodiacIndex],
      house,
      planet: planets[planetIndex],
      degree: (node.phase / (2 * Math.PI)) * 360,
      dimension: 'Design',
      children: [...node.children]
    };
  }
};

export const SpaceOperator: DimensionOperator = {
  name: 'Space',
  keynote: 'I Think',
  element: 'Ether',

  apply(node: Node, state: StateSpace): Node {
    // Space generates meaning.
    // This is emergent closure from the full pipeline.
    // The meaning is the interference pattern of all edges connected to this node.

    // Collect all edges connected to this node
    const connectedEdges = state.edges.filter(e => e.from === node.id || e.to === node.id);

    // Calculate emergent meaning as weighted sum of edge coherences
    let emergentMeaning = 0;
    let totalWeight = 0;

    for (const edge of connectedEdges) {
      emergentMeaning += edge.coherence * edge.weight;
      totalWeight += Math.abs(edge.weight);
    }

    const normalizedMeaning = totalWeight > 0 ? emergentMeaning / totalWeight : 0;

    // The meaning becomes the node's final amplitude
    // This is the closure: the node now carries its meaning as its amplitude
    const finalAmplitude = Math.abs(normalizedMeaning) * node.amplitude;

    // Create a meaning child node that captures the emergent property
    const meaningNode: Node = {
      ...node,
      id: `${node.id}_meaning`,
      amplitude: finalAmplitude,
      phase: 0,  // Meaning has no phase — it's the scalar closure
      dimension: 'Space',
      parent: node,
      children: []
    };

    return {
      ...node,
      amplitude: finalAmplitude,
      phase: 0,
      dimension: 'Space',
      children: [meaningNode, ...node.children]
    };
  }
};

// ============================================================================
// STATE SPACE ENGINE
// ============================================================================

export class StateSpaceEngine {
  private state: StateSpace;
  private operators: Record<Dimension, DimensionOperator>;
  private nodeCounter: number;

  constructor() {
    this.nodeCounter = 0;
    this.operators = {
      Movement: MovementOperator,
      Evolution: EvolutionOperator,
      Being: BeingOperator,
      Design: DesignOperator,
      Space: SpaceOperator
    };

    this.state = {
      nodes: new Map(),
      edges: [],
      dimensions: this.operators,
      coherence: 0,
      timestamp: Date.now(),
      history: []
    };
  }

  /**
   * Create a new node from raw coordinates.
   * Coordinates: Gate.Line.Color.Tone.Base
   */
  createNode(gate: number, line: number, color: number, tone: number, base: number, degree: number = 0, minute: number = 0, second: number = 0, arcSecond: number = 0): Node {
    const id = `node_${++this.nodeCounter}`;
    return {
      id,
      gate: Math.max(1, Math.min(64, gate)),
      line: Math.max(1, Math.min(6, line)),
      color: Math.max(1, Math.min(6, color)),
      tone: Math.max(1, Math.min(6, tone)),
      base: Math.max(1, Math.min(5, base)),  // FIXED: 5 bases (1-5), was clamped to 6
      degree: Math.max(0, Math.min(360, degree)),
      minute: Math.max(0, Math.min(60, minute)),
      second: Math.max(0, Math.min(60, second)),  // FIXED: was `Math.min(99, second)` with undefined `second` (ReferenceError) + duplicate key
      arcSecond: Math.max(0, Math.min(99, arcSecond)),
      axis: '',
      zodiac: '',
      house: 0,
      planet: '',
      dimension: 'Movement',
      amplitude: 0,
      phase: 0,
      children: [],
      parent: null,
      timestamp: Date.now()
    };
  }

  /**
   * Parse coordinate string: "Gate.Line.Color.Tone.Base" or "25.1.3.5.2"
   */
  parseCoordinate(coord: string): Node {
    // Parse: "Gate.Line.Color.Tone.Base°Degree′Minute″Second‴ArcSecond"
    // Example: "25.1.3.5.2°15′30″45‴78"
    // Where: ° = degree (0-360), ′ = minute (0-60), ″ = second (0-60), ‴ = arcSecond (0-99)

    const degMatch = coord.match(/°(\d+)/);
    const minMatch = coord.match(/′(\d+)/);
    const secMatch = coord.match(/″(\d+)/);
    const arcSecMatch = coord.match(/‴(\d+)/);

    const degree = degMatch ? parseInt(degMatch[1]) : 0;
    const minute = minMatch ? parseInt(minMatch[1]) : 0;
    const second = secMatch ? parseInt(secMatch[1]) : 0;
    const arcSecond = arcSecMatch ? parseInt(arcSecMatch[1]) : 0;

    // Remove all angular markers and split by dot/space
    const cleanCoord = coord
      .replace(/°\d+/, '')
      .replace(/′\d+/, '')
      .replace(/″\d+/, '')
      .replace(/‴\d+/, '');
    const parts = cleanCoord.split(/[.\s]+/).map(Number).filter(n => !isNaN(n));

    return this.createNode(
      parts[0] || 1,
      parts[1] || 1,
      parts[2] || 1,
      parts[3] || 1,
      parts[4] || 1,
      degree,
      minute,
      second,
      arcSecond
    );
  }

  /**
   * Apply the FULL dimensional pipeline to a node.
   * Movement → Evolution → Being → Design → Space
   */
  applyPipeline(node: Node): Node {
    // Save snapshot before transformation
    this.saveSnapshot();

    // Step 1: Movement — create impulse
    let current = this.operators.Movement.apply(node, this.state);
    this.state.nodes.set(current.id, current);

    // Step 2: Evolution — apply polarity
    current = this.operators.Evolution.apply(current, this.state);
    this.state.nodes.set(current.id, current);
    for (const child of current.children) {
      this.state.nodes.set(child.id, child);
    }

    // Step 3: Being — create witness
    current = this.operators.Being.apply(current, this.state);
    this.state.nodes.set(current.id, current);
    for (const child of current.children) {
      this.state.nodes.set(child.id, child);
    }

    // Step 4: Design — add context
    current = this.operators.Design.apply(current, this.state);
    this.state.nodes.set(current.id, current);

    // Step 5: Space — generate meaning
    current = this.operators.Space.apply(current, this.state);
    this.state.nodes.set(current.id, current);
    for (const child of current.children) {
      this.state.nodes.set(child.id, child);
    }

    // Recalculate global coherence
    this.state.coherence = this.calculateCoherence();
    this.state.timestamp = Date.now();

    return current;
  }

  /**
   * Apply a SINGLE dimension operator to a node.
   */
  applyDimension(node: Node, dimension: Dimension): Node {
    this.saveSnapshot();
    const operator = this.operators[dimension];
    const result = operator.apply(node, this.state);
    this.state.nodes.set(result.id, result);
    this.state.coherence = this.calculateCoherence();
    this.state.timestamp = Date.now();
    return result;
  }

  /**
   * Calculate global coherence from the graph structure.
   * Coherence = average edge weight magnitude, weighted by edge coherence.
   */
  calculateCoherence(): number {
    if (this.state.edges.length === 0) return 0;

    let totalCoherence = 0;
    let totalWeight = 0;

    for (const edge of this.state.edges) {
      totalCoherence += edge.coherence * Math.abs(edge.weight);
      totalWeight += Math.abs(edge.weight);
    }

    return totalWeight > 0 ? totalCoherence / totalWeight : 0;
  }

  /**
   * Propagate state through time.
   * Each timestep: all nodes evolve, edges update, new edges may form.
   */
  step(): StateSpace {
    this.saveSnapshot();

    // Update all node amplitudes (decay + excitation from edges)
    for (const node of this.state.nodes.values()) {
      // Decay
      node.amplitude *= 0.95;

      // Excitation from incoming edges
      const incomingEdges = this.state.edges.filter(e => e.to === node.id);
      for (const edge of incomingEdges) {
        node.amplitude += edge.weight * edge.coherence * 0.1;
      }

      // Clamp
      node.amplitude = Math.max(0, Math.min(1, node.amplitude));

      // Phase evolution
      node.phase += 0.01 * node.amplitude;
      node.phase = node.phase % (2 * Math.PI);
    }

    // Update edge weights based on node coherence
    for (const edge of this.state.edges) {
      const fromNode = this.state.nodes.get(edge.from);
      const toNode = this.state.nodes.get(edge.to);
      if (fromNode && toNode) {
        edge.coherence = Math.abs(Math.cos(fromNode.phase - toNode.phase));
        edge.weight = fromNode.amplitude * toNode.amplitude * edge.coherence;
      }
    }

    // Remove weak edges
    this.state.edges = this.state.edges.filter(e => Math.abs(e.weight) > 0.01);

    // Recalculate coherence
    this.state.coherence = this.calculateCoherence();
    this.state.timestamp = Date.now();

    return this.state;
  }

  /**
   * Run simulation for N timesteps.
   */
  simulate(steps: number): StateSnapshot[] {
    const snapshots: StateSnapshot[] = [];
    for (let i = 0; i < steps; i++) {
      this.step();
      snapshots.push({
        nodes: Array.from(this.state.nodes.values()),
        edges: [...this.state.edges],
        coherence: this.state.coherence,
        timestamp: this.state.timestamp
      });
    }
    return snapshots;
  }

  /**
   * Query the state space.
   * Returns the most coherent node matching the query.
   */
  query(gate?: number, dimension?: Dimension): Node | null {
    const candidates = Array.from(this.state.nodes.values())
      .filter(n => (!gate || n.gate === gate) && (!dimension || n.dimension === dimension))
      .sort((a, b) => b.amplitude - a.amplitude);

    return candidates[0] || null;
  }

  /**
   * Generate sentence from node.
   */
  generateSentence(node: Node): string {
    const gateNames = [
      'The Creative', 'The Receptive', 'Difficulty at the Beginning', 'Youthful Folly',
      'Waiting', 'Conflict', 'The Army', 'Holding Together', 'The Taming Power of the Small',
      'Treading', 'Peace', 'Standstill', 'Fellowship with Men', 'Possession in Great Measure',
      'Modesty', 'Enthusiasm', 'Following', 'Work on What Has Been Spoiled', 'Approach',
      'Contemplation', 'Biting Through', 'Grace', 'Splitting Apart', 'Return', 'Innocence',
      'The Taming Power of the Great', 'The Corners of the Mouth', 'Preponderance of the Great',
      'The Abysmal', 'The Clinging Fire', 'Influence', 'Duration', 'Retreat', 'The Power of the Great',
      'Progress', 'Darkening of the Light', 'The Family', 'Opposition', 'Obstruction', 'Deliverance',
      'Decrease', 'Increase', 'Breakthrough', 'Coming to Meet', 'Gathering Together', 'Pushing Upward',
      'Oppression', 'The Well', 'Revolution', 'The Cauldron', 'The Arousing', 'Keeping Still',
      'Development', 'The Marrying Maiden', 'Abundance', 'The Wanderer', 'The Gentle', 'The Joyous',
      'Dispersion', 'Limitation', 'Inner Truth', 'Preponderance of the Small', 'After Completion',
      'Before Completion'
    ];

    const lineNames = ['Investigator', 'Hermit', 'Martyr', 'Opportunist', 'Heretic', 'Role Model'];
    const colorNames = ['Fear', 'Hope', 'Desire', 'Need', 'Guilt', 'Innocence'];
    const toneNames = ['Security', 'Uncertainty', 'Action', 'Meditation', 'Judgement', 'Acceptance'];
    const baseNames = ['Individuality', 'Mind', 'Body', 'Ego', 'Personality', 'Spirit'];

    const hexagram = gateNames[node.gate - 1] || 'Unknown';
    const line = lineNames[node.line - 1] || 'Unknown';
    const color = colorNames[node.color - 1] || 'Unknown';
    const tone = toneNames[node.tone - 1] || 'Unknown';
    const base = baseNames[node.base - 1] || 'Unknown';

    const dimKeynotes: Record<Dimension, string> = {
      Movement: 'I Define',
      Evolution: 'I Remember',
      Being: 'I Am',
      Design: 'I Design',
      Space: 'I Think'
    };

    return `${dimKeynotes[node.dimension]} — Gate ${node.gate} ${hexagram} through ${line} expression. ${color} motivates, ${tone} resonates, ${base} anchors. At ${node.degree}°${node.minute}′${node.second}″${node.arcSecond}‴${node.axis ? ' ' + node.axis : ''}. Coherence: ${node.amplitude.toFixed(3)}`;
  }

  /**
   * Get current state.
   */
  getState(): StateSpace {
    return this.state;
  }

  /**
   * Get state history.
   */
  getHistory(): StateSnapshot[] {
    return this.state.history;
  }

  private saveSnapshot(): void {
    this.state.history.push({
      nodes: Array.from(this.state.nodes.values()).map(n => ({ ...n, children: [] })),
      edges: [...this.state.edges],
      coherence: this.state.coherence,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.state.history.length > 1000) {
      this.state.history = this.state.history.slice(-1000);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
// FIXED: removed duplicate re-export block — the five operators are already
// `export const` at their definitions; the re-export caused duplicate-export.

export default StateSpaceEngine;
