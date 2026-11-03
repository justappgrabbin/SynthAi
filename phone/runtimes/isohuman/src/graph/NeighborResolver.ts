// ============================================================================
// Neighbor Resolver — Hamming-distance and structural neighbors
// ============================================================================
import { CorrelativeNode, CorrelativeRelation } from "../models";
import { StateGraph } from "./StateGraph";
import { HammingResolver } from "../topology/HammingResolver";

export class NeighborResolver {
  constructor(private graph: StateGraph) {}

  getHammingNeighbors(nodeId: string, distance: number = 1): CorrelativeNode[] {
    const node = this.graph.getNode(nodeId);
    if (!node) return [];
    const patterns = HammingResolver.neighbors(node.binaryPattern, distance);
    return patterns
      .map((p) => this.graph.getNodeByBinaryPattern(p))
      .filter((n): n is CorrelativeNode => n !== undefined);
  }

  getStructuralNeighbors(nodeId: string): CorrelativeNode[] {
    const relations = this.graph.getRelationsForNode(nodeId);
    return relations
      .filter((r) => r.type === "neighbor")
      .map((r) =>
        r.sourceNodeId === nodeId
          ? this.graph.getNode(r.targetNodeId)
          : this.graph.getNode(r.sourceNodeId)
      )
      .filter((n): n is CorrelativeNode => n !== undefined);
  }

  getAllNeighbors(nodeId: string): CorrelativeNode[] {
    const hamming = this.getHammingNeighbors(nodeId);
    const structural = this.getStructuralNeighbors(nodeId);
    const seen = new Set(hamming.map((n) => n.id));
    for (const n of structural) {
      if (!seen.has(n.id)) hamming.push(n);
    }
    return hamming;
  }
}
