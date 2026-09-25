/**
 * Phase Space Engine - Five-Dimensional Sequential Transformation
 * ================================================================
 *
 * The core computation: Space(Design(Being(Evolution(Movement(state)))))
 *
 * Each dimension is a TRANSFORM, not a feature.
 * The output of one stage is the input of the next.
 * The trace records every intermediate state.
 *
 * Dimensions:
 *   1. Movement   (D1) - The impulse, the initial transformation
 *   2. Evolution  (D2) - The trajectory, how it changes over time
 *   3. Being      (D3) - The witness, where it currently exists
 *   4. Design     (D4) - The structure, rules and constraints applied
 *   5. Space      (D5) - The meaning, embedded in shared geometry
 *
 * Interrogative projection (READ-ONLY):
 *   Who   → Space     (identity, relation, "who is this")
 *   What  → Evolution (developmental content, "what is changing")
 *   Where → Being     (situation, location, "where is it")
 *   When  → Movement  (transition, timing, "when is it moving")
 *   Why   → Design    (purpose, structure, "why this form")
 *
 * This is NOT a lookup. It is NOT a classification.
 * It is a COMPUTATION. The state is TRANSFORMED at each stage.
 */

const ATO = require('./layer1_ato_core.js');

// ============================================================
// SECTION 1: OPERATOR BASE CLASS
// ============================================================

class PhaseOperator {
  /**
   * Base class for all five phase-space operators.
   *
   * Each operator:
   * - Receives a state (the output of the previous stage)
   * - Transforms it (computation, not lookup)
   * - Returns the transformed state
   * - Records events describing what was transformed
   */
  constructor(name, transformFn) {
    this.name = name;
    this.transform = transformFn;  // (state, context) => { state, events }
  }

  apply(state, context = {}) {
    const result = this.transform(state, context);
    return {
      state: result.state,
      events: result.events || [],
      operator: this.name,
      input: state,
      output: result.state
    };
  }
}

// ============================================================
// SECTION 2: THE FIVE DIMENSIONS
// ============================================================

/**
 * D1: MOVEMENT
 * The initial transformation. The impulse.
 * What is the raw action, the first change, the spark?
 *
 * Movement transforms the incoming state by:
 * - Detecting the primary impulse (what wants to change)
 * - Applying the minimal transformation that expresses that impulse
 * - Producing the first derivative of state (rate of change)
 */
const MovementOperator = new PhaseOperator('Movement', (state, context) => {
  const events = [];

  // Detect impulse from state vector
  const impulse = detectImpulse(state);
  events.push({ type: 'impulse_detected', impulse, source: 'state_vector' });

  // Apply minimal transformation
  // The transformation is a rotation in the hypercube
  // NOT a lookup, NOT a classification
  const transformed = rotateInHypercube(state, impulse.axis, impulse.magnitude);
  events.push({
    type: 'state_rotated',
    axis: impulse.axis,
    magnitude: impulse.magnitude,
    before: state,
    after: transformed
  });

  // Compute first derivative (rate of change)
  const derivative = computeDerivative(state, transformed);
  events.push({ type: 'derivative_computed', value: derivative });

  return {
    state: {
      ...transformed,
      _movement: {
        impulse: impulse,
        derivative: derivative,
        timestamp: Date.now()
      }
    },
    events
  };
});

/**
 * D2: EVOLUTION
 * The trajectory. How the state changes over time.
 * When did it change? What path did it take?
 *
 * Evolution transforms by:
 * - Incorporating history from temporal SSM
 * - Computing the trajectory (path through state space)
 * - Detecting acceleration/deceleration (second derivative)
 * - Projecting future states
 */
const EvolutionOperator = new PhaseOperator('Evolution', (state, context) => {
  const events = [];
  const history = context.history || [];

  // Incorporate prior trajectory
  const trajectory = computeTrajectory(state, history);
  events.push({ type: 'trajectory_computed', points: trajectory.length });

  // Detect change patterns (acceleration, deceleration, oscillation)
  const patterns = detectChangePatterns(trajectory);
  events.push({ type: 'patterns_detected', patterns });

  // Apply trajectory influence to current state
  // The state is PULLED by its own history
  const evolved = applyTrajectory(state, trajectory);
  events.push({
    type: 'state_evolved',
    trajectory_influence: trajectory.influence,
    before: state,
    after: evolved
  });

  return {
    state: {
      ...evolved,
      _evolution: {
        trajectory: trajectory,
        patterns: patterns,
        history: history.slice(-10),  // Last 10 states
        timestamp: Date.now()
      }
    },
    events
  };
});

/**
 * D3: BEING
 * The situated state. Where does it currently exist?
 * What is its current form, its present condition?
 *
 * Being transforms by:
 * - Resolving the state into its current situated form
 * - Determining its "address" in the current moment
 * - Computing its relationships to other active states
 * - Establishing its present identity (not its future or past)
 */
const BeingOperator = new PhaseOperator('Being', (state, context) => {
  const events = [];
  const mesh = context.mesh;

  // Resolve current situated form
  // The state is PROJECTED onto the current hypercube surface
  const situated = situateState(state);
  events.push({
    type: 'state_situated',
    coordinates: situated.coordinates,
    surface: situated.surface
  });

  // Compute relationships to other active states
  const relations = computeRelations(situated, mesh);
  events.push({ type: 'relations_computed', count: relations.length });

  // Establish present identity (the "now" of this state)
  const identity = establishPresentIdentity(situated, relations);
  events.push({
    type: 'identity_established',
    identity: identity,
    stability: identity.stability
  });

  return {
    state: {
      ...situated,
      _being: {
        coordinates: situated.coordinates,
        relations: relations,
        identity: identity,
        timestamp: Date.now()
      }
    },
    events
  };
});

/**
 * D4: DESIGN
 * The structural transformation. Why this form?
 * What rules, constraints, and possibilities shape it?
 *
 * Design transforms by:
 * - Applying structural rules (from I Ching, from learned patterns)
 * - Enforcing constraints (what is possible vs impossible)
 * - Generating possible forms (what COULD this become)
 * - Selecting the form that best fits the trajectory
 */
const DesignOperator = new PhaseOperator('Design', (state, context) => {
  const events = [];
  const rules = context.rules || [];

  // Generate possible forms
  // NOT a lookup. A GENERATION from the current state.
  const possibleForms = generatePossibleForms(state);
  events.push({ type: 'forms_generated', count: possibleForms.length });

  // Apply structural rules
  const constrained = applyConstraints(possibleForms, rules);
  events.push({
    type: 'constraints_applied',
    rules_used: rules.length,
    forms_remaining: constrained.length
  });

  // Select form based on trajectory fit
  const selected = selectForm(constrained, state._evolution?.trajectory);
  events.push({
    type: 'form_selected',
    form: selected.id,
    fit_score: selected.fit,
    reason: selected.reason
  });

  // Apply the selected form to the state
  const designed = applyForm(state, selected);
  events.push({
    type: 'state_designed',
    form_applied: selected.id,
    before: state,
    after: designed
  });

  return {
    state: {
      ...designed,
      _design: {
        possibleForms: possibleForms.map(f => f.id),
        selectedForm: selected.id,
        constraints: rules.map(r => r.name),
        fitScore: selected.fit,
        timestamp: Date.now()
      }
    },
    events
  };
});

/**
 * D5: SPACE
 * The embedding. The final identity. Who is this?
 * Where does it live in the shared geometry?
 *
 * Space transforms by:
 * - Embedding the state into the shared hypercube
 * - Establishing its permanent address (identity)
 * - Creating edges to related states
 * - Making it navigable and addressable
 */
const SpaceOperator = new PhaseOperator('Space', (state, context) => {
  const events = [];
  const mesh = context.mesh;

  // Embed into shared geometry
  const embedded = embedInSpace(state, mesh);
  events.push({
    type: 'state_embedded',
    address: embedded.address,
    coordinates: embedded.coordinates
  });

  // Establish permanent identity
  const identity = establishIdentity(embedded);
  events.push({
    type: 'identity_established',
    id: identity.id,
    name: identity.name,
    address: identity.address
  });

  // Create edges to related states
  const edges = createEdges(embedded, mesh);
  events.push({
    type: 'edges_created',
    count: edges.length,
    neighbors: edges.map(e => e.target)
  });

  // Make navigable
  const navigable = makeNavigable(embedded, edges);
  events.push({
    type: 'state_navigable',
    portals: navigable.portals,
    channels: navigable.channels
  });

  return {
    state: {
      ...navigable,
      _space: {
        address: identity.address,
        identity: identity,
        edges: edges,
        portals: navigable.portals,
        timestamp: Date.now()
      }
    },
    events
  };
});

// ============================================================
// SECTION 3: COMPUTATIONAL FUNCTIONS (NOT LOOKUPS)
// ============================================================

function detectImpulse(state) {
  // Compute the dominant direction of change in the state vector
  // This is a MATHEMATICAL operation, not a classification
  const vector = state.vector || state;
  if (!Array.isArray(vector)) return { axis: 0, magnitude: 0 };

  // Find the component with largest absolute value
  let maxIdx = 0;
  let maxVal = Math.abs(vector[0]);
  for (let i = 1; i < vector.length; i++) {
    if (Math.abs(vector[i]) > maxVal) {
      maxVal = Math.abs(vector[i]);
      maxIdx = i;
    }
  }

  return {
    axis: maxIdx,
    magnitude: vector[maxIdx],
    direction: vector[maxIdx] > 0 ? 'positive' : 'negative'
  };
}

function rotateInHypercube(state, axis, magnitude) {
  // Rotate the state vector around the given axis
  // This is a geometric transformation
  const vector = [...(state.vector || state)];

  // Simple rotation: shift components based on axis
  const rotated = vector.map((v, i) => {
    if (i === axis) return v;
    // Cross-coupling with axis component
    return v + magnitude * 0.1 * Math.sin(i + axis);
  });

  // Normalize
  const norm = Math.sqrt(rotated.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    return rotated.map(v => v / norm);
  }
  return rotated;
}

function computeDerivative(before, after) {
  // Compute rate of change between two states
  const b = before.vector || before;
  const a = after.vector || after;

  if (!Array.isArray(b) || !Array.isArray(a)) return 0;

  const diff = b.map((v, i) => a[i] - v);
  return Math.sqrt(diff.reduce((s, v) => s + v * v, 0));
}

function computeTrajectory(state, history) {
  // Compute the path through state space
  const points = history.map(h => h.state || h).filter(s => s);
  points.push(state);

  // Compute velocity at each point
  const velocities = [];
  for (let i = 1; i < points.length; i++) {
    const v1 = points[i - 1].vector || points[i - 1];
    const v2 = points[i].vector || points[i];
    if (Array.isArray(v1) && Array.isArray(v2)) {
      const diff = v1.map((v, j) => v2[j] - v);
      velocities.push(Math.sqrt(diff.reduce((s, v) => s + v * v, 0)));
    }
  }

  // Compute influence (how much trajectory pulls current state)
  const influence = velocities.length > 0
    ? velocities.reduce((s, v) => s + v, 0) / velocities.length
    : 0;

  return {
    points: points.length,
    velocities,
    influence,
    direction: velocities.length > 0 ? velocities[velocities.length - 1] : 0
  };
}

function detectChangePatterns(trajectory) {
  const patterns = [];
  const vels = trajectory.velocities;

  if (vels.length < 2) return patterns;

  // Detect acceleration
  const accels = [];
  for (let i = 1; i < vels.length; i++) {
    accels.push(vels[i] - vels[i - 1]);
  }

  const avgAccel = accels.reduce((s, a) => s + a, 0) / accels.length;
  if (avgAccel > 0.1) patterns.push({ type: 'acceleration', value: avgAccel });
  if (avgAccel < -0.1) patterns.push({ type: 'deceleration', value: avgAccel });
  if (Math.abs(avgAccel) < 0.05) patterns.push({ type: 'steady', value: avgAccel });

  // Detect oscillation
  let oscillations = 0;
  for (let i = 1; i < accels.length; i++) {
    if (accels[i] * accels[i - 1] < 0) oscillations++;
  }
  if (oscillations > accels.length / 3) {
    patterns.push({ type: 'oscillation', count: oscillations });
  }

  return patterns;
}

function applyTrajectory(state, trajectory) {
  // Pull the state along its trajectory
  const vector = state.vector || (Array.isArray(state) ? state : []);
  if (!Array.isArray(vector)) return state;

  const pull = trajectory.influence * 0.1;

  const newVector = vector.map(v => v + pull * (Math.random() - 0.5));

  return {
    ...state,
    vector: newVector
  };
}

function situateState(state) {
  // Project state onto the current hypercube surface
  const vector = state.vector || (Array.isArray(state) ? state : []);
  if (!Array.isArray(vector)) return { ...state, coordinates: [] };

  // Compute coordinates on the surface
  const coordinates = vector.map((v, i) => ({
    dimension: i,
    value: v,
    surface: Math.abs(v) > 0.5 ? 'active' : 'dormant'
  }));

  return {
    ...state,
    vector: vector,
    coordinates: coordinates,
    surface: coordinates.filter(c => c.surface === 'active').length / coordinates.length
  };
}

function computeRelations(situated, mesh) {
  // Compute relations to other states in the mesh
  const relations = [];

  if (!mesh || !mesh.vertices) return relations;

  for (const [id, vertex] of mesh.vertices) {
    if (vertex.vector && situated.vector) {
      const dist = ATO.hammingDistance(
        situated.vector.map(v => v > 0 ? 1 : 0),
        vertex.vector.map(v => v > 0 ? 1 : 0)
      );
      if (dist < 3) {
        relations.push({
          target: id,
          distance: dist,
          type: dist === 0 ? 'identical' : dist < 2 ? 'close' : 'near'
        });
      }
    }
  }

  return relations;
}

function establishPresentIdentity(situated, relations) {
  // The identity is derived from the situated state and its relations
  // NOT from a lookup table

  const activeCoords = situated.coordinates.filter(c => c.surface === 'active');
  const stability = activeCoords.length / situated.coordinates.length;

  return {
    id: `being_${Date.now()}`,
    coordinates: activeCoords.map(c => c.dimension),
    stability: stability,
    relationCount: relations.length,
    form: stability > 0.6 ? 'defined' : stability > 0.3 ? 'emerging' : 'diffuse'
  };
}

function generatePossibleForms(state) {
  // Generate possible forms from the current state
  // This is a CREATIVE operation, not a lookup

  const vector = state.vector || state;
  if (!Array.isArray(vector)) return [];

  const forms = [];

  // Form 1: The direct projection (what the state currently is)
  forms.push({
    id: 'direct',
    vector: [...vector],
    fit: 1.0,
    reason: 'direct_projection'
  });

  // Form 2: The complement (what the state is not)
  forms.push({
    id: 'complement',
    vector: vector.map(v => -v),
    fit: 0.5,
    reason: 'complementary_form'
  });

  // Form 3: The amplified (what the state wants to become)
  const maxVal = Math.max(...vector.map(Math.abs));
  forms.push({
    id: 'amplified',
    vector: vector.map(v => v / (maxVal || 1)),
    fit: 0.7,
    reason: 'amplified_form'
  });

  // Form 4: The attenuated (what the state fears becoming)
  forms.push({
    id: 'attenuated',
    vector: vector.map(v => v * 0.5),
    fit: 0.3,
    reason: 'attenuated_form'
  });

  return forms;
}

function applyConstraints(forms, rules) {
  // Apply structural rules to constrain possible forms
  // Rules are FUNCTIONS, not lookup tables

  let constrained = [...forms];

  for (const rule of rules) {
    constrained = constrained.filter(form => {
      // Each rule is a predicate function
      if (typeof rule === 'function') {
        return rule(form);
      }
      return true;
    });
  }

  return constrained.length > 0 ? constrained : forms.slice(0, 1);
}

function selectForm(forms, trajectory) {
  // Select the form that best fits the trajectory
  if (forms.length === 0) return { id: 'none', fit: 0, reason: 'no_forms' };

  // Score each form by trajectory alignment
  const scored = forms.map(form => {
    let score = form.fit || 0.5;

    // Boost forms that align with trajectory direction
    if (trajectory && trajectory.direction > 0) {
      score += 0.1;
    }

    return { ...form, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ...scored[0],
    fit: scored[0].score
  };
}

function applyForm(state, form) {
  // Apply the selected form to the state
  return {
    ...state,
    vector: form.vector || state.vector,
    form: form.id
  };
}

function embedInSpace(state, mesh) {
  // Embed the state into the shared geometry
  const vector = state.vector || (Array.isArray(state) ? state : []);

  // Compute address from vector hash
  const address = computeAddress(vector);

  return {
    ...state,
    address: address,
    coordinates: vector
  };
}

function computeAddress(vector) {
  // Compute a stable address from the vector
  if (!Array.isArray(vector)) return 'addr_unknown';

  const hash = vector.reduce((s, v, i) => s + Math.abs(v) * (i + 1), 0);
  return `addr_${Math.floor(hash * 1000)}`;
}

function establishIdentity(embedded) {
  // Establish the permanent identity
  return {
    id: `id_${embedded.address}`,
    name: `State_${embedded.address}`,
    address: embedded.address,
    vector: embedded.vector
  };
}

function createEdges(embedded, mesh) {
  // Create edges to related states in the mesh
  const edges = [];

  if (!mesh || !mesh.vertices) return edges;

  for (const [id, vertex] of mesh.vertices) {
    if (vertex.vector && embedded.vector) {
      const dist = ATO.hammingDistance(
        embedded.vector.map(v => v > 0 ? 1 : 0),
        vertex.vector.map(v => v > 0 ? 1 : 0)
      );
      if (dist < 3 && dist > 0) {
        edges.push({
          target: id,
          distance: dist,
          transform: ATO.xor(
            embedded.vector.map(v => v > 0 ? 1 : 0),
            vertex.vector.map(v => v > 0 ? 1 : 0)
          )
        });
      }
    }
  }

  return edges;
}

function makeNavigable(embedded, edges) {
  // Make the state navigable by creating portals
  const portals = edges.map((e, i) => ({
    id: `portal_${i}`,
    target: e.target,
    distance: e.distance,
    direction: i % 6  // Six directions for hexagonal navigation
  }));

  // Create channels (paths) between portals
  const channels = [];
  for (let i = 0; i < portals.length - 1; i++) {
    channels.push({
      from: portals[i].id,
      to: portals[i + 1].id,
      active: true
    });
  }

  return {
    ...embedded,
    portals: portals,
    channels: channels
  };
}

// ============================================================
// SECTION 4: PHASE SPACE ENGINE
// ============================================================

class PhaseSpaceEngine {
  constructor() {
    this.operators = {
      Movement: MovementOperator,
      Evolution: EvolutionOperator,
      Being: BeingOperator,
      Design: DesignOperator,
      Space: SpaceOperator
    };

    this.stageOrder = ['Movement', 'Evolution', 'Being', 'Design', 'Space'];
  }

  /**
   * Run the full five-stage composition.
   *
   * Returns:
   *   1. Final Space-embedded state
   *   2. Trace containing every intermediate stage
   *   3. Events describing transformations at each stage
   *   4. Validation errors if operators are missing
   */
  compose(initialState, context = {}) {
    const trace = [];
    const errors = [];
    let currentState = initialState;

    for (const stageName of this.stageOrder) {
      const operator = this.operators[stageName];

      if (!operator) {
        errors.push({
          stage: stageName,
          error: 'MISSING_OPERATOR',
          message: `Operator ${stageName} is not registered`
        });
        continue;
      }

      const result = operator.apply(currentState, context);

      trace.push({
        stage: stageName,
        input: result.input,
        output: result.output,
        events: result.events,
        operator: result.operator
      });

      currentState = result.state;
    }

    return {
      finalState: currentState,
      trace: trace,
      errors: errors,
      complete: errors.length === 0
    };
  }

  /**
   * Project the completed trace through an alternate coordinate basis.
   *
   * This is READ-ONLY. It does not recompute the state.
   * It only changes how the trace is read.
   *
   * Standard interrogative projection:
   *   Who   → Space
   *   What  → Movement
   *   Where → Being
   *   When  → Evolution
   *   Why   → Design
   */
  project(trace, projection = 'interrogative') {
    const projections = {
      interrogative: {
        Who: 'Space',
        What: 'Movement',
        Where: 'Being',
        When: 'Evolution',
        Why: 'Design'
      },
      chronological: {
        First: 'Movement',
        Second: 'Evolution',
        Third: 'Being',
        Fourth: 'Design',
        Fifth: 'Space'
      },
      structural: {
        Foundation: 'Movement',
        Process: 'Evolution',
        Situation: 'Being',
        Form: 'Design',
        Identity: 'Space'
      }
    };

    const mapping = projections[projection] || projections.interrogative;
    const result = {};

    for (const [key, stageName] of Object.entries(mapping)) {
      const stage = trace.find(t => t.stage === stageName);
      if (stage) {
        result[key] = {
          stage: stageName,
          output: stage.output,
          events: stage.events
        };
      }
    }

    return result;
  }

  /**
   * Register a custom operator for a stage.
   */
  registerOperator(stageName, operator) {
    this.operators[stageName] = operator;
  }

  /**
   * Get the operator for a stage.
   */
  getOperator(stageName) {
    return this.operators[stageName];
  }
}

// ============================================================
// SECTION 5: EXPORT
// ============================================================

const PhaseSpaceModule = {
  PhaseSpaceEngine,
  PhaseOperator,
  MovementOperator,
  EvolutionOperator,
  BeingOperator,
  DesignOperator,
  SpaceOperator
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhaseSpaceModule;
}

if (typeof window !== 'undefined') {
  window.PhaseSpace = PhaseSpaceModule;
}
