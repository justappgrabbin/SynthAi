// ============================================================================
// Monopole Controller — Global attention and trajectory router
// ============================================================================
import { ResonanceNode, MonopoleDecision, RouteSuppression, ExplanationStep, UnifiedFieldState } from "../models";
import { AdapterRegistry } from "../adapters/AdapterRegistry";

export class MonopoleController {
  constructor(private adapters: AdapterRegistry) {}

  decide(field: UnifiedFieldState): MonopoleDecision {
    const trace: ExplanationStep[] = [];
    const nodes = Array.from(field.nodes.values());

    // Sort by composite score: activation + attractorWeight + tension
    const scored = nodes.map((n) => ({
      node: n,
      score: n.activation * 0.4 + n.attractorWeight * 0.3 + n.tension * 0.2 + n.operators.movement * 0.1,
    }));
    scored.sort((a, b) => b.score - a.score);

    const selectedNodeIds = scored.slice(0, 3).map((s) => s.node.id);
    trace.push({ step: 1, operation: "select_nodes", input: nodes.length, output: selectedNodeIds, confidence: 0.9 });

    const selectedChannelIds = scored
      .slice(0, 3)
      .filter((s) => s.node.channelModes.length > 0)
      .flatMap((s) => s.node.channelModes);
    trace.push({ step: 2, operation: "select_channels", input: selectedNodeIds, output: selectedChannelIds, confidence: 0.85 });

    const activatedAdapterIds: string[] = [];
    const suppressedRoutes: RouteSuppression[] = [];

    // Detect mode mismatches and activate adapters
    for (let i = 0; i < selectedNodeIds.length; i++) {
      for (let j = i + 1; j < selectedNodeIds.length; j++) {
        const a = field.nodes.get(selectedNodeIds[i])!;
        const b = field.nodes.get(selectedNodeIds[j])!;
        if (a.circuitFamily && b.circuitFamily && a.circuitFamily !== b.circuitFamily) {
          const adapter = this.adapters.findAdapter(a.circuitFamily, b.circuitFamily);
          if (adapter) {
            activatedAdapterIds.push(adapter.id);
          } else {
            suppressedRoutes.push({
              routeId: `${a.id}→${b.id}`,
              reason: `No adapter for ${a.circuitFamily}↔${b.circuitFamily}`,
            });
          }
        }
      }
    }
    trace.push({ step: 3, operation: "resolve_adapters", input: selectedNodeIds.length, output: activatedAdapterIds.length, confidence: 0.8 });

    const dominantAttractorIds = scored
      .filter((s) => s.node.attractorWeight > 0.6)
      .map((s) => s.node.id);

    const coherenceScore = this.computeCoherence(field);

    return {
      selectedNodeIds,
      selectedChannelIds,
      activatedAdapterIds,
      dominantAttractorIds,
      suppressedRoutes,
      coherenceScore,
      decisionTrace: trace,
    };
  }

  private computeCoherence(field: UnifiedFieldState): number {
    const ops = field.operatorProjections;
    const variance =
      Math.pow(ops.being - 0.5, 2) +
      Math.pow(ops.design - 0.5, 2) +
      Math.pow(ops.movement - 0.5, 2) +
      Math.pow(ops.evolution - 0.5, 2) +
      Math.pow(ops.space - 0.5, 2);
    return Math.max(0, 1 - variance);
  }
}
