import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
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
// Owner-mediated teaching is disabled unless a long local token is configured.
const ownerToken = process.env.SYNTHIA_OWNER_TOKEN ?? '';
function ownerApproved(req) {
  const candidate = req.headers['x-synthia-owner-token'];
  if (ownerToken.length < 32 || typeof candidate !== 'string') return false;
  const supplied = Buffer.from(candidate, 'utf8');
  const expected = Buffer.from(ownerToken, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
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
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const swarm = await computer.automataGateway.snapshot();
        return json(res, 200, { ready: true, computer: 'SynthAI Computer', swarmProcesses: swarm.processCount, files: computer.vfs.list('/').length });
      }
      // Read-only resonance discovery + proposal path for the real local
      // Android Computer. Deliberately NO execution endpoint here: loopback
      // HTTP is not equivalent to verified owner authorization.
      if (req.method === 'GET' && url.pathname === '/api/resonance') {
        const discovery = await computer.discoverResonantSwarmCapabilities();
        return json(res, 200, { discovery, resonance: computer.resonance.snapshot() });
      }
      if (req.method === 'POST' && url.pathname === '/api/resonance/propose') {
        const request = await body(req);
        if (typeof request?.text !== 'string' || !request.text.trim() || request.text.length > 4000)
          throw new TypeError('A nonempty text request (max 4000 characters) is required.');
        await computer.discoverResonantSwarmCapabilities();
        return json(res, 200, await computer.publishResonanceSignal({
          type: 'request', text: request.text, domain: request.domain ?? null,
        }));
      }
      // Explicit dual model interfaces: semantic tools, learned language, and
      // owner-authorized supervised learning. No execution permissions granted.
      if (req.method === 'GET' && url.pathname === '/api/synthia/model')
        return json(res, 200, computer.synthia.languageModel.status());
      if (req.method === 'POST' && url.pathname === '/api/synthia/model/semantic') {
        const request = await body(req);
        return json(res, 200, await computer.synthia.languageModel.semantic.read(request.text));
      }
      if (req.method === 'POST' && url.pathname === '/api/synthia/model/generate') {
        const request = await body(req);
        return json(res, 200, await computer.synthia.languageModel.language.generate(request.text));
      }
      if (req.method === 'POST' && url.pathname === '/api/synthia/model/teach') {
        if (!ownerApproved(req)) return json(res, 403, { error: 'Owner training authorization required and must be configured locally.' });
        const request = await body(req);
        if (typeof request.accepted !== 'boolean') throw new TypeError('Explicit approved or rejected feedback required.');
        return json(res, 200, await computer.synthia.languageModel.language.teach({
          prompt: request.prompt, response: request.response, accepted: request.accepted,
          capability: request.capability ?? 'language-response', source: 'authenticated-local-owner',
        }));
      }

      // Non-sensitive resident health; learning graph and user utterances stay private.
      if (req.method === 'GET' && url.pathname === '/api/synthia/status')
        return json(res, 200, computer.synthia.status());
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
        const admitted = request.addressKey
          ? files.resolve(request.addressKey).find((entry) => entry.path === request.path) ?? files.resolve(request.addressKey)[0]
          : await files.write(`/home/user/Documents/${String(request.name ?? 'artifact').replaceAll('/', '_')}`, request.content, 'execution-intake');
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
