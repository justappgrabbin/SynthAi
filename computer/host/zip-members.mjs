import { inflateRawSync } from 'node:zlib';

/** Read ZIP central directory entries without relying on an OS unzip command. */
export function readZipMembers(bytes, { maxEntries = 200, maxMemberBytes = 600000, maxTotalBytes = 6000000 } = {}) {
  const data = Buffer.from(bytes);
  const end = data.length - 22;
  let eocd = -1;
  for (let at = end; at >= Math.max(0, end - 65535); at--) {
    if (data.readUInt32LE(at) === 0x06054b50 && at + 22 + data.readUInt16LE(at + 20) === data.length) { eocd = at; break; }
  }
  if (eocd < 0) throw new TypeError('Invalid ZIP central directory.');
  if (data.readUInt16LE(eocd + 4) || data.readUInt16LE(eocd + 6)) throw new TypeError('Multi-disk ZIP is unsupported.');
  const count = data.readUInt16LE(eocd + 10);
  if (count > maxEntries) throw new RangeError('Archive has more than 200 entries.');
  let at = data.readUInt32LE(eocd + 16);
  const endDirectory = at + data.readUInt32LE(eocd + 12);
  if (endDirectory > eocd) throw new TypeError('Invalid ZIP directory extent.');
  const members = [];
  const paths = new Set();
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > endDirectory || data.readUInt32LE(at) !== 0x02014b50) throw new TypeError('Invalid ZIP entry.');
    const flags = data.readUInt16LE(at + 8);
    const method = data.readUInt16LE(at + 10);
    const compressed = data.readUInt32LE(at + 20);
    const expanded = data.readUInt32LE(at + 24);
    const nameBytes = data.readUInt16LE(at + 28);
    const extraBytes = data.readUInt16LE(at + 30);
    const commentBytes = data.readUInt16LE(at + 32);
    const local = data.readUInt32LE(at + 42);
    const next = at + 46 + nameBytes + extraBytes + commentBytes;
    if (next > endDirectory || (flags & 1) || ![0, 8].includes(method) || [compressed, expanded, local].includes(0xffffffff)) throw new TypeError('Unsupported ZIP entry.');
    const name = data.subarray(at + 46, at + 46 + nameBytes).toString('utf8');
    at = next;
    if (name.endsWith('/')) continue;
    const parts = name.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..') || name.startsWith('/') || name.includes('\\') || name.includes('\0')) throw new TypeError('Unsafe ZIP path.');
    if (paths.has(name)) throw new TypeError('Duplicate ZIP path.');
    paths.add(name);
    total += expanded;
    if (expanded > maxMemberBytes || total > maxTotalBytes) throw new RangeError('ZIP content exceeds the file limit.');
    if (local + 30 > data.length || data.readUInt32LE(local) !== 0x04034b50) throw new TypeError('Invalid ZIP local entry.');
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    if (start + compressed > data.length) throw new TypeError('Truncated ZIP member.');
    const encoded = data.subarray(start, start + compressed);
    const content = method === 0 ? encoded : inflateRawSync(encoded, { maxOutputLength: maxMemberBytes });
    if (content.length !== expanded) throw new TypeError('ZIP expanded size mismatch.');
    members.push({ name, content });
  }
  return members;
}
