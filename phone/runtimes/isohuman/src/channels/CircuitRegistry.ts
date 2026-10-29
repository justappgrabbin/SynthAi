// ============================================================================
// Circuit Registry — Family-level inductive biases
// ============================================================================
import { CircuitFamily } from "../models";

export interface CircuitDefinition {
  family: CircuitFamily;
  description: string;
  baseBehavior: string;
  primaryBias: string[];
  baseAnalogue: string;
}

export class CircuitRegistry {
  private circuits = new Map<CircuitFamily, CircuitDefinition>();

  constructor() {
    this.register({
      family: "understanding",
      description: "Logical, feedforward, constraint-driven",
      baseBehavior: "question → abstraction → constrained answer",
      primaryBias: ["logical", "feedforward", "consistency-seeking", "constraint-driven"],
      baseAnalogue: "deep feedforward computation",
    });
    this.register({
      family: "sensing",
      description: "Developmental, experiential, adaptive",
      baseBehavior: "experience → accumulation → maturation → adaptation",
      primaryBias: ["developmental", "experiential", "temporal", "incremental"],
      baseAnalogue: "deep belief and recurrent learning",
    });
    this.register({
      family: "knowing",
      description: "Reservoir-like, pulsed, emergent, metastable",
      baseBehavior: "silence → pulse → instability → mutation → expression",
      primaryBias: ["nonlinear", "emergent", "reservoir-like", "metastable"],
      baseAnalogue: "liquid state or reservoir computation",
    });
    this.register({
      family: "integration",
      description: "Agency-action, embodied exploration",
      baseBehavior: "actor-critic exploration",
      primaryBias: ["agency", "action", "exploration"],
      baseAnalogue: "actor-critic network",
    });
    this.register({
      family: "centering",
      description: "Threshold-disruption, initiation through shock",
      baseBehavior: "initiation through threshold crossing",
      primaryBias: ["threshold", "disruption", "initiation"],
      baseAnalogue: "spiking network",
    });
    this.register({
      family: "ego_defense",
      description: "Resource allocation, control, preservation",
      baseBehavior: "distribution and authority",
      primaryBias: ["control", "resource", "preservation"],
      baseAnalogue: "resource allocation network",
    });
  }

  register(def: CircuitDefinition): void {
    this.circuits.set(def.family, def);
  }

  get(family: CircuitFamily): CircuitDefinition | undefined {
    return this.circuits.get(family);
  }

  getAll(): CircuitDefinition[] {
    return Array.from(this.circuits.values());
  }
}
