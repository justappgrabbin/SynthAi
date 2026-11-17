// src/engine/CodonMatrix.js
// Exact mapping from the Codon Mapping transcription + CHNOPS formulas
// This is the biochemical foundation of the resonance engine

export const CODON_MATRIX = {
  alanine:      { 
    gates: [57, 48, 18, 46], 
    formula: {C:3, H:7,  N:1, O:2, S:0, P:0}, 
    theme: "Fear/Survival/Intuition", 
    circuit: "Splenic/Intuitive",
    behavior: "acoustic_intuition",
    element: "water"
  },
  arginine:     { 
    gates: [10, 38, 35, 17, 21, 51], 
    formula: {C:6, H:14, N:4, O:2, S:0, P:0}, 
    theme: "Ego/Competition/Behaviour", 
    circuit: "Heart/Root",
    behavior: "competitive_drive",
    element: "fire"
  },
  asparagine:   { 
    gates: [43, 34], 
    formula: {C:4, H:8,  N:2, O:3, S:0, P:0}, 
    theme: "Efficiency/Sacral/Power", 
    circuit: "Individual",
    behavior: "power_efficiency",
    element: "air"
  },
  asparticAcid: { 
    gates: [28, 32], 
    formula: {C:4, H:7,  N:1, O:4, S:0, P:0}, 
    theme: "Fear of Death/Failure", 
    circuit: "Splenic/Tribal",
    behavior: "risk_assessment",
    element: "water"
  },
  cysteine:     { 
    gates: [45, 16], 
    formula: {C:3, H:7,  N:1, O:2, S:1, P:0}, 
    theme: "Skills/Rulership/Gathering", 
    circuit: "Throat/Tribal",
    behavior: "skill_gathering",
    element: "fire"
  },
  glutamine:    { 
    gates: [13, 30], 
    formula: {C:5, H:10, N:2, O:3, S:0, P:0}, 
    theme: "Secrets/Desire/Fates", 
    circuit: "Solar Plexus",
    behavior: "desire_secrets",
    element: "water"
  },
  glutamicAcid: { 
    gates: [44, 50], 
    formula: {C:5, H:9,  N:1, O:4, S:0, P:0}, 
    theme: "Intelligence/Values/Smell", 
    circuit: "Splenic",
    behavior: "intelligence_values",
    element: "air"
  },
  glycine:      { 
    gates: [6, 47, 64, 40], 
    formula: {C:2, H:5,  N:1, O:2, S:0, P:0}, 
    theme: "Chaos/Denial/Confusion/Questions", 
    circuit: "Head/Ajna/Ego",
    behavior: "chaos_processing",
    element: "ether"
  },
  histidine:    { 
    gates: [49, 55], 
    formula: {C:6, H:9,  N:3, O:2, S:0, P:0}, 
    theme: "Mutation/Spirit/Principles", 
    circuit: "Solar Plexus",
    behavior: "mutative_pressure",
    element: "fire"
  },
  isoleucine:   { 
    gates: [61, 60, 19], 
    formula: {C:6, H:13, N:1, O:2, S:0, P:0}, 
    theme: "Pressure/Thinking/Limitation", 
    circuit: "Head/Root",
    behavior: "thinking_pressure",
    element: "air"
  },
  leucine:      { 
    gates: [42, 3, 27, 24, 20, 23], 
    formula: {C:6, H:13, N:1, O:2, S:0, P:0}, 
    theme: "Uniqueness/Incarnation/Nourishment", 
    circuit: "Sacral/Throat",
    behavior: "uniqueness_expression",
    element: "earth"
  },
  lysine:       { 
    gates: [1, 14], 
    formula: {C:6, H:14, N:2, O:2, S:0, P:0}, 
    theme: "Direction/Work/Possession", 
    circuit: "Sacral/G Centre",
    behavior: "direction_work",
    element: "earth"
  },
  methionine:   { 
    gates: [41], 
    formula: {C:5, H:11, N:1, O:2, S:1, P:0}, 
    theme: "Initiation/Fantasy/Hunger", 
    circuit: "Root",
    behavior: "initiation_fantasy",
    element: "fire"
  },
  phenylalanine:{ 
    gates: [8, 2], 
    formula: {C:9, H:11, N:1, O:2, S:0, P:0}, 
    theme: "Driver/Contribution/Monopole", 
    circuit: "G/Throat",
    behavior: "contribution_drive",
    element: "ether"
  },
  proline:      { 
    gates: [37, 63, 22, 36], 
    formula: {C:5, H:9,  N:1, O:2, S:0, P:0}, 
    theme: "Bonding/Emotion/Doubt/Crisis", 
    circuit: "Solar Plexus/Throat",
    behavior: "bonding_emotion",
    element: "water"
  },
  serine:       { 
    gates: [58, 54, 53, 39, 52, 15], 
    formula: {C:3, H:7,  N:1, O:3, S:0, P:0}, 
    theme: "Pressure/Flow/Ambition", 
    circuit: "Root/Format",
    behavior: "pressure_flow",
    element: "air"
  },
  threonine:    { 
    gates: [4, 29], 
    formula: {C:4, H:9,  N:1, O:3, S:0, P:0}, 
    theme: "Commitment/Experience/Experimentation", 
    circuit: "Ajna/Sacral",
    behavior: "commitment_experience",
    element: "earth"
  },
  tryptophan:   { 
    gates: [35], 
    formula: {C:11,H:12, N:2, O:2, S:0, P:0}, 
    theme: "Experience/Change/Adventure", 
    circuit: "Throat",
    behavior: "experience_change",
    element: "fire"
  },
  tyrosine:     { 
    gates: [11, 56], 
    formula: {C:9, H:11, N:1, O:3, S:0, P:0}, 
    theme: "Ideas/Stories/Curiosity", 
    circuit: "Ajna/Throat",
    behavior: "ideas_stories",
    element: "air"
  },
  valine:       { 
    gates: [26, 44], 
    formula: {C:5, H:11, N:1, O:2, S:0, P:0}, 
    theme: "Transmission/Tribe/Ego", 
    circuit: "Heart/Throat",
    behavior: "transmission_tribe",
    element: "earth"
  }
};

// Reverse lookup: Gate -> Amino Acid
export const GATE_TO_CODON = {};
Object.entries(CODON_MATRIX).forEach(([acid, data]) => {
  data.gates.forEach(gate => {
    GATE_TO_CODON[gate] = acid;
  });
});

// Elemental behavior axes (from your description)
export const ELEMENTAL_BEHAVIOR = {
  C: "structure",      // scaffolding, form, boundaries, carbon = scaffolding
  H: "flow",         // movement, transfer, emotion, hydrogen = fluidity
  N: "catalysis",    // transformation, mutation, awareness, nitrogen = change
  O: "oxidation",    // action, consumption, manifestation, oxygen = energy
  S: "bridging",     // bonding, connection, resistance, sulfur = links
  P: "phosphorylation" // activation, timing, energy debt, phosphorus = power
};

// Classical element mapping for energetic layer
export const CLASSICAL_ELEMENTS = {
  fire: { gates: [10, 38, 35, 17, 21, 51, 45, 16, 49, 55, 41, 35], behavior: "activation_transformation" },
  water: { gates: [57, 48, 18, 46, 28, 32, 13, 30, 37, 63, 22, 36], behavior: "flow_adaptation" },
  air: { gates: [43, 34, 44, 50, 61, 60, 19, 58, 54, 53, 39, 52, 15, 11, 56], behavior: "expansion_communication" },
  earth: { gates: [42, 3, 27, 24, 20, 23, 1, 14, 4, 29, 26, 44], behavior: "manifestation_form" },
  ether: { gates: [6, 47, 64, 40, 8, 2], behavior: "field_potential" }
};

// Success metrics mapping - what each element contributes to human success
export const SUCCESS_CONTRIBUTIONS = {
  structure: ["goal_clarity", "system_building", "boundary_maintenance"],
  flow: ["emotional_regulation", "adaptability", "relationship_harmony"],
  catalysis: ["innovation", "transformation", "breakthrough_thinking"],
  oxidation: ["action_taking", "energy_management", "physical_vitality"],
  bridging: ["connection_depth", "conflict_resolution", "collaborative_power"],
  phosphorylation: ["timing_precision", "activation_energy", "momentum_building"]
};

export default CODON_MATRIX;
