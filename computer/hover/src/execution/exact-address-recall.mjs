import { createHash } from 'node:crypto';
import {
  validateCanonicalAddress,
  canonicalAddressKey,
} from '../../vendor/execution-spine-v0.4.0/src/canonical-address.mjs';
import { stableStringify } from '../util.mjs';

const encoder = new TextEncoder();

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function asBytes(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (typeof value === 'string') return encoder.encode(value);
  return encoder.encode(stableStringify(value));
}

function canonicalFileBundle(files = []) {
  const normalized = [...files]
    .map((file) => ({
      path: String(file.path),
      type: String(file.type ?? 'text/plain'),
      content: String(file.content ?? ''),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { bytes: encoder.encode(stableStringify(normalized)), value: Object.freeze(normalized) };
}

/**
 * Integration-native implementation of the supplied Exact Address Recall
 * contract. The donor patch is preserved untouched; this adapter uses the
 * execution spine's protected `arcAxis` field instead of weakening it to the
 * donor overlay's incompatible `arc` spelling.
 */
export class ExactAddressRecall {
  constructor({ engine = null, appRegistry = null } = {}) {
    this.engine = engine;
    this.appRegistry = appRegistry;
    this.commitments = new Map();
    this.content = new Map();
    this.history = [];
    this.sequence = 0;
  }

  #commit(address, kind, material, { provenance = [], recipe = null, supersede = false } = {}) {
    validateCanonicalAddress(address);
    if (!['tool', 'app'].includes(kind)) throw new RangeError(`unsupported exact-recall kind: ${kind}`);
    const addressKey = canonicalAddressKey(address);
    const bytes = asBytes(material.bytes);
    const contentHash = sha256(bytes);
    const key = `${kind}:${addressKey}`;
    const prior = this.commitments.get(key) ?? null;
    if (prior && prior.contentHash !== contentHash && !supersede) {
      const error = new Error('ADDRESS_CONFLICT: exact address already commits different bytes');
      error.code = 'ADDRESS_CONFLICT';
      throw error;
    }
    const sequence = ++this.sequence;
    const record = Object.freeze({
      id: `exact-commit-${String(sequence).padStart(4, '0')}`,
      sequence,
      kind,
      address: structuredClone(address),
      addressKey,
      contentHash,
      byteLength: bytes.byteLength,
      representation: material.representation,
      value: material.value == null ? null : structuredClone(material.value),
      recipe: recipe == null ? null : structuredClone(recipe),
      provenance: Object.freeze([
        { type: 'authority', value: 'SynthAI-Exact-Address-Recall-PATCH.zip' },
        { type: 'schema-adaptation', value: 'arc -> protected canonical arcAxis' },
        ...structuredClone(provenance),
      ]),
      supersedes: prior?.id ?? null,
    });
    this.content.set(contentHash, bytes);
    this.commitments.set(key, record);
    this.history.push(Object.freeze({ operation: 'commit', record }));
    return record;
  }

  commitTool(address, request, options = {}) {
    const toolId = typeof request === 'string' ? request : request?.toolId ?? request?.id;
    const tool = toolId ? this.engine?.mesh?.get(toolId) : null;
    if (!tool) throw new Error(`unknown live ATO/tool: ${toolId ?? 'unspecified'}`);
    const exported = {
      id: tool.id,
      capabilities: [...(tool.capabilities ?? [])],
      registry: tool.constructor?.registry ?? null,
      source: 'live-synthia-mesh',
    };
    return this.#commit(address, 'tool', {
      bytes: stableStringify(exported),
      value: exported,
      representation: 'deterministic-tool-export',
    }, {
      ...options,
      recipe: { type: 'mesh-tool', toolId: tool.id },
    });
  }

  commitApp(address, input = {}, options = {}) {
    if (input.bytes != null || input.binary != null) {
      const bytes = asBytes(input.bytes ?? input.binary);
      return this.#commit(address, 'app', {
        bytes,
        value: null,
        representation: 'literal-binary',
      }, options);
    }
    if (Array.isArray(input.files)) {
      const bundle = canonicalFileBundle(input.files);
      return this.#commit(address, 'app', {
        ...bundle,
        representation: 'canonical-file-set',
      }, options);
    }
    const app = this.appRegistry?.resolve(input);
    if (!app) throw new Error('app commitment requires literal bytes, a file set, or a registered app');
    const exported = {
      id: app.id,
      name: app.name,
      aliases: [...app.aliases],
      kind: app.kind,
      singlePlayer: app.singlePlayer,
      backendRequired: app.backendRequired,
      capabilities: [...app.capabilities],
      address: app.address,
      provenance: app.provenance,
    };
    return this.#commit(address, 'app', {
      bytes: stableStringify(exported),
      value: exported,
      representation: 'registered-app-recipe',
    }, {
      ...options,
      recipe: { type: 'registered-app', appId: app.id },
    });
  }

  recall(address, { kind = null } = {}) {
    validateCanonicalAddress(address);
    const addressKey = canonicalAddressKey(address);
    const kinds = kind ? [kind] : ['tool', 'app'];
    const commitment = kinds.map((candidate) => this.commitments.get(`${candidate}:${addressKey}`)).find(Boolean);
    if (!commitment) {
      const error = new Error('EXACT_ADDRESS_NOT_COMMITTED');
      error.code = 'EXACT_ADDRESS_NOT_COMMITTED';
      throw error;
    }
    const bytes = this.content.get(commitment.contentHash);
    if (!bytes || sha256(bytes) !== commitment.contentHash) {
      const error = new Error('HASH_MISMATCH: exact recall failed closed');
      error.code = 'HASH_MISMATCH';
      throw error;
    }
    const sequence = ++this.sequence;
    const recalled = Object.freeze({
      ok: true,
      exact: true,
      sequence,
      kind: commitment.kind,
      address: structuredClone(commitment.address),
      addressKey,
      contentHash: commitment.contentHash,
      byteLength: bytes.byteLength,
      representation: commitment.representation,
      value: commitment.value == null ? null : structuredClone(commitment.value),
      bytes: new Uint8Array(bytes),
      commitmentId: commitment.id,
    });
    this.history.push(Object.freeze({ operation: 'recall', commitmentId: commitment.id, sequence }));
    return recalled;
  }

  recognize() {
    return Object.freeze({ recognized: true, authoritative: false, recallPermitted: false });
  }

  snapshot() {
    return Object.freeze({
      commitments: this.commitments.size,
      contentObjects: this.content.size,
      history: this.history.length,
      schemaField: 'arcAxis',
      failClosed: true,
      overwritePolicy: 'explicit-supersession-only',
      donorAuthorityPreserved: true,
    });
  }
}

export default ExactAddressRecall;
