// ============================================================================
// Channel Processor — Apply circuit-family bias to node processing
// ============================================================================
import { ResonanceNode, CircuitFamily } from "../models";
import { ChannelRegistry, ChannelSpec } from "./ChannelRegistry";

export class ChannelProcessor {
  constructor(private registry: ChannelRegistry) {}

  process(node: ResonanceNode, channelId?: string): ResonanceNode {
    const updated = { ...node };
    if (channelId) {
      const spec = this.registry.get(channelId);
      if (spec) {
        updated.circuitFamily = spec.circuitFamily;
        updated.channelModes = [channelId];
      }
    }
    switch (updated.circuitFamily) {
      case "understanding":
        updated.activation = Math.min(1, updated.activation + 0.1);
        updated.tension = Math.max(0, updated.tension - 0.05);
        break;
      case "sensing":
        updated.memoryGravity = Math.min(1, updated.memoryGravity + 0.08);
        break;
      case "knowing":
        updated.tension = Math.min(1, updated.tension + 0.1);
        updated.regime = updated.tension > 0.7 ? "critical" : updated.regime;
        break;
      case "integration":
        updated.activation = Math.min(1, updated.activation + 0.15);
        break;
      case "centering":
        updated.operators.being = Math.min(1, updated.operators.being + 0.1);
        break;
      case "ego_defense":
        updated.operators.design = Math.min(1, updated.operators.design + 0.1);
        break;
    }
    return updated;
  }

  getSpec(channelId: string): ChannelSpec | undefined {
    return this.registry.get(channelId);
  }
}
