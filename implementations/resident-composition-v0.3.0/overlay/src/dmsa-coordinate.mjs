/** User-specified coordinate boundary. No wrapping, defaulting, or arc conversion. */
export const DMSA_RANGES = Object.freeze({ degree: [0, 29], minute: [0, 59], second: [0, 59], arc: [0, 99] });

export class DMSACoordinateError extends RangeError {
  constructor(field, value, range, coordinate, context) {
    super(`DMSA_RANGE_ERROR: ${field}=${String(value)}; expected integer ${range[0]}..${range[1]}; address calculation halted before transformation.`);
    this.name = 'DMSACoordinateError'; this.code = 'DMSA_RANGE_ERROR';
    this.details = structuredClone({ field, received: value, permitted: range,
      coordinate, originatingInput: context.originatingInput ?? null,
      calculation: context.calculation ?? null, transformation: context.transformation ?? null,
      dimensionalFrame: context.dimensionalFrame ?? null, parentOperation: context.parentOperation ?? null });
  }
}

export function assertDMSA(coordinate, context = {}) {
  for (const [field, range] of Object.entries(DMSA_RANGES)) {
    const value = coordinate?.[field];
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
      throw new DMSACoordinateError(field, value, range, coordinate ?? null, context);
    }
  }
  return Object.freeze(Object.fromEntries(Object.keys(DMSA_RANGES).map(field => [field, coordinate[field]])));
}

/** Explicit boundary for transformations receiving DMSA. Error propagation is preserved. */
export function transformDMSA(coordinate, transformation, context = {}) {
  if (typeof transformation !== 'function') throw new TypeError('An explicit transformation is required');
  const validated = assertDMSA(coordinate, context);
  return transformation(validated);
}
