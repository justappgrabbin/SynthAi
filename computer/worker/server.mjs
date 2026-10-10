import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { JobStore } from './store.mjs';

const token = process.env.RELAY_API_TOKEN;
if (!token || token.length < 32) throw new Error('RELAY_API_TOKEN must contain at least 32 characters');
const directory = resolve(process.env.RELAY_DATA_DIR || './relay-data');
const store = await new JobStore(join(directory, 'jobs')).init();
let child, timer, stopping = false;
function startWorker() {
  child = spawn(process.execPath, [fileURLToPath(new URL('./worker-main.mjs', import.meta.url))], { stdio: 'inherit', env: { ...process.env, RELAY_API_TOKEN: '', RELAY_DATA_DIR: directory } });
  child.on('exit', () => { if (!stopping) timer = setTimeout(startWorker, 1000); });
}
if (process.env.RELAY_NO_WORKER !== '1') startWorker();
const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const allowed = new Set((process.env.RELAY_ALLOWED_ORIGINS || 'https://relay.local').split(','));
  if (origin && allowed.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json');
  const reply = (status, value) => { response.statusCode = status; response.end(JSON.stringify(value)); };
  if (request.method === 'GET' && request.url === '/health') return reply(child && child.exitCode === null ? 200 : 503, { ok: Boolean(child && child.exitCode === null) });
  if (origin && !allowed.has(origin)) return reply(403, { error: 'Origin is not allowed' });
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Idempotency-Key');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    return reply(204, null);
  }
  const supplied = Buffer.from(request.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(401, { error: 'Authentication required' });
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'GET' && path === '/api/worker/status') return reply(200, { ok: true, workerActive: Boolean(child && child.exitCode === null && !child.killed), supportedKinds: ['tasks', 'notes'] });
    if (request.method === 'GET' && path === '/api/jobs') return reply(200, { jobs: (await store.list()).map(({ output, ...job }) => job) });
    if (request.method === 'POST' && path === '/api/jobs') {
      let body = ''; for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 20000) return reply(413, { error: 'Request too large' }); }
      const job = await store.submit(JSON.parse(body), request.headers['idempotency-key']);
      return reply(202, { id: job.id, status: job.status });
    }
    const match = path.match(/^\/api\/jobs\/([a-f0-9]{64})(\/artifact)?$/);
    if (request.method === 'GET' && match) {
      const job = await store.get(match[1]);
      if (!job) return reply(404, { error: 'Job not found' });
      if (match[2]) return job.status === 'verified' ? reply(200, { project: job.output, verification: job.verification, jobId: job.id }) : reply(409, { error: 'Artifact has not passed verification' });
      const { output, ...status } = job; return reply(200, status);
    }
    return reply(404, { error: 'Route not found' });
  } catch (error) { return reply(400, { error: error.message }); }
});
server.listen(Number(process.env.PORT || 8788), process.env.HOST || '0.0.0.0', () => console.log(JSON.stringify({ event: 'relay-server-ready', port: server.address().port })));
async function shutdown() { stopping = true; clearTimeout(timer); child?.kill('SIGTERM'); server.close(); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
