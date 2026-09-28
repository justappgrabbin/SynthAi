import { deterministicId, publicContext, safe } from '../util.mjs';

/** A mesh of local meshes with typed, provenance-bearing context transfer. */
export class MeshFederation {
  constructor({ id = 'synthia:federation' } = {}) {
    this.id = id;
    this.meshes = new Map();
    this.links = new Map();
    this.transfers = [];
    this.sequence = 0;
  }

  register(mesh) {
    if (!mesh?.id || typeof mesh.receive !== 'function') throw new TypeError('federated mesh must expose id and receive()');
    if (this.meshes.has(mesh.id)) throw new Error(`duplicate federated mesh: ${mesh.id}`);
    this.meshes.set(mesh.id, mesh);
    return mesh;
  }

  connect(fromMesh, toMesh, { relation = 'shares-relational-context', types = ['*'] } = {}) {
    if (!this.meshes.has(fromMesh) || !this.meshes.has(toMesh)) throw new Error('both local meshes must be registered');
    const id = `${fromMesh}->${toMesh}`;
    const link = Object.freeze({ id, fromMesh, toMesh, relation, types: Object.freeze([...types]) });
    this.links.set(id, link);
    return link;
  }

  async transfer({ from, to, type = 'state-packet', payload, relationalContext = {}, address = null, provenance = {}, parentId = null } = {}) {
    const sourceMesh = typeof from === 'string' ? from : from?.mesh;
    const targetMesh = typeof to === 'string' ? to : to?.mesh;
    const link = this.links.get(`${sourceMesh}->${targetMesh}`);
    if (!link) throw new Error(`no federated link: ${sourceMesh}->${targetMesh}`);
    if (!link.types.includes('*') && !link.types.includes(type)) throw new TypeError(`link rejects packet type: ${type}`);
    const target = this.meshes.get(targetMesh);
    const sequence = ++this.sequence;
    const envelope = Object.freeze({
      id: deterministicId('federated', { sourceMesh, targetMesh, type, payload, sequence }),
      sequence,
      from: Object.freeze(typeof from === 'string' ? { mesh: from, node: null } : { mesh: from.mesh, node: from.node ?? null }),
      to: Object.freeze(typeof to === 'string' ? { mesh: to, node: null } : { mesh: to.mesh, node: to.node ?? null }),
      type,
      payload: safe(payload),
      relationalContext: Object.freeze(publicContext(safe(relationalContext))),
      address: safe(address),
      provenance: Object.freeze({ federation: this.id, ...safe(provenance) }),
      parentId,
    });
    const receipt = await target.receive(envelope);
    if (!receipt?.consumed || receipt.consumedEnvelopeId !== envelope.id) {
      throw new Error(`mesh ${targetMesh} delivered but did not consume ${envelope.id}`);
    }
    const record = Object.freeze({ envelope, receipt: safe(receipt) });
    this.transfers.push(record);
    return record;
  }

  async share({ from, targets = null, ...packet } = {}) {
    const sourceMesh = typeof from === 'string' ? from : from.mesh;
    const destinations = targets ?? [...this.links.values()]
      .filter((link) => link.fromMesh === sourceMesh)
      .map((link) => link.toMesh);
    const deliveries = [];
    for (const target of destinations) deliveries.push(await this.transfer({ from, to: target, ...packet }));
    return Object.freeze(deliveries);
  }

  audit() {
    return Object.freeze({
      ok: this.meshes.size > 1 && this.links.size > 0 && this.transfers.length > 0
        && this.transfers.every((entry) => entry.receipt.consumed),
      localMeshes: this.meshes.size,
      links: this.links.size,
      transfers: this.transfers.length,
      consumedTransfers: this.transfers.filter((entry) => entry.receipt.consumed).length,
      meshes: Object.freeze([...this.meshes.keys()]),
    });
  }
}

export default MeshFederation;
