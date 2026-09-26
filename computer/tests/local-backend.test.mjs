import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BrowserComputerRuntime } from '../BrowserComputerRuntime.mjs';
import { DeviceProjectWorkspace } from '../adapters/DeviceProjectWorkspace.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';
import { LocalComputerBackendAdapter } from '../adapters/LocalComputerBackendAdapter.mjs';

const SERVER = fileURLToPath(new URL('../backend/local-server.mjs', import.meta.url));

async function boot(stateDir, token) {
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      SYNTHAI_LOCAL_HOST: '127.0.0.1',
      SYNTHAI_LOCAL_PORT: '0',
      SYNTHAI_LOCAL_TOKEN: token,
      SYNTHAI_STATE_DIR: stateDir,
      SYNTHAI_EVENT_LOG: join(stateDir, 'events.ndjson')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.setEncoding('utf8');

  const ready = await new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error('local backend boot timeout\n' + stderr)), 15000);
    let pending = '';
    const onData = chunk => {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('SYNTHAI_LOCAL_BACKEND_READY ')) continue;
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolveReady(JSON.parse(line.slice('SYNTHAI_LOCAL_BACKEND_READY '.length)));
        return;
      }
    };
    child.stdout.on('data', onData);
    child.once('exit', code => {
      clearTimeout(timer);
      rejectReady(new Error('local backend exited before ready code=' + code + '\n' + stderr));
    });
  });

  return { child, ready, stderr: () => stderr };
}

async function request(baseUrl, token, path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function rpc(baseUrl, token, method, ...args) {
  const { response, body } = await request(baseUrl, token, '/rpc', {
    method: 'POST',
    body: JSON.stringify({ method, args })
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  return body.result;
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

test('phone acceptance re-verification clears stale local backend evidence', async () => {
  const runtime = await new BrowserComputerRuntime({ persistence: new MemoryPersistence() }).boot();
  const adapter = new LocalComputerBackendAdapter();
  adapter.verify = async () => ({
    health: { environment: 'linux-local', version: 'test', services: ['projects'] },
    snapshot: { version: 'test' }
  });

  await runtime.connectLocalBackend(adapter);
  assert.equal(runtime.localBackendVerified, true);
  assert.equal((await runtime.reverifyLocalBackend()).health.version, 'test');

  adapter.verify = async () => { throw new Error('backend stopped'); };
  await assert.rejects(runtime.reverifyLocalBackend(), /backend stopped/);
  assert.equal(runtime.localBackendVerified, false);
  assert.equal(runtime.localBackendHealth, null);
});

test('local Computer backend serves the canonical runtime and persists through restart', { timeout: 45000 }, async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'synthai-local-backend-'));
  const token = 'test-local-token';
  let first;
  let second;

  try {
    first = await boot(stateDir, token);
    const base1 = 'http://127.0.0.1:' + first.ready.port;

    const unauthorized = await fetch(base1 + '/health');
    assert.equal(unauthorized.status, 401);

    const health = await request(base1, token, '/health');
    assert.equal(health.response.status, 200);
    assert.equal(health.body.environment, 'linux-local');
    assert.ok(health.body.services.includes('address-service'));
    assert.ok(health.body.services.includes('penta-ephemeris'));

    const preflight = await fetch(base1 + '/rpc', {
      method: 'OPTIONS',
      headers: { Origin: 'https://appassets.androidplatform.net', 'Access-Control-Request-Headers': 'authorization,content-type' }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://appassets.androidplatform.net');

    const snapshot = await rpc(base1, token, 'snapshot');
    assert.match(snapshot.version, /^0\.2\.0/);

    const browser = await new BrowserComputerRuntime({ persistence: new MemoryPersistence() }).boot();
    const oldProject = await browser.projects.create({ name: 'Existing browser project' });
    await browser.projects.writeFile(oldProject.id, 'index.html', '<h1>older</h1>', { type: 'text/html' });
    await browser.connectLocalBackend({ baseUrl: base1, token });
    const workspace = new DeviceProjectWorkspace({ runtime: browser });
    await workspace.attach();
    assert.equal(workspace.source(oldProject.id), 'browser');

    const project = await workspace.create({ name: 'Inside the Computer' });
    await workspace.writeFile(project.id, 'index.html', '<h1>local</h1>', { type: 'text/html' });
    assert.equal(workspace.source(project.id), 'device');
    assert.equal((await workspace.readFile(project.id, 'index.html')).content, '<h1>local</h1>');

    browser.configureGitHub({
      baseUrl: 'https://example.invalid', token: 'test-token',
      fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ repo: { url: 'https://github.com/example/demo' } }) })
    });
    const published = await workspace.publish(project.id);
    assert.equal(published.repo.url, 'https://github.com/example/demo');
    assert.equal(workspace.get(project.id).status, 'published');

    const penta = await rpc(base1, token, 'groupPenta', [{
      label: 'probe',
      birth_date: '1990-09-18',
      birth_time: '21:34',
      latitude: 37.7749,
      longitude: -122.4194,
      timezone_offset: -7
    }]);
    assert.equal(penta.members.length, 1);
    assert.equal(typeof penta.members[0].body_gate, 'number');

    await stop(first.child);
    first = null;

    second = await boot(stateDir, token);
    const base2 = 'http://127.0.0.1:' + second.ready.port;

    const projects = await rpc(base2, token, 'project.list');
    const restored = projects.find(item => item.id === project.id);
    assert.ok(restored, 'project should survive local backend restart');

    const restoredFile = await rpc(base2, token, 'project.readFile', project.id, 'index.html');
    assert.equal(restoredFile.content, '<h1>local</h1>');
    await browser.connectLocalBackend({ baseUrl: base2, token });
    await workspace.attach();
    assert.equal(workspace.get(project.id).status, 'published');
    assert.equal((await workspace.readFile(oldProject.id, 'index.html')).content, '<h1>older</h1>');
    assert.equal(workspace.list().length, 2);
  } finally {
    if (first) await stop(first.child);
    if (second) await stop(second.child);
    await rm(stateDir, { recursive: true, force: true });
  }
});
