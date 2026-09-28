import { deterministicId, safe } from '../util.mjs';

/**
 * A local coordinating mesh. Instruments remain independently callable, while
 * coordinate() lets the mesh select and run one or more instruments for a
 * shared task. Imported context is consumed through receive(), never only
 * appended to a log.
 */
export class RelationalMesh {
  constructor({ id, dimension = 'Being', address = null } = {}) {
    if (!id) throw new TypeError('RelationalMesh requires id');
    this.id = id;
    this.dimension = dimension;
    this.address = address;
    this.nodes = new Map();
    this.edges = [];
    this.receipts = [];
    this.history = [];
    this.sequence = 0;
    this.defaultNodeId = null;
  }

  register(node, { id = node?.id, capabilities = node?.capabilities ?? [], address = node?.address ?? null, handler = null, defaultNode = false } = {}) {
    if (!id) throw new TypeError('local mesh node requires id');
    if (this.nodes.has(id)) throw new Error(`duplicate local node: ${this.id}/${id}`);
    const invoke = handler
      ?? (typeof node?.run === 'function' ? (input, context) => node.run(input, context) : null)
      ?? (typeof node?.process === 'function' ? (input, context) => node.process(input, context) : null)
      ?? (typeof node === 'function' ? node : null);
    if (typeof invoke !== 'function') throw new TypeError(`node ${id} is not callable`);
    const record = { id, node, capabilities: [...capabilities], address, invoke };
    this.nodes.set(id, record);
    if (!this.defaultNodeId || defaultNode) this.defaultNodeId = id;
    return record;
  }

  connect(from, to, relation = 'coordinates-with', metadata = {}) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error(`unknown local edge endpoint in ${this.id}`);
    const edge = Object.freeze({ from, to, relation, metadata: Object.freeze({ ...metadata }) });
    this.edges.push(edge);
    return edge;
  }

  async run(nodeId, input, context = {}) {
    const record = this.nodes.get(nodeId);
    if (!record) throw new Error(`unknown local node: ${this.id}/${nodeId}`);
    const sequence = ++this.sequence;
    const output = await record.invoke(input, {
      ...context,
      localMesh: this.id,
      localNode: nodeId,
      localSequence: sequence,
    });
    const event = Object.freeze({
      id: deterministicId(`local-run:${this.id}`, { nodeId, input, sequence }),
      sequence,
      nodeId,
      input: safe(input),
      output: safe(output),
      relationalContext: safe(context.relationalContext ?? null),
    });
    this.history.push(event);
    return { output, event };
  }

  async coordinate(input, context = {}) {
    const required = new Set(context.capabilities ?? []);
    const candidates = [...this.nodes.values()].filter((record) =>
      required.size === 0 || [...required].every((capability) => record.capabilities.includes(capability)));
    const selected = candidates[0] ?? this.nodes.get(this.defaultNodeId);
    if (!selected) throw new Error(`mesh ${this.id} has no callable nodes`);
    return this.run(selected.id, input, context);
  }

  /** Called by MeshFederation. The returned receipt proves execution/consumption. */
  async receive(envelope) {
    const target = envelope.to?.node ?? this.defaultNodeId;
    const context = {
      relationalContext: envelope.relationalContext,
      federatedEnvelope: envelope,
      address: envelope.address,
      provenance: envelope.provenance,
    };
    const result = target
      ? await this.run(target, envelope.payload, context)
      : await this.coordinate(envelope.payload, context);
    const receipt = Object.freeze({
      delivered: true,
      consumed: true,
      envelopeId: envelope.id,
      consumedEnvelopeId: envelope.id,
      meshId: this.id,
      nodeId: result.event.nodeId,
      localEventId: result.event.id,
      output: safe(result.output),
    });
    this.receipts.push(receipt);
    return receipt;
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      dimension: this.dimension,
      address: safe(this.address),
      nodes: Object.freeze([...this.nodes.values()].map(({ id, capabilities, address }) => ({ id, capabilities: [...capabilities], address: safe(address) }))),
      edges: Object.freeze([...this.edges]),
      runs: this.history.length,
      consumedTransfers: this.receipts.length,
    });
  }
}

export default RelationalMesh;
