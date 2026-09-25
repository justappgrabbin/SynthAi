/**
 * DISEMINER - Pattern Detection and Life Insight Engine
 * =====================================================
 *
 * Based on Sheldon Klein's DISEMINER system.
 *
 * DISEMINER watches user behavior, detects recurring patterns,
# and maps them to I Ching archetypes for insight generation.
 *
 * What it does:
 * 1. Records events (user actions, feelings, choices)
 * 2. Detects recurring patterns (avoidance, repetition, cycles)
 * 3. Maps patterns to I Ching hexagrams (archetypes)
 * 4. Generates insights and scenario recommendations
 *
 * Feature space: [frequency, intensity, recurrence, avoidance, growth, stagnation]
 *   frequency:  how often this pattern appears
 *   intensity:  how strong the emotional charge
 *   recurrence: does it repeat in cycles
 *   avoidance:  is the user avoiding something
 *   growth:     is there progress or learning
 *   stagnation: is the pattern stuck
 */

const ATO = require('./layer1_ato_core.js');
const FeatureSpace = require('./layer2_feature_space.js');

class Diseminer {
  constructor() {
    this.name = "DISEMINER";
    this.version = "1.0";
    this.featureSpace = [0, 1, 0, 0, 1, 0];  // Tool signature in mesh

    // Pattern database
    this.patterns = new Map();  // pattern_id -> pattern_data
    this.events = [];             // chronological event log
    this.insights = [];           // generated insights

    // Pattern archetypes (mapped to I Ching hexagrams)
    this.archetypes = this._buildArchetypes();
  }

  // ============================================================
  // ARCHETYPES (Pattern -> I Ching Mapping)
  // ============================================================

  _buildArchetypes() {
    /**
     * Map common life patterns to I Ching hexagrams.
     * Each archetype has:
     * - pattern_type: what kind of pattern
     * - hexagrams: which hexagrams represent this archetype
     * - gates: which Human Design gates activate
     * - insight: what the pattern means
     * - scenario: what scenario to generate
     */
    return {
      "avoidance": {
        hexagrams: [6, 33, 36],     // Conflict, Retreat, Darkening
        gates: [6, 12, 33, 36],
        centers: ["solar_plexus", "throat"],
        insight: "You are avoiding a necessary confrontation. The pattern shows retreat where advance is needed.",
        scenario: "The Meeting",
        lesson: "Directness"
      },
      "repetition": {
        hexagrams: [3, 24, 32],     // Difficulty, Return, Duration
        gates: [3, 24, 32, 42],
        centers: ["sacral", "root"],
        insight: "You repeat the same cycle without learning. The pattern is stuck in a loop.",
        scenario: "The Threshold",
        lesson: "Awareness"
      },
      "initiation": {
        hexagrams: [1, 25, 34],     // Creative, Innocence, Great Power
        gates: [1, 25, 34, 51],
        centers: ["g_center", "sacral"],
        insight: "You are at the beginning of something new. The pattern shows creative potential.",
        scenario: "The Spark",
        lesson: "Courage"
      },
      "waiting": {
        hexagrams: [5, 20, 52],     // Waiting, Contemplation, Keeping Still
        gates: [5, 20, 52, 9],
        centers: ["sacral", "spleen"],
        insight: "You are in a period of waiting. The pattern shows patience is required.",
        scenario: "The Pause",
        lesson: "Patience"
      },
      "conflict": {
        hexagrams: [6, 38, 49],     // Conflict, Opposition, Revolution
        gates: [6, 38, 39, 49],
        centers: ["solar_plexus", "heart"],
        insight: "You are in a state of inner or outer conflict. The pattern shows opposition.",
        scenario: "The Battle",
        lesson: "Resolution"
      },
      "transformation": {
        hexagrams: [49, 50, 55],    // Revolution, Cauldron, Abundance
        gates: [42, 49, 50, 55],
        centers: ["sacral", "solar_plexus"],
        insight: "You are in a period of transformation. The pattern shows change is happening.",
        scenario: "The Forge",
        lesson: "Surrender"
      },
      "community": {
        hexagrams: [8, 13, 37],     // Holding Together, Fellowship, Family
        gates: [8, 13, 37, 40],
        centers: ["g_center", "solar_plexus"],
        insight: "You are seeking or building community. The pattern shows connection.",
        scenario: "The Gathering",
        lesson: "Trust"
      },
      "exhaustion": {
        hexagrams: [47, 29, 39],    // Exhaustion, Abysmal, Obstruction
        gates: [28, 29, 47, 48],
        centers: ["root", "spleen"],
        insight: "You are exhausted or blocked. The pattern shows a need for rest or release.",
        scenario: "The Well",
        lesson: "Restoration"
      }
    };
  }

  // ============================================================
  // EVENT RECORDING
  // ============================================================

  /**
   * Record an event from the user's life.
   */
  recordEvent(event) {
    const enriched = {
      ...event,
      timestamp: Date.now(),
      id: `event_${this.events.length}_${Date.now()}`,
      vector: this._eventToVector(event)
    };

    this.events.push(enriched);

    // Check if this event triggers a pattern
    this._checkPatterns(enriched);

    return enriched;
  }

  /**
   * Convert an event to a feature vector.
   */
  _eventToVector(event) {
    const vec = [0, 0, 0, 0, 0, 0];

    // frequency: how often this type of event
    vec[0] = this._getEventFrequency(event.type) > 3 ? 1 : 0;

    // intensity: emotional charge
    vec[1] = event.intensity === "high" ? 1 : 0;

    // recurrence: does it repeat
    vec[2] = event.recurring ? 1 : 0;

    // avoidance: is the user avoiding something
    vec[3] = event.avoidance ? 1 : 0;

    // growth: is there progress
    vec[4] = event.growth ? 1 : 0;

    // stagnation: is the pattern stuck
    vec[5] = event.stagnation ? 1 : 0;

    return vec;
  }

  /**
   * Get frequency of an event type.
   */
  _getEventFrequency(type) {
    return this.events.filter(e => e.type === type).length;
  }

  // ============================================================
  // PATTERN DETECTION
  // ============================================================

  /**
   * Check if a new event triggers any known patterns.
   */
  _checkPatterns(event) {
    // Look for recurring events of the same type
    const sameType = this.events.filter(e => e.type === event.type);

    if (sameType.length >= 3) {
      // Potential pattern detected
      this._detectPattern(sameType);
    }

    // Look for avoidance patterns
    if (event.avoidance) {
      const avoidanceEvents = this.events.filter(e => e.avoidance);
      if (avoidanceEvents.length >= 2) {
        this._detectAvoidancePattern(avoidanceEvents);
      }
    }
  }

  /**
   * Detect a recurring pattern from a set of events.
   */
  _detectPattern(events) {
    const patternId = `pattern_${this.patterns.size}_${Date.now()}`;

    // Aggregate event vectors
    const aggregate = events.reduce((sum, e) => {
      return sum.map((val, i) => val + e.vector[i]);
    }, [0, 0, 0, 0, 0, 0]);

    // Normalize
    const normalized = aggregate.map(v => v > events.length / 2 ? 1 : 0);

    // Match against archetypes
    const archetype = this._matchArchetype(normalized);

    const pattern = {
      id: patternId,
      type: events[0].type,
      events: events.map(e => e.id),
      vector: normalized,
      archetype: archetype,
      detected: Date.now(),
      strength: Math.min(1.0, events.length / 5)  // Strength increases with frequency
    };

    this.patterns.set(patternId, pattern);

    // Generate insight
    if (archetype) {
      this._generateInsight(pattern, archetype);
    }

    return pattern;
  }

  /**
   * Detect an avoidance pattern.
   */
  _detectAvoidancePattern(events) {
    const patternId = `avoidance_${this.patterns.size}_${Date.now()}`;

    const pattern = {
      id: patternId,
      type: "avoidance",
      events: events.map(e => e.id),
      vector: [0, 1, 0, 1, 0, 0],  // high intensity, avoidance
      archetype: this.archetypes.avoidance,
      detected: Date.now(),
      strength: Math.min(1.0, events.length / 3)
    };

    this.patterns.set(patternId, pattern);
    this._generateInsight(pattern, this.archetypes.avoidance);

    return pattern;
  }

  /**
   * Match a pattern vector against archetypes.
   */
  _matchArchetype(vector) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [name, archetype] of Object.entries(this.archetypes)) {
      // Create a representative vector for this archetype
      const archetypeVec = this._archetypeToVector(archetype);
      const similarity = ATO.similarity(vector, archetypeVec);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = archetype;
      }
    }

    return bestMatch;
  }

  /**
   * Convert an archetype to a representative vector.
   */
  _archetypeToVector(archetype) {
    // Simple mapping based on hexagram numbers
    const hex = archetype.hexagrams[0];
    const hexVec = FeatureSpace.HEXAGRAMS[hex]?.vector || [0,0,0,0,0,0];
    return hexVec;
  }

  // ============================================================
  // INSIGHT GENERATION
  // ============================================================

  /**
   * Generate an insight from a detected pattern.
   */
  _generateInsight(pattern, archetype) {
    const insight = {
      id: `insight_${this.insights.length}_${Date.now()}`,
      patternId: pattern.id,
      archetype: archetype,
      text: archetype.insight,
      scenario: archetype.scenario,
      lesson: archetype.lesson,
      gates: archetype.gates,
      centers: archetype.centers,
      hexagrams: archetype.hexagrams,
      strength: pattern.strength,
      timestamp: Date.now()
    };

    this.insights.push(insight);
    return insight;
  }

  /**
   * Get all active insights.
   */
  getInsights() {
    return this.insights.filter(i => i.strength > 0.3);
  }

  /**
   * Get the strongest current insight.
   */
  getStrongestInsight() {
    const active = this.getInsights();
    if (active.length === 0) return null;
    return active.reduce((best, current) => 
      current.strength > best.strength ? current : best
    );
  }

  // ============================================================
  // RECOMMENDATION ENGINE
  // ============================================================

  /**
   * Recommend a scenario based on current patterns.
   */
  recommendScenario() {
    const insight = this.getStrongestInsight();
    if (!insight) return null;

    return {
      scenario: insight.scenario,
      lesson: insight.lesson,
      gates: insight.gates,
      centers: insight.centers,
      hexagrams: insight.hexagrams,
      insight: insight.text,
      strength: insight.strength
    };
  }

  // ============================================================
  // MESH INTEGRATION
  // ============================================================

  /**
   * Handler for when this tool is called from the mesh.
   */
  handle(vertex, params = {}) {
    if (params.event) {
      return this.recordEvent(params.event);
    }
    if (params.getInsights) {
      return this.getInsights();
    }
    if (params.recommend) {
      return this.recommendScenario();
    }
    return {
      patterns: this.patterns.size,
      events: this.events.length,
      insights: this.insights.length
    };
  }

  // ============================================================
  // EXPORT
  // ============================================================


  // ============================================================
  // PHASE-SPACE OPERATOR HOOKS
  // ============================================================

  /**
   * Return operators for the five phase-space stages.
   * DISEMINER contributes primarily to Evolution (trajectory, patterns) and Being (situation).
   */
  getOperators(context) {
    return {
      // Evolution: Compare current state with history, detect trajectories
      trajectoryFn: (state, ctx) => {
        const history = ctx.history || this.events.slice(-10);
        const patterns = this._detectStatePatterns(state, history);

        return {
          state: {
            ...state,
            detectedPatterns: patterns,
            trajectory: {
              length: history.length,
              stability: this._computeStability(state, history),
              divergence: this._computeDivergence(state, history)
            }
          },
          events: [
            { type: 'diseminer_evolution', patterns: patterns.length },
            { type: 'diseminer_trajectory', stability: state.trajectory?.stability }
          ]
        };
      },

      // Being: Identify where the state currently settles or diverges
      beingFn: (state, ctx) => {
        const situation = this._identifySituation(state);

        return {
          state: {
            ...state,
            situation: situation,
            archetype: situation.archetype,
            insight: situation.insight
          },
          events: [
            { type: 'diseminer_being', situation: situation.type },
            { type: 'diseminer_archetype', archetype: situation.archetype }
          ]
        };
      }
    };
  }

  // Helper: Detect patterns from state history (not predefined matching)
  _detectStatePatterns(state, history) {
    const patterns = [];

    if (history.length < 2) return patterns;

    // Detect repetition in state vectors
    const vectors = history.map(h => h.vector || h.state?.vector || []).filter(v => v.length > 0);
    if (vectors.length > 2) {
      const similarities = [];
      for (let i = 1; i < vectors.length; i++) {
        const sim = this._vectorSimilarity(vectors[i-1], vectors[i]);
        similarities.push(sim);
      }
      const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      if (avgSim > 0.8) {
        patterns.push({ type: 'repetition', strength: avgSim });
      } else if (avgSim < 0.3) {
        patterns.push({ type: 'divergence', strength: 1 - avgSim });
      }
    }

    // Detect avoidance (state moving away from resolution)
    if (state.unresolvedQuestions && state.unresolvedQuestions.length > 0) {
      const unresolvedCount = state.unresolvedQuestions.filter(q => q.unresolved).length;
      if (unresolvedCount > 2) {
        patterns.push({ type: 'avoidance', count: unresolvedCount });
      }
    }

    return patterns;
  }

  _vectorSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  _computeStability(state, history) {
    if (history.length < 2) return 1.0;
    const recent = history.slice(-5);
    const vectors = recent.map(h => h.vector || h.state?.vector || []).filter(v => v.length > 0);
    if (vectors.length < 2) return 1.0;
    const similarities = [];
    for (let i = 1; i < vectors.length; i++) {
      similarities.push(this._vectorSimilarity(vectors[i-1], vectors[i]));
    }
    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  _computeDivergence(state, history) {
    if (history.length < 2) return 0.0;
    const first = history[0].vector || history[0].state?.vector || [];
    const last = history[history.length - 1].vector || history[history.length - 1].state?.vector || [];
    if (first.length === 0 || last.length === 0) return 0.0;
    return 1 - this._vectorSimilarity(first, last);
  }

  _identifySituation(state) {
    // Identify situation from computed state, not from predefined patterns
    const patterns = state.detectedPatterns || [];
    const stability = state.trajectory?.stability || 0.5;
    const divergence = state.trajectory?.divergence || 0.0;

    if (divergence > 0.7) {
      return {
        type: 'transformation',
        archetype: 'transformation',
        insight: 'The state is diverging rapidly from its origin. A transformation is occurring.',
        stability: 'unstable'
      };
    }

    if (stability > 0.8 && patterns.some(p => p.type === 'repetition')) {
      return {
        type: 'stuck',
        archetype: 'repetition',
        insight: 'The state is repeating without evolving. A cycle is being maintained.',
        stability: 'rigid'
      };
    }

    if (patterns.some(p => p.type === 'avoidance')) {
      return {
        type: 'avoidance',
        archetype: 'avoidance',
        insight: 'The state contains unresolved questions that are being avoided.',
        stability: 'avoidant'
      };
    }

    return {
      type: 'emerging',
      archetype: 'initiation',
      insight: 'The state is forming. Its trajectory is still being established.',
      stability: 'fluid'
    };
  }

  toString() {
    return `DISEMINER(v=${this.version}, patterns=${this.patterns.size}, events=${this.events.length}, insights=${this.insights.length})`;
  }
}

const DiseminerModule = { Diseminer };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiseminerModule;
}

if (typeof window !== 'undefined') {
  window.Diseminer = DiseminerModule;
}
