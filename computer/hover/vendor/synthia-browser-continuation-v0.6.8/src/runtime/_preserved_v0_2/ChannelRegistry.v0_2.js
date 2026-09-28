import { NEURAL_NETWORK_MAPPINGS } from "./foundations";
class ChannelRegistry {
  channels;
  constructor() {
    this.channels = /* @__PURE__ */ new Map();
    this.initializeChannels();
  }
  initializeChannels() {
    const canonicalPairs = [
      [1, 8],
      [2, 14],
      [3, 60],
      [4, 63],
      [5, 15],
      [6, 59],
      [7, 31],
      [9, 52],
      [10, 20],
      [11, 56],
      [12, 22],
      [13, 33],
      [16, 48],
      [17, 62],
      [18, 58],
      [19, 49],
      [21, 45],
      [23, 43],
      [24, 61],
      [25, 51],
      [26, 44],
      [27, 50],
      [28, 38],
      [29, 30],
      [32, 54],
      [34, 57],
      [35, 36],
      [37, 40],
      [39, 55],
      [41, 30],
      [42, 53],
      [46, 29],
      [47, 64],
      [48, 16],
      [49, 19],
      [50, 27]
    ];
    for (const [gateA, gateB] of canonicalPairs) {
      const channelId = `${Math.min(gateA, gateB)}-${Math.max(gateA, gateB)}`;
      const mapping = NEURAL_NETWORK_MAPPINGS[channelId];
      const channel = {
        channelId,
        name: mapping?.name || `Channel ${channelId}`,
        gateA: Math.min(gateA, gateB),
        gateB: Math.max(gateA, gateB),
        circuit: mapping?.circuit || "Unknown",
        computationalExpression: mapping?.network || "Unknown",
        requiredCapabilities: [channelId],
        activationRules: [
          {
            ruleId: `rule_${channelId}_harmonic`,
            condition: (source, target) => {
              return source.address.gateLine.gate === gateA && target.address.gateLine.gate === gateB || source.address.gateLine.gate === gateB && target.address.gateLine.gate === gateA;
            },
            weight: 1
          }
        ]
      };
      this.channels.set(channelId, channel);
    }
  }
  getChannel(channelId) {
    return this.channels.get(channelId);
  }
  getAllChannels() {
    return Array.from(this.channels.values());
  }
  findByGates(gateA, gateB) {
    const channelId = `${Math.min(gateA, gateB)}-${Math.max(gateA, gateB)}`;
    return this.channels.get(channelId);
  }
}
var stdin_default = ChannelRegistry;
export {
  ChannelRegistry,
  stdin_default as default
};
