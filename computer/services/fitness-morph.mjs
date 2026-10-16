/**
 * Local fitness and executable visual-geometry bridge for EXISTING Computer.
 * Source algorithms are preserved unchanged under donors/verified/simlish.
 *
 * Evidence is quantitative and held-out. Samples/images are never persisted
 * to the event ledger; only fitness metrics, accepted parameters, graph
 * revision IDs and provenance are recorded. No backend, worker or LLM.
 */
import { fitLighting, fitParticles, lightingLoss } from '../donors/verified/simlish/swarm-fit.mjs';
import { matchGrid, intermediatePoints } from '../donors/verified/simlish/frame-morph.mjs';

export const FITNESS_PROVIDER = 'simlish:fitness-morph.v1';
export const FITNESS_FORMATION = 'simlish:swarm-lighting';
export const GEOMETRY_FORMATION = 'simlish:frame-geometry';
export const CONSTANT_FORMATION = 'simlish:lighting-constant';
export const GRADIENT_FORMATION = 'simlish:lighting-gradient';
export const EVOLVING_FORMATION = 'simlish:lighting-active';
export const EVOLUTION_PROVIDER = 'simlish:formation-fitness-evolution.v1';
const graph = functionId => ({
  nodes: [{ id: 'input' }, { id: 'result' }],
  edges: [{ from: 'input', to: 'result', functionId }],
});
const finiteRGB = color => Array.isArray(color) && color.length === 3 &&
  color.every(x => Number.isFinite(x) && x >= 0 && x <= 255);
const validSamples = samples => Array.isArray(samples) && samples.length >= 12 &&
  samples.length <= 1000 && samples.every(s =>
    Number.isFinite(s.x) && Math.abs(s.x) <= 1 &&
    Number.isFinite(s.y) && Math.abs(s.y) <= 1 &&
    finiteRGB(s.source) && finiteRGB(s.target));
const validMesh = mesh => mesh && Array.isArray(mesh.source) &&
  Array.isArray(mesh.target) && mesh.source.length > 0 &&
  mesh.source.length <= 512 && mesh.source.length === mesh.target.length &&
  [...mesh.source, ...mesh.target].every(p => Number.isFinite(p.x) && Number.isFinite(p.y));

export class ComputerFitnessMorph {
  constructor({ computer } = {}) {
    if (!computer?.formations || !computer?.eventEmitter || !computer?.morph)
      throw new TypeError('ComputerFitnessMorph needs existing Computer formations, morph and event ledger');
    this.computer = computer;
    this.evolving = new Set();
  }

  async boot() {
    this.computer.registerFormationOperation('simlish.swarm.fit-lighting', input => {
      if (!validSamples(input?.samples) || !Array.isArray(input?.baseline) ||
          input.baseline.length !== 3 ||
          !input.baseline.every(v => Number.isFinite(v) && v >= -60 && v <= 60))
        throw new TypeError('Lighting fit requires 12-1000 actual RGB sample pairs and bounded baseline');
      return fitLighting(input.samples, input.baseline);
    });
    this.computer.registerFormationOperation('simlish.morph.interpolate-mesh', ({ mesh, t } = {}) => {
      if (!validMesh(mesh) || !Number.isFinite(t) || t < 0 || t > 1)
        throw new TypeError('Morph interpolation requires a finite mesh and progress from zero to one');
      return {
        points: intermediatePoints(mesh, t),
        progress: t, fallback: Boolean(mesh.fallback),
        donor: 'Simlish/frame-morph.mjs',
        kind: 'triangle-mesh-interpolation',
      };
    });
    // These operators are two graph hypotheses over the SAME recovered Simlish
    // CPU PSO. Candidate execution uses ATO; acceptance uses held-out samples.
    this.computer.registerFormationOperation('simlish.evolution.constant', async input => {
      const { samples, baseline } = input || {};
      if (!validSamples(samples) || !Array.isArray(baseline) ||
          baseline.length !== 3 || !baseline.every(x => Number.isFinite(x) && x >= -60 && x <= 60))
        throw new TypeError('Constant candidate requires bounded observed samples and baseline');
      const train = samples.filter((_, i) => i % 3 !== 0);
      const held = samples.filter((_, i) => i % 3 === 0);
      const coeff = v => [...v, 0, 0, 0, 0, 0, 0];
      const fit = await fitParticles({
        bounds: [[-60, 60], [-60, 60], [-60, 60]],
        initial: baseline,
        particles: 24, iterations: 40,
        score: v => lightingLoss(train, coeff(v)) + v.reduce((n, x) => n + x * x * .003, 0),
      });
      return {
        strategy: 'constant', coefficients: coeff(fit.values),
        trainingError: lightingLoss(train, coeff(fit.values)),
        heldOutBefore: lightingLoss(held, coeff(baseline)),
        heldOutAfter: lightingLoss(held, coeff(fit.values)),
        candidateFormation: CONSTANT_FORMATION,
        workers: false, backend: fit.backend,
      };
    });
    this.computer.registerFormationOperation('simlish.evolution.gradient', async input => {
      const { samples, baseline } = input || {};
      if (!validSamples(samples) || !Array.isArray(baseline) ||
          baseline.length !== 3 || !baseline.every(x => Number.isFinite(x) && x >= -60 && x <= 60))
        throw new TypeError('Gradient candidate requires bounded observed samples and baseline');
      const fit = await fitLighting(samples, baseline);
      return {
        strategy: 'gradient', coefficients: [...fit.values],
        trainingError: fit.score,
        heldOutBefore: fit.heldOutBefore,
        heldOutAfter: fit.heldOutAfter,
        candidateFormation: GRADIENT_FORMATION,
        workers: fit.workers, backend: fit.backend,
      };
    });
    return this;
  }

  async ensureFormations({ address } = {}) {
    const existing = this.computer.formations;
    if (!existing.list().some(f => f.id === FITNESS_FORMATION)) {
      await this.computer.createFormation({
        id: FITNESS_FORMATION, address,
        purpose: 'Simlish CPU PSO face/scene lighting: held-out validation',
        graph: graph('simlish.swarm.fit-lighting'),
      });
    }
    if (!existing.list().some(f => f.id === GEOMETRY_FORMATION)) {
      await this.computer.createFormation({
        id: GEOMETRY_FORMATION, address,
        purpose: 'Simlish frame geometry morph: actual interpolated point mesh',
        graph: graph('simlish.morph.interpolate-mesh'),
      });
    }
    for (const [id, operation, purpose] of [
      [CONSTANT_FORMATION, 'simlish.evolution.constant', 'CPU PSO three-coefficient lighting candidate'],
      [GRADIENT_FORMATION, 'simlish.evolution.gradient', 'CPU PSO affine lighting candidate'],
      [EVOLVING_FORMATION, 'simlish.evolution.constant', 'Selected executable lighting topology'],
    ]) {
      if (!existing.list().some(f => f.id === id))
        await this.computer.createFormation({ id, address, purpose, graph: graph(operation) });
    }
    return [this.computer.formations.describe(FITNESS_FORMATION),
      this.computer.formations.describe(GEOMETRY_FORMATION)];
  }

  async fit(samples, baseline = [0, 0, 0], { target = 'studio-lighting' } = {}) {
    if (!validSamples(samples) || !Array.isArray(baseline) || baseline.length !== 3 ||
        !baseline.every(v => Number.isFinite(v) && v >= -60 && v <= 60))
      throw new TypeError('Fitness requires 12-1000 valid observed image sample pairs');
    if (typeof target !== 'string' || !target || target.length > 128)
      throw new TypeError('A bounded morph target identifier is required');
    const output = await this.computer.executeFormation(FITNESS_FORMATION, { samples, baseline });
    const fitted = output.outputs.result;
    const gain = fitted.heldOutBefore - fitted.heldOutAfter;
    const accepted = fitted.accepted === true && Number.isFinite(gain) && gain > 1e-6;
    const evidence = {
      scope: 'measured-paired-pixels/low-frequency-lighting',
      source: 'unchanged Simlish/swarm-fit.mjs',
      revision: output.revisionId,
      target, samples: fitted.samples,
      initialScore: fitted.initialScore, trainScore: fitted.score,
      heldOutBefore: fitted.heldOutBefore, heldOutAfter: fitted.heldOutAfter,
      gain, accepted, particles: fitted.particles,
      iterations: fitted.iterations, backend: fitted.backend,
      workers: fitted.workers, gpu: fitted.gpu,
      values: [...fitted.values],
    };
    // Persist the accepted expression through the Computer's existing MorphEngine.
    // Reject/no improvement preserves the last accepted visual parameters.
    if (accepted) {
      await this.computer.morph.express(target, {
        fittedLighting: evidence.values,
        fitness: { heldOutBefore: evidence.heldOutBefore,
          heldOutAfter: evidence.heldOutAfter, formationRevision: evidence.revision },
      }, { source: FITNESS_PROVIDER });
    }
    await this.computer.emitEvent({
      actor_id: 'automaton:simlish-swarm-fit', actor_type: 'automaton',
      target_id: target, event_type: 'verification', provider: FITNESS_PROVIDER,
      trajectory_id: 'fitness:' + target, input: { method: 'cpu-pso-lighting' },
      result_status: accepted ? 'success' : 'partial',
      result: evidence,
      observable_effect: accepted ?
        'Held-out error improved; existing MorphEngine expression updated' :
        'No held-out improvement; existing morph expression preserved',
    });
    return Object.freeze(evidence);
  }

  async evolve(samples, baseline = [0, 0, 0], { target = 'studio-lighting' } = {}) {
    if (!validSamples(samples) || !Array.isArray(baseline) || baseline.length !== 3 ||
        !baseline.every(v => Number.isFinite(v) && v >= -60 && v <= 60))
      throw new TypeError('Evolution requires 12-1000 observed pixel pairs and bounded baseline');
    if (typeof target !== 'string' || !target || target.length > 128)
      throw new TypeError('A bounded evolution target identifier is required');
    if (this.evolving.has(target)) throw new Error('A lighting evolution is already running for ' + target);
    this.evolving.add(target);
    try {
      // Execute both immutable candidate ATO graphs. They use the ORIGINAL
      // Simlish PSO and disjoint held-out sample partition, not a synthetic score.
      const input = { samples, baseline };
      const a = await this.computer.executeFormation(CONSTANT_FORMATION, input);
      const b = await this.computer.executeFormation(GRADIENT_FORMATION, input);
      const candidates = [a, b].map(receipt => ({
        ...receipt.outputs.result,
        revision: receipt.revisionId,
      }));
      if (!candidates.every(c => Number.isFinite(c.heldOutBefore) &&
        Number.isFinite(c.heldOutAfter) && c.coefficients.length === 9 &&
        c.coefficients.every(Number.isFinite)))
        throw new Error('Fitness candidates must return finite observed evidence');
      // The affine model has six additional parameters. Prefer the simpler
      // 3-parameter graph unless the held-out error drops by >1 unit.
      const ranked = candidates.map(c => ({
        ...c, selectionLoss: c.heldOutAfter + (c.strategy === 'gradient' ? 1 : 0),
      })).sort((x, y) => x.selectionLoss - y.selectionLoss ||
        x.strategy.localeCompare(y.strategy));
      const winner = ranked[0];
      const gain = winner.heldOutBefore - winner.heldOutAfter;
      const accepted = gain > 1e-6;
      const current = this.computer.formations.describe(EVOLVING_FORMATION);
      const chosenOperation = winner.strategy === 'gradient' ?
        'simlish.evolution.gradient' : 'simlish.evolution.constant';
      const beforeOperation = current.revisions.at(-1)?.graph?.edges[0]?.functionId;
      let revision = current.activeRevision;
      let transformed = false;
      if (accepted) {
        if (beforeOperation !== chosenOperation) {
          const updated = await this.computer.transformFormation(
            EVOLVING_FORMATION, graph(chosenOperation), {
              reason: 'measured-held-out-fitness/structural-selection',
            },
          );
          revision = updated.activeRevision;
          transformed = true;
        }
        // Existing MorphEngine is the sole mutable owner of visible fitness
        // expression. Failed variants never rewrite its accepted parameters.
        await this.computer.morph.express(target, {
          fittedLighting: [...winner.coefficients],
          fitness: {
            strategy: winner.strategy, heldOutBefore: winner.heldOutBefore,
            heldOutAfter: winner.heldOutAfter, formationRevision: revision,
            sampleCount: samples.length,
          },
        }, { source: EVOLUTION_PROVIDER });
      }
      const evidence = Object.freeze({
        target, accepted, gain, selected: accepted ? winner.strategy : null,
        proposed: winner.strategy, transformed, revision, priorRevision: current.activeRevision,
        sampleCount: samples.length,
        candidates: candidates.map(c => ({
          strategy: c.strategy, graphRevision: c.revision,
          heldOutBefore: c.heldOutBefore, heldOutAfter: c.heldOutAfter,
          trainingError: c.trainingError,
        })),
        coefficients: accepted ? [...winner.coefficients] : null,
        donor: 'unchanged Simlish/swarm-fit.mjs', gpu: false, workers: false,
      });
      await this.computer.emitEvent({
        actor_id: 'automaton:simlish-fitness-selection', actor_type: 'automaton',
        target_id: EVOLVING_FORMATION, event_type: 'verification',
        provider: EVOLUTION_PROVIDER, trajectory_id: 'fitness:evolution:' + target,
        input: { operation: 'compare-two-ato-lighting-graphs' },
        result: evidence, result_status: accepted ? 'success' : 'partial',
        observable_effect: accepted ?
          'Held-out candidate accepted; selected formation revision and native MorphEngine expression retained' :
          'Candidate rejected by held-out fitness; prior active expression retained',
      });
      return evidence;
    } finally {
      this.evolving.delete(target);
    }
  }

  async evolutionHistory(target = 'studio-lighting') {
    return (await this.computer.eventEmitter.history('fitness:evolution:' + target))
      .filter(e => e.provider === EVOLUTION_PROVIDER);
  }

  async interpolate(mesh, progress = 0.5) {
    const result = await this.computer.executeFormation(GEOMETRY_FORMATION, { mesh, t: progress });
    return Object.freeze({ ...result.outputs.result, revision: result.revisionId });
  }

  async history(target = 'studio-lighting') {
    return (await this.computer.eventEmitter.history('fitness:' + target))
      .filter(e => e.provider === FITNESS_PROVIDER);
  }
}
