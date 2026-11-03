// ============================================================================
// Design Operator — Topology, structure, constraints
// ============================================================================
import { ResonanceNode, UnifiedFieldState } from "../models";

export class DesignOperator {
  apply(node: ResonanceNode, field: UnifiedFieldState): ResonanceNode {
    const updated = { ...node };
    const neighborCount = Array.from(field.nodes.values()).filter(
      (n) => n.id !== node.id && this.topologicalDistance(node, n) < 2
    ).length;
    updated.operators.design = Math.min(1, neighborCount / 6 + 0.2);
    return updated;
  }

  project(field: UnifiedFieldState): UnifiedFieldState {
    const updated = { ...field };
    let total = 0;
    for (const node of updated.nodes.values()) total += node.operators.design;
    updated.operatorProjections.design = total / updated.nodes.size;
    return updated;
  }

  private topologicalDistance(a: ResonanceNode, b: ResonanceNode): number {
    let diff = 0;
    for (let i = 0; i < 6; i++) {
      if (a.lines[i] !== b.lines[i]) diff++;
    }
    return diff;
  }
}
