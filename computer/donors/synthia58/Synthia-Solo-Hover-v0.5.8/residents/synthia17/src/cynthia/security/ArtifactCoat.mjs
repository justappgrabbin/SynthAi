const clone = value => structuredClone(value);
const encoder = new TextEncoder();
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
export async function sha256(value) { return hex(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value)); }

export class ArtifactCoat {
  constructor({ trustedKeyIds = [] } = {}) { this.trustedKeyIds = new Set(trustedKeyIds); }
  async generateIdentity() {
    const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const keyId = (await sha256(stableStringify(publicKey))).slice(0, 24);
    return Object.freeze({ keyId, publicKey, privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey) });
  }
  async wrap({ content, manifest, identity, parentCoatHash = null, mutations = [] }) {
    const contentText = typeof content === 'string' ? content : stableStringify(content);
    const contentHash = await sha256(contentText), manifestHash = await sha256(stableStringify(manifest));
    const unsigned = { version: 'cynthia-coat/portable-1', contentHash, manifestHash, parentCoatHash, signerKeyId: identity.keyId, signerPublicKey: identity.publicKey, manifest: clone(manifest), mutations: clone(mutations) };
    const privateKey = await crypto.subtle.importKey('jwk', identity.privateKey, { name: 'Ed25519' }, false, ['sign']);
    const signature = hex(await crypto.subtle.sign('Ed25519', privateKey, encoder.encode(stableStringify(unsigned))));
    return Object.freeze({ ...unsigned, signature, coatHash: await sha256(stableStringify(unsigned) + signature) });
  }
  async verify(coat, content) {
    const { signature, coatHash, ...unsigned } = coat;
    const publicKey = await crypto.subtle.importKey('jwk', coat.signerPublicKey, { name: 'Ed25519' }, false, ['verify']);
    const signatureBytes = Uint8Array.from(signature.match(/../g) ?? [], part => Number.parseInt(part, 16));
    const signatureValid = await crypto.subtle.verify('Ed25519', publicKey, signatureBytes, encoder.encode(stableStringify(unsigned)));
    const contentText = typeof content === 'string' ? content : stableStringify(content);
    const result = { signatureValid, contentValid: coat.contentHash === await sha256(contentText), manifestValid: coat.manifestHash === await sha256(stableStringify(coat.manifest)), coatHashValid: coatHash === await sha256(stableStringify(unsigned) + signature), trustedSigner: this.trustedKeyIds.has(coat.signerKeyId) };
    return Object.freeze({ ...result, valid: result.signatureValid && result.contentValid && result.manifestValid && result.coatHashValid, decision: result.signatureValid && result.contentValid && result.manifestValid && result.coatHashValid ? (result.trustedSigner ? 'allow' : 'quarantine') : 'reject' });
  }
}
