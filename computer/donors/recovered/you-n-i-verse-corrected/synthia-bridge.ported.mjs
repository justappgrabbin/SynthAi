/**
 * GENERATED FILE — mechanical TS->JS type-erasure transpile (esbuild transform, no logic changes).
 * Source: synthia-bridge.ts (canonical original in this directory)
 * Generated: 2026-09-22, esbuild 0.27.7. Adapter change: relative import specifiers rewritten to generated .ported.mjs filenames.
 */
const MICRO_BITS = {
  GATE: 6,
  // 64 gates
  LINE: 3,
  // 6 lines
  COLOR: 3,
  // 6 colors
  TONE: 3,
  // 6 tones
  BASE: 3
  // 5 bases (0-4, but we use 3 bits for alignment)
};
const MICRO_OFFSETS = {
  GATE: 0,
  LINE: 6,
  COLOR: 9,
  TONE: 12,
  BASE: 15
};
const MICRO_SIZE = 64 * 6 * 6 * 6 * 5;
function encodeMicro(addr) {
  const g = Math.max(0, Math.min(63, addr.gate));
  const l = Math.max(0, Math.min(5, addr.line));
  const c = Math.max(0, Math.min(5, addr.color));
  const t = Math.max(0, Math.min(5, addr.tone));
  const b = Math.max(0, Math.min(4, addr.base));
  return (((g * 6 + l) * 6 + c) * 6 + t) * 5 + b;
}
function decodeMicro(index) {
  const b = index % 5;
  index = Math.floor(index / 5);
  const t = index % 6;
  index = Math.floor(index / 6);
  const c = index % 6;
  index = Math.floor(index / 6);
  const l = index % 6;
  index = Math.floor(index / 6);
  const g = index;
  return { gate: g, line: l, color: c, tone: t, base: b };
}
const MACRO_SIZE = 13 * 5 * 12 * 12;
function encodeMacro(addr) {
  const p = Math.max(0, Math.min(12, addr.planet));
  const d = Math.max(0, Math.min(4, addr.dimension));
  const z = Math.max(0, Math.min(11, addr.zodiac));
  const h = Math.max(0, Math.min(11, addr.house));
  return ((p * 5 + d) * 12 + z) * 12 + h;
}
function decodeMacro(index) {
  const h = index % 12;
  index = Math.floor(index / 12);
  const z = index % 12;
  index = Math.floor(index / 12);
  const d = index % 5;
  index = Math.floor(index / 5);
  const p = index;
  return { planet: p, dimension: d, zodiac: z, house: h };
}
class Substrate {
  cells;
  // Sparse: only store activated cells
  PLANET_DIM_SLOTS = 65;
  // 13 planets × 5 dimensions
  constructor() {
    this.cells = /* @__PURE__ */ new Map();
  }
  /**
   * Get or create a cell at a micro address.
   */
  getCell(microIndex) {
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
    return this.cells.get(microIndex);
  }
  /**
   * Get activation slot index for a (planet, dimension) pair.
   */
  getSlot(planet, dimension) {
    return planet * 5 + dimension;
  }
  /**
   * Read activation at (micro, planet, dimension).
   */
  read(microIndex, planet, dimension) {
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
  write(microIndex, planet, dimension, values) {
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
  addEdge(fromMicro, fromMacro, toMicro, toMacro, weight, type) {
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
  getEdges(microIndex) {
    const cell = this.cells.get(microIndex);
    return cell ? cell.edges : [];
  }
  /**
   * Total activated cells.
   */
  getActiveCount() {
    return this.cells.size;
  }
}
const WH_MAP = {
  WHERE: { question: "WHERE", base: 0, dimension: 0, sense: "Seeing", keynote: "I Define" },
  WHAT: { question: "WHAT", base: 1, dimension: 1, sense: "Taste", keynote: "I Remember" },
  WHEN: { question: "WHEN", base: 2, dimension: 2, sense: "Touching", keynote: "I Am" },
  WHY: { question: "WHY", base: 3, dimension: 3, sense: "Smell", keynote: "I Design" },
  WHO: { question: "WHO", base: 4, dimension: 4, sense: "Hearing", keynote: "I Think" }
};
class WHExtractor {
  /**
   * Extract W-H from natural language input.
   */
  extract(input) {
    const lower = input.toLowerCase();
    if (lower.match(/\\b(where|place|location|position|direction)\\b/)) return WH_MAP.WHERE;
    if (lower.match(/\\b(what|thing|object|concept|idea)\\b/)) return WH_MAP.WHAT;
    if (lower.match(/\\b(when|time|moment|period|date)\\b/)) return WH_MAP.WHEN;
    if (lower.match(/\\b(why|reason|cause|purpose|motive)\\b/)) return WH_MAP.WHY;
    if (lower.match(/\\b(who|person|identity|self|being)\\b/)) return WH_MAP.WHO;
    return WH_MAP.WHERE;
  }
  /**
   * Extract W-H from coordinate syntax.
   * The base in the coordinate determines the entry point.
   */
  extractFromCoordinate(base) {
    const b = Math.max(0, Math.min(4, base - 1));
    const questions = ["WHERE", "WHAT", "WHEN", "WHY", "WHO"];
    return WH_MAP[questions[b]];
  }
}
class DimensionalPipeline {
  substrate;
  constructor(substrate) {
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
  execute(micro, macro2, entry) {
    const state = {
      micro,
      macro: macro2,
      emergent: { degree: 0, minute: 0, second: 0, arcSecond: 0 },
      amplitude: 0.5,
      // Start at neutral
      phase: 0,
      coherence: 0.5,
      stage: 0,
      entryBase: entry.base,
      intermediateResults: {}
    };
    state.amplitude = 0.3 + entry.base / 4 * 0.7;
    state.phase = entry.dimension / 4 * 2 * Math.PI;
    state = this.stageMovement(state);
    state = this.stageEvolution(state);
    state = this.stageBeing(state);
    state = this.stageDesign(state);
    state = this.stageSpace(state);
    return state;
  }
  stageMovement(state) {
    const gateFreq = (state.micro.gate + 1) / 64;
    const linePhase = Math.sin((state.micro.line + 1) * Math.PI / 6);
    state.amplitude = gateFreq * 0.5 + 0.5;
    state.phase = linePhase * Math.PI;
    state.stage = 0;
    state.intermediateResults.movement = { amplitude: state.amplitude, phase: state.phase };
    return state;
  }
  stageEvolution(state) {
    const colorRatio = (state.micro.color + 1) / 6;
    const toneFreq = (state.micro.tone + 1) / 6;
    const exaltation = state.amplitude * colorRatio;
    const detriment = state.amplitude * (1 - colorRatio);
    state.amplitude = Math.sqrt(
      exaltation ** 2 + detriment ** 2 + 2 * exaltation * detriment * Math.cos(toneFreq * Math.PI)
    );
    state.phase += toneFreq * Math.PI;
    state.stage = 1;
    state.intermediateResults.evolution = { exaltation, detriment, amplitude: state.amplitude };
    return state;
  }
  stageBeing(state) {
    const witnessPerspective = (state.micro.base + 1) / 5;
    const selfInterference = state.amplitude * Math.cos(state.phase);
    state.amplitude = Math.abs(selfInterference);
    state.phase = state.phase * witnessPerspective;
    state.stage = 2;
    state.intermediateResults.being = { witnessPerspective, selfInterference };
    return state;
  }
  stageDesign(state) {
    state.emergent.degree = state.phase / (2 * Math.PI) * 360;
    state.emergent.minute = state.micro.line * 10;
    state.emergent.second = state.micro.color * 10;
    state.emergent.arcSecond = state.micro.tone * 16 + state.micro.base * 3;
    state.stage = 3;
    state.intermediateResults.design = { ...state.emergent };
    return state;
  }
  stageSpace(state) {
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
    state.phase = 0;
    state.stage = 4;
    state.intermediateResults.space = { coherence: state.coherence, meaning: emergentMeaning };
    return state;
  }
}
class SynthiaBridge {
  substrate;
  pipeline;
  whExtractor;
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
  process(input, macro2) {
    const wh = typeof input === "string" ? this.whExtractor.extract(input) : this.whExtractor.extractFromCoordinate(input.base + 1);
    let micro;
    if (typeof input === "string") {
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
    const fullMacro = {
      planet: macro2?.planet ?? 0,
      dimension: macro2?.dimension ?? wh.dimension,
      zodiac: macro2?.zodiac ?? 0,
      house: macro2?.house ?? 0
    };
    const pipelineResult = this.pipeline.execute(micro, fullMacro, wh);
    const microIndex = encodeMicro(micro);
    this.substrate.write(microIndex, fullMacro.planet, fullMacro.dimension, {
      amplitude: pipelineResult.amplitude,
      phase: pipelineResult.phase,
      coherence: pipelineResult.coherence
    });
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
  generateOutput(state, wh) {
    const gateNames = [
      "The Creative",
      "The Receptive",
      "Difficulty at the Beginning",
      "Youthful Folly",
      "Waiting",
      "Conflict",
      "The Army",
      "Holding Together",
      "The Taming Power of the Small",
      "Treading",
      "Peace",
      "Standstill",
      "Fellowship with Men",
      "Possession in Great Measure",
      "Modesty",
      "Enthusiasm",
      "Following",
      "Work on What Has Been Spoiled",
      "Approach",
      "Contemplation",
      "Biting Through",
      "Grace",
      "Splitting Apart",
      "Return",
      "Innocence",
      "The Taming Power of the Great",
      "The Corners of the Mouth",
      "Preponderance of the Great",
      "The Abysmal",
      "The Clinging Fire",
      "Influence",
      "Duration",
      "Retreat",
      "The Power of the Great",
      "Progress",
      "Darkening of the Light",
      "The Family",
      "Opposition",
      "Obstruction",
      "Deliverance",
      "Decrease",
      "Increase",
      "Breakthrough",
      "Coming to Meet",
      "Gathering Together",
      "Pushing Upward",
      "Oppression",
      "The Well",
      "Revolution",
      "The Cauldron",
      "The Arousing",
      "Keeping Still",
      "Development",
      "The Marrying Maiden",
      "Abundance",
      "The Wanderer",
      "The Gentle",
      "The Joyous",
      "Dispersion",
      "Limitation",
      "Inner Truth",
      "Preponderance of the Small",
      "After Completion",
      "Before Completion"
    ];
    const lineNames = ["Investigator", "Hermit", "Martyr", "Opportunist", "Heretic", "Role Model"];
    const colorNames = ["Fear", "Hope", "Desire", "Need", "Guilt", "Innocence"];
    const toneNames = ["Security", "Uncertainty", "Action", "Meditation", "Judgement", "Acceptance"];
    const baseNames = ["Individuality", "Mind", "Body", "Ego", "Personality"];
    const dimNames = ["Movement", "Evolution", "Being", "Design", "Space"];
    const g = state.micro.gate;
    const l = state.micro.line;
    const c = state.micro.color;
    const t = state.micro.tone;
    const b = state.micro.base;
    return `${wh.keynote} (${wh.question}) \u2014 Gate ${g + 1} ${gateNames[g]} through ${lineNames[l]} expression. ${colorNames[c]} motivates, ${toneNames[t]} resonates, ${baseNames[b]} anchors. At ${state.emergent.degree.toFixed(1)}\xB0${state.emergent.minute}\u2032${state.emergent.second}\u2033${state.emergent.arcSecond}\u2034. Coherence: ${state.coherence.toFixed(3)}. Pipeline: ${dimNames.join(" \u2192 ")}.`;
  }
  /**
   * Get substrate statistics.
   */
  getStats() {
    const active = this.substrate.getActiveCount();
    const total = MICRO_SIZE * 65;
    const bytesPerCell = 65 * 4 * 3 + 65 * 4 + 64;
    const memory = active * bytesPerCell;
    return {
      activeCells: active,
      totalPossible: total,
      memoryEstimate: memory > 1024 * 1024 ? `${(memory / 1024 / 1024).toFixed(2)} MB` : `${(memory / 1024).toFixed(2)} KB`
    };
  }
}
var synthia_bridge_default = SynthiaBridge;
export {
  DimensionalPipeline,
  MACRO_SIZE,
  MICRO_BITS,
  MICRO_OFFSETS,
  MICRO_SIZE,
  Substrate,
  SynthiaBridge,
  WHExtractor,
  WH_MAP,
  decodeMacro,
  decodeMicro,
  synthia_bridge_default as default,
  encodeMacro,
  encodeMicro
};
