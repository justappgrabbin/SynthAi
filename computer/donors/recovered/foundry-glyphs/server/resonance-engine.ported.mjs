/**
 * GENERATED FILE — mechanical TS->JS type-erasure transpile (esbuild 0.27.7, no logic changes).
 * Source: server/resonance-engine.ts (canonical original in this directory).
 * Adapter change: value import "@shared/schema" redirected to ./shared-schema-constants.ported.mjs
 * (verbatim-extracted constants) because shared/schema.ts needs drizzle-orm/zod at value level.
 * Generated: 2026-09-22.
 */
import { MANDALA_CONSTANTS, GATE_SEQUENCE } from "./shared-schema-constants.ported.mjs";
const SIGN_BASE = {
  Aries: 0,
  Taurus: 30,
  Gemini: 60,
  Cancer: 90,
  Leo: 120,
  Virgo: 150,
  Libra: 180,
  Scorpio: 210,
  Sagittarius: 240,
  Capricorn: 270,
  Aquarius: 300,
  Pisces: 330
};
const HD_CHANNELS = [
  [1, 8],
  [2, 14],
  [3, 60],
  [4, 63],
  [5, 15],
  [6, 59],
  [7, 31],
  [9, 52],
  [10, 20],
  [10, 34],
  [10, 57],
  [11, 56],
  [12, 22],
  [13, 33],
  [16, 48],
  [17, 62],
  [18, 58],
  [19, 49],
  [20, 34],
  [20, 57],
  [21, 45],
  [23, 43],
  [24, 61],
  [25, 51],
  [26, 44],
  [27, 50],
  [28, 38],
  [29, 46],
  [30, 41],
  [32, 54],
  [34, 57],
  [35, 36],
  [37, 40],
  [39, 55],
  [42, 53],
  [47, 64]
];
function getHDActivation(sign, deg, min = 0, sec = 0) {
  const totalDeg = SIGN_BASE[sign] + deg + min / 60 + sec / 3600;
  const normalized = (totalDeg % 360 + 360) % 360;
  let gate = 0;
  let gateStart = 0;
  for (let i = 0; i < GATE_SEQUENCE.length; i++) {
    const current = GATE_SEQUENCE[i];
    const next = GATE_SEQUENCE[(i + 1) % GATE_SEQUENCE.length];
    const end = next.start === 0 ? 360 : next.start;
    if (current.start === 358.25) {
      if (normalized >= 358.25 || normalized < 3.875) {
        gate = current.gate;
        gateStart = normalized >= 358.25 ? current.start : 358.25 - 360;
        break;
      }
    } else if (normalized >= current.start && normalized < end) {
      gate = current.gate;
      gateStart = current.start;
      break;
    }
  }
  let within = normalized - gateStart;
  if (within < 0) within += 360;
  const { LINE_ARC, COLOR_ARC, TONE_ARC, BASE_ARC } = MANDALA_CONSTANTS;
  const line = Math.floor(within / LINE_ARC) + 1;
  const remLine = within % LINE_ARC;
  const color = Math.floor(remLine / COLOR_ARC) + 1;
  const remColor = remLine % COLOR_ARC;
  const tone = Math.floor(remColor / TONE_ARC) + 1;
  const remTone = remColor % TONE_ARC;
  const base = Math.floor(remTone / BASE_ARC) + 1;
  return {
    gate: Math.min(64, Math.max(1, gate)),
    line: Math.min(6, Math.max(1, line)),
    color: Math.min(6, Math.max(1, color)),
    tone: Math.min(6, Math.max(1, tone)),
    base: Math.min(5, Math.max(1, base)),
    eclipticDeg: normalized,
    sign,
    degree: Math.floor(deg),
    minute: Math.floor(min),
    second: sec
  };
}
function calculateFaganBradleyAyanamsa(year) {
  return MANDALA_CONSTANTS.FAGAN_BRADLEY_BASE + MANDALA_CONSTANTS.PRECESSION_RATE * (year - MANDALA_CONSTANTS.FAGAN_BRADLEY_EPOCH);
}
function tropicalToSidereal(tropicalDeg, year) {
  const ayanamsa = calculateFaganBradleyAyanamsa(year);
  return ((tropicalDeg - ayanamsa) % 360 + 360) % 360;
}
function tropicalToDraconic(tropicalDeg, northNodeDeg) {
  return ((tropicalDeg - northNodeDeg) % 360 + 360) % 360;
}
function calculateHDAlignment(activations, targetGates) {
  if (!targetGates || targetGates.length === 0) {
    const uniqueGates = new Set(activations.map((a) => a.gate));
    return Math.min(1, uniqueGates.size / 64);
  }
  const activeGates = new Set(activations.map((a) => a.gate));
  const matched = targetGates.filter((g) => activeGates.has(g)).length;
  return matched / targetGates.length;
}
function calculateIChingProbability(activations) {
  if (activations.length === 0) return 0.5;
  let yangCount = 0;
  let yinCount = 0;
  activations.forEach((a) => {
    if (a.line <= 3) yangCount++;
    else yinCount++;
  });
  const balance = Math.abs(yangCount - yinCount) / activations.length;
  return 1 - balance * 0.5;
}
function calculateFrictionFactor(activations) {
  const lineDistribution = [0, 0, 0, 0, 0, 0];
  activations.forEach((a) => {
    if (a.line >= 1 && a.line <= 6) {
      lineDistribution[a.line - 1]++;
    }
  });
  const total = activations.length;
  if (total === 0) return 0.5;
  const expected = total / 6;
  let variance = 0;
  lineDistribution.forEach((count) => {
    variance += Math.pow(count - expected, 2);
  });
  variance /= 6;
  const maxVariance = Math.pow(total, 2) / 6;
  const normalizedVariance = variance / maxVariance;
  return 0.1 + normalizedVariance * 0.9;
}
function calculateResonanceScore(hdAlignment, iChingProbability, frictionFactor) {
  if (frictionFactor <= 0) return 0;
  return hdAlignment * iChingProbability / frictionFactor;
}
function calculateCoherenceScore(missingNodes, imbalanceDeviation, disorderVariance) {
  let score = 100;
  score -= missingNodes * 25;
  score -= imbalanceDeviation * 0.5;
  score -= disorderVariance * 0.3;
  return Math.max(0, Math.min(100, score));
}
function detectMissingHarmonics(bodyActivations, mindActivations, heartActivations) {
  const missingNodes = [];
  const pairs = [
    { idx: 0, acts1: bodyActivations, acts2: mindActivations },
    { idx: 1, acts1: mindActivations, acts2: heartActivations },
    { idx: 2, acts1: bodyActivations, acts2: heartActivations }
  ];
  pairs.forEach(({ idx, acts1, acts2 }) => {
    if (acts1.length === 0 || acts2.length === 0) return;
    const gates1 = new Set(acts1.map((a) => a.gate));
    const gates2 = new Set(acts2.map((a) => a.gate));
    let channelsWithOneEnd = 0;
    let crossLayerComplete = 0;
    HD_CHANNELS.forEach(([g1, g2]) => {
      const layer1HasG1 = gates1.has(g1);
      const layer1HasG2 = gates1.has(g2);
      const layer2HasG1 = gates2.has(g1);
      const layer2HasG2 = gates2.has(g2);
      const anyHasEnd = layer1HasG1 || layer1HasG2 || layer2HasG1 || layer2HasG2;
      if (anyHasEnd) {
        channelsWithOneEnd++;
        const crossComplete = layer1HasG1 && layer2HasG2 || layer1HasG2 && layer2HasG1 || layer1HasG1 && layer1HasG2 || layer2HasG1 && layer2HasG2;
        if (crossComplete) {
          crossLayerComplete++;
        }
      }
    });
    if (channelsWithOneEnd > 0 && crossLayerComplete < channelsWithOneEnd) {
      missingNodes.push({
        pairIdx: idx,
        expected: channelsWithOneEnd,
        actual: crossLayerComplete,
        gap: channelsWithOneEnd - crossLayerComplete
      });
    }
  });
  return missingNodes;
}
function detectResonanceImbalance(bodyActivations, mindActivations, heartActivations) {
  const imbalances = [];
  const TOLERANCE = 15;
  const bodyPairs = [
    ["body", bodyActivations, "mind", mindActivations],
    ["mind", mindActivations, "heart", heartActivations],
    ["body", bodyActivations, "heart", heartActivations]
  ];
  bodyPairs.forEach(([name1, acts1, name2, acts2]) => {
    if (acts1.length === 0 || acts2.length === 0) return;
    const avgGate1 = acts1.reduce((sum, a) => sum + a.gate, 0) / acts1.length;
    const avgGate2 = acts2.reduce((sum, a) => sum + a.gate, 0) / acts2.length;
    const avgLine1 = acts1.reduce((sum, a) => sum + a.line, 0) / acts1.length;
    const avgLine2 = acts2.reduce((sum, a) => sum + a.line, 0) / acts2.length;
    const natalDiff = Math.abs(avgGate1 - avgGate2);
    const lineDiff = Math.abs(avgLine1 - avgLine2);
    const currentDiff = (natalDiff + lineDiff * 10) / 2;
    const deviation = Math.abs(natalDiff - currentDiff);
    if (deviation > TOLERANCE || lineDiff > 2) {
      imbalances.push({
        bodies: [name1, name2],
        natalDiff,
        currentDiff,
        deviation: Math.max(deviation, lineDiff * 5)
      });
    }
  });
  return imbalances;
}
function detectChartDisorder(bodyActivations, mindActivations, heartActivations) {
  const disorders = [];
  const VARIANCE_THRESHOLD = 100;
  if (bodyActivations.length > 0 && mindActivations.length > 0 && heartActivations.length > 0) {
    const bodySun = bodyActivations[0];
    const mindSun = mindActivations[0];
    const heartSun = heartActivations[0];
    const sunPositions = [bodySun.eclipticDeg, mindSun.eclipticDeg, heartSun.eclipticDeg];
    const sunMean = sunPositions.reduce((a, b) => a + b, 0) / 3;
    const sunVariance = sunPositions.reduce((sum, p) => sum + Math.pow(p - sunMean, 2), 0) / 3;
    if (sunVariance > VARIANCE_THRESHOLD) {
      const distances = [
        Math.abs(bodySun.eclipticDeg - sunMean),
        Math.abs(mindSun.eclipticDeg - sunMean),
        Math.abs(heartSun.eclipticDeg - sunMean)
      ];
      const minIdx = distances.indexOf(Math.min(...distances));
      const dominant = ["body", "mind", "heart"][minIdx];
      disorders.push({
        body: "sun",
        tropical: bodySun.eclipticDeg,
        sidereal: mindSun.eclipticDeg,
        draconic: heartSun.eclipticDeg,
        variance: sunVariance,
        dominant
      });
    }
  }
  return disorders;
}
function diagnoseField(bodyActivations, mindActivations, heartActivations) {
  const allActivations = [...bodyActivations, ...mindActivations, ...heartActivations];
  const hdAlignment = calculateHDAlignment(allActivations);
  const iChingProbability = calculateIChingProbability(allActivations);
  const frictionFactor = calculateFrictionFactor(allActivations);
  const resonanceScore = calculateResonanceScore(hdAlignment, iChingProbability, frictionFactor);
  const missingNodes = detectMissingHarmonics(bodyActivations, mindActivations, heartActivations);
  const chargeImbalance = detectResonanceImbalance(bodyActivations, mindActivations, heartActivations);
  const chartDisorder = detectChartDisorder(bodyActivations, mindActivations, heartActivations);
  const totalImbalanceDeviation = chargeImbalance.reduce((sum, i) => sum + i.deviation, 0);
  const totalDisorderVariance = chartDisorder.reduce((sum, d) => sum + d.variance, 0);
  const coherenceScore = calculateCoherenceScore(
    missingNodes.length,
    totalImbalanceDeviation,
    totalDisorderVariance
  );
  return {
    missingNodes,
    chargeImbalance,
    chartDisorder,
    coherenceScore,
    hdAlignment,
    iChingProbability,
    frictionFactor,
    resonanceScore,
    approved: coherenceScore >= 70 && resonanceScore >= 0.5
  };
}
function evaluateResonance(request) {
  const diagnosis = diagnoseField(
    request.bodyActivations,
    request.mindActivations,
    request.heartActivations
  );
  let recommendation = "";
  if (diagnosis.approved) {
    recommendation = "Field coherent. Proceed with current alignment.";
  } else {
    const parts = [];
    if (diagnosis.missingNodes.length > 0) {
      parts.push("Restore harmonic channel connections across layers");
    }
    if (diagnosis.chargeImbalance.length > 0) {
      parts.push("Balance resonance between body pairs");
    }
    if (diagnosis.chartDisorder.length > 0) {
      parts.push("Reduce positional variance across chart layers");
    }
    if (diagnosis.coherenceScore < 70) {
      parts.push("Realign through Strategy & Authority");
    }
    recommendation = parts.length > 0 ? parts.join("; ") : "Review field configuration";
  }
  return {
    diagnosis,
    recommendation,
    timestamp: /* @__PURE__ */ new Date(),
    requestId: crypto.randomUUID()
  };
}
export {
  calculateCoherenceScore,
  calculateFaganBradleyAyanamsa,
  calculateFrictionFactor,
  calculateHDAlignment,
  calculateIChingProbability,
  calculateResonanceScore,
  diagnoseField,
  evaluateResonance,
  getHDActivation,
  tropicalToDraconic,
  tropicalToSidereal
};