const clone = value => value === undefined ? undefined : structuredClone(value);

export class StellarLabAdapter {
  constructor({ experimentLoop, id = 'lab:stellar' } = {}) {
    if (!experimentLoop?.createHypothesis || !experimentLoop?.createExperiment || !experimentLoop?.run || !experimentLoop?.classify) {
      throw new TypeError('StellarLabAdapter requires the Computer ExperimentLoop contract');
    }
    Object.assign(this, { experimentLoop, id });
    this.name = 'Stellar Lab';
    this.listeners = new Set();
    this.history = [];
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  snapshot() {
    return { id: this.id, name: this.name, history: clone(this.history.slice(-100)), evidencePolicy: 'execution-is-observation-until-explicit-classification' };
  }

  async request({ operation, payload = {} } = {}) {
    let result;
    switch (operation) {
      case 'create-hypothesis':
        result = await this.experimentLoop.createHypothesis(payload);
        break;
      case 'create-experiment':
        result = await this.experimentLoop.createExperiment(payload);
        break;
      case 'run':
        if (typeof payload.executor !== 'function') throw new TypeError('Stellar run requires a real executor(input)');
        result = await this.experimentLoop.run(payload.experimentId, payload.executor, payload.input);
        break;
      case 'classify':
        if (typeof payload.measure !== 'function') throw new TypeError('Stellar classification requires measure(output)');
        result = await this.experimentLoop.classify(payload.experimentId, { measure: payload.measure });
        break;
      case 'hypothesis':
        result = await this.experimentLoop.hypothesis(payload.id);
        break;
      default:
        throw new RangeError(`Unknown Stellar Lab operation: ${operation}`);
    }
    const record = { operation, at: new Date().toISOString(), result: clone(result) };
    this.history.push(record);
    this.#emit({ type: 'stellar:operation', summary: operation, payload: record });
    return result;
  }

  async process(input = {}) { return this.request(input); }

  #emit(event) {
    const normalized = { id: `stellar-${this.history.length}`, source: this.id, at: new Date().toISOString(), ...clone(event) };
    for (const listener of this.listeners) {
      try { listener(clone(normalized)); } catch {}
    }
  }
}

export default StellarLabAdapter;
