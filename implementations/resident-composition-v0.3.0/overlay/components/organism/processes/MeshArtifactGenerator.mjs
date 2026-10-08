import { AutoCoder } from './AutoCoder.mjs';
const clone = value => structuredClone(value);

/** Parser-free generation orchestration. Canonical interpretation belongs to the supplied resolver. */
export class MeshArtifactGenerator {
  constructor({ world, resolve, propose, verify, memory = null, coder = new AutoCoder() } = {}) {
    if (!world?.query || !world?.assert) throw new TypeError('semantic world required');
    for (const [name, fn] of Object.entries({ resolve, propose, verify })) {
      if (typeof fn !== 'function') throw new TypeError(`${name} function required`);
    }
    Object.assign(this, { world, resolve, propose, verify, memory, coder });
    this.history = clone(memory?.get?.('mesh-artifact-generation', 'history')?.value ?? []);
    this.sequence = this.history.length;
  }

  async generate({ purpose, kind, source, project = [], parentId = null } = {}) {
    if (typeof purpose !== 'string' || !purpose.trim()) throw new TypeError('purpose required');
    if (typeof kind !== 'string' || !kind.trim()) throw new TypeError('output kind required');
    if (parentId !== null && !this.history.some(record => record.id === parentId)) {
      throw new Error('unknown generation parent');
    }
    const record = {
      id: `mesh-artifact:${++this.sequence}`, parentId, purpose, kind,
      source: clone(source), status: 'resolving', createdAt: Date.now()
    };
    this.history.push(record);
    this.#save();
    try {
      const resolution = await this.resolve(clone(source));
      record.resolution = clone(resolution);
      // A resolver must explicitly admit this interpretation. No default address or guessed mapping.
      if (resolution?.complete !== true) {
        record.status = 'held';
        return clone(record);
      }
      record.status = 'proposing';
      this.#save();
      const proposal = await this.propose({
        purpose, kind, resolution: clone(resolution), facts: this.world.query(),
        project: this.coder.inspectProject(project), parentId
      });
      if (!Array.isArray(proposal?.files) || !proposal.files.length ||
          proposal.files.some(file => typeof file.path !== 'string' || !file.path.trim() || typeof file.source !== 'string') ||
          new Set(proposal.files.map(file => file.path)).size !== proposal.files.length) {
        throw new TypeError('proposal requires unique named source files');
      }
      record.proposal = clone(proposal);
      record.status = 'verifying';
      this.#save();
      const verification = await this.verify(clone(record));
      record.verification = clone(verification);
      record.status = verification?.pass === true && verification.evidence != null ? 'verified' : 'unverified';
      if (record.status === 'verified') {
        this.world.assert(record.id, 'GENERATED', kind, {
          purpose, parentId, resolution: clone(resolution), evidence: clone(verification.evidence)
        });
      }
    } catch (error) {
      record.status = 'failed';
      record.error = String(error?.message ?? error);
    } finally {
      record.finishedAt = Date.now();
      this.#save();
    }
    return clone(record);
  }

  snapshot() { return clone(this.history); }
  #save() { this.memory?.upsert?.('mesh-artifact-generation', 'history', clone(this.history)); }
}
export default MeshArtifactGenerator;
