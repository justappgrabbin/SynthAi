import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { startSynthiaSupervisor, synthiaChildSpecs } from '../backend/synthia-supervisor.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(check, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(100);
  }
  return false;
}

test('SYNTHIA SUPERVISOR: children bind loopback and carry the embedded env', () => {
  const spec = synthiaChildSpecs({ SYNTHAI_LOCAL_TOKEN: 'secret', HOST: '0.0.0.0', DATA_DIR: '/data/x' });
  const [node, py] = spec.children;
  assert.equal(node.env.HOST, '127.0.0.1');
  assert.equal(py.env.HOST, '127.0.0.1');
  assert.equal(node.env.PORT, '17381');
  assert.equal(py.env.PORT, '17382');
  assert.equal(node.env.TERMINAL_TOKEN, 'secret');
  assert.equal(node.env.PYTHON_BRIDGE_URL, 'http://127.0.0.1:17382');
  assert.equal(node.env.SYNTHIA_API_BASE, 'http://127.0.0.1:17382');
  assert.equal(node.env.DATA_DIR, '/data/x');
  assert.equal(node.env.CORS_ORIGIN, 'https://appassets.androidplatform.net');
  assert.ok(node.args.includes('server/lite.js'));
  assert.ok(node.args.some(arg => arg.startsWith('--max-old-space-size=')));
});

test('SYNTHIA SUPERVISOR: a missing Synthia install is reported, never thrown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'synthia-missing-'));
  const lines = [];
  const supervisor = startSynthiaSupervisor({ env: { SYNTHIA_ROOT: join(root, 'absent'), DATA_DIR: join(root, 'data') }, out: line => lines.push(line) });
  const status = supervisor.status();
  assert.equal(status.children['synthia-node'].state, 'missing');
  assert.equal(status.children['synthia-python'].state, 'missing');
  supervisor.stop();
  await rm(root, { recursive: true, force: true });
});

test('SYNTHIA SUPERVISOR: starts both children, probes /health and restarts after a crash', async () => {
  const root = await mkdtemp(join(tmpdir(), 'synthia-root-'));
  await mkdir(join(root, 'server'), { recursive: true });
  await writeFile(join(root, 'server', 'lite.js'), `
    const http = require('http');
    http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, host: process.env.HOST })); })
      .listen(Number(process.env.PORT), process.env.HOST, () => console.log('stub node listening ' + process.env.HOST + ':' + process.env.PORT));
  `);
  await writeFile(join(root, 'render-server.py'), `
import http.server, os
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers(); self.wfile.write(b'{"ok":true}')
    def log_message(self, *a): pass
print('stub python listening', flush=True)
http.server.HTTPServer((os.environ['HOST'], int(os.environ['PORT'])), H).serve_forever()
`);
  const nodePort = await freePort();
  const pyPort = await freePort();
  const lines = [];
  const supervisor = startSynthiaSupervisor({
    env: { ...process.env, SYNTHIA_ROOT: root, SYNTHIA_NODE_PORT: String(nodePort), SYNTHIA_PY_PORT: String(pyPort), DATA_DIR: join(root, 'data'), TERMINAL_TOKEN: 't' },
    out: line => lines.push(line),
    minBackoffMs: 50,
    probeIntervalMs: 100
  });
  try {
    const children = () => supervisor.status().children;
    assert.ok(await waitFor(() => children()['synthia-node'].state === 'ready' && children()['synthia-python'].state === 'ready'), lines.join('\n'));
    assert.ok(lines.some(line => line.startsWith('[synthia-node] stub node listening 127.0.0.1:')), lines.join('\n'));
    assert.ok(lines.some(line => line.startsWith('[synthia-python] stub python listening')), lines.join('\n'));

    const firstPid = children()['synthia-node'].pid;
    process.kill(firstPid, 'SIGKILL');
    assert.ok(await waitFor(() => children()['synthia-node'].restarts >= 1 && children()['synthia-node'].state === 'ready' && children()['synthia-node'].pid !== firstPid), lines.join('\n'));
  } finally {
    supervisor.stop();
    await sleep(200);
    await rm(root, { recursive: true, force: true });
  }
});
