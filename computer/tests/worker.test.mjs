import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JobStore } from '../worker/store.mjs';

test('queue rejects unsupported requests and preserves idempotency', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'relay-store-'));
  try {
    const store = await new JobStore(directory).init();
    const first = await store.submit({ name: 'Trip', kind: 'tasks' }, 'one-build-key');
    await store.put({ ...first, status: 'running' });
    const retry = await store.submit({ name: 'Trip', kind: 'tasks' }, 'one-build-key');
    assert.equal(retry.status, 'running');
    assert.equal((await store.list()).length, 1);
    await assert.rejects(store.submit({ name: 'Other', kind: 'notes' }, 'one-build-key'), /different request/);
    await assert.rejects(store.submit({ name: 'Game', kind: 'game' }, 'another-key'), /supported kind/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real worker recovers interrupted build and verifies its saved artifact', { timeout: 90000, skip: !process.env.RELAY_TEST_BROWSER }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'relay-worker-'));
  const token = 'test-worker-token-that-is-at-least-32-characters';
  let server, port, logs = '';
  async function start() {
    logs = '';
    server = spawn(process.execPath, [fileURLToPath(new URL('../worker/server.mjs', import.meta.url))], { detached: true, env: { ...process.env, RELAY_DATA_DIR: directory, RELAY_API_TOKEN: token, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', data => { logs += data; }); server.stderr.on('data', data => { logs += data; });
    await until(() => { const match = logs.match(/"event":"relay-server-ready","port":(\d+)/); if (match) { port = Number(match[1]); return true; } });
  }
  async function until(predicate) {
    const deadline = Date.now() + 65000;
    while (Date.now() < deadline) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 30)); }
    throw new Error(`Timed out: ${logs}`);
  }
  async function request(path, options = {}) { return fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } }); }
  async function kill() {
    if (!server || server.exitCode !== null) return;
    const exited = new Promise(resolve => server.once('exit', resolve));
    process.kill(-server.pid, 'SIGKILL'); await exited;
  }
  try {
    await start();
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/jobs`)).status, 401);
    const submitted = await (await request('/api/jobs', { method: 'POST', headers: { 'Idempotency-Key': 'trip-build-restart', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Trip tasks', kind: 'tasks' }) })).json();
    let before;
    await until(async () => { before = await (await request(`/api/jobs/${submitted.id}`)).json(); return before.stage === 'verifying'; });
    assert.equal((await request(`/api/jobs/${submitted.id}/artifact`)).status, 409);
    await kill();
    await start();
    let after;
    await until(async () => { after = await (await request(`/api/jobs/${submitted.id}`)).json(); if (after.status === 'failed') throw new Error(after.error); return after.status === 'verified'; });
    assert.equal(after.attempts, 2);
    const artifact = await (await request(`/api/jobs/${submitted.id}/artifact`)).json();
    assert.equal(artifact.project.name, 'Trip tasks');
    assert.equal(artifact.verification.ok, true);
    assert.ok(artifact.verification.checks.includes('task completion'));
    assert.equal(after.events.filter(event => event.stage === 'built').length, 1);
    const repeated = await (await request('/api/jobs', { method: 'POST', headers: { 'Idempotency-Key': 'trip-build-restart' }, body: JSON.stringify({ name: 'Trip tasks', kind: 'tasks' }) })).json();
    assert.equal(repeated.id, submitted.id);
    assert.equal((await (await request('/api/jobs')).json()).jobs.length, 1);
  } finally { await kill(); await rm(directory, { recursive: true, force: true }); }
});
