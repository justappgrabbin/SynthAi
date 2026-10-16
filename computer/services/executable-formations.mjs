/**
 * Computer formation execution gateway.
 *
 * The Computer event emitter is the durable authority for formation revisions,
 * activation and execution receipts. Recovered ATO Core owns computation.
 * StateSpaceKernel below is an addressed CODE PROJECTION, not an alternative
 * source of truth for Computer identity or persisted state.
 *
 * No generated JavaScript eval, backend service, or LLM is required.
 * Executable operations must be registered from real, installed source.
 */
import {
  ATOEngine, FunctionRegistry, Automaton, AutomataMesh, Anomata, StateSpaceKernel,
} from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/vendor/ato-core/src/index.mjs';

export const FORMATION_PROVIDER = 'synthai:recovered-ato-core-formation';
export const FORMATION_MANIFEST = 'ato.computer-formation.v1';
const clone = value => structuredClone(value);
const trajectory = id => 'formation:' + id;
const revisionKey = (id, number) => 'formation:' + id + '@' + number;
const validId = id => typeof id === 'string' && id.length > 0 && id.length < 256;
const stateSummary = formation => ({
  id: formation.id,
  activeRevision: formation.activeRevision,
  revisionCount: formation.revisions.length,
});

export class ComputerFormationService {
  constructor({ computer } = {}) {
    if (!computer?.eventEmitter || typeof computer.emitEvent !== 'function')
      throw new TypeError('ComputerFormationService requires the Computer event emitter');
    this.computer = computer;
    this.registry = new FunctionRegistry();
    this.compiler = new ATOEngine({ registry: this.registry });
    this.kernel = new StateSpaceKernel();
    this.anomata = new Anomata({ kernel: this.kernel, maxEvents: Number.POSITIVE_INFINITY });
    this.mesh = new AutomataMesh();
    this.formations = new Map();
    this.compiled = new Map();
    this.mutating = new Set();
  }

  registerOperation(id, implementation) {
    this.registry.register(id, implementation);
    return this;
  }

  async recover() {
    // Rebuild only the ephemeral index; event history remains authoritative.
    if (this.formations.size) throw new Error('Formation recovery already applied');
    for (const event of await this.computer.eventEmitter.readAll()) {
      if (event.provider !== FORMATION_PROVIDER) continue;
      if (event.event_type === 'state_transition' && event.result_status === 'success')
        this.#apply(event);
    }
    return this;
  }

  #project(formation, event) {
    this.kernel.annotate(formation.address, 'code', {
      formationId: formation.id,
      activeRevision: formation.activeRevision,
      revisions: formation.revisions.map(({ id, artifactId }) => ({ id, artifactId })),
    }, { provider: FORMATION_PROVIDER, eventId: event.event_id });
  }

  #apply(event) {
    const action = event.input?.action;
    const payload = event.result;
    if (!payload || payload.manifestVersion !== FORMATION_MANIFEST)
      throw new Error('Invalid persisted formation event: ' + event.event_id);
    const id = payload.formationId;
    if (!validId(id) || event.target_id !== id || event.trajectory_id !== trajectory(id))
      throw new Error('Formation journal identity mismatch: ' + event.event_id);
    let formation = this.formations.get(id);
    if (action === 'create' || action === 'transform') {
      if (action === 'create' && formation) throw new Error('Duplicate persisted formation: ' + id);
      if (action === 'transform' && !formation) throw new Error('Transformation without source: ' + id);
      if (!formation) {
        formation = {
          id, address: clone(payload.address), purpose: payload.purpose ?? null,
          activeRevision: null, revisions: [],
        };
        this.formations.set(id, formation);
      } else if (JSON.stringify(formation.address) !== JSON.stringify(payload.address)) {
        throw new Error('Formation address changed without address migration: ' + id);
      }
      const expected = revisionKey(id, formation.revisions.length + 1);
      if (payload.revisionId !== expected || payload.previousRevision !== formation.activeRevision)
        throw new Error('Broken formation revision chain: ' + event.event_id);
      const revision = Object.freeze({
        id: payload.revisionId,
        previousRevision: payload.previousRevision,
        graph: clone(payload.graph),
        artifactId: payload.artifactId,
        number: formation.revisions.length + 1,
      });
      formation.revisions.push(revision);
      formation.activeRevision = revision.id;
    } else if (action === 'activate') {
      if (!formation || !formation.revisions.some(item => item.id === payload.revisionId))
        throw new Error('Cannot activate missing formation revision: ' + id);
      formation.activeRevision = payload.revisionId;
    } else throw new Error('Unknown persisted formation action: ' + String(action));
    this.#project(formation, event);
  }

  #prepare(formationId, revisionId, address, purpose, graph) {
    const compiled = this.compiler.compile({
      id: revisionId, address, purpose, graph,
    });
    const automaton = new Automaton({
      id: revisionId, address,
      structure: 'hexagram', activeLevels: [1, 2, 3, 4, 5],
      functionalLevel: 'being',
      ports: [
        { id: 'input', direction: 'input', type: 'json', schemaVersion: '1' },
        { id: 'output', direction: 'output', type: 'json', schemaVersion: '1' },
      ],
      implementation: input => this.anomata.run(revisionId, 'execute', input),
      metadata: {
        family: 'computer-executable-formation',
        formationId, revisionId, artifactId: compiled.artifact.id,
      },
    });
    return { automaton, compiled };
  }

  #mount(revision, address, prepared) {
    if (this.compiled.has(revision.id)) return;
    const item = prepared || this.#prepare(
      revision.id.split('@').slice(0, -1).join('@'),
      revision.id, address, null, revision.graph,
    );
    if (item.compiled.artifact.id !== revision.artifactId)
      throw new Error('Recovered formation artifact checksum mismatch: ' + revision.id);
    this.anomata.mount({
      id: revision.id, address,
      capabilities: [{
        id: 'execute', address, input: 'json', output: 'json',
        implementation: input => item.compiled.execute(input),
      }],
    });
    this.mesh.add(item.automaton);
    this.compiled.set(revision.id, item);
  }

  #require(id) {
    const formation = this.formations.get(id);
    if (!formation) throw new Error('Unknown formation: ' + id);
    return formation;
  }

  describe(id) {
    const f = this.#require(id);
    return Object.freeze({
      id: f.id, address: clone(f.address), purpose: f.purpose,
      activeRevision: f.activeRevision,
      revisions: Object.freeze(f.revisions.map(r => Object.freeze({
        id: r.id, number: r.number, previousRevision: r.previousRevision,
        artifactId: r.artifactId, graph: clone(r.graph),
      }))),
    });
  }

  list() {
    return Object.freeze([...this.formations.keys()].sort().map(id => this.describe(id)));
  }

  async #exclusive(id, action) {
    if (this.mutating.has(id)) throw new Error('Concurrent formation mutation: ' + id);
    this.mutating.add(id);
    try { return await action(); }
    finally { this.mutating.delete(id); }
  }

  async #event({ id, action, preState, result, status = 'success', error = null }) {
    return this.computer.emitEvent({
      actor_id: trajectory(id), actor_type: 'automaton', target_id: id,
      event_type: status === 'failure' ? 'failure' : action === 'execute' ? 'tool_execution' : 'state_transition',
      provider: FORMATION_PROVIDER, trajectory_id: trajectory(id),
      actor_address: this.formations.get(id)?.address ?? result?.address ?? null,
      input: { action },
      pre_state: preState,
      post_state: status === 'success' ? {
        activeRevision: result?.revisionId ?? preState?.activeRevision ?? null,
      } : preState,
      result: status === 'success' ? result : null,
      result_status: status,
      observable_effect: status === 'failure' ? 'formation operation failed: ' + error :
        action === 'execute' ? 'formation graph executed' : 'formation revision recorded',
    });
  }

  async #commit(id, action, payload, prepared, address, previous) {
    const event = await this.#event({
      id, action, preState: previous, result: payload,
    });
    this.#apply(event);
    if (prepared) {
      const f = this.#require(id);
      const revision = f.revisions.at(-1);
      this.#mount(revision, address, prepared);
    }
    return this.describe(id);
  }

  async create({ id, address, purpose = null, graph } = {}) {
    if (!validId(id)) throw new TypeError('Formation id required (1-255 characters)');
    return this.#exclusive(id, async () => {
      if (this.formations.has(id)) throw new Error('Formation already exists: ' + id);
      const normalized = this.kernel.get(address).address;
      const revisionId = revisionKey(id, 1);
      const graphSnapshot = clone(graph);
      const prepared = this.#prepare(id, revisionId, normalized, purpose, graphSnapshot);
      return this.#commit(id, 'create', {
        manifestVersion: FORMATION_MANIFEST,
        formationId: id, revisionId, previousRevision: null,
        address: clone(normalized), purpose, graph: graphSnapshot,
        artifactId: prepared.compiled.artifact.id,
      }, prepared, normalized, null);
    });
  }

  async transform(id, graph, { reason = 'structural-recomposition' } = {}) {
    if (!validId(id)) throw new TypeError('Formation id required');
    return this.#exclusive(id, async () => {
      const f = this.#require(id);
      const previous = stateSummary(f);
      const revisionId = revisionKey(id, f.revisions.length + 1);
      try {
        const graphSnapshot = clone(graph);
        const prepared = this.#prepare(id, revisionId, f.address, f.purpose, graphSnapshot);
        return await this.#commit(id, 'transform', {
          manifestVersion: FORMATION_MANIFEST,
          formationId: id, revisionId, previousRevision: f.activeRevision,
          address: clone(f.address), purpose: f.purpose,
          reason, graph: graphSnapshot, artifactId: prepared.compiled.artifact.id,
        }, prepared, f.address, previous);
      } catch (error) {
        // Only reject invalid input; a failed persistence write must not be
        // mislabeled as a successful transformation.
        await this.#event({
          id, action: 'transform', preState: previous, status: 'failure',
          error: String(error?.message ?? error),
        });
        throw error;
      }
    });
  }

  async activate(id, revisionId) {
    return this.#exclusive(id, async () => {
      const f = this.#require(id);
      const previous = stateSummary(f);
      if (!f.revisions.some(r => r.id === revisionId))
        throw new Error('Unknown formation revision: ' + revisionId);
      await this.#commit(id, 'activate', {
        manifestVersion: FORMATION_MANIFEST,
        formationId: id, revisionId,
      }, null, f.address, previous);
      return this.describe(id);
    });
  }

  async execute(id, input, { revisionId = null } = {}) {
    const f = this.#require(id);
    const chosen = revisionId ?? f.activeRevision;
    const version = f.revisions.find(r => r.id === chosen);
    if (!version) throw new Error('Unknown formation revision: ' + chosen);
    try {
      if (!this.compiled.has(chosen))
        this.#mount(version, f.address, null);
      const outcome = await this.mesh.run(chosen, input);
      const native = outcome.outputs[chosen].result;
      const receipt = Object.freeze({
        formationId: id, revisionId: chosen, artifactId: native.artifactId,
        address: clone(f.address), outputs: clone(native.outputs),
      });
      await this.#event({
        id, action: 'execute',
        preState: { activeRevision: f.activeRevision },
        result: receipt,
      });
      return receipt;
    } catch (error) {
      await this.#event({
        id, action: 'execute',
        preState: { activeRevision: f.activeRevision }, status: 'failure',
        error: String(error?.message ?? error),
      });
      throw error;
    }
  }

  history(id) {
    return this.computer.eventEmitter.history(trajectory(id))
      .then(events => Object.freeze(events.filter(e => e.provider === FORMATION_PROVIDER)));
  }
}
