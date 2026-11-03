// ============================================================================
// Coherence Regulator — Maintain field coherence
// ============================================================================
import { UnifiedFieldState } from "../models";

export class CoherenceRegulator {
  regulate(field: UnifiedFieldState): UnifiedFieldState {
    const updated = { ...field };
    let totalActivation = 0;
    for (const node of updated.nodes.values()) {
      totalActivation += node.activation;
    }
    const avgActivation = totalActivation / updated.nodes.size;

    // Dampen runaway activation, boost latent nodes
    for (const node of updated.nodes.values()) {
      if (node.activation > avgActivation * 2) {
        node.activation *= 0.95;
        node.tension *= 0.95;
      } else if (node.activation < avgActivation * 0.1 && node.attractorWeight > 0.3) {
        node.activation = Math.min(1, node.activation + 0.05);
      }
    }

    updated.coherenceScore = this.computeCoherence(updated);
    return updated;
  }

  private computeCoherence(field: UnifiedFieldState): number {
    const ops = field.operatorProjections;
    const mean = (ops.being + ops.design + ops.movement + ops.evolution + ops.space) / 5;
    const variance =
      Math.pow(ops.being - mean, 2) +
      Math.pow(ops.design - mean, 2) +
      Math.pow(ops.movement - mean, 2) +
      Math.pow(ops.evolution - mean, 2) +
      Math.pow(ops.space - mean, 2);
    return Math.max(0, 1 - variance / 5);
  }
}
