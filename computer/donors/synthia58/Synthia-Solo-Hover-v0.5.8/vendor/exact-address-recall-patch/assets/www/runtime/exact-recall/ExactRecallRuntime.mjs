import ExactRecallRegistry from './ExactRecallRegistry.mjs';
import ExactArtifactStore from './ExactArtifactStore.mjs';
import AtoToolMaterializer from './AtoToolMaterializer.mjs';
import FoundryAppMaterializer from './FoundryAppMaterializer.mjs';
import VqRecognitionHint from './VqRecognitionHint.mjs';
import { requireExactAddress } from './CanonicalArtifactCommitment.mjs';
import { sha256Hex, asBytes, encodeFileBundle, decodeFileBundle } from './ContentHash.mjs';

export class ExactRecallError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'ExactRecallError'; this.code = code; this.details = details; }
}

export class ExactRecallRuntime {
  constructor({ unit, registry = new ExactRecallRegistry(), store = new ExactArtifactStore() } = {}) {
    if (!unit) throw new TypeError('Synthia unit is required');
    this.unit = unit;
    this.registry = registry;
    this.store = store;
    this.ato = new AtoToolMaterializer({ unit });
    this.foundry = new FoundryAppMaterializer({ unit });
    this.vq = new VqRecognitionHint();
    this.events = [];
  }

  async commitTool(address, request, { provenance = [], lineage = null, supersede = false } = {}) {
    address = requireExactAddress(address);
    const provisional = { kind:'tool', address, expectedSha256:'0'.repeat(64), materializer:'ato', recipe:{ request }, provenance, lineage };
    const generated = await this.ato.materialize({ ...provisional, recipe: { request } });
    const stored = await this.store.put(generated.bytes, { kind:'tool', address, toolId:generated.toolId });
    const commitment = this.registry.register({ ...provisional, expectedSha256: stored.sha256 }, { supersede });
    this.#event('commit', commitment, { byteLength: stored.byteLength });
    return Object.freeze({ commitment, materialized: generated });
  }

  async commitApp(address, artifact, { provenance = [], lineage = null, supersede = false } = {}) {
    address = requireExactAddress(address);
    let bytes, recipe, mode;
    if (Array.isArray(artifact?.files)) {
      bytes = encodeFileBundle(artifact.files);
      recipe = { files: decodeFileBundle(bytes).files };
      mode = 'recipe';
    } else if (artifact instanceof Blob) {
      bytes = new Uint8Array(await artifact.arrayBuffer()); recipe = null; mode = 'exact-bytes';
    } else {
      bytes = asBytes(artifact?.bytes ?? artifact); recipe = null; mode = 'exact-bytes';
    }
    const stored = await this.store.put(bytes, { kind:'app', address, mode });
    const commitment = this.registry.register({ kind:'app', address, expectedSha256:stored.sha256, materializer: mode === 'recipe' ? 'foundry' : 'exact-bytes', recipe, provenance, lineage }, { supersede });
    this.#event('commit', commitment, { byteLength: stored.byteLength, mode });
    return Object.freeze({ commitment, byteLength: stored.byteLength });
  }

  async commitFoundryGraph(address, graph, target, { provenance = [], lineage = null, supersede = false } = {}) {
    address = requireExactAddress(address);
    const temp = { kind:'app', address, materializer:'foundry', recipe:{ graph, target } };
    const generated = await this.foundry.materialize(temp);
    const stored = await this.store.put(generated.bytes, { kind:'app', address, mode:'resident-foundry', target });
    const commitment = this.registry.register({ kind:'app', address, expectedSha256:stored.sha256, materializer:'foundry', recipe:{ graph, target }, provenance, lineage }, { supersede });
    this.#event('commit', commitment, { byteLength: stored.byteLength, mode:'resident-foundry' });
    return Object.freeze({ commitment, materialized: generated });
  }

  recognize(candidate) { return this.vq.suggest(candidate); }

  async recall(address, { kind } = {}) {
    address = requireExactAddress(address);
    if (kind !== 'tool' && kind !== 'app') throw new TypeError('recall kind must be tool or app');
    const commitment = this.registry.get(kind, address);
    if (!commitment) throw new ExactRecallError('UNKNOWN_ADDRESS', `No exact ${kind} is committed at this canonical address`, { address });

    const stored = await this.store.get(commitment.expectedSha256);
    if (stored) {
      const actual = await sha256Hex(stored);
      this.#assertHash(commitment, actual, 'store');
      this.#event('recall', commitment, { source:'exact-store' });
      return this.#result(commitment, stored, 'exact-store');
    }

    let materialized;
    if (commitment.materializer === 'ato') materialized = await this.ato.materialize(commitment);
    else if (commitment.materializer === 'foundry') materialized = await this.foundry.materialize(commitment);
    else throw new ExactRecallError('EXACT_BYTES_MISSING', 'Exact bytes are not present; regeneration is forbidden for this commitment', { expectedSha256: commitment.expectedSha256 });

    this.#assertHash(commitment, materialized.actualSha256, commitment.materializer);
    await this.store.put(materialized.bytes, { kind, address, rematerialized:true });
    this.#event('recall', commitment, { source:commitment.materializer, rematerialized:true });
    return this.#result(commitment, materialized.bytes, commitment.materializer, materialized);
  }

  #assertHash(commitment, actual, source) {
    if (actual !== commitment.expectedSha256) {
      this.#event('mismatch', commitment, { actualSha256:actual, source });
      throw new ExactRecallError('HASH_MISMATCH', 'Materialized artifact does not match the artifact committed to this address', { expectedSha256:commitment.expectedSha256, actualSha256:actual, source, key:commitment.key });
    }
  }

  #result(commitment, bytes, source, materialized = null) {
    let files = null;
    if (commitment.kind === 'app' && commitment.materializer === 'foundry') {
      try { files = decodeFileBundle(bytes).files; } catch {}
    }
    return Object.freeze({ ok:true, exact:true, kind:commitment.kind, address:commitment.address, addressKey:commitment.addressKey, sha256:commitment.expectedSha256, source, bytes, files, materialized });
  }

  #event(type, commitment, details = {}) {
    this.events.push(Object.freeze({ type, key:commitment.key, sha256:commitment.expectedSha256, at:Date.now(), ...details }));
  }

  snapshot() {
    return Object.freeze({ schema:'synthia.exact-recall-runtime.v1', commitments:this.registry.snapshot().commitments.length, events:Object.freeze([...this.events]), vq:this.vq.snapshot() });
  }
}
export default ExactRecallRuntime;
