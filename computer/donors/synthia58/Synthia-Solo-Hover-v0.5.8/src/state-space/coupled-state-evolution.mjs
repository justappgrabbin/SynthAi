/**
 * Coupled state evolution for Synthia's existing state-space.
 *
 * Provenance:
 * - Mathematical pattern recovered from the user's axion-magnetic-resonance
 *   research artifact: coupled states evolve under a field-dependent operator,
 *   are propagated numerically, and are measured as resulting state weights.
 * - This module does NOT import axion/photon constants or replace Synthia's
 *   canonical State Space, ATO, Klein, addressing, mesh, or trajectory systems.
 *
 * The runtime is deliberately domain-neutral: Synthia supplies the states,
 * couplings, field terms, address, and context. The calculator only evolves
 * the supplied state.
 */

export const DEFAULT_STATE_BASIS = Object.freeze([
  'Movement', 'Evolution', 'Being', 'Design', 'Space',
]);

const EPSILON = 1e-12;

function finiteNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`${label} must be a finite number`);
  return n;
}

function zeroVector(size) {
  return Array.from({ length: size }, () => 0);
}

function identityMatrix(size) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => row === col ? 1 : 0));
}

function normalizeBasis(basis) {
  if (!Array.isArray(basis) || basis.length < 2) {
    throw new TypeError('basis must contain at least two named states');
  }
  const normalized = basis.map((name) => String(name));
  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError('basis state names must be unique');
  }
  return Object.freeze(normalized);
}

function normalizeRealMatrix(matrix, size, label = 'operator') {
  if (!Array.isArray(matrix) || matrix.length !== size) {
    throw new TypeError(`${label} must be a ${size}x${size} matrix`);
  }
  return matrix.map((row, i) => {
    if (!Array.isArray(row) || row.length !== size) {
      throw new TypeError(`${label} row ${i} must contain ${size} values`);
    }
    return row.map((value, j) => finiteNumber(value, `${label}[${i}][${j}]`));
  });
}

function stateVector(input, basis) {
  const size = basis.length;
  if (Array.isArray(input)) {
    if (input.length !== size) throw new TypeError(`state vector must contain ${size} values`);
    return input.map((value, i) => finiteNumber(value, `state[${i}]`));
  }
  if (input && typeof input === 'object') {
    return basis.map((name) => finiteNumber(input[name] ?? 0, `state.${name}`));
  }
  const initial = zeroVector(size);
  initial[0] = 1;
  return initial;
}

function normalizeAmplitude(real, imag) {
  const norm2 = real.reduce((sum, value, i) => sum + value * value + imag[i] * imag[i], 0);
  if (norm2 <= EPSILON) throw new RangeError('state amplitude has zero norm');
  const scale = 1 / Math.sqrt(norm2);
  return {
    real: real.map((value) => value * scale),
    imag: imag.map((value) => value * scale),
  };
}

function addScaled(base, delta, scale) {
  return base.map((value, i) => value + delta[i] * scale);
}

function derivative(real, imag, operator) {
  const size = real.length;
  const dr = zeroVector(size);
  const di = zeroVector(size);
  // dψ/dt = -i H ψ, with ψ = real + i*imag and real-valued H.
  for (let row = 0; row < size; row++) {
    let hReal = 0;
    let hImag = 0;
    for (let col = 0; col < size; col++) {
      hReal += operator[row][col] * real[col];
      hImag += operator[row][col] * imag[col];
    }
    dr[row] = hImag;
    di[row] = -hReal;
  }
  return { real: dr, imag: di };
}

function rk4(real, imag, operator, dt) {
  const k1 = derivative(real, imag, operator);
  const k2 = derivative(
    addScaled(real, k1.real, dt / 2),
    addScaled(imag, k1.imag, dt / 2),
    operator,
  );
  const k3 = derivative(
    addScaled(real, k2.real, dt / 2),
    addScaled(imag, k2.imag, dt / 2),
    operator,
  );
  const k4 = derivative(
    addScaled(real, k3.real, dt),
    addScaled(imag, k3.imag, dt),
    operator,
  );
  return {
    real: real.map((value, i) =>
      value + (dt / 6) * (k1.real[i] + 2 * k2.real[i] + 2 * k3.real[i] + k4.real[i])),
    imag: imag.map((value, i) =>
      value + (dt / 6) * (k1.imag[i] + 2 * k2.imag[i] + 2 * k3.imag[i] + k4.imag[i])),
  };
}

function combineOperator(base, field, fieldStrength) {
  return base.map((row, i) =>
    row.map((value, j) => value + fieldStrength * field[i][j]));
}

function probabilities(real, imag, basis) {
  const raw = real.map((value, i) => value * value + imag[i] * imag[i]);
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return Object.freeze(Object.fromEntries(
    basis.map((name, i) => [name, raw[i] / total]),
  ));
}

function dominantState(weights) {
  return Object.entries(weights).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best)[0];
}

/**
 * General N-state coupled propagator.
 *
 * operator: base coupling matrix.
 * fieldOperator: optional matrix whose contribution is multiplied by
 * fieldStrength at each step. fieldStrength may be a number or function
 * ({step,time,address,context}) => number.
 */
export function propagateCoupledState({
  basis = DEFAULT_STATE_BASIS,
  state = null,
  imaginaryState = null,
  operator = null,
  fieldOperator = null,
  fieldStrength = 0,
  dt = 0.05,
  steps = 1,
  address = null,
  context = null,
  recordTrajectory = true,
} = {}) {
  const names = normalizeBasis(basis);
  const size = names.length;
  const baseOperator = normalizeRealMatrix(operator ?? identityMatrix(size).map((row) => row.map(() => 0)), size);
  const field = normalizeRealMatrix(fieldOperator ?? identityMatrix(size).map((row) => row.map(() => 0)), size, 'fieldOperator');
  const stepSize = finiteNumber(dt, 'dt');
  const count = Number(steps);
  if (!Number.isInteger(count) || count < 0 || count > 100000) {
    throw new RangeError('steps must be an integer from 0 to 100000');
  }

  let normalized = normalizeAmplitude(
    stateVector(state, names),
    stateVector(imaginaryState ?? zeroVector(size), names),
  );
  let real = normalized.real;
  let imag = normalized.imag;
  const trajectory = [];

  const snapshot = (step, time, strength) => {
    const weights = probabilities(real, imag, names);
    return Object.freeze({
      step,
      time,
      fieldStrength: strength,
      probabilities: weights,
      dominantState: dominantState(weights),
    });
  };

  if (recordTrajectory) trajectory.push(snapshot(0, 0, 0));

  for (let step = 0; step < count; step++) {
    const time = step * stepSize;
    const strength = typeof fieldStrength === 'function'
      ? finiteNumber(fieldStrength({ step, time, address, context }), 'fieldStrength')
      : finiteNumber(fieldStrength, 'fieldStrength');
    const activeOperator = combineOperator(baseOperator, field, strength);
    const evolved = rk4(real, imag, activeOperator, stepSize);
    normalized = normalizeAmplitude(evolved.real, evolved.imag);
    real = normalized.real;
    imag = normalized.imag;
    if (recordTrajectory) trajectory.push(snapshot(step + 1, (step + 1) * stepSize, strength));
  }

  const finalProbabilities = probabilities(real, imag, names);
  return Object.freeze({
    model: 'synthia-coupled-state-evolution-v1',
    basis: names,
    address,
    context,
    steps: count,
    dt: stepSize,
    amplitude: Object.freeze({
      real: Object.freeze([...real]),
      imaginary: Object.freeze([...imag]),
    }),
    probabilities: finalProbabilities,
    dominantState: dominantState(finalProbabilities),
    trajectory: Object.freeze(trajectory),
    canonicalStateSpaceReplaced: false,
  });
}

/**
 * Synthia-facing calculator. It keeps an append-only local calculation ledger;
 * callers remain responsible for canonical address/trajectory persistence.
 */
export class CoupledStateEvolutionRuntime {
  constructor({ basis = DEFAULT_STATE_BASIS } = {}) {
    this.basis = normalizeBasis(basis);
    this.history = [];
  }

  evolve(input = {}) {
    const result = propagateCoupledState({ ...input, basis: input.basis ?? this.basis });
    const record = Object.freeze({
      id: `coupled-state-evolution-${this.history.length + 1}`,
      sequence: this.history.length + 1,
      result,
    });
    this.history.push(record);
    return record;
  }

  manifest() {
    return Object.freeze({
      id: 'coupled-state-evolution',
      model: 'synthia-coupled-state-evolution-v1',
      basis: this.basis,
      method: 'real-valued coupled operator + complex state amplitude + RK4 propagation',
      provenance: 'axion-magnetic-resonance mathematical pattern, adapted domain-neutrally',
      replacesCanonicalStateSpace: false,
    });
  }
}

export default CoupledStateEvolutionRuntime;
