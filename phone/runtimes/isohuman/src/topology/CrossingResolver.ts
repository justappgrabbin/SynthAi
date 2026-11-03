// ============================================================================
// Crossing Resolver — Temporary field interactions
// ============================================================================
import { ResonanceNode, ChannelAdapter } from "../models";

export interface CrossingEvent {
  id: string;
  nodeAId: string;
  nodeBId: string;
  overlapScore: number;
  adapterRequired?: string;
  timestamp: string;
  resolved: boolean;
}

export class CrossingResolver {
  private crossings: CrossingEvent[] = [];

  detectCrossing(
    nodeA: ResonanceNode,
    nodeB: ResonanceNode,
    activationThreshold: number = 0.3
  ): CrossingEvent | null {
    const overlap = this.computeOverlap(nodeA, nodeB);
    if (overlap < activationThreshold) return null;

    const event: CrossingEvent = {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nodeAId: nodeA.id,
      nodeBId: nodeB.id,
      overlapScore: overlap,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    this.crossings.push(event);
    return event;
  }

  private computeOverlap(a: ResonanceNode, b: ResonanceNode): number {
    const opA = a.operators;
    const opB = b.operators;
    const diff =
      Math.abs(opA.being - opB.being) +
      Math.abs(opA.design - opB.design) +
      Math.abs(opA.movement - opB.movement) +
      Math.abs(opA.evolution - opB.evolution) +
      Math.abs(opA.space - opB.space);
    return Math.max(0, 1 - diff / 5);
  }

  resolveCrossing(eventId: string, adapterId?: string): void {
    const evt = this.crossings.find((c) => c.id === eventId);
    if (evt) {
      evt.resolved = true;
      evt.adapterRequired = adapterId;
    }
  }

  getActiveCrossings(): CrossingEvent[] {
    return this.crossings.filter((c) => !c.resolved);
  }

  getCrossingsForNode(nodeId: string): CrossingEvent[] {
    return this.crossings.filter(
      (c) => (c.nodeAId === nodeId || c.nodeBId === nodeId) && !c.resolved
    );
  }
}
