import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { FileAdmission } from '../services/file-admission.mjs';
import { readZipMembers } from './zip-members.mjs';

const root = resolve(fileURLToPath(new URL('../shell/kimi-linux/dist/', import.meta.url)));
const dataDir = resolve(process.env.SYNTHIA_DATA_DIR ?? fileURLToPath(new URL('../runtime/data/local-computer/', import.meta.url)));
const port = Number(process.env.SYNTHIA_PORT ?? 8765);
const host = '127.0.0.1';
// WebView and the resident Node service share a loopback origin. Reject foreign
// Host/Origin and cross-site Fetch Metadata before any API or file operation.
// This is a browser/DNS-rebinding boundary, not authentication for other local apps.
const allowedAuthorities = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const allowedOrigins = new Set([...allowedAuthorities].map(authority => `http://${authority}`));
function isLocalRequest(req) {
  const origin = req.headers.origin;
  const fetchSite = req.headers['sec-fetch-site'];
  return allowedAuthorities.has(req.headers.host)
    && (origin === undefined || allowedOrigins.has(origin))
    && (fetchSite === undefined || fetchSite === 'same-origin' || fetchSite === 'none');
}
await mkdir(dataDir, { recursive: true });
const computer = await new ComputerRuntime({
  persistence: new JsonFilePersistence(join(dataDir, 'state.json')),
  eventLogPath: join(dataDir, 'events.jsonl'),
}).boot();
const conversation = new ConversationExecution(computer);
const files = new FileAdmission(computer, conversation.execution);

// Import names are allocated before the first asynchronous write. This prevents
// an upload with the same filename from replacing an earlier user's original.
const activeImportPaths = new Set();
function reserveImportPath(originalName) {
  const dot = originalName.lastIndexOf('.');
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  const extension = dot > 0 ? originalName.slice(dot) : '';
  for (let copy = 1; copy <= 10000; copy++) {
    const name = copy === 1 ? originalName : `${stem} (${copy})${extension}`;
    const path = `/home/user/Imports/${name}`;
    const members = name.toLowerCase().endsWith('.zip')
      ? `/home/user/Imports/${name.slice(0, -4)}/` : null;
    if (activeImportPaths.has(path) || computer.vfs.read(path)) continue;
    if (members && (activeImportPaths.has(members) || computer.vfs.list(members).length)) continue;
    activeImportPaths.add(path);
    if (members) activeImportPaths.add(members);
    return { name, path, members, release() {
      activeImportPaths.delete(path);
      if (members) activeImportPaths.delete(members);
    } };
  }
  throw new RangeError('Import name collision limit reached.');
}

// Execution requests without an existing address are new admissions, not editor saves.
// Reserve a unique Documents path before any asynchronous write so concurrent
// requests cannot replace an earlier source under the same user-facing name.
const activeExecutionPaths = new Set();
function reserveExecutionPath(originalName) {
  const safeName = String(originalName ?? 'artifact').split(/[\\/]/).at(-1).replace(/[^\w. -]/g, '_');
  if (!safeName || safeName === '.' || safeName === '..') throw new TypeError('Invalid execution artifact name.');
  const dot = safeName.lastIndexOf('.');
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  const extension = dot > 0 ? safeName.slice(dot) : '';
  for (let copy = 1; copy <= 10000; copy++) {
    const name = copy === 1 ? safeName : `${stem} (${copy})${extension}`;
    const path = `/home/user/Documents/${name}`;
    if (activeExecutionPaths.has(path) || computer.vfs.read(path)) continue;
    activeExecutionPaths.add(path);
    return { path, release() { activeExecutionPaths.delete(path); } };
  }
  throw new RangeError('Execution artifact name collision limit reached.');
}

async function ingestUpload({ name, base64 }) {
  if (typeof name !== 'string' || !name || typeof base64 !== 'string' || base64.length > 8000000) throw new TypeError('A named file of at most 6 MB is required.');
  const safeName = name.split(/[\\/]/).at(-1).replace(/[^\w. -]/g, '_');
  if (!safeName || safeName === '.' || safeName === '..') throw new TypeError('Invalid file name.');
  const bytes = Buffer.from(base64, 'base64');
  const asText = (buffer) => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer).includes('\0') ? null : new TextDecoder().decode(buffer); }
    catch { return null; }
  };
  const save = async (path, buffer, source) => {
    const text = asText(buffer);
    const record = await files.write(path, text === null ? buffer.toString('base64') : text, source, text === null ? 'base64' : 'utf8');
    return { path: record.path, address: record.meta.address, addressKey: record.meta.addressKey, digest: record.meta.digest, encoding: record.meta.encoding, size: buffer.length, dna: record.meta.dna };
  };
  const reservation = reserveImportPath(safeName);
  try {
    const archive = await save(reservation.path, bytes, 'file-import');
    if (!reservation.members) {
      await files.mirrorImported([archive]);
      return { items: [archive] };
    }
    const items = [archive];
    for (const { name: entry, content } of readZipMembers(bytes)) {
      items.push(await save(`${reservation.members}${entry}`, content, `archive:${archive.addressKey}`));
    }
    await files.mirrorImported(items);
    return { items };
  } finally {
    reservation.release();
  }
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  let text = '';
  for await (const part of req) {
    text += part;
    if (text.length > 8500000) throw new RangeError('Request is too large.');
  }
  return JSON.parse(text);
}

const server = createServer(async (req, res) => {
  try {
    if (!isLocalRequest(req)) return json(res, 403, { error: 'Computer requests must use its local origin.' });
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const swarm = await computer.automataGateway.snapshot();
        return json(res, 200, { ready: true, computer: 'SynthAI Computer', swarmProcesses: swarm.processCount, files: computer.vfs.list('/').length });
      }
      if (req.method === 'GET' && url.pathname === '/api/history') return json(res, 200, conversation.history());
      if (req.method === 'POST' && url.pathname === '/api/chat') return json(res, 200, await conversation.talk((await body(req)).text));
      if (req.method === 'GET' && url.pathname === '/api/filesystem') return json(res, 200, computer.state.get('computer.desktop.filesystem', null));
      if (req.method === 'PUT' && url.pathname === '/api/filesystem') {
        const filesystem = await body(req);
        return json(res, 200, await files.admitDesktop(filesystem));
      }
      if (req.method === 'GET' && url.pathname === '/api/resolve-file') {
        const matches = files.resolve(url.searchParams.get('address') ?? '');
        return json(res, 200, matches.map(({ path, meta }) => ({ path, address: meta.address, digest: meta.digest, dna: meta.dna })));
      }
      if (req.method === 'GET' && url.pathname === '/api/files') return json(res, 200, computer.vfs.list('/').map(({ content, ...record }) => record));
      if (req.method === 'GET' && url.pathname === '/api/activate-file') {
        return json(res, 200, await files.activate(url.searchParams.get('address') ?? '', url.searchParams.get('path') ?? ''));
      }
      if (req.method === 'POST' && url.pathname === '/api/ingest') return json(res, 200, await ingestUpload(await body(req)));
      if (req.method === 'PUT' && url.pathname === '/api/files') {
        const { path, content } = await body(req);
        return json(res, 200, await files.write(path, content, 'kimi-linux-file'));
      }
      if (req.method === 'POST' && url.pathname === '/api/execute') {
        const request = await body(req);
        let admitted;
        if (request.addressKey) {
          const matches = files.resolve(request.addressKey);
          admitted = request.path ? matches.find((entry) => entry.path === request.path) : matches[0];
        } else {
          const reservation = reserveExecutionPath(request.name);
          try { admitted = await files.write(reservation.path, request.content, 'execution-intake'); }
          finally { reservation.release(); }
        }
        if (!admitted) throw new TypeError('No artifact found at that state-space address.');
        const artifact = await files.activate(admitted.meta.addressKey, admitted.path);
        if (artifact.meta.encoding === 'base64') throw new TypeError('Binary artifacts cannot be executed as text.');
        return json(res, 200, await conversation.executeArtifact({ name: artifact.path.split('/').at(-1), type: request.type, content: artifact.content }));
      }
      return json(res, 404, { error: 'Unknown computer operation.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const path = resolve(root, '.' + requested);
    if (path !== root && !path.startsWith(root + sep)) return json(res, 403, { error: 'Invalid path.' });
    const target = (await stat(path).catch(() => null))?.isFile() ? path : join(root, 'index.html');
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    const code = error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
    json(res, code, { error: String(error?.message ?? error) });
  }
});
server.listen(port, host, () => console.log(`Synthia Computer ready at http://${host}:${port}`));
