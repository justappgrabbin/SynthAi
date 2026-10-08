import { resolveIntroductionAddress } from '../integration/IntroductionAddress.mjs';
import { AutoCoder } from './AutoCoder.mjs';
import { deriveMeshAnalogy } from './MeshAnalogyContext.mjs';
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
    for (const record of this.history) {
      if (['resolving', 'proposing', 'verifying'].includes(record.status)) {
        record.status = 'interrupted';
        record.finishedAt = Date.now();
        (record.lifecycle ??= []).push({ status: 'interrupted', at: record.finishedAt });
      }
    }
    this.#save();
  }

  async generate({ purpose, kind, source, project = [], parentId = null, analogy = null, context = {} } = {}) {
    if (typeof purpose !== 'string' || !purpose.trim()) throw new TypeError('purpose required');
    if (typeof kind !== 'string' || !kind.trim()) throw new TypeError('output kind required');
    if (parentId !== null && !this.history.some(record => record.id === parentId)) {
      throw new Error('unknown generation parent');
    }
    const record = {
      id: `mesh-artifact:${globalThis.crypto.randomUUID()}`, parentId, purpose, kind,
      source: clone(source), context: clone(context), status: 'resolving', createdAt: Date.now(), lifecycle: []
    };
    const projectInput = clone(project);
    const analogyInput = clone(analogy);
    this.history.push(record);
    this.#stage(record, 'resolving');
    try {
      const resolution = await this.resolve(clone(record.source));
      record.resolution = clone(resolution);
      record.addressBinding = resolveIntroductionAddress({address:resolution?.address}, null, record.id);
      // A resolver must explicitly admit this interpretation. No default address or guessed mapping.
      if (resolution?.complete !== true || !record.addressBinding.complete) {
        this.#stage(record, 'held');
      } else {
        record.facts = this.world.query();
        record.analogy = analogyInput == null ? null : deriveMeshAnalogy(analogyInput);
        this.#stage(record, 'proposing');
        const proposal = await this.propose({
          purpose, kind, resolution: clone(resolution), facts: clone(record.facts), analogy: clone(record.analogy), context: clone(record.context),
          project: this.coder.inspectProject(projectInput), parentId
        });
        if (proposal?.held === true) {
          record.proposal = clone(proposal);
          this.#stage(record, 'held');
        } else {
          if (!Array.isArray(proposal?.files) || !proposal.files.length ||
              proposal.files.some(file => typeof file.path !== 'string' || !file.path.trim() || typeof file.source !== 'string') ||
              new Set(proposal.files.map(file => file.path)).size !== proposal.files.length) {
            throw new TypeError('proposal requires unique named source files');
          }
          record.proposal = clone(proposal);
          record.proposal.files = record.proposal.files.map(file => ({...file, addressBinding:resolveIntroductionAddress(file,record.addressBinding,`${record.id}/${file.path}`)}));
          if (record.proposal.files.some(file => !file.addressBinding.complete)) {
            record.proposal.held = true; record.proposal.reason = 'output-address-unresolved';
            this.#stage(record, 'held');
          } else {
          this.#stage(record, 'verifying');
          const verification = await this.verify(clone(record));
          record.verification = clone(verification);
          const passed = verification?.pass === true && verification.evidence != null;
          if (passed) {
            this.world.assert(record.id, 'GENERATED', kind, {
              purpose, parentId, context: clone(record.context), resolution: clone(resolution), analogy: clone(record.analogy), evidence: clone(verification.evidence)
            });
          }
          this.#stage(record, passed ? 'verified' : 'unverified');
          }
        }
      }
    } catch (error) {
      this.#stage(record, 'failed');
      record.error = String(error?.message ?? error);
    } finally {
      record.finishedAt = Date.now();
      this.#save();
    }
    return clone(record);
  }

  #stage(record, status) { record.status = status; record.lifecycle.push({ status, at: Date.now() }); this.#save(); }
  snapshot() { return clone(this.history); }
  #save() { this.memory?.upsert?.('mesh-artifact-generation', 'history', clone(this.history)); }
}
export default MeshArtifactGenerator;
