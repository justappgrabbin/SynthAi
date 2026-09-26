import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const image = process.argv[2];
assert.ok(image, 'pass the built ARM64 image tag');

const volume = `synthai-arm64-smoke-${process.pid}`;
const token = 'ci-arm64-backend-smoke-token';
const base = 'http://127.0.0.1:17380';
let container;

async function docker(...args) {
  const result = await exec('docker', args, { timeout: 20000 });
  return result.stdout.trim();
}

async function request(path, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(3000),
  });
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  assert.equal(value.ok, true, JSON.stringify(value));
  return value.result ?? value;
}

async function rpc(method, ...args) {
  return request('/rpc', { method, args });
}

async function boot() {
  container = await docker('run', '--detach', '--rm', '--platform', 'linux/arm64',
    '--publish', '127.0.0.1:17380:17380', '--volume', `${volume}:/var/lib/synthai`,
    '--env', `SYNTHAI_LOCAL_TOKEN=${token}`, '--env', 'SYNTHAI_LOCAL_HOST=0.0.0.0',
    '--env', 'SYNTHIA_EMBEDDED=1', '--env', `TERMINAL_TOKEN=${token}`,
    '--env', 'DATA_DIR=/var/lib/synthai/synthia', '--env', 'CORS_ORIGIN=https://appassets.androidplatform.net',
    image, 'node', '/opt/synthai/computer/backend/local-server.mjs');

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try { return await request('/health'); } catch { /* Guest Node may still be starting. */ }
    if (await docker('inspect', '--format', '{{.State.Running}}', container) !== 'true') {
      throw new Error(`ARM64 backend exited before /health: ${await docker('logs', container)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`ARM64 backend /health timed out: ${await docker('logs', container)}`);
}

async function stop() {
  if (!container) return;
  const current = container;
  container = undefined;
  await docker('stop', '--time', '3', current);
}

try {
  await docker('volume', 'create', volume);
  const arch = await docker('run', '--rm', '--platform', 'linux/arm64', image, 'node', '-p', 'process.arch');
  assert.equal(arch, 'arm64');

  const health = await boot();
  assert.equal(health.arch, 'arm64');
  assert.equal(health.environment, 'linux-local');
  assert.ok(health.services.includes('purpose-guide'));
  assert.ok(health.services.includes('task-fit'));

  const project = await rpc('project.create', { name: 'ARM64 APK backend smoke' });
  await rpc('project.writeFile', project.id, 'proof.txt', 'persisted on ARM64');
  const fit = await rpc('scoreTaskFit', {
    task: { required_axes: [{ axis: ['C'], weight: 1 }] },
    participants: [{ id: 'candidate', copnhfe: { C: 80 } }],
    sunGate: 16,
  });
  assert.equal(fit.fit, 80);

  await stop();
  const restarted = await boot();
  assert.equal(restarted.arch, 'arm64');
  const file = await rpc('project.readFile', project.id, 'proof.txt');
  assert.equal(file.content, 'persisted on ARM64');
  console.log('ARM64 Linux backend verified: /health, project and TaskFit RPC, persistence after restart');

  // Embedded Synthia Server: supervised by local-server.mjs, loopback only.
  const synthiaDeadline = Date.now() + 300000;
  let synthia = null;
  while (Date.now() < synthiaDeadline) {
    const health = await request('/health');
    synthia = health.synthia;
    const children = synthia?.children || {};
    if (children['synthia-node']?.state === 'ready' && children['synthia-python']?.state === 'ready') break;
    if (Object.values(children).some(child => child.state === 'missing')) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  const children = synthia?.children || {};
  assert.equal(children['synthia-node']?.state, 'ready', 'Synthia Node not ready: ' + JSON.stringify(synthia));
  assert.equal(children['synthia-python']?.state, 'ready', 'Synthia Python not ready: ' + JSON.stringify(synthia));
  assert.equal(children['synthia-node'].host, '127.0.0.1');
  const probe = await docker('exec', container, 'node', '-e', [
    '(async()=>{',
    "const g=await fetch('http://127.0.0.1:17381/computer/github/status',{headers:{'x-terminal-token':process.env.TERMINAL_TOKEN}});",
    "const h=await fetch('http://127.0.0.1:17381/health');",
    "const p=await fetch('http://127.0.0.1:17382/health');",
    "console.log(JSON.stringify({github:g.status,githubBody:await g.json(),node:h.status,python:p.status}));",
    '})().catch(e=>{console.error(e);process.exit(1)})'
  ].join(''));
  const synthiaProbe = JSON.parse(probe.split('\n').pop());
  assert.equal(synthiaProbe.node, 200, probe);
  assert.equal(synthiaProbe.python, 200, probe);
  assert.equal(synthiaProbe.github, 503, probe);
  assert.equal(synthiaProbe.githubBody.error, 'github_token_not_configured', probe);
  console.log('ARM64 embedded Synthia Server verified: node /health, python /health, /computer/github/status reachable (no token yet)');
} finally {
  if (container) {
    try { await docker('logs', container); } catch { /* Keep original failure. */ }
    try { await stop(); } catch { /* Keep original failure. */ }
  }
  try { await docker('volume', 'rm', volume); } catch { /* CI volume is ephemeral. */ }
}
