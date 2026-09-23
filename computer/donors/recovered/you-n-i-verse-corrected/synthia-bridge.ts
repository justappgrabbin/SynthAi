/**
 * SYNTIAOS ↔ YOU-N-I-VERSE BRIDGE
 * 
 * Integrates the SynthiaOS coordinate substrate with the YOU-N-I-VERSE 
 * graph-state transformation runtime.
 * 
 * Architecture:
 *   SynthiaOS:     address space, activation field, W-H extraction, convergence, transduction
 *   Bridge:        coordinate translation, materialization, dematerialization
 *   YNIV Engine:   evolving graph state, sequential dimensional operators, phase/coherence, semantic edges
 * 
 * Address Space:
 *   Micro:  gate × line × color × tone × base = 69,120 positions (17 bits)
 *   Macro:  planet × dimension × zodiac × house = 9,360 positions (14 bits)  
 *   Emergent: degree × minute × second × arcSecond = 129,600,000 positions (27 bits)
 * 
 * The 5 bases (not 6):
 *   Base 1: Individuality — Where? — Seeing — "I Define" — Movement
 *   Base 2: Mind — What? — Taste — "I Remember" — Evolution
 *   Base 3: Body — When? — Touching — "I Am" — Being
 *   Base 4: Ego — Why? — Smell — "I Design" — Design
 *   Base 5: Personality — Who? — Hearing — "I Think" — Space
 * 
 * W-H Mapping → Dimensional Entry Point:
 *   WHERE → Movement (Base 1) → full pipeline Movement→Evolution→Being→Design→Space
 *   WHAT  → Evolution (Base 2) → full pipeline Movement→Evolution→Being→Design→Space
 *   WHEN  → Being (Base 3) → full pipeline Movement→Evolution→Being→Design→Space
 *   WHY   → Design (Base 4) → full pipeline Movement→Evolution→Being→Design→Space
 *   WHO   → Space (Base 5) → full pipeline Movement→Evolution→Being→Design→Space
 * 
 * The W-H determines WHICH INFORMATION enters the pipeline, not which dimension executes.
 * ALL 5 dimensions ALWAYS execute sequentially.
 */

// ============================================================================
// ADDRESS SPACE (SynthiaOS Layer)
// ============================================================================

/**
 * Micro Address: gate × line × color × tone × base = 69,120 positions
 * 
 * Bits: 6 + 3 + 3 + 3 + 2 = 17 bits (fits in 32-bit integer)
 *   gate:  6 bits (0-63, 0 = Gate 1)
 *   line:  3 bits (0-5, 0 = Line 1)
 *   color: 3 bits (0-5, 0 = Color 1)
 *   tone:  3 bits (0-5, 0 = Tone 1)
 *   base:  2 bits (0-4, 0 = Base 1)
 */

export interface MicroAddress {
  gate: number;   // 0-63 (Gate 1-64)
  line: number;   // 0-5 (Line 1-6)
  color: number;  // 0-5 (Color 1-6)
  tone: number;   // 0-5 (Tone 1-6)
  base: number;   // 0-4 (Base 1-5) ← CORRECTED: 5 bases, not 6
}

export const MICRO_BITS = {
  GATE: 6,   // 64 gates
  LINE: 3,   // 6 lines
  COLOR: 3,  // 6 colors
  TONE: 3,   // 6 tones
  BASE: 3    // 5 bases (0-4, but we use 3 bits for alignment)
};

export const MICRO_OFFSETS = {
  GATE: 0,
  LINE: 6,
  COLOR: 9,
  TONE: 12,
  BASE: 15
};

export const MICRO_SIZE = 64 * 6 * 6 * 6 * 5; // 69,120

/**
 * Encode micro address to compact index (0 to 69,119).
 */
export function encodeMicro(addr: MicroAddress): number {
  const g = Math.max(0, Math.min(63, addr.gate));
  const l = Math.max(0, Math.min(5, addr.line));
  const c = Math.max(0, Math.min(5, addr.color));
  const t = Math.max(0, Math.min(5, addr.tone));
  const b = Math.max(0, Math.min(4, addr.base));  // 5 bases: 0-4

  return (((g * 6 + l) * 6 + c) * 6 + t) * 5 + b;
}

/**
 * Decode compact index to micro address.
 */
export function decodeMicro(index: number): MicroAddress {
  const b = index % 5;  index = Math.floor(index / 5);
  const t = index % 6;  index = Math.floor(index / 6);
  const c = index % 6;  index = Math.floor(index / 6);
  const l = index % 6;  index = Math.floor(index / 6);
  const g = index;

  return { gate: g, line: l, color: c, tone: t, base: b };
}

/**
 * Macro Address: planet × dimension × zodiac × house = 9,360 positions
 * 
 * These are CONTEXTUAL coordinates, not part of the 69,120 identity.
 * They determine the lens through which the micro coordinate is viewed.
 * 
 * Bits: 4 + 3 + 4 + 4 = 15 bits
 *   planet:    4 bits (0-12, 13 planets)
 *   dimension: 3 bits (0-4, 5 dimensions)
 *   zodiac:    4 bits (0-11, 12 signs)
 *   house:     4 bits (0-11, 12 houses)
 */

export interface MacroAddress {
  planet: number;     // 0-12 (13 planets)
  dimension: number;  // 0-4 (5 dimensions)
  zodiac: number;     // 0-11 (12 signs)
  house: number;      // 0-11 (12 houses)
}

export const MACRO_SIZE = 13 * 5 * 12 * 12; // 9,360

export function encodeMacro(addr: MacroAddress): number {
  const p = Math.max(0, Math.min(12, addr.planet));
  const d = Math.max(0, Math.min(4, addr.dimension));
  const z = Math.max(0, Math.min(11, addr.zodiac));
  const h = Math.max(0, Math.min(11, addr.house));

  return ((p * 5 + d) * 12 + z) * 12 + h;
}

export function decodeMacro(index: number): MacroAddress {
  const h = index % 12;  index = Math.floor(index / 12);
  const z = index % 12;  index = Math.floor(index / 12);
  const d = index % 5;   index = Math.floor(index / 5);
  const p = index;

  return { planet: p, dimension: d, zodiac: z, house: h };
}

/**
 * Emergent Address: degree × minute × second × arcSecond
 * 
 * These are COMPUTED, not stored. They emerge from the interaction of
 * micro and macro coordinates with the current state.
 * 
 * degree:     0-360 (9 bits)
 * minute:     0-60 (6 bits)
 * second:     0-60 (6 bits)
 * arcSecond:  0-99 (7 bits)
 * 
 * Total: 28 bits. These are NOT part of the substrate identity.
 * They are derived properties.
 */

export interface EmergentAddress {
  degree: number;     // 0-360
  minute: number;   // 0-60
  second: number;   // 0-60
  arcSecond: number; // 0-99
}

// ============================================================================
// SUBSTRATE (Fixed Computational Mesh)
// ============================================================================

/**
 * The substrate is a fixed 69,120-position activation field.
 * Each position stores:
 *   - amplitude: Float32 (0-1)
 *   - phase: Float32 (0-2π)
 *   - coherence: Float32 (0-1)
 *   - timestamp: Uint32 (last update time)
 * 
 * The substrate is indexed by micro address ONLY.
 * Macro coordinates provide the contextual lens.
 * 
 * To avoid collisions between planet/dimension combinations,
 * we use a SEPARATE substrate per (planet, dimension) pair,
 * OR we use a single substrate with macro-indexed lookup.
 * 
 * Approach: Single substrate, but each cell stores 13×5 = 65 activation slots.
 * This is: 69,120 × 65 × 4 bytes = ~18 MB for amplitude alone.
 * Alternative: Sparse representation — only activate cells that are queried.
 */

export interface SubstrateCell {
  microIndex: number;           // 0-69,119
  activations: Float32Array;    // 65 slots (13 planets × 5 dimensions)
  phases: Float32Array;         // 65 slots
  coherences: Float32Array;     // 65 slots
  timestamps: Uint32Array;      // 65 slots
  edges: EdgeRef[];            // Dynamic edges from this cell
}

export interface EdgeRef {
  targetMicroIndex: number;
  targetMacroIndex: number;
  weight: number;
  type: 'channel' | 'harmonic' | 'transit' | 'dimensional' | 'feedback';
}

export class Substrate {
  private cells: Map<number, SubstrateCell>;  // Sparse: only store activated cells
  private readonly PLANET_DIM_SLOTS = 65;     // 13 planets × 5 dimensions

  constructor() {
    this.cells = new Map();
  }

  /**
   * Get or create a cell at a micro address.
   */
  getCell(microIndex: number): SubstrateCell {
    if (!this.cells.has(microIndex)) {
      this.cells.set(microIndex, {
        microIndex,
        activations: new Float32Array(this.PLANET_DIM_SLOTS),
        phases: new Float32Array(this.PLANET_DIM_SLOTS),
        coherences: new Float32Array(this.PLANET_DIM_SLOTS),
        timestamps: new Uint32Array(this.PLANET_DIM_SLOTS),
        edges: []
      });
    }
    return this.cells.get(microIndex)!;
  }

  /**
   * Get activation slot index for a (planet, dimension) pair.
   */
  private getSlot(planet: number, dimension: number): number {
    return planet * 5 + dimension;  // 0-64
  }

  /**
   * Read activation at (micro, planet, dimension).
   */
  read(microIndex: number, planet: number, dimension: number): {
    amplitude: number;
    phase: number;
    coherence: number;
    timestamp: number;
  } {
    const cell = this.cells.get(microIndex);
    if (!cell) return { amplitude: 0, phase: 0, coherence: 0, timestamp: 0 };

    const slot = this.getSlot(planet, dimension);
    return {
      amplitude: cell.activations[slot],
      phase: cell.phases[slot],
      coherence: cell.coherences[slot],
      timestamp: cell.timestamps[slot]
    };
  }

  /**
   * Write activation at (micro, planet, dimension).
   */
  write(microIndex: number, planet: number, dimension: number, values: {
    amplitude: number;
    phase: number;
    coherence: number;
  }): void {
    const cell = this.getCell(microIndex);
    const slot = this.getSlot(planet, dimension);

    cell.activations[slot] = values.amplitude;
    cell.phases[slot] = values.phase;
    cell.coherences[slot] = values.coherence;
    cell.timestamps[slot] = Date.now();
  }

  /**
   * Add edge between two substrate positions.
   */
  addEdge(fromMicro: number, fromMacro: number, toMicro: number, toMacro: number, weight: number, type: EdgeRef['type']): void {
    const cell = this.getCell(fromMicro);
    cell.edges.push({
      targetMicroIndex: toMicro,
      targetMacroIndex: toMacro,
      weight,
      type
    });
  }

  /**
   * Get all edges from a cell.
   */
  getEdges(microIndex: number): EdgeRef[] {
    const cell = this.cells.get(microIndex);
    return cell ? cell.edges : [];
  }

  /**
   * Total activated cells.
   */
  getActiveCount(): number {
    return this.cells.size;
  }
}

// ============================================================================
// W-H EXTRACTOR (Entry Point Determination)
// ============================================================================

/**
 * W-H (Where-What-When-Why-Who) maps to the 5 bases and determines
 * which information enters the dimensional pipeline.
 * 
 * WHERE → Base 1 (Individuality) → Movement entry
 * WHAT  → Base 2 (Mind) → Evolution entry
 * WHEN  → Base 3 (Body) → Being entry
 * WHY   → Base 4 (Ego) → Design entry
 * WHO   → Base 5 (Personality) → Space entry
 * 
 * The entry point determines the INITIAL CONDITIONS of the pipeline,
 * but ALL 5 dimensions ALWAYS execute sequentially.
 */

export type WHQuestion = 'WHERE' | 'WHAT' | 'WHEN' | 'WHY' | 'WHO';

export interface WHEntry {
  question: WHQuestion;
  base: number;        // 0-4 (Base 1-5)
  dimension: number;   // 0-4 (Movement-Evolution-Being-Design-Space)
  sense: string;        // Seeing, Taste, Touching, Smell, Hearing
  keynote: string;      // "I Define", "I Remember", "I Am", "I Design", "I Think"
}

export const WH_MAP: Record<WHQuestion, WHEntry> = {
  WHERE: { question: 'WHERE', base: 0, dimension: 0, sense: 'Seeing', keynote: 'I Define' },
  WHAT:  { question: 'WHAT',  base: 1, dimension: 1, sense: 'Taste', keynote: 'I Remember' },
  WHEN:  { question: 'WHEN',  base: 2, dimension: 2, sense: 'Touching', keynote: 'I Am' },
  WHY:   { question: 'WHY',   base: 3, dimension: 3, sense: 'Smell', keynote: 'I Design' },
  WHO:   { question: 'WHO',   base: 4, dimension: 4, sense: 'Hearing', keynote: 'I Think' }
};

export class WHExtractor {
  /**
   * Extract W-H from natural language input.
   */
  extract(input: string): WHEntry {
    const lower = input.toLowerCase();

    if (lower.match(/\\b(where|place|location|position|direction)\\b/)) return WH_MAP.WHERE;
    if (lower.match(/\\b(what|thing|object|concept|idea)\\b/)) return WH_MAP.WHAT;
    if (lower.match(/\\b(when|time|moment|period|date)\\b/)) return WH_MAP.WHEN;
    if (lower.match(/\\b(why|reason|cause|purpose|motive)\\b/)) return WH_MAP.WHY;
    if (lower.match(/\\b(who|person|identity|self|being)\\b/)) return WH_MAP.WHO;

    // Default: WHERE (most common entry point)
    return WH_MAP.WHERE;
  }

  /**
   * Extract W-H from coordinate syntax.
   * The base in the coordinate determines the entry point.
   */
  extractFromCoordinate(base: number): WHEntry {
    const b = Math.max(0, Math.min(4, base - 1));  // Convert 1-5 to 0-4
    const questions: WHQuestion[] = ['WHERE', 'WHAT', 'WHEN', 'WHY', 'WHO'];
    return WH_MAP[questions[b]];
  }
}

// ============================================================================
// DIMENSIONAL PIPELINE (Sequential Execution)
// ============================================================================

/**
 * ALL 5 dimensions ALWAYS execute sequentially, regardless of entry point.
 * The entry point only determines INITIAL CONDITIONS.
 * 
 * Pipeline: Movement → Evolution → Being → Design → Space
 * 
 * Each stage transforms the state and produces intermediate results.
 */

export interface PipelineState {
  micro: MicroAddress;
  macro: MacroAddress;
  emergent: EmergentAddress;
  amplitude: number;
  phase: number;
  coherence: number;
  stage: number;  // 0-4 (which dimension is currently executing)
  entryBase: number;  // 0-4 (which W-H base was the entry point)
  intermediateResults: Record<string, any>;
}

export class DimensionalPipeline {
  private substrate: Substrate;

  constructor(substrate: Substrate) {
    this.substrate = substrate;
  }

  /**
   * Execute the FULL 5-stage pipeline.
   * 
   * @param micro Micro address (identity)
   * @param macro Macro address (context)
   * @param entry Which W-H base entered the pipeline (determines initial conditions)
   * @returns Final pipeline state after all 5 stages
   */
  execute(micro: MicroAddress, macro: MacroAddress, entry: WHEntry): PipelineState {
    const state: PipelineState = {
      micro,
      macro,
      emergent: { degree: 0, minute: 0, second: 0, arcSecond: 0 },
      amplitude: 0.5,  // Start at neutral
      phase: 0,
      coherence: 0.5,
      stage: 0,
      entryBase: entry.base,
      intermediateResults: {}
    };

    // Apply initial conditions based on entry point
    state.amplitude = 0.3 + (entry.base / 4) * 0.7;  // Entry base biases initial amplitude
    state.phase = (entry.dimension / 4) * 2 * Math.PI;  // Entry dimension biases initial phase

    // Stage 0: Movement — Create impulse
    state = this.stageMovement(state);

    // Stage 1: Evolution — Apply polarity
    state = this.stageEvolution(state);

    // Stage 2: Being — Create witness
    state = this.stageBeing(state);

    // Stage 3: Design — Add context
    state = this.stageDesign(state);

    // Stage 4: Space — Generate meaning
    state = this.stageSpace(state);

    return state;
  }

  private stageMovement(state: PipelineState): PipelineState {
    // Movement creates impulse from gate frequency and line phase
    const gateFreq = (state.micro.gate + 1) / 64;
    const linePhase = Math.sin((state.micro.line + 1) * Math.PI / 6);

    state.amplitude = gateFreq * 0.5 + 0.5;
    state.phase = linePhase * Math.PI;
    state.stage = 0;
    state.intermediateResults.movement = { amplitude: state.amplitude, phase: state.phase };

    return state;
  }

  private stageEvolution(state: PipelineState): PipelineState {
    // Evolution applies polarity from color and tone
    const colorRatio = (state.micro.color + 1) / 6;
    const toneFreq = (state.micro.tone + 1) / 6;

    const exaltation = state.amplitude * colorRatio;
    const detriment = state.amplitude * (1 - colorRatio);

    state.amplitude = Math.sqrt(
      exaltation**2 + detriment**2 + 
      2 * exaltation * detriment * Math.cos(toneFreq * Math.PI)
    );
    state.phase += toneFreq * Math.PI;
    state.stage = 1;
    state.intermediateResults.evolution = { exaltation, detriment, amplitude: state.amplitude };

    return state;
  }

  private stageBeing(state: PipelineState): PipelineState {
    // Being creates witness from base perspective
    const witnessPerspective = (state.micro.base + 1) / 5;
    const selfInterference = state.amplitude * Math.cos(state.phase);

    state.amplitude = Math.abs(selfInterference);
    state.phase = state.phase * witnessPerspective;
    state.stage = 2;
    state.intermediateResults.being = { witnessPerspective, selfInterference };

    return state;
  }

  private stageDesign(state: PipelineState): PipelineState {
    // Design adds contextual coordinates from macro address
    state.emergent.degree = (state.phase / (2 * Math.PI)) * 360;
    state.emergent.minute = state.micro.line * 10;  // Line maps to minute
    state.emergent.second = state.micro.color * 10;  // Color maps to second
    state.emergent.arcSecond = state.micro.tone * 16 + state.micro.base * 3;  // Tone+Base → arcSecond

    state.stage = 3;
    state.intermediateResults.design = { ...state.emergent };

    return state;
  }

  private stageSpace(state: PipelineState): PipelineState {
    // Space generates meaning from substrate edges
    const microIndex = encodeMicro(state.micro);
    const slot = macro.planet * 5 + macro.dimension;
    const edges = this.substrate.getEdges(microIndex);

    let emergentMeaning = 0;
    let totalWeight = 0;

    for (const edge of edges) {
      const targetState = this.substrate.read(edge.targetMicroIndex, macro.planet, macro.dimension);
      emergentMeaning += edge.weight * targetState.coherence;
      totalWeight += Math.abs(edge.weight);
    }

    state.coherence = totalWeight > 0 ? Math.abs(emergentMeaning) / totalWeight : state.coherence;
    state.amplitude = state.coherence * state.amplitude;
    state.phase = 0;  // Meaning has no phase — scalar closure
    state.stage = 4;
    state.intermediateResults.space = { coherence: state.coherence, meaning: emergentMeaning };

    return state;
  }
}

// ============================================================================
// BRIDGE (SynthiaOS ↔ YNIV Engine)
// ============================================================================

export class SynthiaBridge {
  private substrate: Substrate;
  private pipeline: DimensionalPipeline;
  private whExtractor: WHExtractor;

  constructor() {
    this.substrate = new Substrate();
    this.pipeline = new DimensionalPipeline(this.substrate);
    this.whExtractor = new WHExtractor();
  }

  /**
   * Main entry point: process a query through the full system.
   * 
   * Flow:
   *   1. Extract W-H from input
   *   2. Parse/construct micro and macro addresses
   *   3. Execute 5-stage dimensional pipeline
   *   4. Materialize graph node from pipeline result
   *   5. Generate semantic edges
   *   6. Write activation back to substrate
   *   7. Return compiled output
   */
  process(input: string | MicroAddress, macro?: Partial<MacroAddress>): {
    micro: MicroAddress;
    macro: MacroAddress;
    emergent: EmergentAddress;
    pipeline: PipelineState;
    output: string;
  } {
    // Step 1: Extract W-H
    const wh = typeof input === 'string' 
      ? this.whExtractor.extract(input)
      : this.whExtractor.extractFromCoordinate(input.base + 1);

    // Step 2: Parse addresses
    let micro: MicroAddress;
    if (typeof input === 'string') {
      // Try to parse coordinate from string
      const coordMatch = input.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?/);
      if (coordMatch) {
        micro = {
          gate: (parseInt(coordMatch[1]) || 1) - 1,
          line: (parseInt(coordMatch[2]) || 1) - 1,
          color: (parseInt(coordMatch[3]) || 1) - 1,
          tone: (parseInt(coordMatch[4]) || 1) - 1,
          base: Math.max(0, Math.min(4, (parseInt(coordMatch[5]) || 1) - 1))
        };
      } else {
        micro = { gate: 0, line: 0, color: 0, tone: 0, base: wh.base };
      }
    } else {
      micro = input;
    }

    const fullMacro: MacroAddress = {
      planet: macro?.planet ?? 0,
      dimension: macro?.dimension ?? wh.dimension,
      zodiac: macro?.zodiac ?? 0,
      house: macro?.house ?? 0
    };

    // Step 3: Execute pipeline
    const pipelineResult = this.pipeline.execute(micro, fullMacro, wh);

    // Step 4-6: Write to substrate
    const microIndex = encodeMicro(micro);
    this.substrate.write(microIndex, fullMacro.planet, fullMacro.dimension, {
      amplitude: pipelineResult.amplitude,
      phase: pipelineResult.phase,
      coherence: pipelineResult.coherence
    });

    // Step 7: Generate output
    const output = this.generateOutput(pipelineResult, wh);

    return {
      micro,
      macro: fullMacro,
      emergent: pipelineResult.emergent,
      pipeline: pipelineResult,
      output
    };
  }

  /**
   * Generate human-readable output from pipeline result.
   */
  private generateOutput(state: PipelineState, wh: WHEntry): string {
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
    const baseNames = ['Individuality', 'Mind', 'Body', 'Ego', 'Personality'];
    const dimNames = ['Movement', 'Evolution', 'Being', 'Design', 'Space'];

    const g = state.micro.gate;
    const l = state.micro.line;
    const c = state.micro.color;
    const t = state.micro.tone;
    const b = state.micro.base;

    return `${wh.keynote} (${wh.question}) — Gate ${g + 1} ${gateNames[g]} through ${lineNames[l]} expression. ${colorNames[c]} motivates, ${toneNames[t]} resonates, ${baseNames[b]} anchors. At ${state.emergent.degree.toFixed(1)}°${state.emergent.minute}′${state.emergent.second}″${state.emergent.arcSecond}‴. Coherence: ${state.coherence.toFixed(3)}. Pipeline: ${dimNames.join(' → ')}.`;
  }

  /**
   * Get substrate statistics.
   */
  getStats(): {
    activeCells: number;
    totalPossible: number;
    memoryEstimate: string;
  } {
    const active = this.substrate.getActiveCount();
    const total = MICRO_SIZE * 65;  // 69,120 × 65 slots
    const bytesPerCell = 65 * 4 * 3 + 65 * 4 + 64;  // activations + phases + coherences + timestamps + edges
    const memory = active * bytesPerCell;

    return {
      activeCells: active,
      totalPossible: total,
      memoryEstimate: memory > 1024 * 1024 
        ? `${(memory / 1024 / 1024).toFixed(2)} MB`
        : `${(memory / 1024).toFixed(2)} KB`
    };
  }
}

export default SynthiaBridge;
