import { ProcessMind } from 'synthia/vendor/processes-cleaned/src/runtime/ProcessMind.js';

export class SynthiaProcess {
  constructor({
    id,
    kind = 'general',
    capabilities = [],
    handlers = {},
    initialState = {},
    metadata = {},
  }) {
    if (!id) throw new TypeError('SynthiaProcess requires an id.');
    this.id = id;
    this.kind = kind;
    this.capabilities = new Set(capabilities);
    this.handlers = new Map(Object.entries(handlers));
    this.mind = new ProcessMind(id, { initialState, metadata });
    this.mesh = null;
  }

  connect(mesh) {
    this.mesh = mesh;
    return this;
  }

  register(type, handler) {
    if (!type || typeof handler !== 'function') {
      throw new TypeError('register(type, handler) requires a function handler.');
    }
    this.handlers.set(type, handler);
    return this;
  }

  can(type) {
    return this.capabilities.has(type) || this.handlers.has(type);
  }

  async receive(packet) {
    if (!packet?.type) throw new TypeError('Process packet requires a type.');
    const handler = this.handlers.get(packet.type);
    if (!handler) {
      throw new Error(`${this.id} has no handler for ${packet.type}.`);
    }

    this.mind.observe({
      kind: 'packet-received',
      from: packet.from,
      type: packet.type,
      requestId: packet.requestId,
    });

    const result = await handler.call(this, packet.payload, packet);

    this.mind.observe({
      kind: 'packet-completed',
      from: packet.from,
      type: packet.type,
      requestId: packet.requestId,
    });

    return result;
  }

  async request(to, type, payload = {}, meta = {}) {
    if (!this.mesh) throw new Error(`${this.id} is not connected to a ProcessMesh.`);
    return this.mesh.request({ from: this.id, to, type, payload, meta });
  }

  snapshot() {
    return {
      id: this.id,
      kind: this.kind,
      capabilities: [...this.capabilities],
      mind: this.mind.snapshot(),
    };
  }
}

export default SynthiaProcess;
