/**
 * EMERGENT EDGE RESOLVER
 * 
 * All 36 HD channels as executable functions.
 * Each edge: source gate → target gate → emergent output
 * 
 * This is the "programming language" layer - edges are functions that
 * transform state, not just connections.
 */

import type { GateNumber, IChingAddress, StateVector } from './synthia-bridge';

// ============================================================================
// EDGE DEFINITIONS
// ============================================================================

export type EdgeType = 
  | 'CHANNEL'      // HD channel (electromagnetic connection)
  | 'HARMONIC'     // Same line, different gate
  | 'TRANSIT'      // Planetary activation
  | 'DIMENSIONAL'  // Cross-dimension link
  | 'FEEDBACK';    // Output loops back to input

export interface Edge {
  id: string;
  source: number;      // Gate 1-64
  target: number;      // Gate 1-64
  type: EdgeType;
  weight: number;      // 0-1
  bidirectional: boolean;
}

export interface EdgeExecution {
  edgeId: string;
  input: StateVector;
  output: StateVector;
  transformation: string;
  timestamp: number;
}

// ============================================================================
// THE 36 CHANNELS AS FUNCTIONS
// ============================================================================

/**
 * Channel function signature:
 * Takes source state, returns transformed state
 */
export type ChannelFunction = (input: ChannelInput) => ChannelOutput;

export interface ChannelInput {
  sourceGate: number;
  targetGate: number;
  sourceState: {
    amplitude: number;
    phase: number;
    coherence: number;
  };
  targetState: {
    amplitude: number;
    phase: number;
    coherence: number;
  };
}

export interface ChannelOutput {
  emergentAmplitude: number;
  emergentPhase: number;
  coherence: number;
  meaning: string;
  transformation: string;
}

/**
 * Helper: Create channel function with consistent structure
 */
function createChannel(
  name: string,
  sourceGate: number,
  targetGate: number,
  meaning: string,
  transform: (input: ChannelInput) => { amp: number; phase: number; coh: number }
): ChannelFunction {
  return (input: ChannelInput) => {
    const result = transform(input);
    return {
      emergentAmplitude: result.amp,
      emergentPhase: result.phase,
      coherence: result.coh,
      meaning,
      transformation: `${name}: Gates ${sourceGate}→${targetGate} transformed A:${input.sourceState.amplitude.toFixed(2)}→${result.amp.toFixed(2)}`
    };
  };
}

/**
 * All 36 channels as executable functions
 */
export const CHANNELS: Record<string, ChannelFunction> = {
  // ========================================================================
  // CHANNEL 1-8: INSPIRATION (Creative → Contribution)
  // ========================================================================
  'ch_1_8': createChannel(
    'Inspiration',
    1, 8,
    'Creative expression becomes contribution to the whole',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.coherence,
      phase: (input.sourceState.phase + input.targetState.phase) / 2,
      coh: Math.min(input.sourceState.coherence, input.targetState.coherence) * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 2-14: BEAT (Direction → Power)
  // ========================================================================
  'ch_2_14': createChannel(
    'Beat',
    2, 14,
    'Direction channels power into rhythmic flow',
    (input) => ({
      amp: Math.sqrt(input.sourceState.amplitude * input.targetState.amplitude),
      phase: input.targetState.phase,
      coh: input.sourceState.coherence * 0.9
    })
  ),

  // ========================================================================
  // CHANNEL 3-60: MUTATION (Ordering → Acceptance)
  // ========================================================================
  'ch_3_60': createChannel(
    'Mutation',
    3, 60,
    'Order emerges from chaos through accepting limitation',
    (input) => ({
      amp: input.sourceState.amplitude * (1 + Math.sin(input.sourceState.phase)),
      phase: 0,  // Reset phase - mutation creates new beginning
      coh: input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 4-63: LOGIC (Formulization → Doubt)
  // ========================================================================
  'ch_4_63': createChannel(
    'Logic',
    4, 63,
    'Answers emerge through questioning patterns',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.amplitude,
      phase: Math.abs(input.sourceState.phase - input.targetState.phase),
      coh: (input.sourceState.coherence + input.targetState.coherence) / 2
    })
  ),

  // ========================================================================
  // CHANNEL 5-15: RHYTHM (Waiting → Extremes)
  // ========================================================================
  'ch_5_15': createChannel(
    'Rhythm',
    5, 15,
    'Universal patterns flow through natural timing',
    (input) => ({
      amp: (input.sourceState.amplitude + input.targetState.amplitude) / 2,
      phase: input.sourceState.phase,  // Maintain source timing
      coh: Math.max(input.sourceState.coherence, input.targetState.coherence)
    })
  ),

  // ========================================================================
  // CHANNEL 6-59: INTIMACY (Conflict → Sexuality)
  // ========================================================================
  'ch_6_59': createChannel(
    'Intimacy',
    6, 59,
    'Emotional depth breaks through barriers to connection',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.amplitude * 1.2,
      phase: (input.sourceState.phase + input.targetState.phase) % (2 * Math.PI),
      coh: input.sourceState.coherence * input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 7-31: ALPHA (Leadership → Influence)
  // ========================================================================
  'ch_7_31': createChannel(
    'Alpha',
    7, 31,
    'Logical leadership creates democratic influence',
    (input) => ({
      amp: input.targetState.amplitude,  // Target dominates (leadership flows outward)
      phase: input.targetState.phase,
      coh: input.sourceState.coherence * 1.05
    })
  ),

  // ========================================================================
  // CHANNEL 9-52: CONCENTRATION (Focus → Stillness)
  // ========================================================================
  'ch_9_52': createChannel(
    'Concentration',
    9, 52,
    'Detailed focus emerges from stillness',
    (input) => ({
      amp: input.sourceState.amplitude * 0.8,  // Reduce noise
      phase: 0,  // Stillness = no phase oscillation
      coh: input.targetState.coherence * 1.2
    })
  ),

  // ========================================================================
  // CHANNEL 10-20: AWAKENING (Behavior → Now)
  // ========================================================================
  'ch_10_20': createChannel(
    'Awakening',
    10, 20,
    'Self-behavior becomes present-moment awareness',
    (input) => ({
      amp: Math.min(input.sourceState.amplitude, input.targetState.amplitude),
      phase: 0,  // Now = no past/future phase
      coh: input.sourceState.coherence * input.targetState.coherence * 1.3
    })
  ),

  // ========================================================================
  // CHANNEL 11-56: CURIOSITY (Ideas → Stimulation)
  // ========================================================================
  'ch_11_56': createChannel(
    'Curiosity',
    11, 56,
    'Ideas stimulate new experiences',
    (input) => ({
      amp: input.sourceState.amplitude * 1.1,
      phase: input.sourceState.phase + (input.targetState.phase * 0.5),
      coh: (input.sourceState.coherence + input.targetState.coherence) / 2
    })
  ),

  // ========================================================================
  // CHANNEL 12-22: OPENNESS (Caution → Grace)
  // ========================================================================
  'ch_12_22': createChannel(
    'Openness',
    12, 22,
    'Cautious expression opens into graceful reception',
    (input) => ({
      amp: input.targetState.amplitude,
      phase: input.targetState.phase,
      coh: input.targetState.coherence * (input.sourceState.coherence > 0.5 ? 1.2 : 0.8)
    })
  ),

  // ========================================================================
  // CHANNEL 13-33: PRODIGAL (Listener → Privacy)
  // ========================================================================
  'ch_13_33': createChannel(
    'Prodigal',
    13, 33,
    'Deep listening becomes private wisdom',
    (input) => ({
      amp: input.sourceState.amplitude * 0.9,
      phase: input.sourceState.phase,
      coh: input.sourceState.coherence * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 16-48: DEPTH (Skills → Depth)
  // ========================================================================
  'ch_16_48': createChannel(
    'Depth',
    16, 48,
    'Enthusiastic skills tap into deep patterns',
    (input) => ({
      amp: Math.sqrt(input.sourceState.amplitude * input.targetState.amplitude),
      phase: (input.sourceState.phase + input.targetState.phase) / 2,
      coh: Math.min(input.sourceState.coherence, input.targetState.coherence)
    })
  ),

  // ========================================================================
  // CHANNEL 17-62: ACCEPTANCE (Opinion → Details)
  // ========================================================================
  'ch_17_62': createChannel(
    'Acceptance',
    17, 62,
    'Opinions grounded in detailed facts become acceptable',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.coherence,
      phase: input.targetState.phase,
      coh: input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 18-58: JUDGEMENT (Correction → Vitality)
  // ========================================================================
  'ch_18_58': createChannel(
    'Judgement',
    18, 58,
    'Correcting patterns releases vital energy',
    (input) => ({
      amp: input.targetState.amplitude * 1.15,
      phase: input.sourceState.phase,
      coh: input.sourceState.coherence * input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 19-49: SYNTHESIS (Wanting → Rejection)
  // ========================================================================
  'ch_19_49': createChannel(
    'Synthesis',
    19, 49,
    'Approach and rejection create synthesis',
    (input) => ({
      amp: Math.abs(input.sourceState.amplitude - input.targetState.amplitude),
      phase: (input.sourceState.phase - input.targetState.phase + 2 * Math.PI) % (2 * Math.PI),
      coh: (input.sourceState.coherence + input.targetState.coherence) / 2
    })
  ),

  // ========================================================================
  // CHANNEL 20-34: CHARISMA (Now → Power)
  // ========================================================================
  'ch_20_34': createChannel(
    'Charisma',
    20, 34,
    'Present-moment power becomes magnetic charisma',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.amplitude,
      phase: 0,
      coh: Math.max(input.sourceState.coherence, input.targetState.coherence) * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 21-45: MONEY (Control → Gathering)
  // ========================================================================
  'ch_21_45': createChannel(
    'Money',
    21, 45,
    'Will-power controls resources into gathering',
    (input) => ({
      amp: input.targetState.amplitude,
      phase: input.targetState.phase,
      coh: input.sourceState.coherence * input.targetState.coherence * 1.05
    })
  ),

  // ========================================================================
  // CHANNEL 23-43: STRUCTURING (Assimilation → Insight)
  // ========================================================================
  'ch_23_43': createChannel(
    'Structuring',
    23, 43,
    'Breaking apart assimilates into breakthrough insight',
    (input) => ({
      amp: input.sourceState.amplitude * 0.7 + input.targetState.amplitude * 0.3,
      phase: input.targetState.phase,
      coh: input.targetState.coherence * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 24-61: AWARENESS (Rationalization → Mystery)
  // ========================================================================
  'ch_24_61': createChannel(
    'Awareness',
    24, 61,
    'Rationalization dissolves into mysterious awareness',
    (input) => ({
      amp: input.targetState.amplitude,
      phase: input.sourceState.phase * 0.5 + input.targetState.phase * 0.5,
      coh: input.targetState.coherence * 1.15
    })
  ),

  // ========================================================================
  // CHANNEL 25-51: INITIATION (Innocence → Shock)
  // ========================================================================
  'ch_25_51': createChannel(
    'Initiation',
    25, 51,
    'Innocent openness becomes shocking initiation',
    (input) => ({
      amp: input.targetState.amplitude * 1.3,
      phase: 0,  // Shock resets phase
      coh: input.sourceState.coherence * 0.8  // Shock reduces coherence temporarily
    })
  ),

  // ========================================================================
  // CHANNEL 26-44: SURRENDER (Egoist → Alertness)
  // ========================================================================
  'ch_26_44': createChannel(
    'Surrender',
    26, 44,
    'Ego-control surrenders into alert receptivity',
    (input) => ({
      amp: input.targetState.amplitude,
      phase: input.targetState.phase,
      coh: input.sourceState.coherence * input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 27-50: PRESERVATION (Care → Values)
  // ========================================================================
  'ch_27_50': createChannel(
    'Preservation',
    27, 50,
    'Nourishing care preserves core values',
    (input) => ({
      amp: input.sourceState.amplitude * 1.1,
      phase: input.sourceState.phase,
      coh: Math.max(input.sourceState.coherence, input.targetState.coherence)
    })
  ),

  // ========================================================================
  // CHANNEL 28-38: STRUGGLE (Risk → Opposition)
  // ========================================================================
  'ch_28_38': createChannel(
    'Struggle',
    28, 38,
    'Risk-taking meets opposition in meaningful struggle',
    (input) => ({
      amp: Math.abs(input.sourceState.amplitude - input.targetState.amplitude) * 1.2,
      phase: (input.sourceState.phase + input.targetState.phase) % (2 * Math.PI),
      coh: Math.min(input.sourceState.coherence, input.targetState.coherence)
    })
  ),

  // ========================================================================
  // CHANNEL 29-30: RECOGNITION (Perseverance → Desire)
  // ========================================================================
  'ch_29_30': createChannel(
    'Recognition',
    29, 30,
    'Persevering through the abyss recognizes true desire',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.amplitude * 1.1,
      phase: input.targetState.phase,
      coh: input.targetState.coherence * 1.05
    })
  ),

  // ========================================================================
  // CHANNEL 32-54: TRANSFORMATION (Continuity → Ambition)
  // ========================================================================
  'ch_32_54': createChannel(
    'Transformation',
    32, 54,
    'Enduring continuity transforms into ambitious drive',
    (input) => ({
      amp: input.targetState.amplitude * 1.2,
      phase: input.targetState.phase,
      coh: input.sourceState.coherence * input.targetState.coherence * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 34-57: POWER (Power → Intuition)
  // ========================================================================
  'ch_34_57': createChannel(
    'Power',
    34, 57,
    'Great power flows through intuitive knowing',
    (input) => ({
      amp: input.sourceState.amplitude * 1.25,
      phase: input.targetState.phase,
      coh: input.targetState.coherence * 1.2
    })
  ),

  // ========================================================================
  // CHANNEL 35-36: TRANSIENCE (Change → Crisis)
  // ========================================================================
  'ch_35_36': createChannel(
    'Transience',
    35, 36,
    'Progressive change emerges from navigating crisis',
    (input) => ({
      amp: (input.sourceState.amplitude + input.targetState.amplitude) / 2 * 1.1,
      phase: (input.sourceState.phase + input.targetState.phase) / 2,
      coh: Math.min(input.sourceState.coherence, input.targetState.coherence) * 0.9
    })
  ),

  // ========================================================================
  // CHANNEL 37-40: COMMUNITY (Friendship → Aloneness)
  // ========================================================================
  'ch_37_40': createChannel(
    'Community',
    37, 40,
    'Family friendship balances with necessary aloneness',
    (input) => ({
      amp: (input.sourceState.amplitude + input.targetState.amplitude) / 2,
      phase: input.sourceState.phase * 0.7 + input.targetState.phase * 0.3,
      coh: input.sourceState.coherence * 1.05
    })
  ),

  // ========================================================================
  // CHANNEL 39-55: EMOTING (Provocation → Spirit)
  // ========================================================================
  'ch_39_55': createChannel(
    'Emoting',
    39, 55,
    'Provocative obstruction releases emotional spirit',
    (input) => ({
      amp: input.targetState.amplitude * 1.15,
      phase: input.targetState.phase,
      coh: input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 41-30: RECOGNITION (Contraction → Desire)
  // ========================================================================
  'ch_41_30': createChannel(
    'Recognition',
    41, 30,
    'Decreasing contraction recognizes emerging desire',
    (input) => ({
      amp: input.targetState.amplitude * 1.1,
      phase: input.targetState.phase,
      coh: input.targetState.coherence * 1.05
    })
  ),

  // ========================================================================
  // CHANNEL 42-53: MATURATION (Expansion → Beginnings)
  // ========================================================================
  'ch_42_53': createChannel(
    'Maturation',
    42, 53,
    'Increasing expansion matures through new beginnings',
    (input) => ({
      amp: input.sourceState.amplitude * input.targetState.amplitude,
      phase: 0,
      coh: (input.sourceState.coherence + input.targetState.coherence) / 2 * 1.1
    })
  ),

  // ========================================================================
  // CHANNEL 46-29: DISCOVERY (Determination → Perseverance)
  // ========================================================================
  'ch_46_29': createChannel(
    'Discovery',
    46, 29,
    'Determined push discovers persevering commitment',
    (input) => ({
      amp: input.sourceState.amplitude * 1.2,
      phase: input.sourceState.phase,
      coh: input.sourceState.coherence * input.targetState.coherence
    })
  ),

  // ========================================================================
  // CHANNEL 47-64: ABSTRACTION (Realization → Confusion)
  // ========================================================================
  'ch_47_64': createChannel(
    'Abstraction',
    47, 64,
    'Oppressive realization becomes abstract confusion before clarity',
    (input) => ({
      amp: input.targetState.amplitude * 0.9,
      phase: input.targetState.phase,
      coh: Math.min(input.sourceState.coherence, input.targetState.coherence)
    })
  ),
};

// ============================================================================
// EDGE RESOLVER
// ============================================================================

export class EmergentEdgeResolver {
  private channels: Map<string, ChannelFunction>;
  private edgeHistory: EdgeExecution[];

  constructor() {
    this.channels = new Map(Object.entries(CHANNELS));
    this.edgeHistory = [];
  }

  /**
   * Get channel between two gates (if exists)
   */
  getChannel(gate1: number, gate2: number): ChannelFunction | null {
    // Try both directions
    const key1 = `ch_${gate1}_${gate2}`;
    const key2 = `ch_${gate2}_${gate1}`;
    
    return this.channels.get(key1) || this.channels.get(key2) || null;
  }

  /**
   * Check if edge exists between two gates
   */
  hasEdge(gate1: number, gate2: number): boolean {
    return this.getChannel(gate1, gate2) !== null;
  }

  /**
   * Resolve edge: Execute channel function
   */
  resolve(source: StateVector, target: StateVector): {
    edgeType: EdgeType;
    edgeName: string;
    output: ChannelOutput;
    emergent: {
      amplitude: number;
      phase: number;
      coherence: number;
    };
  } {
    const sourceGate = source.micro.gate + 1;  // 0-indexed to 1-indexed
    const targetGate = target.micro.gate + 1;

    const channel = this.getChannel(sourceGate, targetGate);

    if (channel) {
      // Execute channel function
      const output = channel({
        sourceGate,
        targetGate,
        sourceState: {
          amplitude: source.amplitude,
          phase: source.phase,
          coherence: source.coherence
        },
        targetState: {
          amplitude: target.amplitude,
          phase: target.phase,
          coherence: target.coherence
        }
      });

      const execution: EdgeExecution = {
        edgeId: `ch_${sourceGate}_${targetGate}`,
        input: source,
        output: target,
        transformation: output.transformation,
        timestamp: Date.now()
      };

      this.edgeHistory.push(execution);

      return {
        edgeType: 'CHANNEL',
        edgeName: output.meaning,
        output,
        emergent: {
          amplitude: output.emergentAmplitude,
          phase: output.emergentPhase,
          coherence: output.coherence
        }
      };
    } else {
      // No direct channel - check for harmonic (same line)
      if (source.micro.line === target.micro.line) {
        const harmonicStrength = 0.7;
        const output: ChannelOutput = {
          emergentAmplitude: source.amplitude * harmonicStrength,
          emergentPhase: source.phase,
          coherence: source.coherence * harmonicStrength,
          meaning: `Harmonic resonance on line ${source.micro.line + 1}`,
          transformation: `Harmonic: Gates ${sourceGate} and ${targetGate} share line ${source.micro.line + 1}`
        };

        return {
          edgeType: 'HARMONIC',
          edgeName: 'Line Harmonic',
          output,
          emergent: {
            amplitude: output.emergentAmplitude,
            phase: output.emergentPhase,
            coherence: output.coherence
          }
        };
      }

      // No connection
      return {
        edgeType: 'NONE',
        edgeName: 'No Connection',
        output: {
          emergentAmplitude: 0,
          emergentPhase: 0,
          coherence: 0,
          meaning: 'No direct or harmonic connection',
          transformation: 'No transformation possible'
        },
        emergent: {
          amplitude: 0,
          phase: 0,
          coherence: 0
        }
      };
    }
  }

  /**
   * Get all edges from a gate
   */
  getEdgesFrom(gate: number): number[] {
    const edges: number[] = [];
    
    for (let target = 1; target <= 64; target++) {
      if (this.hasEdge(gate, target)) {
        edges.push(target);
      }
    }
    
    return edges;
  }

  /**
   * Get edge history
   */
  getHistory(): EdgeExecution[] {
    return [...this.edgeHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.edgeHistory = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalChannels: number;
    totalExecutions: number;
    mostUsedChannel: string | null;
  } {
    const channelCounts = new Map<string, number>();
    
    for (const exec of this.edgeHistory) {
      const count = channelCounts.get(exec.edgeId) || 0;
      channelCounts.set(exec.edgeId, count + 1);
    }

    let mostUsed: string | null = null;
    let maxCount = 0;
    
    for (const [channel, count] of channelCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = channel;
      }
    }

    return {
      totalChannels: this.channels.size,
      totalExecutions: this.edgeHistory.length,
      mostUsedChannel: mostUsed
    };
  }
}

// ============================================================================
// STATE VECTOR (for edge resolution)
// ============================================================================

export interface StateVector {
  micro: {
    gate: number;      // 0-63
    line: number;      // 0-5
    color: number;     // 0-5
    tone: number;      // 0-5
    base: number;      // 0-4
  };
  amplitude: number;   // 0-1
  phase: number;       // 0-2π
  coherence: number;   // 0-1
}

export default EmergentEdgeResolver;
