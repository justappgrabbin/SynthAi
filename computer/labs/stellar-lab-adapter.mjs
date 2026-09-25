import { ExperimentLoop } from '../services/experiment-loop.mjs';

const clone = value => value === undefined ? undefined : structuredClone(value);
const safeKey = value => String(value ?? 'item').replace(/[^A-Za-z0-9_-]/g, c => `_${c.charCodeAt(0).toString(16)}`);

export class StellarLabAdapter {
  constructor({ mesh, state, bus = null, experiments = null, clock = () => Date.now(), id = 'lab:stellar' } = {}) {
    if (!mesh?.registerParticipant || !mesh?.bindHandler) throw new TypeError('StellarLabAdapter requires relational mesh');
    if (!state?.get || !state?.set) throw new TypeError('StellarLabAdapter requires StateStore-like persistence');
    Object.assign(this, { mesh, state, bus, clock, id: String(id) });
    this.experiments = experiments ?? new ExperimentLoop({ bus });
    this.executors = new Map();
    this.measures = new Map();
    this.unbind = null;
    this.mounted = false;
  }

  registerExecutor(id, executor) {
    if (!id || typeof executor !== 'function') throw new TypeError('executor id and function required');
    this.executors.set(String(id), executor);
    return executor;
  }

  registerMeasure(id, measure) {
    if (!id || typeof measure !== 'function') throw new TypeError('measure id and function required');
    this.measures.set(String(id), measure);
    return measure;
  }

  async mount() {
    const existing = this.mesh.participant(this.id);
    if (!existing) {
      await this.mesh.registerParticipant(this.id, {
        kind: 'world-research',
        residency: 'active',
        capabilities: ['experiment.hypothesis','experiment.create','experiment.run','experiment.observation','experiment.evidence','experiment.report'],
        publicState: { name: 'Stellar Lab', bound: true, evidencePolicy: 'explicit-replication' },
      });
    } else {
      await this.mesh.setResidency(this.id, 'active');
      await this.mesh.publishPresence(this.id, { bound: true, evidencePolicy: 'explicit-replication' });
    }

    if (this.mesh.participant('system:execution') &&
        !this.mesh.relationshipsFor(this.id).some(edge => edge.type === 'uses-execution' && edge.to === 'system:execution')) {
      await this.mesh.connect(this.id, 'system:execution', { type: 'uses-execution' });
    }

    this.unbind?.();
    this.unbind = this.mesh.bindHandler(this.id, envelope => this.handle(envelope));
    this.mounted = true;
    this.bus?.emit('stellar:mounted', this.snapshot());
    return this.snapshot();
  }

  async request({ operation, payload = {}, envelope = {} } = {}) {
    return this.handle({ ...clone(envelope), operation, payload: clone(payload) });
  }

  async handle(envelope = {}) {
    const p = envelope.payload ?? {};
    let result;
    switch (envelope.operation) {
      case 'hypothesis.create':
        result = await this.experiments.createHypothesis(p);
        break;
      case 'hypothesis.get':
        result = await this.experiments.hypothesis(p.id);
        break;
      case 'experiment.create':
        result = await this.experiments.createExperiment(p);
        break;
      case 'experiment.get':
        result = clone(this.experiments.experiment(p.id));
        break;
      case 'experiment.run': {
        const exp = this.experiments.experiment(p.experimentId);
        if (!exp) throw new Error(`unknown experiment ${p.experimentId}`);
        const executorId = String(p.executorId ?? exp.method ?? '');
        const executor = this.executors.get(executorId);
        if (!executor) throw new Error(`Stellar executor not registered: ${executorId}`);
        result = await this.experiments.run(p.experimentId, executor, clone(p.input));
        break;
      }
      case 'evidence.classify': {
        const exp = this.experiments.experiment(p.experimentId);
        if (!exp) throw new Error(`unknown experiment ${p.experimentId}`);
        const measureId = String(p.measureId ?? exp.metric ?? exp.hypothesisId ?? '');
        const measure = this.measures.get(measureId);
        if (!measure) throw new Error(`Stellar measure not registered: ${measureId}`);
        result = await this.experiments.classify(p.experimentId, { measure });
        break;
      }
      case 'snapshot':
        result = this.snapshot();
        break;
      default:
        throw new Error(`unsupported Stellar Lab operation: ${envelope.operation}`);
    }

    const receipt = {
      operation: envelope.operation,
      requestId: envelope.id ?? null,
      result: clone(result),
      at: this.clock(),
    };
    await this.state.set(`stellar.receipts.${safeKey(envelope.id ?? `${envelope.operation}-${this.clock()}`)}`, receipt, { source: 'stellar-lab' });
    this.bus?.emit('stellar:operation', clone(receipt));
    return result;
  }

  snapshot() {
    return {
      id: this.id,
      mounted: this.mounted,
      provider: this.experiments.providerId,
      executorIds: [...this.executors.keys()],
      measureIds: [...this.measures.keys()],
      experimentIds: [...this.experiments.experiments.keys()],
      evidencePolicy: 'execution-is-observation-until-explicit-replicated-classification',
    };
  }

  async unmount() {
    this.unbind?.();
    this.unbind = null;
    if (this.mesh.participant(this.id)) await this.mesh.setResidency(this.id, 'warm');
    this.mounted = false;
    return true;
  }
}

export default StellarLabAdapter;
