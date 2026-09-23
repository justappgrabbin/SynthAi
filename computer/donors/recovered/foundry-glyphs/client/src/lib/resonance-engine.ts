import type { BirthData, HDActivation, ChartLayer, ChartLayerData, NatalBlueprint, FieldDiagnosis, ZodiacSign, HDType, HDCenter } from "@shared/schema";
import { MANDALA_CONSTANTS, GATE_SEQUENCE, GATE_MEANINGS } from "@shared/schema";

const ZODIAC_SIGNS: ZodiacSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

function getGateAtDegree(degree: number): number {
  const normalizedDegree = ((degree % 360) + 360) % 360;

  for (let i = GATE_SEQUENCE.length - 1; i >= 0; i--) {
    if (normalizedDegree >= GATE_SEQUENCE[i].start) {
      return GATE_SEQUENCE[i].gate;
    }
  }
  return GATE_SEQUENCE[0].gate;
}

function degreeToActivation(degree: number): HDActivation {
  const normalizedDegree = ((degree % 360) + 360) % 360;

  const signIndex = Math.floor(normalizedDegree / 30);
  const sign = ZODIAC_SIGNS[signIndex];
  const signDegree = normalizedDegree % 30;
  const deg = Math.floor(signDegree);
  const minuteDecimal = (signDegree - deg) * 60;
  const minute = Math.floor(minuteDecimal);
  const second = Math.floor((minuteDecimal - minute) * 60);

  const gate = getGateAtDegree(normalizedDegree);

  const gateInfo = GATE_SEQUENCE.find(g => g.gate === gate)!;
  const degreeInGate = normalizedDegree - gateInfo.start;

  const line = Math.min(6, Math.floor(degreeInGate / MANDALA_CONSTANTS.LINE_ARC) + 1);
  const degreeInLine = degreeInGate - (line - 1) * MANDALA_CONSTANTS.LINE_ARC;
  const color = Math.min(6, Math.floor(degreeInLine / MANDALA_CONSTANTS.COLOR_ARC) + 1);
  const degreeInColor = degreeInLine - (color - 1) * MANDALA_CONSTANTS.COLOR_ARC;
  const tone = Math.min(6, Math.floor(degreeInColor / MANDALA_CONSTANTS.TONE_ARC) + 1);
  const degreeInTone = degreeInColor - (tone - 1) * MANDALA_CONSTANTS.TONE_ARC;
  const base = Math.min(5, Math.floor(degreeInTone / MANDALA_CONSTANTS.BASE_ARC) + 1);

  return {
    gate,
    line,
    color,
    tone,
    base,
    eclipticDeg: normalizedDegree,
    sign,
    degree: deg,
    minute,
    second,
  };
}

export function calculateResonanceScore(birthData: BirthData): {
  blueprint: NatalBlueprint;
  diagnosis: FieldDiagnosis;
  compositeSentence: string;
  correctionSentence?: string;
  recommendations: string[];
} {
  const birthDateTime = new Date(`${birthData.date}T${birthData.time}:00`);
  const j2000 = new Date("2000-01-01T12:00:00Z");
  const daysSinceJ2000 = (birthDateTime.getTime() - j2000.getTime()) / (1000 * 60 * 60 * 24);

  const sunLongitude = (280.460 + 0.9856474 * daysSinceJ2000) % 360;
  const moonLongitude = (218.316 + 13.176396 * daysSinceJ2000) % 360;
  const mercuryLongitude = (sunLongitude + 27 * Math.sin(daysSinceJ2000 * 0.16)) % 360;
  const venusLongitude = (sunLongitude + 45 * Math.sin(daysSinceJ2000 * 0.1)) % 360;
  const marsLongitude = (sunLongitude + 100 * Math.sin(daysSinceJ2000 * 0.053)) % 360;
  const jupiterLongitude = (sunLongitude + 150 * Math.sin(daysSinceJ2000 * 0.0084)) % 360;
  const saturnLongitude = (sunLongitude + 200 * Math.sin(daysSinceJ2000 * 0.0034)) % 360;
  const uranusLongitude = (sunLongitude + 250 * Math.sin(daysSinceJ2000 * 0.0012)) % 360;
  const neptuneLongitude = (sunLongitude + 290 * Math.sin(daysSinceJ2000 * 0.0006)) % 360;
  const plutoLongitude = (sunLongitude + 320 * Math.sin(daysSinceJ2000 * 0.0004)) % 360;
  const northNodeLongitude = (125.04 - 0.052954 * daysSinceJ2000) % 360;
  const southNodeLongitude = (northNodeLongitude + 180) % 360;
  const ascendantLongitude = (sunLongitude + 90) % 360;
  const midheavenLongitude = (sunLongitude + 180) % 360;

  const tropicalSun = degreeToActivation(sunLongitude);

  const ayanamsa = MANDALA_CONSTANTS.FAGAN_BRADLEY_BASE +
    (birthDateTime.getFullYear() - MANDALA_CONSTANTS.FAGAN_BRADLEY_EPOCH) * MANDALA_CONSTANTS.PRECESSION_RATE;

  const nodeShift = 360 - northNodeLongitude;

  const createLayer = (layer: ChartLayer): ChartLayerData => {
    let offset = 0;
    if (layer === "mind") offset = -ayanamsa;
    if (layer === "heart") offset = nodeShift;

    return {
      layer,
      ayanamsa: layer === "mind" ? ayanamsa : undefined,
      nodeShift: layer === "heart" ? nodeShift : undefined,
      sun: degreeToActivation(sunLongitude + offset),
      moon: degreeToActivation(moonLongitude + offset),
      mercury: degreeToActivation(mercuryLongitude + offset),
      venus: degreeToActivation(venusLongitude + offset),
      mars: degreeToActivation(marsLongitude + offset),
      jupiter: degreeToActivation(jupiterLongitude + offset),
      saturn: degreeToActivation(saturnLongitude + offset),
      uranus: degreeToActivation(uranusLongitude + offset),
      neptune: degreeToActivation(neptuneLongitude + offset),
      pluto: degreeToActivation(plutoLongitude + offset),
      northNode: degreeToActivation(northNodeLongitude + offset),
      southNode: degreeToActivation(southNodeLongitude + offset),
      ascendant: degreeToActivation(ascendantLongitude + offset),
      descendant: degreeToActivation((ascendantLongitude + 180) % 360 + offset),
      midheaven: degreeToActivation(midheavenLongitude + offset),
      imumCoeli: degreeToActivation((midheavenLongitude + 180) % 360 + offset),
    };
  };

  const bodyLayer = createLayer("body");
  const mindLayer = createLayer("mind");
  const heartLayer = createLayer("heart");

  const allGates = [
    bodyLayer.sun.gate, bodyLayer.moon.gate, bodyLayer.mars.gate, bodyLayer.venus.gate,
    mindLayer.sun.gate, mindLayer.moon.gate, mindLayer.mars.gate, mindLayer.venus.gate,
    heartLayer.sun.gate, heartLayer.moon.gate, heartLayer.mars.gate, heartLayer.venus.gate,
  ];

  const centerMap: Record<number, HDCenter> = {};
  Object.entries(GATE_MEANINGS).forEach(([gate, info]) => {
    centerMap[parseInt(gate)] = info.center;
  });

  const activatedCenters = [...new Set(allGates.map(g => centerMap[g]))].filter(Boolean);

  const sacralActive = activatedCenters.includes("Sacral");
  const throatActive = activatedCenters.includes("Throat");
  const heartActive = activatedCenters.includes("Heart");

  let hdType: HDType = "Generator";
  if (!sacralActive && !throatActive) hdType = "Reflector";
  else if (!sacralActive && heartActive) hdType = "Projector";
  else if (sacralActive && throatActive && heartActive) hdType = "ManifestingGenerator";
  else if (!sacralActive && throatActive) hdType = "Manifestor";

  const gateCounts = new Map<number, number>();
  allGates.forEach(g => gateCounts.set(g, (gateCounts.get(g) || 0) + 1));
  const uniqueGates = gateCounts.size;

  let definition: NatalBlueprint["definition"] = "Single";
  if (uniqueGates < 4) definition = "None";
  else if (uniqueGates < 7) definition = "Split";
  else if (uniqueGates < 10) definition = "TripleSplit";
  else definition = "QuadrupleSplit";

  const blueprint: NatalBlueprint = {
    birthData,
    body: bodyLayer,
    mind: mindLayer,
    heart: heartLayer,
    hdType,
    definition,
    activatedChannels: [],
    activatedCenters,
  };

  const gateVariety = uniqueGates / 12;
  const layerAlignment = 1 - Math.abs(bodyLayer.sun.gate - mindLayer.sun.gate) / 64;
  const heartAlignment = 1 - Math.abs(bodyLayer.sun.gate - heartLayer.sun.gate) / 64;

  const hdAlignment = (gateVariety + layerAlignment + heartAlignment) / 3;
  const iChingProbability = 0.5 + (tropicalSun.line / 6) * 0.3;
  const frictionFactor = 0.7 + (1 - layerAlignment) * 0.3;

  const coherenceScore = Math.round(hdAlignment * 100);
  const resonanceScore = (hdAlignment * iChingProbability) / frictionFactor;
  const approved = coherenceScore >= 70 && resonanceScore >= 0.5;

  const diagnosis: FieldDiagnosis = {
    missingNodes: [],
    chargeImbalance: [],
    chartDisorder: [],
    coherenceScore,
    hdAlignment,
    iChingProbability,
    frictionFactor,
    resonanceScore,
    approved,
  };

  const sunMeaning = GATE_MEANINGS[bodyLayer.sun.gate];
  const moonMeaning = GATE_MEANINGS[bodyLayer.moon.gate];

  const compositeSentence = `You are a ${hdType} with ${sunMeaning?.theme || "unknown theme"} through Gate ${bodyLayer.sun.gate} (${sunMeaning?.name || "Unknown"}). Your emotional nature reflects ${moonMeaning?.theme || "unknown"} via Gate ${bodyLayer.moon.gate}. Your ${definition} definition suggests ${definition === "Single" ? "integrated self-processing" : definition === "Split" ? "need for bridging connections" : "complex multi-part processing"}.`;

  const recommendations: string[] = [];
  if (coherenceScore < 70) {
    recommendations.push("Focus on integrating your three chart layers through meditation");
  }
  if (resonanceScore < 0.5) {
    recommendations.push("Seek environments that match your natural resonance frequency");
  }
  if (definition !== "Single") {
    recommendations.push("Honor your need for others to bridge your split definition");
  }
  if (hdType === "Projector") {
    recommendations.push("Wait for recognition and invitation before major decisions");
  }
  if (hdType === "Reflector") {
    recommendations.push("Take a full lunar cycle before important choices");
  }

  return {
    blueprint,
    diagnosis,
    compositeSentence,
    correctionSentence: approved ? undefined : "Consider realignment practices to improve coherence",
    recommendations,
  };
}

export const resonanceEngine = {
  calculateResonanceScore,
};
