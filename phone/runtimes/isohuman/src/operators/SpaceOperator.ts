// ============================================================================
// Space Operator — Observer context, perspective, scale
// ============================================================================
import { ResonanceNode, UnifiedFieldState } from "../models";

export class SpaceOperator {
  apply(node: ResonanceNode, field: UnifiedFieldState): ResonanceNode {
    const updated = { ...node };
    const ctx = updated.observerContext;
    updated.operators.space = Math.min(1, ctx.scale * 0.3 + updated.operators.space * 0.7);
    return updated;
  }

  project(field: UnifiedFieldState): UnifiedFieldState {
    const updated = { ...field };
    let total = 0;
    for (const node of updated.nodes.values()) total += node.operators.space;
    updated.operatorProjections.space = total / updated.nodes.size;
    return updated;
  }
}
