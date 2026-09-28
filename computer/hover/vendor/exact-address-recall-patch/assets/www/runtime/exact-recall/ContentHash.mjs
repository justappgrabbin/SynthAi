const encoder = new TextEncoder();

export function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return encoder.encode(value);
  throw new TypeError('Exact artifact content must be text, ArrayBuffer, or Uint8Array');
}

export async function sha256Hex(value) {
  const bytes = asBytes(value);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  if (typeof process !== 'undefined' && process?.versions?.node) {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(bytes).digest('hex');
  }
  throw new Error('SHA-256 unavailable in this residence');
}

export function stableJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
}

export function canonicalizeFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) throw new TypeError('app files are required');
  const seen = new Set();
  return files.map(file => {
    const path = String(file?.path || '').replace(/^\/+/, '').replace(/\\/g, '/');
    if (!path || path.includes('../')) throw new TypeError(`invalid app file path: ${path || '(empty)'}`);
    if (seen.has(path)) throw new TypeError(`duplicate app file path: ${path}`);
    seen.add(path);
    if (typeof file.content !== 'string') throw new TypeError(`app file ${path} must have exact text content`);
    return Object.freeze({ path, content: file.content, type: file.type ? String(file.type) : null });
  }).sort((a, b) => a.path.localeCompare(b.path));
}

export function encodeFileBundle(files) {
  const normalized = canonicalizeFiles(files);
  return encoder.encode(stableJSON({ format: 'synthia.exact-app-bundle.v1', files: normalized }));
}

export function decodeFileBundle(bytes) {
  const parsed = JSON.parse(new TextDecoder().decode(asBytes(bytes)));
  if (parsed?.format !== 'synthia.exact-app-bundle.v1' || !Array.isArray(parsed.files)) {
    throw new TypeError('invalid exact app bundle');
  }
  return Object.freeze({ format: parsed.format, files: Object.freeze(canonicalizeFiles(parsed.files)) });
}
