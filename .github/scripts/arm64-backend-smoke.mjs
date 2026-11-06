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
} finally {
  if (container) {
    try { await docker('logs', container); } catch { /* Keep original failure. */ }
    try { await stop(); } catch { /* Keep original failure. */ }
  }
  try { await docker('volume', 'rm', volume); } catch { /* CI volume is ephemeral. */ }
}
