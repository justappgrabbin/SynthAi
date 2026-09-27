// ============================================================
// DISEMINER MCP Server — Monte Carlo Narrative Sampler
// Path Exploration through ATO-Transformed House Space
// ============================================================

import {
  atoXNOR,
  transformHouse,
  HOUSES,
  HEXAGRAMS,
  Hexagram
} from './ato-engine';
import {
  KleinToolSystem,
  KleinToolContext,
  EvaluationResult
} from './klein-tool-engine';

// ─────────────────────────────────────────────────────────────
// SECTION 1: W-DIMENSION PROFILE
// The user's dimensional fingerprint
// ─────────────────────────────────────────────────────────────

/**
 * W-Dimensions: the user's perceptual-position field.
 * 
 * w1: Impulse Field — raw query energy, what the user is asking
 * w2: Polarity Tension — doubt/resistance vector, what blocks resolution
 * w3: Witness Position — where the narrative must land, observer stability
 * w4: Context Envelope — situational breadth, relational field
 * w5: Meaning Crystallization — attractor depth, what actually shifts
 */
export interface WProfile {
  w1: number;  // 0-1: impulse strength
  w2: number;  // 0-1: tension level (higher = more resistance)
  w3: number;  // 0-1: witness stability (higher = more grounded)
  w4: number;  // 0-1: context breadth (higher = more situational awareness)
  w5: number;  // 0-1: meaning depth (higher = more crystallized)
}

/**
 * Default profile: balanced, mid-range
 */
export const DEFAULT_W_PROFILE: WProfile = {
  w1: 0.5,
  w2: 0.5,
  w3: 0.5,
  w4: 0.5,
  w5: 0.5
};

/**
 * Derive W-profile from HD chart data.
 * Maps gate/line/color/tone/base to dimensional weights.
 */
export function deriveWProfileFromChart(chart: {
  sunGate: number;
  sunLine: number;
  sunColor: number;
  sunTone: number;
  sunBase: number;
  earthGate: number;
  earthLine: number;
}): WProfile {
  // Gate determines w1 (impulse) and w5 (meaning attractor)
  const gateImpulse = (chart.sunGate % 16) / 16; // 0-1
  const gateMeaning = (chart.earthGate % 16) / 16;

  // Line determines w2 (tension) — odd lines = more tension
  const lineTension = (chart.sunLine % 2 === 1) ? 0.7 : 0.3;

  // Color determines w3 (witness) — color = direction of attention
  const colorWitness = chart.sunColor / 6;

  // Tone determines w4 (context) — tone = frequency of perception
  const toneContext = chart.sunTone / 6;

  // Base determines w5 refinement
  const baseMeaning = chart.sunBase / 6;

  return {
    w1: gateImpulse,
    w2: lineTension,
    w3: colorWitness,
    w4: toneContext,
    w5: (gateMeaning + baseMeaning) / 2
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION 2: NARRATIVE PATH DEFINITION
// ─────────────────────────────────────────────────────────────

/**
 * A single step in a narrative path
 */
export interface NarrativeStep {
  stepNumber: number;
  houseId: number;
  hexagram: Hexagram;
  atoOperator: string;        // trigram that transformed to this house
  sentence: string;           // generated sentence for this step
  wState: WProfile;           // w-dimensions at this step
  kleinEvaluation?: EvaluationResult; // Klein Tool output at this node
}

/**
 * A complete narrative path from query to convergence
 */
export interface NarrativePath {
  pathId: string;
  steps: NarrativeStep[];
  finalScore: number;         // resonance score
  convergencePoint: string;   // w5 attractor description
  convergenceDepth: number;   // how deep into w5
  trajectory: 'mutation' | 'interference' | 'neutral';
}

/**
 * Simulation result: all paths + statistics
 */
export interface SimulationResult {
  bestPath: NarrativePath;
  top5Paths: NarrativePath[];
  allPaths: NarrativePath[];
  distribution: {
    meanScore: number;
    stdDev: number;
    convergenceRates: Record<string, number>;
  };
  query: string;
  userW: WProfile;
  nSamples: number;
  seed: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION 3: SEEDED RANDOM (REPRODUCIBLE MONTE CARLO)
// ─────────────────────────────────────────────────────────────

/**
 * Linear Congruential Generator for reproducible randomness.
 * Same seed = same sequence, every time.
 */
export class SeededRandom {
  private seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  // LCG parameters (Numerical Recipes)
  next(): number {
    this.state = (1664525 * this.state + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  // Random integer in [min, max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Random choice from array
  choice<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }

  // Weighted random choice
  weightedChoice<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: SENTENCE BUILDER (Five Sentence Types)
// ─────────────────────────────────────────────────────────────

export type SentenceType = 'SPACE' | 'MIND' | 'SOUL' | 'BODY' | 'HEART';

export const SENTENCE_TEMPLATES: Record<SentenceType, string> = {
  SPACE: 'I think [IMAGE] which shapes [PERCEPTION] and invites [RHYTHM].',
  MIND: 'I remember [PATTERN] that accumulates as [LEVER] and biases future [CHOICE].',
  SOUL: 'I design [FORM] to encode [FUNCTION] so the system produces [OUTCOME].',
  BODY: 'I am [SENSORY STATE], which determines my immediate [CAPACITY] to act.',
  HEART: 'I create [INITIATIVE] that yields [NODE] and shifts the waveform toward [NEW PATTERN].'
};

/**
 * Map hexagram to sentence type based on dimensional quality
 */
export function hexagramToSentenceType(hex: Hexagram): SentenceType {
  const upperTri = parseInt(hex.upperTrigram, 2);
  const lowerTri = parseInt(hex.lowerTrigram, 2);
  const combined = (upperTri + lowerTri) % 5;
  const types: SentenceType[] = ['SPACE', 'MIND', 'SOUL', 'BODY', 'HEART'];
  return types[combined];
}

/**
 * Build a sentence from hexagram + w-state + user profile
 */
export function buildSentence(
  hex: Hexagram,
  wState: WProfile,
  userProfile?: { name?: string; gate?: number }
): string {
  const type = hexagramToSentenceType(hex);
  const template = SENTENCE_TEMPLATES[type];

  // Fill slots based on hexagram properties + w-state
  const image = hex.name;
  const perception = wState.w3 > 0.5 ? 'clarity' : 'confusion';
  const rhythm = wState.w1 > 0.5 ? 'acceleration' : 'deceleration';
  const pattern = `${hex.upperTrigram} over ${hex.lowerTrigram}`;
  const lever = wState.w4 > 0.5 ? 'momentum' : 'friction';
  const choice = wState.w2 > 0.5 ? 'hesitation' : 'commitment';
  const form = hex.name;
  const func = type === 'SOUL' ? 'structure' : 'flow';
  const outcome = wState.w5 > 0.5 ? 'crystallization' : 'dissolution';
  const sensory = wState.w2 > 0.5 ? 'tension' : 'ease';
  const capacity = wState.w3 > 0.5 ? 'action' : 'observation';
  const initiative = hex.name;
  const node = `${hex.number}`;
  const newPattern = wState.w5 > 0.5 ? 'integration' : 'fragmentation';

  return template
    .replace('[IMAGE]', image)
    .replace('[PERCEPTION]', perception)
    .replace('[RHYTHM]', rhythm)
    .replace('[PATTERN]', pattern)
    .replace('[LEVER]', lever)
    .replace('[CHOICE]', choice)
    .replace('[FORM]', form)
    .replace('[FUNCTION]', func)
    .replace('[OUTCOME]', outcome)
    .replace('[SENSORY STATE]', sensory)
    .replace('[CAPACITY]', capacity)
    .replace('[INITIATIVE]', initiative)
    .replace('[NODE]', node)
    .replace('[NEW PATTERN]', newPattern);
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: MONTE CARLO SAMPLER
// ─────────────────────────────────────────────────────────────

export class MonteCarloSampler {
  private kleinSystem: KleinToolSystem;
  private maxSteps: number;
  private convergenceThreshold: number;

  constructor(kleinSystem: KleinToolSystem, maxSteps: number = 20, convergenceThreshold: number = 0.85) {
    this.kleinSystem = kleinSystem;
    this.maxSteps = maxSteps;
    this.convergenceThreshold = convergenceThreshold;
  }

  /**
   * Sample a single narrative path.
   */
  samplePath(
    query: string,
    userW: WProfile,
    seed: number,
    nodeId: string = 'root'
  ): NarrativePath {
    const rng = new SeededRandom(seed);
    const steps: NarrativeStep[] = [];
    let currentW = { ...userW };

    // Query → initial hexagram (hash query to gate number)
    const initialGate = this.queryToGate(query, rng);
    let currentHex = HEXAGRAMS[initialGate];
    let currentHouseId = currentHex.houseId;

    for (let step = 0; step < this.maxSteps; step++) {
      // Derive ATO operator from current w2 tension
      const atoOperator = this.deriveATOFromW2(currentW.w2, rng);

      // Transform house
      const house = HOUSES[currentHouseId];
      const transformed = transformHouse(house, atoOperator);

      // Select next hexagram based on w3 witness position
      const nextHex = this.selectByWitness(transformed, currentW.w3, rng);

      // Build sentence
      const sentence = buildSentence(nextHex, currentW);

      // Klein Tool evaluation at this node
      const toolIds = this.kleinSystem.registry.getByGate(nextHex.number).map(t => t.toolId);
      const kleinEval = toolIds.length > 0
        ? this.kleinSystem.evaluateNode(`${nodeId}-step-${step}`, toolIds)
        : undefined;

      // Update w-state based on hexagram interaction
      currentW = this.evolveWState(currentW, nextHex, kleinEval);

      steps.push({
        stepNumber: step,
        houseId: currentHouseId,
        hexagram: nextHex,
        atoOperator,
        sentence,
        wState: { ...currentW },
        kleinEvaluation: kleinEval
      });

      // Check for w5 convergence
      if (currentW.w5 >= this.convergenceThreshold) {
        break;
      }

      // Move to next house
      currentHouseId = nextHex.houseId;
      currentHex = nextHex;
    }

    const finalScore = this.scorePath(steps, userW);
    const convergencePoint = steps[steps.length - 1]?.sentence || 'unresolved';

    return {
      pathId: `path-${seed}`,
      steps,
      finalScore,
      convergencePoint,
      convergenceDepth: steps[steps.length - 1]?.wState.w5 || 0,
      trajectory: this.classifyTrajectory(steps)
    };
  }

  /**
   * Run full simulation with n samples.
   */
  simulate(
    query: string,
    userW: WProfile,
    nSamples: number = 1000,
    baseSeed: number = 42
  ): SimulationResult {
    const paths: NarrativePath[] = [];

    for (let i = 0; i < nSamples; i++) {
      const path = this.samplePath(query, userW, baseSeed + i);
      paths.push(path);
    }

    // Sort by score
    paths.sort((a, b) => b.finalScore - a.finalScore);

    // Compute distribution statistics
    const scores = paths.map(p => p.finalScore);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Convergence rate by attractor
    const convergenceCounts: Record<string, number> = {};
    for (const path of paths) {
      const key = path.trajectory;
      convergenceCounts[key] = (convergenceCounts[key] || 0) + 1;
    }
    const convergenceRates: Record<string, number> = {};
    for (const key of Object.keys(convergenceCounts)) {
      convergenceRates[key] = convergenceCounts[key] / paths.length;
    }

    return {
      bestPath: paths[0],
      top5Paths: paths.slice(0, 5),
      allPaths: paths,
      distribution: { meanScore, stdDev, convergenceRates },
      query,
      userW,
      nSamples,
      seed: baseSeed
    };
  }

  // ── Internal methods ──

  private queryToGate(query: string, rng: SeededRandom): number {
    // Deterministic hash of query to gate 1-64
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      hash = ((hash << 5) - hash) + query.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const positiveHash = Math.abs(hash);
    return (positiveHash % 64) + 1;
  }

  private deriveATOFromW2(w2: number, rng: SeededRandom): string {
    // w2 tension → trigram operator
    // High tension = more yang (1s), low tension = more yin (0s)
    const yangCount = Math.round(w2 * 3);
    const trigrams = ['000', '001', '010', '011', '100', '101', '110', '111'];
    const candidates = trigrams.filter(t => {
      const ones = (t.match(/1/g) || []).length;
      return ones === yangCount;
    });
    return rng.choice(candidates.length > 0 ? candidates : trigrams);
  }

  private selectByWitness(house: Hexagram[], w3: number, rng: SeededRandom): Hexagram {
    // w3 witness stability → selection strategy
    // High w3 = select by resonance (harmonic alignment)
    // Low w3 = select by contrast (disruptive)
    if (w3 > 0.7) {
      // Stable witness: pick hexagram with most balanced trigrams
      const scored = house.map(h => ({
        hex: h,
        score: this.balanceScore(h)
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].hex;
    } else if (w3 < 0.3) {
      // Unstable witness: pick most disruptive hexagram
      const scored = house.map(h => ({
        hex: h,
        score: this.disruptionScore(h)
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].hex;
    } else {
      // Balanced: random within house
      return rng.choice(house);
    }
  }

  private balanceScore(hex: Hexagram): number {
    const upper = parseInt(hex.upperTrigram, 2);
    const lower = parseInt(hex.lowerTrigram, 2);
    return 1 - Math.abs(upper - lower) / 7; // 1 = perfectly balanced
  }

  private disruptionScore(hex: Hexagram): number {
    const upper = parseInt(hex.upperTrigram, 2);
    const lower = parseInt(hex.lowerTrigram, 2);
    return Math.abs(upper - lower) / 7; // 1 = maximally different
  }

  private evolveWState(current: WProfile, hex: Hexagram, kleinEval?: EvaluationResult): WProfile {
    const upperVal = parseInt(hex.upperTrigram, 2);
    const lowerVal = parseInt(hex.lowerTrigram, 2);
    const hexVal = (upperVal + lowerVal) / 2;

    // w1: impulse decays slightly each step (energy dissipates)
    const w1 = Math.max(0, current.w1 * 0.95);

    // w2: tension evolves based on hexagram contrast
    const contrast = Math.abs(upperVal - lowerVal) / 7;
    const w2 = current.w2 * 0.9 + contrast * 0.1;

    // w3: witness stabilizes or destabilizes
    const stability = this.balanceScore(hex);
    const w3 = current.w3 * 0.8 + stability * 0.2;

    // w4: context broadens with each step
    const w4 = Math.min(1, current.w4 + 0.05);

    // w5: meaning crystallizes based on Klein Tool intensity
    const kleinBoost = kleinEval ? kleinEval.result.intensity * 0.1 : 0;
    const w5 = Math.min(1, current.w5 + 0.03 + kleinBoost);

    return { w1, w2, w3, w4, w5 };
  }

  private scorePath(steps: NarrativeStep[], userW: WProfile): number {
    if (steps.length === 0) return 0;

    const final = steps[steps.length - 1].wState;

    // Score = alignment between final state and user's desired trajectory
    // High w5 = good (meaning crystallized)
    // Low w2 = good (tension resolved)
    // High w3 = good (witness stable)
    const meaningScore = final.w5;
    const tensionResolution = 1 - final.w2;
    const witnessStability = final.w3;
    const pathEfficiency = 1 / (1 + steps.length * 0.05); // shorter paths score higher

    return (meaningScore * 0.4 + tensionResolution * 0.3 + witnessStability * 0.2 + pathEfficiency * 0.1);
  }

  private classifyTrajectory(steps: NarrativeStep[]): 'mutation' | 'interference' | 'neutral' {
    if (steps.length < 2) return 'neutral';

    const startW5 = steps[0].wState.w5;
    const endW5 = steps[steps.length - 1].wState.w5;
    const delta = endW5 - startW5;

    if (delta > 0.2) return 'mutation';
    if (delta < -0.1) return 'interference';
    return 'neutral';
  }
}
