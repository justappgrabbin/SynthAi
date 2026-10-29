// ============================================================================
// Being Operator — Existence, persistence, incarnation
// ============================================================================
import { ResonanceNode, UnifiedFieldState } from "../models";

export class BeingOperator {
  apply(node: ResonanceNode, field: UnifiedFieldState): ResonanceNode {
    const updated = { ...node };
    updated.operators.being = Math.min(1, updated.operators.being + updated.activation * 0.1);
    if (updated.activation > 0.7) {
      updated.regime = "activated";
    } else if (updated.activation < 0.1) {
      updated.regime = "latent";
    }
    updated.activationHistory.push({
      timestamp: new Date().toISOString(),
      activation: updated.activation,
      tension: updated.tension,
      regime: updated.regime,
      triggeredBy: "BeingOperator",
    });
    return updated;
  }

  project(field: UnifiedFieldState): UnifiedFieldState {
    const updated = { ...field };
    let totalBeing = 0;
    for (const node of updated.nodes.values()) {
      totalBeing += node.operators.being;
    }
    updated.operatorProjections.being = totalBeing / updated.nodes.size;
    return updated;
  }
}
