import {
  transformHouse,
  HOUSES,
  HEXAGRAMS
} from "./ato-engine.js";
const DEFAULT_W_PROFILE = {
  w1: 0.5,
  w2: 0.5,
  w3: 0.5,
  w4: 0.5,
  w5: 0.5
};
function deriveWProfileFromChart(chart) {
  const gateImpulse = chart.sunGate % 16 / 16;
  const gateMeaning = chart.earthGate % 16 / 16;
  const lineTension = chart.sunLine % 2 === 1 ? 0.7 : 0.3;
  const colorWitness = chart.sunColor / 6;
  const toneContext = chart.sunTone / 6;
  const baseMeaning = chart.sunBase / 6;
  return {
    w1: gateImpulse,
    w2: lineTension,
    w3: colorWitness,
    w4: toneContext,
    w5: (gateMeaning + baseMeaning) / 2
  };
}
class SeededRandom {
  seed;
  state;
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }
  // LCG parameters (Numerical Recipes)
  next() {
    this.state = (1664525 * this.state + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  // Random integer in [min, max)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  // Random choice from array
  choice(arr) {
    return arr[this.nextInt(0, arr.length)];
  }
  // Weighted random choice
  weightedChoice(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}
const SENTENCE_TEMPLATES = {
  SPACE: "I think [IMAGE] which shapes [PERCEPTION] and invites [RHYTHM].",
  MIND: "I remember [PATTERN] that accumulates as [LEVER] and biases future [CHOICE].",
  SOUL: "I design [FORM] to encode [FUNCTION] so the system produces [OUTCOME].",
  BODY: "I am [SENSORY STATE], which determines my immediate [CAPACITY] to act.",
  HEART: "I create [INITIATIVE] that yields [NODE] and shifts the waveform toward [NEW PATTERN]."
};
function hexagramToSentenceType(hex) {
  const upperTri = parseInt(hex.upperTrigram, 2);
  const lowerTri = parseInt(hex.lowerTrigram, 2);
  const combined = (upperTri + lowerTri) % 5;
  const types = ["SPACE", "MIND", "SOUL", "BODY", "HEART"];
  return types[combined];
}
function buildSentence(hex, wState, userProfile) {
  const type = hexagramToSentenceType(hex);
  const template = SENTENCE_TEMPLATES[type];
  const image = hex.name;
  const perception = wState.w3 > 0.5 ? "clarity" : "confusion";
  const rhythm = wState.w1 > 0.5 ? "acceleration" : "deceleration";
  const pattern = `${hex.upperTrigram} over ${hex.lowerTrigram}`;
  const lever = wState.w4 > 0.5 ? "momentum" : "friction";
  const choice = wState.w2 > 0.5 ? "hesitation" : "commitment";
  const form = hex.name;
  const func = type === "SOUL" ? "structure" : "flow";
  const outcome = wState.w5 > 0.5 ? "crystallization" : "dissolution";
  const sensory = wState.w2 > 0.5 ? "tension" : "ease";
  const capacity = wState.w3 > 0.5 ? "action" : "observation";
  const initiative = hex.name;
  const node = `${hex.number}`;
  const newPattern = wState.w5 > 0.5 ? "integration" : "fragmentation";
  return template.replace("[IMAGE]", image).replace("[PERCEPTION]", perception).replace("[RHYTHM]", rhythm).replace("[PATTERN]", pattern).replace("[LEVER]", lever).replace("[CHOICE]", choice).replace("[FORM]", form).replace("[FUNCTION]", func).replace("[OUTCOME]", outcome).replace("[SENSORY STATE]", sensory).replace("[CAPACITY]", capacity).replace("[INITIATIVE]", initiative).replace("[NODE]", node).replace("[NEW PATTERN]", newPattern);
}
class MonteCarloSampler {
  kleinSystem;
  maxSteps;
  convergenceThreshold;
  constructor(kleinSystem, maxSteps = 20, convergenceThreshold = 0.85) {
    this.kleinSystem = kleinSystem;
    this.maxSteps = maxSteps;
    this.convergenceThreshold = convergenceThreshold;
  }
  /**
   * Sample a single narrative path.
   */
  samplePath(query, userW, seed, nodeId = "root") {
    const rng = new SeededRandom(seed);
    const steps = [];
    let currentW = { ...userW };
    const initialGate = this.queryToGate(query, rng);
    let currentHex = HEXAGRAMS[initialGate];
    let currentHouseId = currentHex.houseId;
    for (let step = 0; step < this.maxSteps; step++) {
      const atoOperator = this.deriveATOFromW2(currentW.w2, rng);
      const house = HOUSES[currentHouseId];
      const transformed = transformHouse(house, atoOperator);
      const nextHex = this.selectByWitness(transformed, currentW.w3, rng);
      const sentence = buildSentence(nextHex, currentW);
      const toolIds = this.kleinSystem.registry.getByGate(nextHex.number).map((t) => t.toolId);
      const kleinEval = toolIds.length > 0 ? this.kleinSystem.evaluateNode(`${nodeId}-step-${step}`, toolIds) : void 0;
      currentW = this.evolveWState(currentW, nextHex, kleinEval);
      steps.push({
        stepNumber: step,
        houseId: currentHouseId,
        hexagram: nextHex,
        atoOperator,
        sentence,
        wState: { ...currentW },
        kleinEvaluation: kleinEval
      });
      if (currentW.w5 >= this.convergenceThreshold) {
        break;
      }
      currentHouseId = nextHex.houseId;
      currentHex = nextHex;
    }
    const finalScore = this.scorePath(steps, userW);
    const convergencePoint = steps[steps.length - 1]?.sentence || "unresolved";
    return {
      pathId: `path-${seed}`,
      steps,
      finalScore,
      convergencePoint,
      convergenceDepth: steps[steps.length - 1]?.wState.w5 || 0,
      trajectory: this.classifyTrajectory(steps)
    };
  }
  /**
   * Run full simulation with n samples.
   */
  simulate(query, userW, nSamples = 1e3, baseSeed = 42) {
    const paths = [];
    for (let i = 0; i < nSamples; i++) {
      const path = this.samplePath(query, userW, baseSeed + i);
      paths.push(path);
    }
    paths.sort((a, b) => b.finalScore - a.finalScore);
    const scores = paths.map((p) => p.finalScore);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const convergenceCounts = {};
    for (const path of paths) {
      const key = path.trajectory;
      convergenceCounts[key] = (convergenceCounts[key] || 0) + 1;
    }
    const convergenceRates = {};
    for (const key of Object.keys(convergenceCounts)) {
      convergenceRates[key] = convergenceCounts[key] / paths.length;
    }
    return {
      bestPath: paths[0],
      top5Paths: paths.slice(0, 5),
      allPaths: paths,
      distribution: { meanScore, stdDev, convergenceRates },
      query,
      userW,
      nSamples,
      seed: baseSeed
    };
  }
  // ── Internal methods ──
  queryToGate(query, rng) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      hash = (hash << 5) - hash + query.charCodeAt(i);
      hash = hash & hash;
    }
    const positiveHash = Math.abs(hash);
    return positiveHash % 64 + 1;
  }
  deriveATOFromW2(w2, rng) {
    const yangCount = Math.round(w2 * 3);
    const trigrams = ["000", "001", "010", "011", "100", "101", "110", "111"];
    const candidates = trigrams.filter((t) => {
      const ones = (t.match(/1/g) || []).length;
      return ones === yangCount;
    });
    return rng.choice(candidates.length > 0 ? candidates : trigrams);
  }
  selectByWitness(house, w3, rng) {
    if (w3 > 0.7) {
      const scored = house.map((h) => ({
        hex: h,
        score: this.balanceScore(h)
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].hex;
    } else if (w3 < 0.3) {
      const scored = house.map((h) => ({
        hex: h,
        score: this.disruptionScore(h)
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].hex;
    } else {
      return rng.choice(house);
    }
  }
  balanceScore(hex) {
    const upper = parseInt(hex.upperTrigram, 2);
    const lower = parseInt(hex.lowerTrigram, 2);
    return 1 - Math.abs(upper - lower) / 7;
  }
  disruptionScore(hex) {
    const upper = parseInt(hex.upperTrigram, 2);
    const lower = parseInt(hex.lowerTrigram, 2);
    return Math.abs(upper - lower) / 7;
  }
  evolveWState(current, hex, kleinEval) {
    const upperVal = parseInt(hex.upperTrigram, 2);
    const lowerVal = parseInt(hex.lowerTrigram, 2);
    const hexVal = (upperVal + lowerVal) / 2;
    const w1 = Math.max(0, current.w1 * 0.95);
    const contrast = Math.abs(upperVal - lowerVal) / 7;
    const w2 = current.w2 * 0.9 + contrast * 0.1;
    const stability = this.balanceScore(hex);
    const w3 = current.w3 * 0.8 + stability * 0.2;
    const w4 = Math.min(1, current.w4 + 0.05);
    const kleinBoost = kleinEval ? kleinEval.result.intensity * 0.1 : 0;
    const w5 = Math.min(1, current.w5 + 0.03 + kleinBoost);
    return { w1, w2, w3, w4, w5 };
  }
  scorePath(steps, userW) {
    if (steps.length === 0) return 0;
    const final = steps[steps.length - 1].wState;
    const meaningScore = final.w5;
    const tensionResolution = 1 - final.w2;
    const witnessStability = final.w3;
    const pathEfficiency = 1 / (1 + steps.length * 0.05);
    return meaningScore * 0.4 + tensionResolution * 0.3 + witnessStability * 0.2 + pathEfficiency * 0.1;
  }
  classifyTrajectory(steps) {
    if (steps.length < 2) return "neutral";
    const startW5 = steps[0].wState.w5;
    const endW5 = steps[steps.length - 1].wState.w5;
    const delta = endW5 - startW5;
    if (delta > 0.2) return "mutation";
    if (delta < -0.1) return "interference";
    return "neutral";
  }
}
export {
  DEFAULT_W_PROFILE,
  MonteCarloSampler,
  SENTENCE_TEMPLATES,
  SeededRandom,
  buildSentence,
  deriveWProfileFromChart,
  hexagramToSentenceType
};
