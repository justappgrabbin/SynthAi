/**
 * Local fitness and executable visual-geometry bridge for EXISTING Computer.
 * Source algorithms are preserved unchanged under donors/verified/simlish.
 *
 * Evidence is quantitative and held-out. Samples/images are never persisted
 * to the event ledger; only fitness metrics, accepted parameters, graph
 * revision IDs and provenance are recorded. No backend, worker or LLM.
 */
import { fitLighting } from '../donors/verified/simlish/swarm-fit.mjs';
import { matchGrid, intermediatePoints } from '../donors/verified/simlish/frame-morph.mjs';

export const FITNESS_PROVIDER = 'simlish:fitness-morph.v1';
export const FITNESS_FORMATION = 'simlish:swarm-lighting';
export const GEOMETRY_FORMATION = 'simlish:frame-geometry';
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

  async interpolate(mesh, progress = 0.5) {
    const result = await this.computer.executeFormation(GEOMETRY_FORMATION, { mesh, t: progress });
    return Object.freeze({ ...result.outputs.result, revision: result.revisionId });
  }

  async history(target = 'studio-lighting') {
    return (await this.computer.eventEmitter.history('fitness:' + target))
      .filter(e => e.provider === FITNESS_PROVIDER);
  }
}
