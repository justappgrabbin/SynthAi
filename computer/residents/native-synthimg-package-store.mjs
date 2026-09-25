import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';

const MAGIC = 'SYNTHIMG';
const HEADER_LEN = 49;
const FLAG_GZIP = 0x1;

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function safePath(value) {
  const normalized = String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) return null;
  return normalized.replace(/\/{2,}/g, '/');
}

function readString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const zero = slice.indexOf(0);
  return (zero >= 0 ? slice.subarray(0, zero) : slice).toString('utf8').trim();
}

function parseOctal(value) {
  const clean = String(value ?? '').replace(/\0/g, '').trim();
  return clean ? Number.parseInt(clean, 8) : 0;
}

async function hashRange(filePath, start = 0) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath, { start })) hash.update(chunk);
  return hash.digest('hex');
}

async function parseHeader(filePath) {
  const handle = await open(filePath, 'r');
  try {
    const head = Buffer.alloc(HEADER_LEN);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    if (bytesRead !== HEADER_LEN) throw new Error('synth image too small');
    if (head.subarray(0, 8).toString('utf8') !== MAGIC) throw new Error('not a .synthimg file (bad magic)');
    const version = head[8];
    if (version !== 1) throw new Error(`unsupported .synthimg version ${version}`);
    const flags = head.readUInt32LE(9);
    const manifestLength = head.readUInt32LE(13);
    const storedPayloadSha256 = head.subarray(17, 49).toString('hex');
    if (manifestLength < 2 || manifestLength > 4 * 1024 * 1024) throw new Error('invalid synth manifest length');
    const manifestBytes = Buffer.alloc(manifestLength);
    const read = await handle.read(manifestBytes, 0, manifestLength, HEADER_LEN);
    if (read.bytesRead !== manifestLength) throw new Error('truncated synth manifest');
    let manifest;
    try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
    catch (error) { throw new Error(`invalid synth manifest JSON: ${error?.message ?? error}`); }
    return { version, flags, manifestLength, storedPayloadSha256, manifest, payloadStart: HEADER_LEN + manifestLength };
  } finally {
    await handle.close();
  }
}

async function extractUstar(tarPath, destination) {
  const handle = await open(tarPath, 'r');
  const tarStat = await stat(tarPath);
  let position = 0;
  let files = 0;
  let bytes = 0;
  try {
    while (position + 512 <= tarStat.size) {
      const header = Buffer.alloc(512);
      const read = await handle.read(header, 0, 512, position);
      if (read.bytesRead !== 512) throw new Error('truncated tar header');
      if (header.every(byte => byte === 0)) break;
      const name = readString(header, 0, 100);
      const prefix = readString(header, 345, 155);
      const relative = safePath(prefix ? `${prefix}/${name}` : name);
      if (!relative) throw new Error(`unsafe path in synth image: ${prefix ? prefix + '/' : ''}${name}`);
      const size = parseOctal(readString(header, 124, 12));
      const type = String.fromCharCode(header[156] || 48);
      const dataStart = position + 512;
      const dataEnd = dataStart + size;
      if (dataEnd > tarStat.size) throw new Error(`truncated tar entry: ${relative}`);
      const output = path.join(destination, relative);
      if (type === '0' || type === '\0') {
        await mkdir(path.dirname(output), { recursive: true });
        if (size === 0) {
          const empty = createWriteStream(output, { mode: 0o600 });
          empty.end();
          await new Promise((resolve, reject) => { empty.on('finish', resolve); empty.on('error', reject); });
        } else {
          await pipeline(
            createReadStream(tarPath, { start: dataStart, end: dataEnd - 1 }),
            createWriteStream(output, { mode: 0o600 }),
          );
        }
        files += 1;
        bytes += size;
      } else if (type === '5') {
        await mkdir(output, { recursive: true });
      } else {
        throw new Error(`unsupported tar entry type ${JSON.stringify(type)} for ${relative}`);
      }
      position = dataStart + Math.ceil(size / 512) * 512;
    }
  } finally {
    await handle.close();
  }
  return { files, bytes };
}

function stateKey(id) { return `residentImages.${encodeURIComponent(String(id))}`; }

export class NativeSynthImagePackageStore {
  constructor({
    state,
    bus = null,
    root = path.join(os.homedir(), '.synthai', 'resident-images'),
    maxBytes = 512 * 1024 * 1024,
  } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('NativeSynthImagePackageStore requires StateStore');
    Object.assign(this, { state, bus, root, maxBytes });
  }

  get(id) { return this.state.get(stateKey(id), null); }
  list() { return Object.values(this.state.get('residentImages', {}) ?? {}).filter(Boolean).map(record => this.#public(record)); }

  async installSynthImageStream(readable, { contentLength = null, source = 'resident-image-upload' } = {}) {
    if (contentLength != null && Number(contentLength) > this.maxBytes) throw new Error(`resident image exceeds ${this.maxBytes} bytes`);
    await mkdir(path.join(this.root, 'archives'), { recursive: true });
    await mkdir(path.join(this.root, 'installed'), { recursive: true });
    const provisional = path.join(this.root, 'archives', `incoming-${Date.now()}.synthimg`);
    const archiveHash = createHash('sha256');
    let byteLength = 0;
    const maxBytes = this.maxBytes;
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        byteLength += chunk.length;
        if (byteLength > maxBytes) return callback(new Error(`resident image exceeds ${maxBytes} bytes`));
        archiveHash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(readable, meter, createWriteStream(provisional, { mode: 0o600 }));

    const archiveSha256 = archiveHash.digest('hex');
    const header = await parseHeader(provisional);
    const payloadSha256 = await hashRange(provisional, header.payloadStart);
    if (payloadSha256 !== header.storedPayloadSha256) {
      await rm(provisional, { force: true });
      throw new Error('image payload sha256 mismatch');
    }
    const manifest = header.manifest ?? {};
    const id = String(manifest.id ?? manifest.name ?? `resident-${payloadSha256.slice(0, 12)}`);
    const residentType = String(manifest.resident_type ?? manifest.residentType ?? '');
    const residentEntry = safePath(manifest.resident_entry ?? manifest.residentEntry ?? manifest.runtime_entry ?? manifest.runtimeEntry);
    if (!residentType || !residentEntry) {
      await rm(provisional, { force: true });
      throw new Error('resident image requires resident_type and resident_entry');
    }

    const archive = path.join(this.root, 'archives', `${archiveSha256}.synthimg`);
    if (!(await exists(archive))) await rename(provisional, archive);
    else await rm(provisional, { force: true });

    const installDir = path.join(this.root, 'installed', payloadSha256);
    if (!(await exists(installDir))) {
      await mkdir(installDir, { recursive: true });
      const tarPath = path.join(this.root, 'archives', `${payloadSha256}.payload.tar`);
      try {
        const payloadStream = createReadStream(archive, { start: header.payloadStart });
        if (header.flags & FLAG_GZIP) await pipeline(payloadStream, createGunzip(), createWriteStream(tarPath, { mode: 0o600 }));
        else await pipeline(payloadStream, createWriteStream(tarPath, { mode: 0o600 }));
        await extractUstar(tarPath, installDir);
      } catch (error) {
        await rm(installDir, { recursive: true, force: true });
        throw error;
      } finally {
        await rm(tarPath, { force: true });
      }
    }

    const residentEntryPath = path.join(installDir, residentEntry);
    if (!(await exists(residentEntryPath))) throw new Error(`resident entry missing after extraction: ${residentEntry}`);
    const mobileEntry = safePath(manifest.mobile_entry ?? manifest.mobileEntry ?? manifest.web_entry ?? manifest.webEntry);
    const record = {
      installed: true,
      id,
      name: String(manifest.name ?? id),
      version: String(manifest.version ?? '1'),
      residentType,
      residentEntry,
      mobileEntry: mobileEntry ?? null,
      manifest,
      archiveSha256,
      payloadSha256,
      byteLength,
      archive,
      base: installDir,
      residentEntryPath,
      source: String(source),
      installedAt: Date.now(),
      preservation: 'archive-and-whole-extracted-image-retained',
    };
    await this.state.set(stateKey(id), record, { source: 'native-synthimg-package-store' });
    this.bus?.emit('resident-image:installed', this.#public(record));
    return record;
  }

  async verify(idOrRecord) {
    const record = typeof idOrRecord === 'string' ? this.get(idOrRecord) : idOrRecord;
    if (!record?.base || !record?.residentEntry) return { installed: false, reason: 'NO_PACKAGE' };
    const residentEntryPath = path.join(record.base, record.residentEntry);
    const ok = await exists(residentEntryPath);
    return { installed: ok, record: ok ? record : null, reason: ok ? null : 'RESIDENT_ENTRY_MISSING' };
  }

  #public(record) {
    if (!record) return null;
    return {
      installed: true,
      id: record.id,
      name: record.name,
      version: record.version,
      residentType: record.residentType,
      residentEntry: record.residentEntry,
      mobileEntry: record.mobileEntry,
      archiveSha256: record.archiveSha256,
      payloadSha256: record.payloadSha256,
      byteLength: record.byteLength,
      source: record.source,
      installedAt: record.installedAt,
      preservation: record.preservation,
    };
  }
}

export default NativeSynthImagePackageStore;
