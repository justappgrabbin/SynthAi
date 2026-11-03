// ============================================================================
// Movement Operator — Activation propagation, routing
// ============================================================================
import { ResonanceNode, UnifiedFieldState } from "../models";

export class MovementOperator {
  apply(node: ResonanceNode, field: UnifiedFieldState): ResonanceNode {
    const updated = { ...node };
    const neighbors = Array.from(field.nodes.values()).filter(
      (n) => n.id !== node.id && this.hammingDistance(node.lines, n.lines) === 1
    );
    const avgNeighborActivation = neighbors.reduce((s, n) => s + n.activation, 0) / Math.max(1, neighbors.length);
    updated.operators.movement = Math.min(1, avgNeighborActivation * 1.2);
    updated.activation = Math.min(1, updated.activation + avgNeighborActivation * 0.15);
    return updated;
  }

  project(field: UnifiedFieldState): UnifiedFieldState {
    const updated = { ...field };
    let total = 0;
    for (const node of updated.nodes.values()) total += node.operators.movement;
    updated.operatorProjections.movement = total / updated.nodes.size;
    return updated;
  }

  private hammingDistance(a: [number, number, number, number, number, number], b: [number, number, number, number, number, number]): number {
    let d = 0;
    for (let i = 0; i < 6; i++) if (a[i] !== b[i]) d++;
    return d;
  }
}
