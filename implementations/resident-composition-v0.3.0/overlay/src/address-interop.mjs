import { assertDMSA } from './dmsa-coordinate.mjs';
import {
  validateCanonicalAddress as validateOrganismCanonical,
} from '../components/organism/core/ResidenceContext.mjs';
import {
  Coordinate,
  AXES as ORGANISM_AXES,
  DIMENSION_ORDER,
} from '../components/organism/state-space/state-space-foundation.mjs';
import {
  validateCanonicalAddress as validateExecutionCanonical,
  ADDRESS_FIELDS as EXECUTION_ADDRESS_FIELDS,
} from '../components/execution-spine/src/canonical-address.mjs';

const clone = (value) => globalThis.structuredClone
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

const PLANETS = Object.freeze([
  'Sun','Earth','Moon','North Node','South Node','Mercury','Venus',
  'Mars','Jupiter','Saturn','Uranus','Neptune','Pluto',
]);

export const ORGANISM_ADDRESS_FIELDS = Object.freeze(ORGANISM_AXES.map(([name]) => name));
export { DIMENSION_ORDER, EXECUTION_ADDRESS_FIELDS };

/**
 * Validate the complete 13-part organism address without flattening local
 * sign coordinates into a 360-degree scalar. degree is sign-local 0..29;
 * minute/second are 0..59; arc is the local 0..99 refinement.
 */
export function validateFullOrganismAddress(address = {}, context = {}) {
  const missing = ORGANISM_ADDRESS_FIELDS.filter((field) => address[field] === undefined || address[field] === null || address[field] === '');
  const base = validateOrganismCanonical(address, { allowPartial: false });
  const errors = [...(base.errors ?? [])];
  const diagnostics = [];
  try {
    assertDMSA(address, { ...context, calculation: context.calculation ?? "validateFullOrganismAddress" });
  } catch (error) {
    errors.push(error.message);
    diagnostics.push({ code: error.code, ...error.details });
  }
  if (missing.length) errors.push(`full address missing: ${missing.join(',')}`);

  let numeric = null;
  if (!missing.length) {
    const planetary = typeof address.planetary === 'number'
      ? address.planetary
      : PLANETS.indexOf(address.planetary) + 1;
    const dimension = typeof address.dimension === 'number'
      ? address.dimension
      : DIMENSION_ORDER.indexOf(address.dimension) + 1;
    try {
      numeric = new Coordinate({ ...address, planetary, dimension }).toJSON();
    } catch (error) {
      errors.push(String(error?.message ?? error));
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    complete: missing.length === 0 && errors.length === 0,
    missing: Object.freeze(missing),
    diagnostics: Object.freeze(diagnostics),
    errors: Object.freeze(errors),
    address: errors.length === 0 ? clone(address) : null,
    numeric: errors.length === 0 ? numeric : null,
  });
}

/**
 * Audit an address against the supplied schemas without silently translating
 * one coordinate vocabulary into another. In particular, `arc` and
 * `arcAxis` remain distinct until an explicit source-backed mapping is given.
 */
export function auditAddress(address = {}) {
  const report = {
    organismCanonical: { ok: false, complete: false, errors: [] },
    organismFull: validateFullOrganismAddress(address),
    organismCoordinate: { ok: false, errors: [] },
    executionCanonical: { ok: false, errors: [] },
    unresolvedInterop: [],
  };

  try {
    const result = validateOrganismCanonical(address, { allowPartial: false });
    report.organismCanonical = clone(result);
  } catch (error) {
    report.organismCanonical.errors.push(String(error?.message ?? error));
  }

  try {
    const planetary = typeof address.planetary === 'number' ? address.planetary : PLANETS.indexOf(address.planetary) + 1;
    const dimension = typeof address.dimension === 'number' ? address.dimension : DIMENSION_ORDER.indexOf(address.dimension) + 1;
    new Coordinate({ ...address, planetary, dimension });
    report.organismCoordinate.ok = true;
  } catch (error) {
    report.organismCoordinate.errors.push(String(error?.message ?? error));
  }

  try {
    validateExecutionCanonical(address);
    report.executionCanonical.ok = true;
  } catch (error) {
    report.executionCanonical.errors.push(String(error?.message ?? error));
  }

  if ('arc' in address && !('arcAxis' in address)) {
    report.unresolvedInterop.push('organism schema carries `arc`; execution-spine schema requires `arcAxis`. No axis is synthesized.');
  }
  if ('arcAxis' in address && !('arc' in address)) {
    report.unresolvedInterop.push('execution-spine schema carries `arcAxis`; organism schema requires numeric `arc`. No reduction is synthesized.');
  }
  return Object.freeze(report);
}
