import { createHash } from 'node:crypto';
import { ExecutionAddressResolver } from '../engines/unified-execution-spine/src/execution-address-resolver.mjs';
import { EmergentMesh } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/substrate/mesh072/mesh/emergent_mesh.mjs';
import gateTable from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/substrate/mesh072/real_gate_table.mjs';
import { CodeDNALearner } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/substrate/mesh072/core/code_dna_learner.mjs';
import { Automaton, AutomataMesh } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/ato-core/automaton.mjs';
import { TraceFiringRegistry } from '../donors/Back-up-/vendor/pure-synthia-v0.4.0/src/synthia/ato-core/trace-firing.mjs';

const dimensions = ['Movement', 'Evolution', 'Being', 'Design', 'Space'];
const cueFor = (address, addressKey, path) => ({
  dimension: dimensions.indexOf(address.dimension), gate: address.gate - 1,
  line: address.line - 1, color: address.color - 1, tone: address.tone - 1,
  base: address.base - 1, sign: address.zodiac - 1, house: address.house - 1,
  addressKey, path,
});

/** Reuses the execution address resolver and the recovered code-DNA learner. */
export class FileAdmission {
  constructor(computer, execution) {
    this.computer = computer;
    this.execution = execution;
    this.resolver = new ExecutionAddressResolver();
    this.mesh = new EmergentMesh(gateTable);
    this.dna = new CodeDNALearner(this.mesh);
    this.recallMesh = new AutomataMesh();
    this.recallMesh.add(new Automaton({
      id: 'addressed-file-recall', address: { mode: 'macro', gate: 1, line: 1, color: 1, tone: 1, base: 1 },
      structure: 'hexagram', activeLevels: [1, 2, 3, 4, 5], functionalLevel: 'space',
      implementation: ({ addressKey, path }) => {
        const record = this.resolve(addressKey).find((item) => item.path === path);
        if (!record) throw new Error('No exact file at this address and path.');
        const bytes = record.meta.encoding === 'base64' ? Buffer.from(record.content, 'base64') : Buffer.from(record.content);
        if (createHash('sha256').update(bytes).digest('hex') !== record.meta.digest) throw new Error('File hash verification failed.');
        return record;
      },
    }));
    this.trace = new TraceFiringRegistry({ mesh: this.recallMesh });
    for (const record of computer.vfs.list('/home/')) {
      if (record.meta?.address) this.register(record);
    }
  }

  register(record) {
    const { address, addressKey, digest } = record.meta;
    const id = `file:${addressKey}:${digest}`;
    const bridgeMesh = this.execution.execution.capabilityMesh;
    bridgeMesh.register({
      id, gate: address.gate, kind: 'stored-file', labels: [record.path, record.meta?.dna?.nodes ?? []],
      description: record.path, astPayload: record.meta.encoding === 'base64' ? null : { type: 'source', source: record.content },
      provenance: { path: record.path, digest, source: record.meta.source },
      metadata: { address, addressKey, exactContentHash: digest },
    });
    this.execution.mesh.addEdge('knowledge', `address:${addressKey}`, id, 'contains-file', { path: record.path, digest });
    this.trace.learn(cueFor(address, addressKey, record.path), 'addressed-file-recall');
    if (record.meta.encoding !== 'base64') this.dna.ingestFiles([{ filename: record.path, content: record.content }], { source: record.meta.source, digest });
  }

  resolve(addressKey) {
    return this.computer.vfs.list('/home/').filter((entry) => entry.meta?.addressKey === addressKey);
  }

  async activate(addressKey, path) {
    const record = this.resolve(addressKey).find((entry) => entry.path === path);
    if (!record) throw new Error('File address does not resolve.');
    const fired = await this.trace.fire(cueFor(record.meta.address, addressKey, path));
    if (!fired.activated || !fired.circuitResult) throw new Error('Addressed ATO file recall did not fire.');
    return { ...fired.circuitResult, activation: { trace: fired.trace, automatonId: fired.automatonId, exactAddressVerified: true } };
  }

  async mirrorImported(items) {
    const filesystem = this.computer.state.get('computer.desktop.filesystem', null) ?? { nodes: {}, trashMetadata: {} };
    const nodes = filesystem.nodes;
    const ensure = (parentId, name, type = 'folder') => {
      const existing = Object.values(nodes).find((node) => node.parentId === parentId && node.name === name);
      if (existing) return existing;
      const id = crypto.randomUUID();
      return (nodes[id] = { id, parentId, name, type, createdAt: Date.now(), modifiedAt: Date.now() });
    };
    const root = ensure(null, '/');
    const home = ensure(root.id, 'home');
    const user = ensure(home.id, 'user');
    for (const record of items) {
      const parts = record.path.split('/').filter(Boolean);
      if (parts[0] !== 'home' || parts[1] !== 'user') continue;
      let parent = user;
      for (const part of parts.slice(2, -1)) parent = ensure(parent.id, part);
      const file = ensure(parent.id, parts.at(-1), 'file');
      const stored = this.computer.vfs.read(record.path);
      nodes[file.id] = { ...file, type: 'file', content: stored?.meta?.encoding === 'base64' ? undefined : stored?.content,
        size: stored?.meta?.size ?? 0, modifiedAt: Date.now() };
    }
    await this.computer.state.set('computer.desktop.filesystem', filesystem, { source: 'addressed-import' });
    return filesystem;
  }

  async write(path, content, source = 'desktop', encoding = 'utf8') {
    if (typeof path !== 'string' || !path.startsWith('/home/') || path.includes('..') || typeof content !== 'string' || content.length > 8000000) {
      throw new TypeError('A /home/ file path and text content are required.');
    }
    const bytes = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content);
    const artifact = { name: path.split('/').at(-1), type: 'file', bytes };
    const decomposition = this.resolver.descend(artifact);
    const resolved = this.resolver.resolve({ artifact, decomposition, execution: { ok: true, path: 'file-admission', kind: 'stored-file' } });
    const digest = createHash('sha256').update(bytes).digest('hex');
    const dna = encoding === 'utf8' ? this.dna.ingestFiles([{ filename: path, content }], { source, digest }) : { pieces: 0, nodes: [], gaps: [] };
    const metadata = { source, encoding, size: bytes.length, address: resolved.address, addressKey: resolved.key, addressBasis: 'computational-file-admission', digest, dna: { pieces: dna.pieces, nodes: dna.nodes, gaps: dna.gaps } };
    const record = await this.computer.vfs.write(path, content, metadata);
    this.register(record);
    return record;
  }

  async admitDesktop(filesystem) {
    const nodes = filesystem?.nodes;
    if (!nodes || typeof nodes !== 'object' || !filesystem.trashMetadata || Object.keys(nodes).length > 10000) throw new TypeError('Invalid desktop filesystem.');
    let admitted = 0;
    for (const node of Object.values(nodes)) {
      if (node?.type !== 'file') continue;
      const parts = [];
      let current = node;
      const visited = new Set();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        if (current.name !== '/') parts.unshift(current.name);
        current = current.parentId ? nodes[current.parentId] : null;
      }
      const path = '/' + parts.join('/');
      if (!path.startsWith('/home/')) continue;
      const content = String(node.content ?? '');
      const digest = createHash('sha256').update(content).digest('hex');
      if (this.computer.vfs.read(path)?.meta?.digest === digest) continue;
      await this.write(path, content, 'kimi-linux-filesystem');
      admitted++;
    }
    await this.computer.state.set('computer.desktop.filesystem', filesystem, { source: 'kimi-linux-filesystem' });
    return { saved: true, admitted, files: this.computer.vfs.list('/home/').length };
  }
}
