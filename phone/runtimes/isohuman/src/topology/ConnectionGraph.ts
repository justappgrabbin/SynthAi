// ============================================================================
// Persistent Connection Graph
// ============================================================================
import { CorrelativeRelation } from "../models";

export class ConnectionGraph {
  private edges = new Map<string, Set<string>>();
  private relations = new Map<string, CorrelativeRelation>();

  addRelation(relation: CorrelativeRelation): void {
    this.relations.set(relation.id, relation);
    if (!this.edges.has(relation.sourceNodeId)) {
      this.edges.set(relation.sourceNodeId, new Set());
    }
    this.edges.get(relation.sourceNodeId)!.add(relation.targetNodeId);
    if (relation.bidirectional) {
      if (!this.edges.has(relation.targetNodeId)) {
        this.edges.set(relation.targetNodeId, new Set());
      }
      this.edges.get(relation.targetNodeId)!.add(relation.sourceNodeId);
    }
  }

  getRelationsForNode(nodeId: string): CorrelativeRelation[] {
    return Array.from(this.relations.values()).filter(
      (r) => r.sourceNodeId === nodeId || (r.bidirectional && r.targetNodeId === nodeId)
    );
  }

  getNeighbors(nodeId: string): string[] {
    return Array.from(this.edges.get(nodeId) || []);
  }

  getRelation(id: string): CorrelativeRelation | undefined {
    return this.relations.get(id);
  }

  removeRelation(id: string): void {
    const rel = this.relations.get(id);
    if (!rel) return;
    this.edges.get(rel.sourceNodeId)?.delete(rel.targetNodeId);
    if (rel.bidirectional) {
      this.edges.get(rel.targetNodeId)?.delete(rel.sourceNodeId);
    }
    this.relations.delete(id);
  }

  getAllRelations(): CorrelativeRelation[] {
    return Array.from(this.relations.values());
  }
}
