import {
  DimensionPerspective,
  GeonatalAddress,
  Orientation,
  PerspectivePlacement,
} from "../state/FiveSpaceState";

export interface LCTBSignature {
  line: number;
  color: number;
  tone: number;
  base: number;
}

export interface EmergencePossibility {
  id: string;
  placementId: string;
  perspective: DimensionPerspective;
  orientation: Orientation;
  gate: number;
  lctb: LCTBSignature;
  status: "possible" | "conditioned" | "active" | "settled";
  conditionIds: string[];
}

export function possibilityFromPlacement(
  placement: PerspectivePlacement
): EmergencePossibility {
  const address: GeonatalAddress = placement.address;
  return {
    id: `emergence:${placement.id}`,
    placementId: placement.id,
    perspective: address.dimension,
    orientation: address.orientation,
    gate: address.gate,
    lctb: {
      line: address.line,
      color: address.color,
      tone: address.tone,
      base: address.base,
    },
    status: "possible",
    conditionIds: [],
  };
}

export function conditionEmergence(
  possibility: EmergencePossibility,
  conditionIds: string[]
): EmergencePossibility {
  const uniqueConditions = [...new Set(conditionIds.filter(Boolean))];
  return {
    ...possibility,
    conditionIds: uniqueConditions,
    status: uniqueConditions.length > 0 ? "conditioned" : "possible",
  };
}

export function activateEmergence(
  possibility: EmergencePossibility,
  completingConditionId: string
): EmergencePossibility {
  if (!completingConditionId.trim()) {
    throw new Error("A completing condition is required for activation");
  }
  return {
    ...possibility,
    conditionIds: [...new Set([...possibility.conditionIds, completingConditionId])],
    status: "active",
  };
}

