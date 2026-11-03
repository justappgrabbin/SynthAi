// ============================================================================
// State Graph — Unified node graph with relational geometry
// ============================================================================
import { CorrelativeNode, CorrelativeRelation, CorrelativeTransition } from "../models";

export class StateGraph {
  private nodes = new Map<string, CorrelativeNode>();
  private relations = new Map<string, CorrelativeRelation>();
  private transitions = new Map<string, CorrelativeTransition>();

  addNode(node: CorrelativeNode): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: string): CorrelativeNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): CorrelativeNode[] {
    return Array.from(this.nodes.values());
  }

  addRelation(relation: CorrelativeRelation): void {
    this.relations.set(relation.id, relation);
    const src = this.nodes.get(relation.sourceNodeId);
    const tgt = this.nodes.get(relation.targetNodeId);
    if (src && !src.relationIds.includes(relation.id)) {
      src.relationIds.push(relation.id);
    }
    if (relation.bidirectional && tgt && !tgt.relationIds.includes(relation.id)) {
      tgt.relationIds.push(relation.id);
    }
  }

  getRelation(id: string): CorrelativeRelation | undefined {
    return this.relations.get(id);
  }

  getRelationsForNode(nodeId: string): CorrelativeRelation[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.relationIds.map((id) => this.relations.get(id)!).filter(Boolean);
  }

  addTransition(transition: CorrelativeTransition): void {
    this.transitions.set(transition.id, transition);
    const src = this.nodes.get(transition.rootNodeId);
    const tgt = this.nodes.get(transition.resultantNodeId);
    if (src && !src.outgoingTransitionIds.includes(transition.id)) {
      src.outgoingTransitionIds.push(transition.id);
    }
    if (tgt && !tgt.incomingTransitionIds.includes(transition.id)) {
      tgt.incomingTransitionIds.push(transition.id);
    }
  }

  getTransition(id: string): CorrelativeTransition | undefined {
    return this.transitions.get(id);
  }

  getOutgoingTransitions(nodeId: string): CorrelativeTransition[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.outgoingTransitionIds.map((id) => this.transitions.get(id)!).filter(Boolean);
  }

  getIncomingTransitions(nodeId: string): CorrelativeTransition[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.incomingTransitionIds.map((id) => this.transitions.get(id)!).filter(Boolean);
  }

  getAllTransitions(): CorrelativeTransition[] {
    return Array.from(this.transitions.values());
  }

  getNodeByBinaryPattern(pattern: string): CorrelativeNode | undefined {
    return this.getAllNodes().find((n) => n.binaryPattern === pattern);
  }
}
