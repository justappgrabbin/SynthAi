export const DIMENSION_PERSPECTIVES = [
  "being",
  "movement",
  "evolution",
  "design",
  "space",
] as const;

export type DimensionPerspective = (typeof DIMENSION_PERSPECTIVES)[number];
export type Orientation = "personality" | "design";
export type Scale = "micro" | "macro";

export interface GeonatalAddress {
  planetary: string;
  dimension: DimensionPerspective;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  degree: number;
  minute: number;
  second: number;
  arc: number;
  zodiac: number;
  house: number;
  orientation: Orientation;
  ascendingSide: number;
}

export interface PerspectivePlacement {
  id: string;
  address: GeonatalAddress;
  sourceIds: string[];
  confidence: number;
}

export interface PerspectiveLayer {
  scale: Scale;
  placements: PerspectivePlacement[];
}

export interface PerspectiveStack {
  perspective: DimensionPerspective;
  position: "center" | "corner";
  layers: PerspectiveLayer[];
}

export interface FiveSpaceState {
  id: string;
  subjectId: string;
  observedAt: string;
  being: PerspectiveStack;
  movement: PerspectiveStack;
  evolution: PerspectiveStack;
  design: PerspectiveStack;
  space: PerspectiveStack;
}

const ranges: Array<[keyof GeonatalAddress, number, number]> = [
  ["gate", 1, 64],
  ["line", 1, 6],
  ["color", 1, 6],
  ["tone", 1, 6],
  ["base", 1, 5],
  ["degree", 0, 29],
  ["minute", 0, 59],
  ["second", 0, 59],
  ["arc", 0, 99],
  ["zodiac", 1, 12],
  ["house", 1, 12],
  ["ascendingSide", 1, 12],
];

export function validateGeonatalAddress(address: GeonatalAddress): string[] {
  const issues: string[] = [];
  if (!address.planetary.trim()) issues.push("planetary is required");
  for (const [field, minimum, maximum] of ranges) {
    const value = address[field];
    if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
      issues.push(`${field} must be an integer from ${minimum} through ${maximum}`);
    }
  }
  return issues;
}

export function createFiveSpaceState(
  id: string,
  subjectId: string,
  placements: PerspectivePlacement[],
  macroPerspectives: DimensionPerspective[] = []
): FiveSpaceState {
  const buildStack = (perspective: DimensionPerspective): PerspectiveStack => {
    const ownPlacements = placements.filter(
      (placement) => placement.address.dimension === perspective
    );
    const layers: PerspectiveLayer[] = [{ scale: "micro", placements: ownPlacements }];
    if (perspective !== "being" && macroPerspectives.includes(perspective)) {
      layers.push({ scale: "macro", placements: [] });
    }
    return {
      perspective,
      position: perspective === "being" ? "center" : "corner",
      layers,
    };
  };

  return {
    id,
    subjectId,
    observedAt: new Date().toISOString(),
    being: buildStack("being"),
    movement: buildStack("movement"),
    evolution: buildStack("evolution"),
    design: buildStack("design"),
    space: buildStack("space"),
  };
}

export function getPerspective(
  state: FiveSpaceState,
  perspective: DimensionPerspective
): PerspectiveStack {
  return state[perspective];
}

