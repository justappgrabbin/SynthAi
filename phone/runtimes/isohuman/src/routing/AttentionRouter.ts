// ============================================================================
// Attention Router — Route activation between nodes
// ============================================================================
import { ResonanceNode, UnifiedFieldState } from "../models";
import { FuxiEncoder } from "../topology/FuxiEncoder";

export class AttentionRouter {
  routeActivation(
    field: UnifiedFieldState,
    sourceId: string,
    amount: number
  ): Map<string, number> {
    const source = field.nodes.get(sourceId);
    if (!source) return new Map();

    const distribution = new Map<string, number>();
    const sourcePattern = source.lines.join("");
    const neighbors = FuxiEncoder.getNeighbors(sourcePattern, 1);

    for (const pattern of neighbors) {
      const idx = FuxiEncoder.decodePattern(pattern);
      const nodeId = `node-${idx}`;
      const node = field.nodes.get(nodeId);
      if (node) {
        const weight = 1 / (1 + Math.abs(node.activation - source.activation));
        distribution.set(nodeId, amount * weight * 0.5);
      }
    }
    return distribution;
  }
}
