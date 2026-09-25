// src/engine/CHNOPS.js
// The CHNOPS Vector Calculator - turns any set of activated gates into a 6-dimensional biochemical state vector
// This is the core computation layer that bridges astronomy to biochemistry

import { CODON_MATRIX, GATE_TO_CODON, ELEMENTAL_BEHAVIOR, SUCCESS_CONTRIBUTIONS } from './CodonMatrix.js';

/**
 * Compute CHNOPS vector from activated gates
 * @param {Array} activatedGates - array of gate numbers (e.g., [10, 20, 34, 57])
 * @param {String} normalization - 'softmax', 'unit', or 'raw'
 * @returns {Object} - { raw, normalized, gateCount, elementalBehavior, successProfile }
 */
export function computeCHNOPS(activatedGates, normalization = 'softmax') {
  const raw = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 };
  const successProfile = {
    goal_clarity: 0, system_building: 0, boundary_maintenance: 0,
    emotional_regulation: 0, adaptability: 0, relationship_harmony: 0,
    innovation: 0, transformation: 0, breakthrough_thinking: 0,
    action_taking: 0, energy_management: 0, physical_vitality: 0,
    connection_depth: 0, conflict_resolution: 0, collaborative_power: 0,
    timing_precision: 0, activation_energy: 0, momentum_building: 0
  };

  activatedGates.forEach(gate => {
    const codonKey = GATE_TO_CODON[gate];
    const codon = CODON_MATRIX[codonKey];
    if (codon) {
      Object.keys(raw).forEach(el => {
        if (el !== 'P') raw[el] += codon.formula[el] || 0;
      });

      // Map elemental behaviors to success contributions
      Object.entries(codon.formula).forEach(([element, count]) => {
        if (count > 0 && ELEMENTAL_BEHAVIOR[element]) {
          const behavior = ELEMENTAL_BEHAVIOR[element];
          const contributions = SUCCESS_CONTRIBUTIONS[behavior] || [];
          contributions.forEach(contribution => {
            successProfile[contribution] += count * 0.1;
          });
        }
      });
    }
  });

  // Add Phosphorus as "activation potential" based on N+O reactivity
  // P represents the "energy currency" of the system - how much activation potential exists
  raw.P = (raw.N * 3) + (raw.O * 2) + (raw.S * 5);

  // Normalize to unit vector (the "aura" is a field, not a count)
  const values = Object.values(raw);
  const sum = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);

  const normalized = {};
  Object.keys(raw).forEach(key => {
    if (normalization === 'unit') normalized[key] = raw[key] / sum;
    else if (normalization === 'softmax') {
      normalized[key] = Math.exp(raw[key]) / values.reduce((a, b) => a + Math.exp(b), 0);
    }
    else normalized[key] = raw[key]; // raw stoichiometry
  });

  // Determine dominant elemental behavior
  const elementalBehavior = {};
  Object.entries(normalized).forEach(([element, value]) => {
    if (ELEMENTAL_BEHAVIOR[element]) {
      elementalBehavior[ELEMENTAL_BEHAVIOR[element]] = value;
    }
  });

  return { 
    raw, 
    normalized, 
    activatedGates: [...new Set(activatedGates.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b),
    gateCount: activatedGates.length,
    elementalBehavior,
    successProfile,
    dominantElement: Object.entries(normalized).sort((a, b) => b[1] - a[1])[0][0]
  };
}

/**
 * Compute resonance between two CHNOPS fields
 * This calculates the "interference pattern" between two people's biochemical signatures
 * @param {Object} vectorA - normalized CHNOPS vector for person A
 * @param {Object} vectorB - normalized CHNOPS vector for person B
 * @returns {Object} - { similarity, interference, dyadPotential, complementarityScore, successResonance }
 */
export function computeResonance(vectorA, vectorB) {
  const keys = ['C', 'H', 'N', 'O', 'S', 'P'];
  const a = Object.fromEntries(keys.map(k => [k, Number(vectorA[k] || 0)]));
  const b = Object.fromEntries(keys.map(k => [k, Number(vectorB[k] || 0)]));

  // Bray-Curtis/L1 style similarity for nonnegative chemistry vectors.
  // Unlike cosine, this preserves magnitude/distribution differences instead of
  // collapsing everything that points in roughly the same direction.
  const numerator = keys.reduce((sum,k)=>sum + Math.abs(a[k]-b[k]),0);
  const denominator = keys.reduce((sum,k)=>sum + Math.abs(a[k])+Math.abs(b[k]),0);
  const elementalSimilarity = denominator > 0 ? Math.max(0, 1 - numerator/denominator) : 1;

  const gatesA = new Set((vectorA.activatedGates || []).map(Number));
  const gatesB = new Set((vectorB.activatedGates || []).map(Number));
  const union = new Set([...gatesA,...gatesB]);
  const intersection = [...gatesA].filter(g=>gatesB.has(g));
  const gateOverlap = union.size ? intersection.length/union.size : 1;

  // Chemistry remains the larger contributor, while actual gate identity prevents
  // disjoint activations from being mislabeled nearly identical.
  const similarity = (0.65 * elementalSimilarity) + (0.35 * gateOverlap);

  let interference = "neutral";
  if (similarity > 0.85) interference = "constructive";
  else if (similarity < 0.3) interference = "destructive";
  else if (a.N > b.N * 1.5) interference = "catalytic";
  else if (a.H > b.H * 1.5) interference = "flow_dominant";
  else if (a.C > b.C * 1.5) interference = "structure_dominant";

  const complementarity = denominator > 0 ? numerator/denominator : 0;
  const successKeys = Object.keys(vectorA.successProfile || {});
  let successDot = 0, successNormA = 0, successNormB = 0;
  for (const k of successKeys) {
    const av = vectorA.successProfile?.[k] || 0;
    const bv = vectorB.successProfile?.[k] || 0;
    successDot += av*bv; successNormA += av**2; successNormB += bv**2;
  }
  const successResonance = successNormA > 0 && successNormB > 0 ? successDot/(Math.sqrt(successNormA)*Math.sqrt(successNormB)) : 0;
  return {similarity,elementalSimilarity,gateOverlap,interference,dyadPotential: similarity * (a.P+b.P),complementarityScore:complementarity,successResonance,sharedStrengths:successResonance>0.7?"high":successResonance>0.4?"moderate":"low",growthPotential:complementarity>0.25?"high":"moderate",metric:'0.65*BrayCurtisChemistry + 0.35*GateJaccard'};
}

/**
 * Compute the "Purpose Vector" - what the dyad is collectively moving toward
 * This is the success-driven direction of the relationship
 * @param {Object} triadA - Person A's triad data
 * @param {Object} triadB - Person B's triad data
 * @returns {Object} - purpose vector and interpretation
 */
export function computePurposeVector(triadA, triadB) {
  // Combine all three layers (mind, body, heart) for both people
  const combined = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 };

  ['mind', 'body', 'heart'].forEach(layer => {
    if (triadA[layer]?.normalized) {
      Object.entries(triadA[layer].normalized).forEach(([el, val]) => {
        combined[el] += val * 0.5; // Person A contributes 50%
      });
    }
    if (triadB[layer]?.normalized) {
      Object.entries(triadB[layer].normalized).forEach(([el, val]) => {
        combined[el] += val * 0.5; // Person B contributes 50%
      });
    }
  });

  // Normalize
  const sum = Object.values(combined).reduce((a, b) => a + b, 0);
  const purpose = {};
  Object.entries(combined).forEach(([el, val]) => {
    purpose[el] = val / sum;
  });

  // Determine purpose direction based on dominant elements
  const sorted = Object.entries(purpose).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0];
  const secondary = sorted[1];

  let purposeStatement = "";
  if (dominant[0] === 'C' && secondary[0] === 'N') {
    purposeStatement = "Building transformative structures - creating systems that evolve";
  } else if (dominant[0] === 'H' && secondary[0] === 'O') {
    purposeStatement = "Flowing into action - emotional clarity drives manifestation";
  } else if (dominant[0] === 'N' && secondary[0] === 'P') {
    purposeStatement = "Catalytic activation - transformation powered by precise timing";
  } else if (dominant[0] === 'O' && secondary[0] === 'S') {
    purposeStatement = "Active bonding - taking action that deepens connection";
  } else if (dominant[0] === 'S' && secondary[0] === 'H') {
    purposeStatement = "Bridging flows - connecting through emotional resonance";
  } else {
    purposeStatement = `Purpose driven by ${ELEMENTAL_BEHAVIOR[dominant[0]]} with ${ELEMENTAL_BEHAVIOR[secondary[0]]} support`;
  }

  return {
    vector: purpose,
    dominant: dominant[0],
    secondary: secondary[0],
    statement: purposeStatement,
    strength: Math.sqrt(dominant[1] ** 2 + secondary[1] ** 2)
  };
}

/**
 * Detect deviation from purpose - the "falling away" detection
 * @param {Object} currentVector - current CHNOPS state
 * @param {Object} purposeVector - the dyad's purpose vector
 * @returns {Object} - deviation metrics and warnings
 */
export function detectDeviation(currentVector, purposeVector) {
  const keys = ['C', 'H', 'N', 'O', 'S', 'P'];
  let deviation = 0;
  const elementDeviations = {};

  keys.forEach(k => {
    const diff = Math.abs(currentVector[k] - purposeVector.vector[k]);
    deviation += diff;
    elementDeviations[k] = {
      diff,
      direction: currentVector[k] > purposeVector.vector[k] ? "excess" : "deficit",
      behavior: ELEMENTAL_BEHAVIOR[k]
    };
  });

  deviation = deviation / keys.length;

  // Determine if this is a concerning deviation
  const status = deviation > 0.4 ? "critical" : deviation > 0.25 ? "warning" : "aligned";

  // Generate specific guidance based on which elements are off
  const guidance = [];
  Object.entries(elementDeviations)
    .filter(([_, data]) => data.diff > 0.15)
    .forEach(([element, data]) => {
      if (data.direction === "excess") {
        guidance.push(`Reduce ${data.behavior} - too much ${ELEMENTAL_BEHAVIOR[element]} energy is pulling you off course`);
      } else {
        guidance.push(`Increase ${data.behavior} - need more ${ELEMENTAL_BEHAVIOR[element]} energy to align with purpose`);
      }
    });

  return {
    deviation,
    status,
    elementDeviations,
    guidance,
    // Success impact
    impactOnSuccess: deviation > 0.3 ? "significant" : deviation > 0.15 ? "moderate" : "minimal"
  };
}

export default { computeCHNOPS, computeResonance, computePurposeVector, detectDeviation };
