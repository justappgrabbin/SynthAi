// ============================================================================
// Channel Registry — 36 HD channels mapped to neural analogues
// ============================================================================
import { CircuitFamily } from "../models";

export interface ChannelSpec {
  id: string;
  gateA: number;
  gateB: number;
  circuitFamily: CircuitFamily;
  neuralAnalogue: string;
  graphTopology: string;
  nativeBehavior: string;
  confidence: number;
  provenanceCategory: "native" | "interpretive" | "external_adapter";
}

export class ChannelRegistry {
  private channels = new Map<string, ChannelSpec>();

  constructor() {
    // Understanding
    this.add({ id: "63-4", gateA: 63, gateB: 4, circuitFamily: "understanding", neuralAnalogue: "Deep feedforward", graphTopology: "DAG", nativeBehavior: "Question-to-answer deduction", confidence: 0.8, provenanceCategory: "interpretive" });
    this.add({ id: "17-62", gateA: 17, gateB: 62, circuitFamily: "understanding", neuralAnalogue: "RBM", graphTopology: "Bipartite energy graph", nativeBehavior: "Constraint and detail resolution", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "18-58", gateA: 18, gateB: 58, circuitFamily: "understanding", neuralAnalogue: "Hopfield network", graphTopology: "Attractor graph", nativeBehavior: "Error detection and correction", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "16-48", gateA: 16, gateB: 48, circuitFamily: "understanding", neuralAnalogue: "Sparse autoencoder", graphTopology: "Sparse latent graph", nativeBehavior: "Skill extraction from depth", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "9-52", gateA: 9, gateB: 52, circuitFamily: "understanding", neuralAnalogue: "Extreme learning machine", graphTopology: "Fixed projection graph", nativeBehavior: "Concentrated attention", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "5-15", gateA: 5, gateB: 15, circuitFamily: "understanding", neuralAnalogue: "Kohonen/SOM", graphTopology: "Self-organizing graph", nativeBehavior: "Rhythm and natural clustering", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "7-31", gateA: 7, gateB: 31, circuitFamily: "understanding", neuralAnalogue: "CNN/DCN", graphTopology: "Hierarchical graph", nativeBehavior: "Pattern hierarchy and influence", confidence: 0.7, provenanceCategory: "interpretive" });

    // Sensing
    this.add({ id: "53-42", gateA: 53, gateB: 42, circuitFamily: "sensing", neuralAnalogue: "DBN", graphTopology: "Developmental layered graph", nativeBehavior: "Maturation across stages", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "41-30", gateA: 41, gateB: 30, circuitFamily: "sensing", neuralAnalogue: "RNN/LSTM", graphTopology: "Temporal desire graph", nativeBehavior: "Anticipation and experience", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "36-35", gateA: 36, gateB: 35, circuitFamily: "sensing", neuralAnalogue: "Sequence-to-sequence", graphTopology: "Transition graph", nativeBehavior: "Experiential passage", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "64-47", gateA: 64, gateB: 47, circuitFamily: "sensing", neuralAnalogue: "Encoder/autoencoder", graphTopology: "Compression-resolution graph", nativeBehavior: "Abstract resolution", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "11-56", gateA: 11, gateB: 56, circuitFamily: "sensing", neuralAnalogue: "Generative language model", graphTopology: "Story graph", nativeBehavior: "Conceptual narration", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "29-46", gateA: 29, gateB: 46, circuitFamily: "sensing", neuralAnalogue: "Reinforcement learner", graphTopology: "Embodied path graph", nativeBehavior: "Commitment through experience", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "13-33", gateA: 13, gateB: 33, circuitFamily: "sensing", neuralAnalogue: "Episodic memory network", graphTopology: "Archive-retrieval graph", nativeBehavior: "Witnessing and recall", confidence: 0.7, provenanceCategory: "interpretive" });

    // Knowing
    this.add({ id: "3-60", gateA: 3, gateB: 60, circuitFamily: "knowing", neuralAnalogue: "Liquid state machine", graphTopology: "Reservoir pulse graph", nativeBehavior: "Mutation under constraint", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "61-24", gateA: 61, gateB: 24, circuitFamily: "knowing", neuralAnalogue: "Neural Turing machine", graphTopology: "External-memory graph", nativeBehavior: "Retrieval from uncertainty", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "43-23", gateA: 43, gateB: 23, circuitFamily: "knowing", neuralAnalogue: "Deconvolutional network", graphTopology: "Unpacking graph", nativeBehavior: "Compression-to-expression", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "28-38", gateA: 28, gateB: 38, circuitFamily: "knowing", neuralAnalogue: "GAN", graphTopology: "Adversarial graph", nativeBehavior: "Meaning through struggle", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "20-57", gateA: 20, gateB: 57, circuitFamily: "knowing", neuralAnalogue: "Echo state network", graphTopology: "Immediate reservoir graph", nativeBehavior: "Present-time intuitive output", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "39-55", gateA: 39, gateB: 55, circuitFamily: "knowing", neuralAnalogue: "GRU", graphTopology: "Gated emotional graph", nativeBehavior: "Emotional activation and release", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "12-22", gateA: 12, gateB: 22, circuitFamily: "knowing", neuralAnalogue: "VAE", graphTopology: "Latent social graph", nativeBehavior: "Mood-dependent expression", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "2-14", gateA: 2, gateB: 14, circuitFamily: "knowing", neuralAnalogue: "RBF network", graphTopology: "Radial graph", nativeBehavior: "Directional resonance", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "1-8", gateA: 1, gateB: 8, circuitFamily: "knowing", neuralAnalogue: "Attention network", graphTopology: "Salience graph", nativeBehavior: "Creative broadcasting", confidence: 0.7, provenanceCategory: "interpretive" });

    // Integration
    this.add({ id: "10-34", gateA: 10, gateB: 34, circuitFamily: "integration", neuralAnalogue: "Actor-critic", graphTopology: "Agency-action graph", nativeBehavior: "Embodied exploration", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "25-51", gateA: 25, gateB: 51, circuitFamily: "integration", neuralAnalogue: "Spiking network", graphTopology: "Threshold-disruption graph", nativeBehavior: "Initiation through shock", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "10-20", gateA: 10, gateB: 20, circuitFamily: "integration", neuralAnalogue: "Direct policy network", graphTopology: "Identity-expression graph", nativeBehavior: "Immediate self-expression", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "20-34", gateA: 20, gateB: 34, circuitFamily: "integration", neuralAnalogue: "Motor policy network", graphTopology: "Instant-action graph", nativeBehavior: "Direct manifestation", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "34-57", gateA: 34, gateB: 57, circuitFamily: "integration", neuralAnalogue: "Sensorimotor network", graphTopology: "Survival-response graph", nativeBehavior: "Instinctive power", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "10-57", gateA: 10, gateB: 57, circuitFamily: "integration", neuralAnalogue: "Adaptive control network", graphTopology: "Refinement graph", nativeBehavior: "Behavioral alignment", confidence: 0.7, provenanceCategory: "interpretive" });

    // Ego/Defense
    this.add({ id: "21-45", gateA: 21, gateB: 45, circuitFamily: "ego_defense", neuralAnalogue: "Resource allocation network", graphTopology: "Control-resource graph", nativeBehavior: "Distribution and authority", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "26-44", gateA: 26, gateB: 44, circuitFamily: "ego_defense", neuralAnalogue: "Memory-prediction network", graphTopology: "Pattern-transmission graph", nativeBehavior: "Persuasion and recognition", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "32-54", gateA: 32, gateB: 54, circuitFamily: "ego_defense", neuralAnalogue: "Evolutionary optimizer", graphTopology: "Selection graph", nativeBehavior: "Ambition and continuity", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "37-40", gateA: 37, gateB: 40, circuitFamily: "ego_defense", neuralAnalogue: "Game-theory network", graphTopology: "Contract graph", nativeBehavior: "Exchange and reciprocity", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "59-6", gateA: 59, gateB: 6, circuitFamily: "ego_defense", neuralAnalogue: "Boundary-crossing network", graphTopology: "Fusion graph", nativeBehavior: "Intimacy and permeability", confidence: 0.7, provenanceCategory: "interpretive" });
    this.add({ id: "27-50", gateA: 27, gateB: 50, circuitFamily: "ego_defense", neuralAnalogue: "Regulatory network", graphTopology: "Maintenance graph", nativeBehavior: "Preservation and care", confidence: 0.7, provenanceCategory: "interpretive" });
  }

  private add(spec: ChannelSpec): void {
    this.channels.set(spec.id, spec);
  }

  get(id: string): ChannelSpec | undefined {
    return this.channels.get(id);
  }

  getByCircuit(family: CircuitFamily): ChannelSpec[] {
    return Array.from(this.channels.values()).filter((c) => c.circuitFamily === family);
  }

  getAll(): ChannelSpec[] {
    return Array.from(this.channels.values());
  }
}
