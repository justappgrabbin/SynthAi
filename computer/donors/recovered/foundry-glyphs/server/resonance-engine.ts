import type {
  HDActivation,
  FieldDiagnosis,
  ChartLayer,
  ZodiacSign,
} from "@shared/schema";
import { MANDALA_CONSTANTS, GATE_SEQUENCE, zodiacSigns } from "@shared/schema";

const SIGN_BASE: Record<ZodiacSign, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90, Leo: 120, Virgo: 150,
  Libra: 180, Scorpio: 210, Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
};

const HD_CHANNELS: Array<[number, number]> = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31],
  [9, 52], [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33],
  [16, 48], [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45],
  [23, 43], [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46],
  [30, 41], [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53],
  [47, 64],
];

export function getHDActivation(
  sign: ZodiacSign,
  deg: number,
  min: number = 0,
  sec: number = 0
): HDActivation {
  const totalDeg = SIGN_BASE[sign] + deg + min / 60 + sec / 3600;
  const normalized = ((totalDeg % 360) + 360) % 360;

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
    second: sec,
  };
}

export function calculateFaganBradleyAyanamsa(year: number): number {
  return (
    MANDALA_CONSTANTS.FAGAN_BRADLEY_BASE +
    MANDALA_CONSTANTS.PRECESSION_RATE * (year - MANDALA_CONSTANTS.FAGAN_BRADLEY_EPOCH)
  );
}

export function tropicalToSidereal(tropicalDeg: number, year: number): number {
  const ayanamsa = calculateFaganBradleyAyanamsa(year);
  return ((tropicalDeg - ayanamsa) % 360 + 360) % 360;
}

export function tropicalToDraconic(tropicalDeg: number, northNodeDeg: number): number {
  return ((tropicalDeg - northNodeDeg) % 360 + 360) % 360;
}

export function calculateHDAlignment(
  activations: HDActivation[],
  targetGates?: number[]
): number {
  if (!targetGates || targetGates.length === 0) {
    const uniqueGates = new Set(activations.map((a) => a.gate));
    return Math.min(1, uniqueGates.size / 64);
  }
  const activeGates = new Set(activations.map((a) => a.gate));
  const matched = targetGates.filter((g) => activeGates.has(g)).length;
  return matched / targetGates.length;
}

export function calculateIChingProbability(activations: HDActivation[]): number {
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

export function calculateFrictionFactor(activations: HDActivation[]): number {
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

export function calculateResonanceScore(
  hdAlignment: number,
  iChingProbability: number,
  frictionFactor: number
): number {
  if (frictionFactor <= 0) return 0;
  return (hdAlignment * iChingProbability) / frictionFactor;
}

export function calculateCoherenceScore(
  missingNodes: number,
  imbalanceDeviation: number,
  disorderVariance: number
): number {
  let score = 100;
  score -= missingNodes * 25;
  score -= imbalanceDeviation * 0.5;
  score -= disorderVariance * 0.3;
  return Math.max(0, Math.min(100, score));
}

function detectMissingHarmonics(
  bodyActivations: HDActivation[],
  mindActivations: HDActivation[],
  heartActivations: HDActivation[]
): FieldDiagnosis["missingNodes"] {
  const missingNodes: FieldDiagnosis["missingNodes"] = [];

  const pairs = [
    { idx: 0, acts1: bodyActivations, acts2: mindActivations },
    { idx: 1, acts1: mindActivations, acts2: heartActivations },
    { idx: 2, acts1: bodyActivations, acts2: heartActivations },
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
        const crossComplete =
          (layer1HasG1 && layer2HasG2) ||
          (layer1HasG2 && layer2HasG1) ||
          (layer1HasG1 && layer1HasG2) ||
          (layer2HasG1 && layer2HasG2);
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
        gap: channelsWithOneEnd - crossLayerComplete,
      });
    }
  });

  return missingNodes;
}

function detectResonanceImbalance(
  bodyActivations: HDActivation[],
  mindActivations: HDActivation[],
  heartActivations: HDActivation[]
): FieldDiagnosis["chargeImbalance"] {
  const imbalances: FieldDiagnosis["chargeImbalance"] = [];
  const TOLERANCE = 15;

  const bodyPairs: Array<[string, HDActivation[], string, HDActivation[]]> = [
    ["body", bodyActivations, "mind", mindActivations],
    ["mind", mindActivations, "heart", heartActivations],
    ["body", bodyActivations, "heart", heartActivations],
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
        deviation: Math.max(deviation, lineDiff * 5),
      });
    }
  });

  return imbalances;
}

function detectChartDisorder(
  bodyActivations: HDActivation[],
  mindActivations: HDActivation[],
  heartActivations: HDActivation[]
): FieldDiagnosis["chartDisorder"] {
  const disorders: FieldDiagnosis["chartDisorder"] = [];
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
        Math.abs(heartSun.eclipticDeg - sunMean),
      ];
      const minIdx = distances.indexOf(Math.min(...distances));
      const dominant = (["body", "mind", "heart"] as ChartLayer[])[minIdx];

      disorders.push({
        body: "sun",
        tropical: bodySun.eclipticDeg,
        sidereal: mindSun.eclipticDeg,
        draconic: heartSun.eclipticDeg,
        variance: sunVariance,
        dominant,
      });
    }
  }

  return disorders;
}

export function diagnoseField(
  bodyActivations: HDActivation[],
  mindActivations: HDActivation[],
  heartActivations: HDActivation[]
): FieldDiagnosis {
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
    approved: coherenceScore >= 70 && resonanceScore >= 0.5,
  };
}

export interface ResonanceRequest {
  bodyActivations: HDActivation[];
  mindActivations: HDActivation[];
  heartActivations: HDActivation[];
  targetGates?: number[];
  context?: string;
}

export interface ResonanceResponse {
  diagnosis: FieldDiagnosis;
  recommendation: string;
  timestamp: Date;
  requestId: string;
}

export function evaluateResonance(request: ResonanceRequest): ResonanceResponse {
  const diagnosis = diagnoseField(
    request.bodyActivations,
    request.mindActivations,
    request.heartActivations
  );

  let recommendation = "";
  if (diagnosis.approved) {
    recommendation = "Field coherent. Proceed with current alignment.";
  } else {
    const parts: string[] = [];
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
    timestamp: new Date(),
    requestId: crypto.randomUUID(),
  };
}
