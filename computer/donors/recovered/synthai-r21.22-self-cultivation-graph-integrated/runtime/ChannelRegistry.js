import { NEURAL_NETWORK_MAPPINGS } from './foundations.js';
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
export const CANONICAL_CHANNEL_PAIRS = Object.freeze([
    [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59],
    [7, 31], [9, 52], [10, 20], [10, 34], [10, 57], [11, 56],
    [12, 22], [13, 33], [16, 48], [17, 62], [18, 58], [19, 49],
    [20, 34], [20, 57], [21, 45], [23, 43], [24, 61], [25, 51],
    [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54],
    [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64]
]);
export const INTEGRATION_CIRCUIT_CHANNELS = new Set([
    '10-34', '10-57', '34-57', '20-34', '20-57', '10-20'
]);
export function canonicalChannelId(gateA, gateB) {
    return `${Math.min(gateA, gateB)}-${Math.max(gateA, gateB)}`;
}
function mappingFor(gateA, gateB) {
    const forward = `${gateA}-${gateB}`;
    const reverse = `${gateB}-${gateA}`;
    const canonical = canonicalChannelId(gateA, gateB);
    return NEURAL_NETWORK_MAPPINGS[canonical] || NEURAL_NETWORK_MAPPINGS[forward] || NEURAL_NETWORK_MAPPINGS[reverse];
}
export class ChannelRegistry {
    channels;
    constructor() {
        this.channels = new Map();
        this.initializeChannels();
    }
    initializeChannels() {
        for (const [gateA, gateB] of CANONICAL_CHANNEL_PAIRS) {
            const channelId = canonicalChannelId(gateA, gateB);
            const mapping = mappingFor(gateA, gateB);
            const channel = {
                channelId,
                name: mapping?.name || `Channel ${channelId}`,
                gateA: Math.min(gateA, gateB),
                gateB: Math.max(gateA, gateB),
                circuit: INTEGRATION_CIRCUIT_CHANNELS.has(channelId) ? 'Integration' : (mapping?.circuit || 'Unknown'),
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
    getChannel(channelId) {
        const [a, b] = channelId.split('-').map(Number);
        if (Number.isFinite(a) && Number.isFinite(b))
            return this.channels.get(canonicalChannelId(a, b));
        return this.channels.get(channelId);
    }
    getAllChannels() {
        return Array.from(this.channels.values());
    }
    findByGates(gateA, gateB) {
        return this.channels.get(canonicalChannelId(gateA, gateB));
    }
}
export default ChannelRegistry;
