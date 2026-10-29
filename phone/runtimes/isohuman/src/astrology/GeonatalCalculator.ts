import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  NextMoonNode,
  NodeEventKind,
  SearchMoonNode,
  SiderealTime,
} from "astronomy-engine";
import { DimensionPerspective } from "../state/FiveSpaceState";

export type ZodiacFrame =
  | "tropical"
  | "sidereal_fagan_bradley"
  | "draconic_tropical_true"
  | "draconic_tropical_mean";
export type ImprintSide = "personality" | "design";
export type HouseMethod = "equal";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface ZodiacPosition {
  longitude: number;
  zodiac: number;
  degree: number;
  minute: number;
  second: number;
  arc: number;
  house: number;
  ascendingSide: number;
}

export interface HDResolution {
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
}

export interface GeonatalPlacement extends ZodiacPosition, HDResolution {
  planetary: string;
  dimension: DimensionPerspective;
  frame: ZodiacFrame;
  orientation: ImprintSide;
  sourceTropicalLongitude: number;
  tropicalPersonalitySunAnchor: number;
  anchorRelativeLongitude: number;
  frameOffsetDegrees: number;
}

export interface GeonatalChart {
  timestamp: string;
  designTimestamp: string;
  location: GeoLocation;
  houseMethod: HouseMethod;
  trueNodeLongitude: number;
  faganBradleyAyanamsa: number;
  placements: GeonatalPlacement[];
  charts: Record<ZodiacFrame, {
    frame: ZodiacFrame;
    personalityTropicalSunAnchor: number;
    personalityOffsetDegrees: number;
    designOffsetDegrees: number;
    personalityAscendantLongitude: number;
    designAscendantLongitude: number;
    personality: GeonatalPlacement[];
    design: GeonatalPlacement[];
  }>;
  methods: {
    ephemeris: string;
    sidereal: string;
    draconic: string;
    design: string;
    houses: string;
  };
}

const GATE_WHEEL_START = 302;
const GATE_ORDER = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
] as const;

const BODIES: Array<[string, Body | "Earth" | "North Node" | "South Node"]> = [
  ["Sun", Body.Sun],
  ["Earth", "Earth"],
  ["North Node", "North Node"],
  ["South Node", "South Node"],
  ["Moon", Body.Moon],
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
  ["Uranus", Body.Uranus],
  ["Neptune", Body.Neptune],
  ["Pluto", Body.Pluto],
];



export function calculateGeonatalChart(
  timestamp: Date,
  location: GeoLocation
): GeonatalChart {
  validateLocation(location);
  const personalitySun = tropicalLongitude(Body.Sun, timestamp);
  const designTimestamp = findDesignTimestamp(timestamp, personalitySun);
  const trueNode = trueNodeLongitude(timestamp);
  const ayanamsa = faganBradleyAyanamsa(timestamp);
  const placements: GeonatalPlacement[] = [];

  for (const orientation of ["personality", "design"] as const) {
    const date = orientation === "personality" ? timestamp : designTimestamp;
    const node = trueNodeLongitude(date);
    const sun = tropicalLongitude(Body.Sun, date);
    for (const [planetary, body] of BODIES) {
      const tropical =
        body === "Earth"
          ? normalize(sun + 180)
          : body === "North Node"
            ? node
            : body === "South Node"
              ? normalize(node + 180)
              : tropicalLongitude(body, date);
      for (const frame of [
        "tropical",
        "sidereal_fagan_bradley",
        "draconic_tropical_true",
        "draconic_tropical_mean",
      ] as const) {
        const offset = frame === "tropical" ? 0 : frame === "sidereal_fagan_bradley" ? faganBradleyAyanamsa(date) : frame === "draconic_tropical_mean" ? meanNodeLongitude(date) : node;
        const sourceLongitude = frame === "draconic_tropical_mean" && body === "North Node" ? meanNodeLongitude(date) : frame === "draconic_tropical_mean" && body === "South Node" ? normalize(meanNodeLongitude(date) + 180) : tropical;
        // Preserve the actual natal Sun wheel position as the shared origin.
        const relativeToAnchor = normalize(sourceLongitude - personalitySun);
        const longitude = normalize(personalitySun + relativeToAnchor - offset);
        placements.push(
          makePlacement(
            planetary,
            "being",
            frame,
            orientation,
            longitude,
            date,
            location,
            offset,
            sourceLongitude,
            personalitySun
          )
        );
      }
    }
  }

  const charts = Object.fromEntries(
    (["tropical", "draconic_tropical_true", "draconic_tropical_mean", "sidereal_fagan_bradley"] as ZodiacFrame[]).map(frame => [frame, {
      frame,
      personalityTropicalSunAnchor: personalitySun,
      personalityOffsetDegrees: chartFrameOffset(frame, timestamp),
      designOffsetDegrees: chartFrameOffset(frame, designTimestamp),
      personalityAscendantLongitude: normalize(equalHouseAscendant(timestamp, location) - chartFrameOffset(frame, timestamp)),
      designAscendantLongitude: normalize(equalHouseAscendant(designTimestamp, location) - chartFrameOffset(frame, designTimestamp)),
      personality: placements.filter(p => p.frame === frame && p.orientation === "personality"),
      design: placements.filter(p => p.frame === frame && p.orientation === "design"),
    }])
  ) as GeonatalChart["charts"];

  return {
    timestamp: timestamp.toISOString(),
    designTimestamp: designTimestamp.toISOString(),
    location,
    houseMethod: "equal",
    trueNodeLongitude: trueNode,
    faganBradleyAyanamsa: ayanamsa,
    placements,
    charts,
    methods: {
      ephemeris: "astronomy-engine 2.1.19 geocentric true-ecliptic-of-date",
      sidereal: "Fagan-Bradley J2000 offset with general-precession rate",
      draconic: "tropical longitude minus the chosen true or polynomial mean ascending lunar node; node placements use the same chosen convention",
      design: "timestamp at 88 degrees of prior solar longitude",
      houses: "equal houses; planets, ascendant, and cusps use the same chart-frame offset",
    },
  };
}

export function humanDesignResolution(longitude: number): HDResolution {
  const angle = normalize(longitude - GATE_WHEEL_START);
  const gateIndex = Math.floor(angle / 5.625);
  let remainder = angle % 5.625;
  const line = Math.floor(remainder / 0.9375) + 1;
  remainder %= 0.9375;
  const color = Math.floor(remainder / 0.15625) + 1;
  remainder %= 0.15625;
  const tone = Math.floor(remainder / (0.15625 / 6)) + 1;
  remainder %= 0.15625 / 6;
  const base = Math.min(5, Math.floor(remainder / (0.15625 / 6 / 5)) + 1);
  return { gate: GATE_ORDER[gateIndex], line, color, tone, base };
}

export function faganBradleyAyanamsa(date: Date): number {
  const j2000 = Date.UTC(2000, 0, 1, 12);
  const tropicalYears = (date.getTime() - j2000) / (365.2425 * 86400000);
  return normalize(24.7366667 + (50.290966 / 3600) * tropicalYears);
}

function makePlacement(
  planetary: string,
  dimension: DimensionPerspective,
  frame: ZodiacFrame,
  orientation: ImprintSide,
  longitude: number,
  date: Date,
  location: GeoLocation,
  frameOffset: number,
  sourceTropicalLongitude: number,
  tropicalPersonalitySunAnchor: number
): GeonatalPlacement {
  const zodiacPosition = zodiacBreakdown(longitude);
  const ascendant = normalize(equalHouseAscendant(date, location) - frameOffset);
  const house = Math.floor(normalize(longitude - ascendant) / 30) + 1;
  return {
    planetary,
    dimension,
    frame,
    orientation,
    sourceTropicalLongitude,
    tropicalPersonalitySunAnchor,
    anchorRelativeLongitude: normalize(sourceTropicalLongitude - tropicalPersonalitySunAnchor),
    frameOffsetDegrees: frameOffset,
    ...zodiacPosition,
    house,
    ascendingSide: house,
    ...humanDesignResolution(longitude),
  };
}

function zodiacBreakdown(longitude: number): Omit<
  ZodiacPosition,
  "house" | "ascendingSide"
> {
  const normalized = normalize(longitude);
  const zodiac = Math.floor(normalized / 30) + 1;
  const withinSign = normalized % 30;
  const degree = Math.floor(withinSign);
  const minuteFloat = (withinSign - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const secondFloat = (minuteFloat - minute) * 60;
  const second = Math.floor(secondFloat);
  const arc = Math.min(99, Math.floor((secondFloat - second) * 100));
  return { longitude: normalized, zodiac, degree, minute, second, arc };
}

function tropicalLongitude(body: Body, date: Date): number {
  if (body === Body.Moon) return normalize(EclipticGeoMoon(date).lon);
  return normalize(Ecliptic(GeoVector(body, date, true)).elon);
}

function trueNodeLongitude(date: Date): number {
  let event = SearchMoonNode(new Date(date.getTime() - 35 * 86400000));
  let previous = event;
  while (event.time.date.getTime() <= date.getTime()) {
    previous = event;
    event = NextMoonNode(event);
  }
  const before = nodeLongitudeAtEvent(previous);
  const after = nodeLongitudeAtEvent(event);
  const span = event.time.date.getTime() - previous.time.date.getTime();
  const fraction = (date.getTime() - previous.time.date.getTime()) / span;
  const delta = signedDelta(before, after);
  return normalize(before + delta * fraction);
}

function nodeLongitudeAtEvent(event: ReturnType<typeof SearchMoonNode>): number {
  const moon = EclipticGeoMoon(event.time).lon;
  return normalize(event.kind === NodeEventKind.Ascending ? moon : moon + 180);
}

function findDesignTimestamp(natal: Date, natalSun: number): Date {
  let lowDays = 70;
  let highDays = 110;
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const days = (lowDays + highDays) / 2;
    const candidate = new Date(natal.getTime() - days * 86400000);
    const separation = normalize(natalSun - tropicalLongitude(Body.Sun, candidate));
    if (separation < 88) lowDays = days;
    else highDays = days;
  }
  return new Date(natal.getTime() - ((lowDays + highDays) / 2) * 86400000);
}

function equalHouseAscendant(date: Date, location: GeoLocation): number {
  const lst = normalize(SiderealTime(date) * 15 + location.longitude);
  const radians = Math.PI / 180;
  const theta = lst * radians;
  const latitude = location.latitude * radians;
  const obliquity = 23.4392911 * radians;
  const ascendant =
    Math.atan2(
      -Math.cos(theta),
      Math.sin(obliquity) * Math.tan(latitude) +
        Math.cos(obliquity) * Math.sin(theta)
    ) / radians;
  return normalize(ascendant);
}

function signedDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function normalize(value: number): number {
  return ((value % 360) + 360) % 360;
}

function validateLocation(location: GeoLocation): void {
  if (
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new Error("Latitude must be between -90 and 90 degrees");
  }
  if (
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("Longitude must be between -180 and 180 degrees");
  }
}


/** Mean ascending lunar node, Meeus polynomial, degrees of date. */
export function meanNodeLongitude(date: Date): number {
  const t = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000);
  return normalize(125.0445479 - 1934.1362891*t + 0.0020754*t*t + t*t*t/467441 - t*t*t*t/60616000);
}

function chartFrameOffset(frame: ZodiacFrame, date: Date): number {
  if (frame === "tropical") return 0;
  if (frame === "sidereal_fagan_bradley") return faganBradleyAyanamsa(date);
  if (frame === "draconic_tropical_mean") return meanNodeLongitude(date);
  return trueNodeLongitude(date);
}
