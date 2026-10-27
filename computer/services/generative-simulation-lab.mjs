/**
 * Generative Simulation Lab for the existing SynthAi Computer.
 * Independent LFCL kernel adapter based on the user's archived
 * ovitrac/generativeSimulation examples/deeplearning_D.py scaling law.
 *
 * The model uses synthetic constants, is NOT empirically calibrated,
 * and is not a trained language model. No network or arbitrary code execution.
 */
const MAX_SCENARIOS = 256;
const MAX_PAIRS = 4096;
const POLYMERS = Object.freeze({
  PP: Object.freeze({ tg: 273, r: 1 }),
  HDPE: Object.freeze({ tg: 173, r: 1 }),
});
const copy = x => JSON.parse(JSON.stringify(x));
function bounded(x, name, min, max) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max)
    throw new RangeError(name + ' must be a finite number in [' + min + ', ' + max + ']');
  return x;
}
function polymerDiffusion({ polymer, massGMol, temperatureC } = {}) {
  if (!Object.hasOwn(POLYMERS, polymer)) throw new TypeError('polymer must be PP or HDPE');
  const m = bounded(massGMol, 'massGMol', 1, 1000000);
  const c = bounded(temperatureC, 'temperatureC', 0, 200);
  const t = c + 273.15;
  const { tg, r } = POLYMERS[polymer];
  const alpha = 1 + 140 / (40 + r * (t - tg));
  const d = 1e-9 * Math.pow(m / 100, -alpha);
  if (!Number.isFinite(d) || d <= 0) throw new RangeError('Invalid diffusivity');
  return { polymer, massGMol: m, temperatureC: c, temperatureK: t,
    glassTransitionK: tg, alpha, diffusivityM2PerS: d };
}
const provenance = Object.freeze({
  source: 'ovitrac/generativeSimulation examples/deeplearning_D.py',
  sourceType: 'user-supplied-archive', status: 'synthetic-educational',
  validation: 'not-empirically-calibrated',
});
const builtin = Object.freeze({
  id: 'polymer-diffusion-v1', version: '1.0.0',
  description: 'Synthetic polymer diffusivity scaling law for PP and HDPE',
  provenance,
  input: { polymer: ['PP', 'HDPE'], massGMol: '[1, 1000000]', temperatureC: '[0, 200]' },
  run: polymerDiffusion,
});
export class GenerativeSimulationLab {
  constructor({ bus = null } = {}) {
    this.bus = bus;
    this.kernels = new Map();
    this.registerKernel(builtin);
  }
  registerKernel(kernel) {
    if (!kernel || typeof kernel.id !== 'string' || !/^[a-z0-9-]{2,64}$/.test(kernel.id)
        || typeof kernel.version !== 'string' || typeof kernel.run !== 'function'
        || !kernel.provenance || typeof kernel.provenance !== 'object')
      throw new TypeError('Kernel requires id, version, run and provenance');
    if (this.kernels.has(kernel.id)) throw new Error('Duplicate kernel: ' + kernel.id);
    this.kernels.set(kernel.id, kernel);
    this.bus?.emit('simulation:kernel-registered', { kernelId: kernel.id, version: kernel.version });
    return kernel.id;
  }
  listKernels() {
    return [...this.kernels.values()].map(({ id, version, description, input, provenance }) =>
      copy({ id, version, description, input, provenance }));
  }
  run(kernelId, parameters = {}) {
    const kernel = this.kernels.get(kernelId);
    if (!kernel) throw new Error('Unknown simulation kernel: ' + kernelId);
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters))
      throw new TypeError('Simulation parameters must be an object');
    const output = kernel.run(copy(parameters));
    if (!output || typeof output !== 'object') throw new TypeError('Invalid kernel result');
    const result = copy({ kernelId, version: kernel.version, input: parameters,
      output, provenance: kernel.provenance,
      evidence: { kind: 'model_output', measured: false, hypothesisStatus: 'not-evaluated' } });
    this.bus?.emit('simulation:completed', { kernelId, status: 'synthetic-model-output' });
    return result;
  }
  grid(kernelId, { polymers, massesGMol, temperaturesC } = {}) {
    if (kernelId !== 'polymer-diffusion-v1') throw new Error('No grid adapter for this kernel');
    for (const [name, values] of Object.entries({ polymers, massesGMol, temperaturesC })) {
      if (!Array.isArray(values) || !values.length || values.length > MAX_SCENARIOS)
        throw new RangeError(name + ' needs a nonempty bounded array');
    }
    const count = polymers.length * massesGMol.length * temperaturesC.length;
    if (count > MAX_SCENARIOS) throw new RangeError('Maximum ' + MAX_SCENARIOS + ' scenarios');
    const scenarios = [];
    for (const polymer of polymers)
      for (const massGMol of massesGMol)
        for (const temperatureC of temperaturesC)
          scenarios.push(this.run(kernelId, { polymer, massGMol, temperatureC }).output);
    return { kernelId, scenarios, count: scenarios.length,
      evidence: { kind: 'synthetic-scenarios', measured: false } };
  }
  /**
   * Intra-polymer contrasts echo the supplied neural example.
   * Within each polymer Tg difference is ZERO, so these rows cannot
   * validate a learned cross-polymer Tg effect. Pair-level random split
   * would also leak reused scenario values into both test and train.
   */
  contrastivePairs({ scenarios, maxPairs = MAX_PAIRS } = {}) {
    if (!Array.isArray(scenarios) || scenarios.length > MAX_SCENARIOS)
      throw new RangeError('Provide at most ' + MAX_SCENARIOS + ' scenarios');
    if (!Number.isInteger(maxPairs) || maxPairs < 1 || maxPairs > MAX_PAIRS)
      throw new RangeError('Invalid maxPairs');
    const pairs = [];
    let candidates = 0;
    for (let i = 0; i < scenarios.length; i++) {
      for (let j = i + 1; j < scenarios.length; j++) {
        const a = scenarios[i], b = scenarios[j];
        if (a.polymer !== b.polymer) continue;
        candidates++;
        if (pairs.length >= maxPairs) continue;
        for (const x of [a, b]) {
          if (!Object.hasOwn(POLYMERS, x.polymer)
              || !Number.isFinite(x.massGMol) || x.massGMol <= 0
              || !Number.isFinite(x.temperatureK) || x.temperatureK <= 0
              || !Number.isFinite(x.diffusivityM2PerS) || x.diffusivityM2PerS <= 0)
            throw new TypeError('Invalid contrastive scenario');
        }
        pairs.push({ polymer: a.polymer, scenarioIndices: [i, j],
          logMassRatio: Math.log(a.massGMol / b.massGMol),
          inverseTempDiffK: 1 / a.temperatureK - 1 / b.temperatureK,
          tgDiffK: a.glassTransitionK - b.glassTransitionK,
          logDiffusivityRatio: Math.log(a.diffusivityM2PerS / b.diffusivityM2PerS) });
      }
    }
    return { pairs, candidates, truncated: pairs.length < candidates,
      advisory: 'Synthetic labels only. Split by independent scenario before training; within-polymer Tg difference is zero.' };
  }
}
export default GenerativeSimulationLab;
