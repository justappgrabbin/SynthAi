// ============================================================================
// Contrast Resolver — Multi-axis contrastive meaning
// ============================================================================
import { CorrelativeNode, ContrastRelation } from "../models";
import { StateGraph } from "./StateGraph";

export class ContrastResolver {
  private contrasts: ContrastRelation[] = [];

  constructor(private graph: StateGraph) {}

  registerContrast(contrast: ContrastRelation): void {
    this.contrasts.push(contrast);
  }

  getContrastsForNode(nodeId: string): ContrastRelation[] {
    return this.contrasts.filter(
      (c) => c.sourceNodeId === nodeId || c.targetNodeId === nodeId
    );
  }

  getContrastsByAxis(nodeId: string, axis: string): ContrastRelation[] {
    return this.contrasts.filter(
      (c) => (c.sourceNodeId === nodeId || c.targetNodeId === nodeId) && c.axis === axis
    );
  }

  getContrastPartner(nodeId: string, axis: string): CorrelativeNode | undefined {
    const c = this.contrasts.find(
      (c) => c.sourceNodeId === nodeId && c.axis === axis
    );
    if (c) return this.graph.getNode(c.targetNodeId);
    const c2 = this.contrasts.find(
      (c) => c.targetNodeId === nodeId && c.axis === axis
    );
    if (c2) return this.graph.getNode(c2.sourceNodeId);
    return undefined;
  }

  getAllAxesForNode(nodeId: string): string[] {
    const axes = new Set<string>();
    for (const c of this.contrasts) {
      if (c.sourceNodeId === nodeId || c.targetNodeId === nodeId) {
        axes.add(c.axis);
      }
    }
    return Array.from(axes);
  }
}
