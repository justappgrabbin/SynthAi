// Routing plane only. The mesh does not own semantic state and is not a brain.
// Every registered process keeps its own state and decides what to do with messages.

export class ProcessMesh {
  constructor({ id = 'synthia-process-mesh' } = {}) {
    this.id = id;
    this.processes = new Map();
    this.routeLog = [];
    this.sequence = 0;
  }

  register(process) {
    if (!process?.id || typeof process.receive !== 'function') {
      throw new TypeError('ProcessMesh.register requires a Synthia process.');
    }
    if (this.processes.has(process.id)) {
      throw new Error(`Process already registered: ${process.id}`);
    }
    this.processes.set(process.id, process);
    process.connect(this);
    return process;
  }

  unregister(processId) {
    const process = this.processes.get(processId);
    if (process) process.mesh = null;
    return this.processes.delete(processId);
  }

  get(processId) {
    return this.processes.get(processId) || null;
  }

  list() {
    return [...this.processes.values()].map(process => ({
      id: process.id,
      kind: process.kind,
      capabilities: [...process.capabilities],
    }));
  }

  findByCapability(capability) {
    return [...this.processes.values()].filter(process => process.can(capability));
  }

  async request({ from = 'external', to, type, payload = {}, meta = {} }) {
    const target = this.processes.get(to);
    if (!target) throw new Error(`Unknown process: ${to}`);

    const requestId = `${this.id}:${++this.sequence}`;
    const packet = {
      requestId,
      from,
      to,
      type,
      payload,
      meta,
      timestamp: Date.now(),
    };

    this.routeLog.push({
      requestId,
      from,
      to,
      type,
      timestamp: packet.timestamp,
    });

    return target.receive(packet);
  }

  async requestCapability(capability, payload = {}, { from = 'external', strategy = 'first' } = {}) {
    const candidates = this.findByCapability(capability);
    if (candidates.length === 0) {
      throw new Error(`No process exposes capability: ${capability}`);
    }
    if (strategy === 'all') {
      return Promise.all(candidates.map(process =>
        this.request({ from, to: process.id, type: capability, payload })
      ));
    }
    return this.request({ from, to: candidates[0].id, type: capability, payload });
  }

  snapshot() {
    return {
      id: this.id,
      routes: [...this.routeLog],
      processes: [...this.processes.values()].map(process => process.snapshot()),
    };
  }
}

export default ProcessMesh;
