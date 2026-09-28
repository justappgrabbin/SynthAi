export const DIMENSIONS = Object.freeze(['Movement','Evolution','Being','Design','Space']);
export const CANONICAL_STATES = Object.freeze(['dormant','distortion','resonance','convergence']);
export const UI_STATES = Object.freeze(['dormant','distortion','neutral','resonance','convergence']);

const REQUIRED = ['gate','name','center','keyword','circuit','channel_name','harmonic','biology','amino','binary_code','dimension_affinity','pressure','states'];

export function validateGateCatalog(rows) {
  const errors = [];
  if (!Array.isArray(rows)) return { ok:false, errors:['catalog must be an array'] };
  if (rows.length !== 64) errors.push(`expected 64 gates, received ${rows.length}`);
  const seen = new Set();
  for (const row of rows) {
    const g = Number(row?.gate);
    if (!Number.isInteger(g) || g < 1 || g > 64) errors.push(`invalid gate: ${row?.gate}`);
    if (seen.has(g)) errors.push(`duplicate gate: ${g}`); else seen.add(g);
    for (const key of REQUIRED) if (row?.[key] === null || row?.[key] === undefined || row?.[key] === '') errors.push(`gate ${g}: missing ${key}`);
    if (!DIMENSIONS.includes(row?.dimension_affinity)) errors.push(`gate ${g}: invalid dimension ${row?.dimension_affinity}`);
    if (!Number.isInteger(Number(row?.harmonic)) || Number(row.harmonic) < 1 || Number(row.harmonic) > 64) errors.push(`gate ${g}: invalid harmonic`);
    if (!/^[01]{6}$/.test(String(row?.binary_code ?? ''))) errors.push(`gate ${g}: binary_code must be six bits`);
    for (const state of ['distortion','resonance','convergence']) {
      if (typeof row?.states?.[state] !== 'string' || !row.states[state].trim()) errors.push(`gate ${g}: missing states.${state}`);
    }
  }
  for (let g=1; g<=64; g++) if (!seen.has(g)) errors.push(`missing gate: ${g}`);
  return { ok: errors.length === 0, errors };
}

export function toCodonRecord(row) {
  return Object.freeze({
    id: Number(row.gate),
    name: row.name,
    gate: row.keyword,
    center: row.center,
    element: row.element ?? null,
    biology: row.biology,
    amino: row.amino,
    binary: row.binary_code,
    pressure: row.pressure,
    dimension: row.dimension_affinity,
    circuit: row.circuit,
    channel: row.channel_name,
    harmonic: Number(row.harmonic),
    sign: row.sign ?? null,
    expressions: Object.freeze({
      distortion: row.states.distortion,
      resonance: row.states.resonance,
      convergence: row.states.convergence,
    }),
  });
}

export function buildCodonCatalog(rows) {
  const validation = validateGateCatalog(rows);
  if (!validation.ok) throw new Error(`Invalid canonical gate catalog:\n${validation.errors.join('\n')}`);
  return rows.slice().sort((a,b)=>a.gate-b.gate).map(toCodonRecord);
}

export function describeState(codon, state) {
  const normalized = String(state).toLowerCase();
  if (!UI_STATES.includes(normalized)) throw new Error(`Unsupported UI state: ${state}`);
  if (normalized === 'dormant') return 'Potential is present but not currently assigned an expression state.';
  if (normalized === 'neutral') return 'Observation state only. No distortion, resonance, or convergence claim is persisted.';
  return codon.expressions[normalized];
}

export function persistenceState(state) {
  const normalized = String(state).toLowerCase();
  if (!UI_STATES.includes(normalized)) throw new Error(`Unsupported UI state: ${state}`);
  return CANONICAL_STATES.includes(normalized) ? normalized : null;
}
