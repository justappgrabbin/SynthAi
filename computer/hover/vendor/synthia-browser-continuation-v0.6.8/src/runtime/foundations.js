function encodeIntrinsic(addr) {
  const g = Math.max(0, Math.min(63, addr.gateLine.gate - 1));
  const l = Math.max(0, Math.min(5, addr.gateLine.line - 1));
  const c = Math.max(0, Math.min(5, addr.color - 1));
  const t = Math.max(0, Math.min(5, addr.tone - 1));
  const b = Math.max(0, Math.min(4, addr.base - 1));
  const low = g << 12 | l << 9 | c << 6 | t << 3 | b;
  const s = addr.side === "FIVE_SIDE" ? 1 : 0;
  const p = Math.max(0, Math.min(12, addr.planet - 1));
  const d = Math.max(0, Math.min(4, addr.dimension - 1));
  const high = s << 7 | p << 3 | d;
  return { low, high };
}
function decodeIntrinsic(encoded) {
  const low = encoded.low;
  const b = low & 7;
  const t = low >> 3 & 7;
  const c = low >> 6 & 7;
  const l = low >> 9 & 7;
  const g = low >> 12 & 63;
  const high = encoded.high;
  const d = high & 7;
  const p = high >> 3 & 15;
  const s = high >> 7 & 1;
  return {
    side: s === 1 ? "FIVE_SIDE" : "FOUR_SIDE",
    planet: p + 1,
    dimension: d + 1,
    gateLine: { gate: g + 1, line: l + 1 },
    color: c + 1,
    tone: t + 1,
    base: b + 1
  };
}
const NEURAL_NETWORK_MAPPINGS = {
  // Understanding Circuit
  "63-4": { channel: "63-4", name: "Logic", network: "Deep Feed Forward Network (DFF)", circuit: "Understanding" },
  "17-62": { channel: "17-62", name: "Acceptance", network: "Restricted Boltzmann Machine (RBM)", circuit: "Understanding" },
  "18-58": { channel: "18-58", name: "Judgment", network: "Hopfield Network", circuit: "Understanding" },
  "16-48": { channel: "16-48", name: "Wavelength", network: "Sparse Autoencoder (SAE)", circuit: "Understanding" },
  "9-52": { channel: "9-52", name: "Concentration", network: "Extreme Learning Machine (ELM)", circuit: "Understanding" },
  "15-5": { channel: "15-5", name: "Rhythm", network: "Kohonen Self-Organizing Map", circuit: "Understanding" },
  "31-7": { channel: "31-7", name: "Alpha", network: "Deep Convolutional Network (DCN)", circuit: "Understanding" },
  // Knowing Circuit
  "3-60": { channel: "3-60", name: "Mutation", network: "Liquid State Machine (LSM)", circuit: "Knowing" },
  "61-24": { channel: "61-24", name: "Awareness", network: "Neural Turing Machine (NTM)", circuit: "Knowing" },
  "43-23": { channel: "43-23", name: "Structuring", network: "Deconvolutional Network", circuit: "Knowing" },
  "28-38": { channel: "28-38", name: "Struggle", network: "Generative Adversarial Network (GAN)", circuit: "Knowing" },
  "20-57": { channel: "20-57", name: "Brainwave", network: "Echo State Network (ESN)", circuit: "Knowing" },
  "55-39": { channel: "55-39", name: "Emoting", network: "Gated Recurrent Unit (GRU)", circuit: "Knowing" },
  "12-22": { channel: "12-22", name: "Openness", network: "Variational Autoencoder (VAE)", circuit: "Knowing" },
  "2-14": { channel: "2-14", name: "The Beat", network: "Radial Basis Function Network (RBF)", circuit: "Knowing" },
  "8-1": { channel: "8-1", name: "Inspiration", network: "Attention Network", circuit: "Knowing" },
  // Sensing Circuit
  "42-53": { channel: "42-53", name: "Maturation", network: "Deep Belief Network (DBN)", circuit: "Sensing" },
  // Integration
  "34-57": { channel: "34-57", name: "Power", network: "LSM + DBN reservoir-guided action", circuit: "Integration" },
  "10-20": { channel: "10-20", name: "Awakening", network: "identity network + ESN/attention expression", circuit: "Integration" },
  "10-57": { channel: "10-57", name: "Perfected Form", network: "Capsule-style identity + RBF/ESN intuition", circuit: "Integration" },
  "20-34": { channel: "20-34", name: "Charisma", network: "LSM + policy/action layer", circuit: "Integration" }
};
function resolveHybridArchitecture(channelA, channelB) {
  const mappingA = NEURAL_NETWORK_MAPPINGS[channelA];
  const mappingB = NEURAL_NETWORK_MAPPINGS[channelB];
  if (!mappingA || !mappingB) {
    return {
      baseA: channelA,
      baseB: channelB,
      hybrid: "Unknown",
      description: "One or both channels have no neural mapping"
    };
  }
  const hybrid = `${mappingA.network} + ${mappingB.network}`;
  let description = "";
  if (mappingA.circuit === mappingB.circuit) {
    description = `Intra-circuit hybrid: ${mappingA.circuit} circuit combining ${mappingA.name} and ${mappingB.name}`;
  } else {
    description = `Cross-circuit hybrid: ${mappingA.circuit} (${mappingA.name}) + ${mappingB.circuit} (${mappingB.name})`;
  }
  return { baseA: mappingA.network, baseB: mappingB.network, hybrid, description };
}
var stdin_default = {
  encodeIntrinsic,
  decodeIntrinsic,
  resolveHybridArchitecture,
  NEURAL_NETWORK_MAPPINGS
};
export {
  NEURAL_NETWORK_MAPPINGS,
  decodeIntrinsic,
  stdin_default as default,
  encodeIntrinsic,
  resolveHybridArchitecture
};
