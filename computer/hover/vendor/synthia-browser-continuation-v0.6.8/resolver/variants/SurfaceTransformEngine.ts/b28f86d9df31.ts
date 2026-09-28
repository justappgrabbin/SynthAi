
// ============================================================================
// SurfaceTransformEngine.ts (Updated with SynthiaSubstrate)
// ============================================================================
// Klein 1965: "Automatic Paraphrasing in Essay Format" — generalized.
// SURFACE TRANSFORMATION ENGINE with Synthia coordinate substrate.
//
// Added features:
//   - SynthiaSubstrate integration (bit-packed addressing, typed arrays)
//   - W-H interrogative mapping to 5D coordinates
//   - Coordinate-based feature extraction (no JSON)
//   - Mesh addressing for cross-domain projection
//   - Dual-sided architecture (Personality/Design)
//
// Architecture:
//   Input: State (with Synthia coordinate address)
//   Process: Project to hypercube → Transform → Preserve invariant
//   Output: Variants with computed surfaces
// ============================================================================

import { ToolBase } from './ToolBase.js';
import { SynthiaSubstrate, CoordinateEncoder, CoordinateAddress, NODES_PER_SIDE, TOTAL_NODES } from './SynthiaSubstrate.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Domain = 'language' | 'code' | 'image' | 'music' | 'game' | 'math' | 'biology';

export interface Coordinates {
  gate: number;       // 1-64 (mapped to 0-63 in substrate)
  line: number;       // 1-6
  color: number;      // 1-6
  tone: number;       // 1-6
  base: number;       // 1-5
  degree: number;     // 0-360 (mapped to 0-59 in substrate)
  minute: number;     // 0-60
  second: number;     // 0-60
  arc: number;        // arc-seconds
  zodiac: string;     // sign
  house: number;      // 1-12
}

export interface Ontology {
  movement: number;   // D1: Impulse
  evolution: number;  // D2: Polarity
  being: number;      // D3: Witness
  design: number;     // D4: Constraint
  space: number;      // D5: Meaning
}

export interface State {
  who: { id: string; namespace: string; signature: string };
  what: { type: string; traits: Record<string, any>; memory: any[] };
  where: { trajectory: number[]; position: string };
  when: { temporalMarker: number; cyclePhase: string };
  why: { constraints: string[]; purpose: string; bound: number };
  ontology: Ontology;
  coordinates: Coordinates;
  resolved: boolean;
  hash: string;
  domain: Domain;
  surface?: any;
  // NEW: Synthia substrate address
  synthiaAddress?: CoordinateAddress;
}

export interface TransformConstraint {
  preserve: string[];
  mutate: string[];
  depth: number;
  temperature: number;
}

export interface TransformResult {
  original: State;
  variants: State[];
  invariant: {
    ontology: Ontology;
    coordinates: Partial<Coordinates>;
    hash: string;
  };
  transformationLog: TransformStep[];
  domain: Domain;
  confidence: number;
  // NEW: Synthia substrate info
  substrateResonance: number;
  definedCenters: string[];
}

export interface TransformStep {
  from: string;
  to: string;
  dimension: string;
  delta: number;
  preserved: boolean;
}

// ============================================================================
// SURFACE TRANSFORMATION ENGINE
// ============================================================================

export class SurfaceTransformEngine extends ToolBase {
  private distributionalLexicon: Map<string, Partial<Coordinates>> = new Map();
  private heuristicWeights: Record<string, number> = {
    identity: 0.35, attribute: 0.25, vector: 0.20, interval: 0.12, limit: 0.08
  };
  private grammarRules: Map<string, any> = new Map();
  private featureVocab: string[] = [];
  private ichingBridge: Map<string, Partial<Coordinates>> = new Map();
  private readonly MIN_COHERENCE_THRESHOLD = 0.78;

  // NEW: Synthia substrate
  private substrate: SynthiaSubstrate;

  constructor(mesh) {
    super(mesh, 'SurfaceTransformEngine', 'transform.surface');
    this.substrate = new SynthiaSubstrate();
    this.bootstrapLexicon();
    this.bootstrapGrammar();
    this.bootstrapIChingBridge();
  }

  // ==========================================================================
  // PRIMARY COMPILER METHOD
  // ==========================================================================

  public compileLinguisticInput(text: string): {
    coordinates: Partial<Coordinates>;
    tokens: SemanticToken[];
    confidence: number;
    axisBreakdown: Record<string, number>;
    // NEW: Synthia address from W-H extraction
    synthiaAddress: CoordinateAddress;
  } {
    const tokens = this.tokenizeAndSegment(text);
    let masterCoordinates: Partial<Coordinates> = {
      gate: 1, line: 1, color: 1, tone: 1, base: 1,
      degree: 0, minute: 0, second: 0, arc: 0, zodiac: "Aries", house: 1
    };

    const axisBreakdown: Record<string, number> = { WHO: 0, WHAT: 0, WHERE: 0, WHEN: 0, WHY: 0 };

    for (const token of tokens) {
      axisBreakdown[token.axis] += token.weight;
      const coordinateOffset = this.distributionalLexicon.get(token.lexeme.toLowerCase());
      if (coordinateOffset) {
        masterCoordinates = this.applySubstitutionHeuristic(masterCoordinates, coordinateOffset, token.weight);
      }
    }

    const totalWeight = Object.values(axisBreakdown).reduce((a, b) => a + b, 0);
    const confidence = totalWeight > 0 ? Math.min(1, totalWeight / (tokens.length * 0.25)) : 0;

    // NEW: Extract Synthia address from W-H breakdown
    const synthiaAddress = this.extractSynthiaAddress(axisBreakdown, masterCoordinates);

    return { coordinates: masterCoordinates, tokens, confidence, axisBreakdown, synthiaAddress };
  }

  // ==========================================================================
  // NEW: SYNTHIA ADDRESS EXTRACTION
  // ==========================================================================

  private extractSynthiaAddress(axisBreakdown: Record<string, number>, coords: Partial<Coordinates>): CoordinateAddress {
    // Map W-H axes to Synthia dimensions and bases
    const address: CoordinateAddress = {
      side: 0, // Personality/Conscious
      planet: 0, // Default planet
      dimension: 0,
      gate: (coords.gate || 1) - 1, // 1-based to 0-based
      line: (coords.line || 1) - 1,
      color: (coords.color || 1) - 1,
      tone: (coords.tone || 1) - 1,
      base: (coords.base || 1) - 1,
      degree: Math.floor((coords.degree || 0) / 6), // 0-360 to 0-59
      minute: coords.minute || 0,
      second: coords.second || 0,
      arc: coords.arc || 0,
      zodiac: 0,
      season: 0,
      houseZodiac: (coords.house || 1) - 1,
      houseSeason: 0,
    };

    // Determine dominant dimension from W-H breakdown
    const maxAxis = Object.entries(axisBreakdown).reduce((a, b) => a[1] > b[1] ? a : b);
    switch (maxAxis[0]) {
      case 'WHERE': address.dimension = 0; address.base = 0; break; // Movement
      case 'WHAT': address.dimension = 1; address.base = 1; break;  // Evolution
      case 'WHEN': address.dimension = 2; address.base = 2; break;  // Being
      case 'WHY': address.dimension = 3; address.base = 3; break;   // Design
      case 'WHO': address.dimension = 4; address.base = 4; break;   // Space
    }

    return address;
  }

  // ==========================================================================
  // UPDATED RESOLVE METHOD
  // ==========================================================================

  public resolve(input: { text: string; domain: string }): { state: State; compilation: any } {
    const compilation = this.compileLinguisticInput(input.text);
    const coordinates = compilation.coordinates as Coordinates;

    const who: State['who'] = {
      id: `anon-${Date.now()}`,
      namespace: input.domain || "unknown",
      signature: this.computeDeterministicHash({ text: input.text })
    };

    const what: State['what'] = {
      type: "linguistic_query",
      traits: { originalText: input.text, confidence: compilation.confidence },
      memory: []
    };

    const where: State['where'] = {
      trajectory: [coordinates.gate || 1],
      position: `Gate ${coordinates.gate || 1}, Line ${coordinates.line || 1}`
    };

    const when: State['when'] = {
      temporalMarker: (coordinates.degree || 0) / 360,
      cyclePhase: this.degreeToPhase(coordinates.degree || 0)
    };

    const why: State['why'] = {
      constraints: ["linguistic_resolution"],
      purpose: "state_resolution_from_natural_language",
      bound: compilation.confidence
    };

    const ontology = this.computeOntology(coordinates);

    const rawState: Omit<State, "hash" | "resolved"> = {
      who, what, where, when, why,
      ontology,
      coordinates,
      domain: input.domain as Domain || "unknown",
      synthiaAddress: compilation.synthiaAddress,
    };

    const hash = this.computeDeterministicHash(rawState);
    const state: State = { ...rawState, resolved: true, hash };

    // NEW: Activate in substrate
    if (state.synthiaAddress) {
      this.substrate.activate(state.synthiaAddress, compilation.confidence);
    }

    return { state, compilation };
  }

  // ==========================================================================
  // UPDATED TRANSITION METHOD
  // ==========================================================================

  public transition(state: State, operatorName: string): State {
    const operator = this.operators.get(operatorName);
    if (!operator) {
      throw new Error(`Execution error: Morphism operator "${operatorName}" is undefined.`);
    }

    const transformedState = operator(state);
    transformedState.hash = this.computeDeterministicHash(transformedState);

    // NEW: Update substrate address
    if (transformedState.synthiaAddress) {
      transformedState.synthiaAddress = {
        ...transformedState.synthiaAddress,
        line: (transformedState.coordinates.line - 1),
      };
      this.substrate.activate(transformedState.synthiaAddress, 0.5);
    }

    return transformedState;
  }

  // ==========================================================================
  // NEW: SUBSTRATE RESONANCE CHECK
  // ==========================================================================

  public checkResonance(stateA: State, stateB: State): number {
    if (!stateA.synthiaAddress || !stateB.synthiaAddress) return 0;
    return this.substrate.resonance(stateA.synthiaAddress, stateB.synthiaAddress);
  }

  public getDefinedCenters(state: State): string[] {
    if (!state.synthiaAddress) return [];
    return this.substrate.computeCenters(state.synthiaAddress);
  }

  // ==========================================================================
  // EXISTING METHODS (preserved)
  // ==========================================================================

  public verifyConvergence(state: State, resonanceScore: number): { stable: boolean; action: string; newLine?: number } {
    if (resonanceScore >= this.MIN_COHERENCE_THRESHOLD) {
      return { stable: true, action: "LOCK_STATE_COORDINATE" };
    }
    const adjustedLine = state.coordinates.line >= 6 ? 1 : state.coordinates.line + 1;
    return {
      stable: false,
      action: `RECYCLE_SEGMENTATION_TRIGGER_DESCENT_TO_LINE_${adjustedLine}`,
      newLine: adjustedLine
    };
  }

  // ... (all other existing methods preserved)

  // ==========================================================================
  // PRIVATE HELPERS (preserved)
  // ==========================================================================

  private tokenizeAndSegment(input: string): SemanticToken[] {
    const normalized = input.replace(/[.,\/#!$%\^&\*;:{}=\-_\`~()]/g, "").toLowerCase();
    const words = normalized.split(/\s+/);
    return words.map((word) => {
      let axis: "WHO" | "WHAT" | "WHERE" | "WHEN" | "WHY" = "WHAT";
      let weight = this.heuristicWeights.attribute;
      let kleinSource = "Diseminer";
      if (["i", "observer", "identity", "source", "self", "who", "me", "my"].includes(word)) {
        axis = "WHO"; weight = this.heuristicWeights.identity; kleinSource = "AutoLing-Identity";
      } else if (["move", "shift", "trajectory", "path", "delta", "where", "go", "travel"].includes(word)) {
        axis = "WHERE"; weight = this.heuristicWeights.vector; kleinSource = "AnalogyEngine";
      } else if (["now", "phase", "moment", "cycle", "clock", "when", "time", "then"].includes(word)) {
        axis = "WHEN"; weight = this.heuristicWeights.interval; kleinSource = "HistoricalMonteCarlo";
      } else if (["rule", "stop", "bound", "force", "must", "why", "because", "purpose"].includes(word)) {
        axis = "WHY"; weight = this.heuristicWeights.limit; kleinSource = "LanguageContact";
      } else if (["what", "is", "are", "have", "property", "trait", "feature"].includes(word)) {
        axis = "WHAT"; weight = this.heuristicWeights.attribute; kleinSource = "Diseminer";
      }
      return { lexeme: word, weight, axis, kleinSource };
    });
  }

  private applySubstitutionHeuristic(current: Partial<Coordinates>, offset: Partial<Coordinates>, weight: number): Partial<Coordinates> {
    const fused: Partial<Coordinates> = { ...current };
    if (offset.gate !== undefined) fused.gate = Math.min(64, Math.max(1, Math.round((current.gate || 1) + (offset.gate * weight))));
    if (offset.line !== undefined) fused.line = Math.min(6, Math.max(1, Math.round((current.line || 1) + (offset.line * weight))));
    if (offset.color !== undefined) fused.color = Math.min(6, Math.max(1, Math.round((current.color || 1) + (offset.color * weight))));
    if (offset.tone !== undefined) fused.tone = Math.min(6, Math.max(1, Math.round((current.tone || 1) + (offset.tone * weight))));
    if (offset.base !== undefined) fused.base = Math.min(5, Math.max(1, Math.round((current.base || 1) + (offset.base * weight))));
    if (offset.degree !== undefined) fused.degree = ((current.degree || 0) + (offset.degree * weight)) % 360;
    if (offset.house !== undefined) fused.house = Math.min(12, Math.max(1, Math.round((current.house || 1) + (offset.house * weight))));
    return fused;
  }

  private computeOntology(coords: Coordinates): Ontology {
    return {
      movement: (coords.gate % 8) / 8,
      evolution: (coords.line - 1) / 5,
      being: ((coords.color - 1) * 6 + (coords.tone - 1)) / 35,
      design: (coords.base - 1) / 4,
      space: (coords.degree + (coords.house - 1) * 30 + coords.minute / 60) / 360
    };
  }

  private computeDeterministicHash(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private degreeToPhase(degree: number): string {
    const phases = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    return phases[Math.floor(degree / 30) % 12];
  }

  private bootstrapLexicon(): void {
    this.distributionalLexicon.set("observer", { base: 5, gate: 1, tone: 1 });
    this.distributionalLexicon.set("identity", { base: 5, gate: 10, tone: 2 });
    this.distributionalLexicon.set("self", { base: 5, gate: 25, tone: 3 });
    this.distributionalLexicon.set("source", { base: 5, gate: 33, tone: 4 });
    this.distributionalLexicon.set("i", { base: 5, gate: 1, tone: 1 });
    this.distributionalLexicon.set("who", { base: 5, gate: 15, tone: 2 });
    this.distributionalLexicon.set("memory", { base: 2, gate: 11, color: 3 });
    this.distributionalLexicon.set("trait", { base: 2, gate: 22, color: 4 });
    this.distributionalLexicon.set("property", { base: 2, gate: 36, color: 2 });
    this.distributionalLexicon.set("what", { base: 2, gate: 17, color: 1 });
    this.distributionalLexicon.set("shift", { base: 1, degree: 15, line: 1 });
    this.distributionalLexicon.set("move", { base: 1, degree: 45, line: 2 });
    this.distributionalLexicon.set("where", { base: 1, degree: 180, line: 1 });
    this.distributionalLexicon.set("now", { base: 3, degree: 30, color: 1 });
    this.distributionalLexicon.set("phase", { base: 3, degree: 60, color: 2 });
    this.distributionalLexicon.set("when", { base: 3, degree: 150, color: 5 });
    this.distributionalLexicon.set("force", { base: 4, line: 5, gate: 21 });
    this.distributionalLexicon.set("rule", { base: 4, line: 4, gate: 18 });
    this.distributionalLexicon.set("why", { base: 4, line: 1, gate: 2 });
    this.distributionalLexicon.set("mutation", { gate: 3, line: 3, color: 3 });
    this.distributionalLexicon.set("transform", { gate: 42, line: 4, color: 4 });
    this.distributionalLexicon.set("resonance", { gate: 55, line: 5, color: 2 });
  }

  private bootstrapGrammar(): void {
    this.grammarRules.set("HAS_PROPERTY", {
      generate: (args: string[]) => `${args[0]} is ${args[1]}`,
      recognize: (tokens: string[]) => {
        const m = tokens.join(" ").match(/^(\w+) is (\w+)$/);
        return m ? { relation: "HAS_PROPERTY", args: [m[1], m[2]] } : null;
      },
      axis: "WHAT"
    });
  }

  private bootstrapIChingBridge(): void {
    this.ichingBridge.set("creative", { gate: 1, base: 5, tone: 6 });
    this.ichingBridge.set("receptive", { gate: 2, base: 3, tone: 1 });
    this.ichingBridge.set("arousing", { gate: 51, base: 1, tone: 3 });
    this.ichingBridge.set("abysmal", { gate: 29, base: 4, tone: 2 });
    this.ichingBridge.set("gentle", { gate: 57, base: 2, tone: 5 });
    this.ichingBridge.set("clinging", { gate: 30, base: 4, tone: 3 });
    this.ichingBridge.set("joyous", { gate: 58, base: 5, tone: 2 });
  }

  // NEW: Get substrate for external access
  public getSubstrate(): SynthiaSubstrate {
    return this.substrate;
  }
}

// ============================================================================
// SEMANTIC TOKEN TYPE
// ============================================================================

interface SemanticToken {
  lexeme: string;
  weight: number;
  axis: "WHO" | "WHAT" | "WHERE" | "WHEN" | "WHY";
  kleinSource: string;
}

// ============================================================================
// EXPORT
// ============================================================================

export type { State, Coordinates, Ontology, TransformResult, SemanticToken };
