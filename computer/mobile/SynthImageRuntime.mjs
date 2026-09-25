/**
 * SynthImageRuntime — phone-safe .synthimg loader.
 *
 * Reuses synthctl FORMAT v1:
 *   magic(8) | version u8 | flags u32 LE | manifest_len u32 LE |
 *   payload_sha256(32) | manifest JSON | ustar payload
 *
 * Unlike synthctl-linux, this runtime does NOT use namespaces/pivot_root/cgroups.
 * It verifies the same image, unpacks web-capable payloads in-browser, stores
 * them in Cache Storage, and restores mutable state separately.
 */

const MAGIC = 'SYNTHIMG';
const HEADER_LEN = 49;
const FLAG_GZIP = 0x1;
const textDecoder = new TextDecoder();

const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

async function bytesFrom(source) {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (source?.arrayBuffer) return new Uint8Array(await source.arrayBuffer());
  throw new TypeError('Synth image source must be File, Blob, ArrayBuffer, or Uint8Array');
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto SHA-256 unavailable');
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function safePath(path) {
  const p = String(path || '').replaceAll('\\\\', '/').replace(/^\.\//, '');
  if (!p || p.startsWith('/') || p.split('/').includes('..')) return null;
  return p.replace(/\/{2,}/g, '/');
}

function readString(bytes, start, len) {
  const slice = bytes.subarray(start, start + len);
  const zero = slice.indexOf(0);
  return textDecoder.decode(zero >= 0 ? slice.subarray(0, zero) : slice).trim();
}

function parseOctal(s) {
  const clean = String(s || '').replace(/\0/g, '').trim();
  return clean ? parseInt(clean, 8) : 0;
}

async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This device does not expose DecompressionStream(gzip)');
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function parseUstar(bytes) {
  const files = new Map();
  let off = 0;
  while (off + 512 <= bytes.length) {
    const header = bytes.subarray(off, off + 512);
    if (header.every(b => b === 0)) break;

    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const path = safePath(prefix ? `${prefix}/${name}` : name);
    const size = parseOctal(readString(header, 124, 12));
    const type = String.fromCharCode(header[156] || 48);
    off += 512;

    if (!path) throw new Error(`unsafe path in synth image: ${prefix ? prefix + '/' : ''}${name}`);
    if (off + size > bytes.length) throw new Error(`truncated tar entry: ${path}`);

    if (type === '0' || type === '\0') {
      files.set(path, bytes.slice(off, off + size));
    }
    off += Math.ceil(size / 512) * 512;
  }
  return files;
}

export async function parseSynthImage(source) {
  const bytes = await bytesFrom(source);
  if (bytes.length < HEADER_LEN) throw new Error('synth image too small');
  const magic = textDecoder.decode(bytes.subarray(0, 8));
  if (magic !== MAGIC) throw new Error('not a .synthimg file (bad magic)');
  const version = bytes[8];
  if (version !== 1) throw new Error(`unsupported .synthimg version ${version}`);

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const flags = view.getUint32(9, true);
  const manifestLength = view.getUint32(13, true);
  const storedHash = bytes.slice(17, 49);
  const manifestStart = HEADER_LEN;
  const payloadStart = manifestStart + manifestLength;
  if (payloadStart > bytes.length) throw new Error('invalid synth manifest length');

  let manifest;
  try {
    manifest = JSON.parse(textDecoder.decode(bytes.subarray(manifestStart, payloadStart)));
  } catch (error) {
    throw new Error(`invalid synth manifest JSON: ${error?.message ?? error}`);
  }

  const storedPayload = bytes.slice(payloadStart);
  const actualHash = await sha256(storedPayload);
  if (hex(actualHash) !== hex(storedHash)) throw new Error('image payload sha256 mismatch');

  const payload = flags & FLAG_GZIP ? await gunzip(storedPayload) : storedPayload;
  const files = parseUstar(payload);
  const payloadSha256 = hex(actualHash);

  return Object.freeze({
    version,
    flags,
    compressed: Boolean(flags & FLAG_GZIP),
    manifest: Object.freeze(manifest),
    payloadSha256,
    storedPayloadBytes: storedPayload.byteLength,
    unpackedPayloadBytes: payload.byteLength,
    files,
  });
}

function mimeFor(path) {
  const p = path.toLowerCase();
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.wasm')) return 'application/wasm';
  if (p.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

function mobileEntry(manifest, files) {
  const explicit = manifest.mobile_entry ?? manifest.mobileEntry ?? manifest.web_entry ?? manifest.webEntry;
  if (explicit) {
    const p = safePath(String(explicit).replace(/^\//, ''));
    if (p && files.has(p)) return p;
  }
  const ep = Array.isArray(manifest.entrypoint) ? manifest.entrypoint[0] : manifest.entrypoint;
  if (typeof ep === 'string') {
    const p = safePath(ep.replace(/^\//, ''));
    if (p?.endsWith('.html') && files.has(p)) return p;
  }
  for (const candidate of ['index.html', 'app/index.html', 'public/index.html', 'dist/index.html']) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function residentEntry(manifest, files) {
  const explicit = manifest.resident_entry ?? manifest.residentEntry ?? manifest.runtime_entry ?? manifest.runtimeEntry;
  if (!explicit) return null;
  const p = safePath(String(explicit).replace(/^\//, ''));
  return p && files.has(p) ? p : null;
}

export class SynthImageRuntime {
  constructor({ state, bus, cacheName = 'synthimg-v1', routePrefix = '/__synthimg/' } = {}) {
    Object.assign(this, { state, bus, cacheName, routePrefix });
  }

  async registerServiceWorker(url = '/synthimg-sw.js') {
    if (!globalThis.navigator?.serviceWorker) return { supported: false };
    const registration = await navigator.serviceWorker.register(url, { type: 'classic' });
    await navigator.serviceWorker.ready;
    return { supported: true, registration };
  }

  async install(source, { appId = null } = {}) {
    const image = await parseSynthImage(source);
    const id = appId ?? image.manifest.id ?? image.manifest.name ?? `synthimg-${image.payloadSha256.slice(0, 12)}`;
    const key = encodeURIComponent(id);
    const entry = mobileEntry(image.manifest, image.files);
    const resident = residentEntry(image.manifest, image.files);
    if (!entry && !resident) {
      throw new Error('image verified, but no mobile/web HTML or resident runtime entrypoint was found');
    }

    if (!globalThis.caches) throw new Error('Cache Storage unavailable on this device');
    const cache = await caches.open(this.cacheName);
    const base = `${this.routePrefix}${image.payloadSha256}/`;
    for (const [path, data] of image.files) {
      const requestUrl = new URL(base + path, globalThis.location?.origin ?? 'https://synth.local').href;
      await cache.put(requestUrl, new Response(data, {
        headers: {
          'Content-Type': mimeFor(path),
          'X-Synth-Image': id,
          'X-Synth-Payload-SHA256': image.payloadSha256,
        }
      }));
    }

    const record = {
      id,
      name: image.manifest.name ?? id,
      version: image.manifest.version ?? '1',
      manifest: image.manifest,
      payloadSha256: image.payloadSha256,
      entry,
      residentEntry: resident,
      kind: resident && !entry ? 'resident' : entry && resident ? 'hybrid' : 'app',
      base,
      fileCount: image.files.size,
      storedPayloadBytes: image.storedPayloadBytes,
      unpackedPayloadBytes: image.unpackedPayloadBytes,
      lifecycle: 'warm',
      installedAt: Date.now(),
      lastCheckpoint: null,
    };
    await this.state?.set(`images.${key}`, record, { source: 'synthimg-runtime' });
    this.bus?.emit('synthimg:installed', record);
    return record;
  }

  get(appId) {
    return this.state?.get(`images.${encodeURIComponent(appId)}`, null) ?? null;
  }

  list() {
    return Object.values(this.state?.get('images', {}) ?? {}).filter(Boolean);
  }

  async setLifecycle(appId, lifecycle, extra = {}) {
    if (!['asleep', 'warm', 'active'].includes(lifecycle)) throw new Error('invalid lifecycle');
    const current = this.get(appId);
    if (!current) throw new Error(`unknown synth image: ${appId}`);
    const next = { ...current, ...structuredClone(extra), lifecycle, updatedAt: Date.now() };
    await this.state.set(`images.${encodeURIComponent(appId)}`, next, { source: 'synthimg-runtime' });
    this.bus?.emit('synthimg:lifecycle', { appId, lifecycle });
    return next;
  }

  async checkpoint(appId, { state = null, address = null, previewRef = null, memoryRef = null } = {}) {
    const checkpoint = {
      state: structuredClone(state),
      address: structuredClone(address),
      previewRef,
      memoryRef,
      savedAt: Date.now(),
    };
    return this.setLifecycle(appId, 'asleep', { lastCheckpoint: checkpoint });
  }

  async wake(appId, { full = false } = {}) {
    const record = await this.setLifecycle(appId, full ? 'active' : 'warm');
    return {
      record,
      checkpoint: record.lastCheckpoint,
      launchUrl: record.entry ? new URL(record.base + record.entry, globalThis.location?.origin ?? 'https://synth.local').href : null,
      residentModuleUrl: record.residentEntry ? new URL(record.base + record.residentEntry, globalThis.location?.origin ?? 'https://synth.local').href : null,
    };
  }
}

export const SYNTHIMG_FORMAT = Object.freeze({
  magic: MAGIC,
  version: 1,
  headerBytes: HEADER_LEN,
  gzipFlag: FLAG_GZIP,
});
