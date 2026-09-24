import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { FilePersistence } from './file-persistence.mjs';

const HOST = process.env.SYNTHAI_LOCAL_HOST || '127.0.0.1';
const PORT = Number(process.env.SYNTHAI_LOCAL_PORT || 17380);
const TOKEN = process.env.SYNTHAI_LOCAL_TOKEN || '';
const STATE_DIR = resolve(process.env.SYNTHAI_STATE_DIR || '/var/lib/synthai');
const EVENT_LOG = resolve(process.env.SYNTHAI_EVENT_LOG || (STATE_DIR + '/events.ndjson'));
const ALLOW_UNAUTHENTICATED = process.env.SYNTHAI_ALLOW_UNAUTHENTICATED_LOCAL === '1';
const MAX_BODY = 4 * 1024 * 1024;

if (!TOKEN && !ALLOW_UNAUTHENTICATED) {
  throw new Error('SYNTHAI_LOCAL_TOKEN is required for the local Computer backend');
}

await mkdir(STATE_DIR, { recursive: true });

const runtime = await new ComputerRuntime({
  persistence: new FilePersistence(STATE_DIR),
  namespace: 'synthai-computer-local',
  eventLogPath: EVENT_LOG
}).boot();

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin === 'https://appassets.androidplatform.net' || origin === 'http://127.0.0.1' || origin === 'http://localhost') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-SynthAI-Local-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

function authorized(req) {
  if (ALLOW_UNAUTHENTICATED && !TOKEN) return true;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const header = String(req.headers['x-synthai-local-token'] || '');
  return Boolean(TOKEN) && (bearer === TOKEN || header === TOKEN);
}

function json(res, code, value) {
  const body = JSON.stringify(value);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('request body too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const calls = new Map([
  ['snapshot', () => runtime.snapshot()],
  ['queryCapability', args => runtime.queryCapability(...args)],
  ['route', args => runtime.route(...args)],
  ['resolveAddress', args => runtime.resolveAddress(...args)],
  ['compareAddresses', args => runtime.compareAddresses(...args)],
  ['resolveRelationship', args => runtime.resolveRelationship(...args)],
  ['resolveState', args => runtime.resolveState(...args)],
  ['emitEvent', args => runtime.emitEvent(...args)],
  ['executeOnSwarm', args => runtime.executeOnSwarm(...args)],
  ['worldEvent', args => runtime.worldEvent(...args)],
  ['observeWorld', () => runtime.observeWorld()],
  ['groupPenta', args => runtime.groupPenta(...args)],
  ['project.create', args => runtime.projects.create(args[0] || {})],
  ['project.get', args => runtime.projects.get(args[0])],
  ['project.list', () => runtime.projects.list()],
  ['project.writeFile', args => runtime.projects.writeFile(...args)],
  ['project.readFile', args => runtime.projects.readFile(...args)],
  ['project.listFiles', args => runtime.projects.listFiles(...args)],
  ['project.snapshot', args => runtime.projects.snapshot(...args)],
  ['mountApplication', args => runtime.mountApplication(...args)]
]);

const server = createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (!authorized(req)) {
    return json(res, 401, { ok: false, error: { name: 'Unauthorized', message: 'local Computer token required' } });
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'synthai-computer-local-backend',
        environment: 'linux-local',
        version: '0.4.0-local-backend',
        node: process.version,
        host: HOST,
        state_dir: STATE_DIR,
        services: runtime.services.list().map(item => item.id),
        methods: [...calls.keys()]
      });
    }

    if (req.method === 'POST' && req.url === '/rpc') {
      const body = await readJson(req);
      const method = String(body.method || '');
      const fn = calls.get(method);
      if (!fn) return json(res, 404, { ok: false, error: { name: 'UnknownMethod', message: 'unsupported RPC method: ' + method } });
      const args = Array.isArray(body.args) ? body.args : [];
      const result = await fn(args);
      return json(res, 200, { ok: true, result });
    }

    return json(res, 404, { ok: false, error: { name: 'NotFound', message: 'route not found' } });
  } catch (error) {
    const status = Number(error && error.statusCode) || 500;
    return json(res, status, {
      ok: false,
      error: {
        name: String(error && error.name || 'Error'),
        message: String(error && error.message || error)
      }
    });
  }
});

server.on('error', error => {
  console.error('SYNTHAI_LOCAL_BACKEND_ERROR ' + String(error && error.stack || error));
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : PORT;
  console.log('SYNTHAI_LOCAL_BACKEND_READY ' + JSON.stringify({
    host: HOST,
    port: actualPort,
    environment: 'linux-local',
    version: '0.4.0-local-backend'
  }));
});

const stop = signal => {
  console.log('SYNTHAI_LOCAL_BACKEND_STOP ' + signal);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
