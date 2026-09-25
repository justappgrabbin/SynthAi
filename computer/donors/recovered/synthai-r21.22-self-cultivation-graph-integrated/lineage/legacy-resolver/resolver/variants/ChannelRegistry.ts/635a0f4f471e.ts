import { ChannelDefinition, NEURAL_NETWORK_MAPPINGS } from './foundations';

/**
 * Canonical 36-channel topology.
 *
 * v0.3 correction:
 * - the previous list contained three reversed duplicates and one non-canonical
 *   pair, leaving only 33 unique channel ids;
 * - this list restores 36 unique pairs;
 * - neural-network metadata is looked up in either gate order because the
 *   historical mapping table uses mixed key orientation (e.g. 63-4 vs 17-62).
 */
export const CANONICAL_CHANNEL_PAIRS: ReadonlyArray<readonly [number, number]> = Object.freeze([
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59],
  [7, 31], [9, 52], [10, 20], [10, 34], [10, 57], [11, 56],
  [12, 22], [13, 33], [16, 48], [17, 62], [18, 58], [19, 49],
  [20, 34], [20, 57], [21, 45], [23, 43], [24, 61], [25, 51],
  [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54],
  [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64]
]);

export function canonicalChannelId(gateA: number, gateB: number): string {
  return `${Math.min(gateA, gateB)}-${Math.max(gateA, gateB)}`;
}

function mappingFor(gateA: number, gateB: number) {
  const forward = `${gateA}-${gateB}`;
  const reverse = `${gateB}-${gateA}`;
  const canonical = canonicalChannelId(gateA, gateB);
  return NEURAL_NETWORK_MAPPINGS[canonical] || NEURAL_NETWORK_MAPPINGS[forward] || NEURAL_NETWORK_MAPPINGS[reverse];
}

export class ChannelRegistry {
  private channels: Map<string, ChannelDefinition>;

  constructor() {
    this.channels = new Map();
    this.initializeChannels();
  }

  private initializeChannels(): void {
    for (const [gateA, gateB] of CANONICAL_CHANNEL_PAIRS) {
      const channelId = canonicalChannelId(gateA, gateB);
      const mapping = mappingFor(gateA, gateB);

      const channel: ChannelDefinition = {
        channelId,
        name: mapping?.name || `Channel ${channelId}`,
        gateA: Math.min(gateA, gateB),
        gateB: Math.max(gateA, gateB),
        circuit: mapping?.circuit || 'Unknown',
        computationalExpression: mapping?.network || 'Unknown',
        requiredCapabilities: [channelId],
        activationRules: [
          {
            ruleId: `rule_${channelId}_harmonic`,
            condition: (source, target) => {
              const sourceGate = source.address.gateLine.gate;
              const targetGate = target.address.gateLine.gate;
              return canonicalChannelId(sourceGate, targetGate) === channelId;
            },
            weight: 1.0
          }
        ]
      };

      this.channels.set(channelId, channel);
    }
  }

  getChannel(channelId: string): ChannelDefinition | undefined {
    const [a, b] = channelId.split('-').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return this.channels.get(canonicalChannelId(a, b));
    return this.channels.get(channelId);
  }

  getAllChannels(): ChannelDefinition[] {
    return Array.from(this.channels.values());
  }

  findByGates(gateA: number, gateB: number): ChannelDefinition | undefined {
    return this.channels.get(canonicalChannelId(gateA, gateB));
  }
}

export default ChannelRegistry;
