import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const computerRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const zip1 = 'UEsDBBQAAAAAAA19V13lwP9hEAAAABAAAAAOAAAAZm9sZGVyL21haW4uanNjb25zdCB2ZXJzaW9uPTE7UEsBAhQDFAAAAAAADX1XXeXA/2EQAAAAEAAAAA4AAAAAAAAAAAAAAIABAAAAAGZvbGRlci9tYWluLmpzUEsFBgAAAAABAAEAPAAAADwAAAAAAA==';
const zip2 = 'UEsDBBQAAAAAAA19V10mk9JKEAAAABAAAAAOAAAAZm9sZGVyL21haW4uanNjb25zdCB2ZXJzaW9uPTI7UEsBAhQDFAAAAAAADX1XXSaT0koQAAAAEAAAAA4AAAAAAAAAAAAAAIABAAAAAGZvbGRlci9tYWluLmpzUEsFBgAAAAABAAEAPAAAADwAAAAAAA==';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function start(port, dataDir) {
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: computerRoot, env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dataDir }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(`Computer exited during startup: ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/api/status`);
      if (res.ok && (await res.json()).ready) return child;
    } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error('Computer did not become ready');
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const ended = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await ended;
}

test('packaged Computer imports retain originals across duplicate names, concurrent requests and restart', { timeout: 90000 }, async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'synthia-import-preservation-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let child;
  t.after(async () => { await stop(child); await rm(dataDir, { recursive: true, force: true }); });
  const api = async (path, body) => {
    const response = await fetch(`${base}${path}`, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  };
  const upload = async (name, bytes) => (await api('/api/ingest', { name, base64: Buffer.from(bytes).toString('base64') })).items;
  const activate = record => api(`/api/activate-file?${new URLSearchParams({ address: record.addressKey, path: record.path })}`);
  child = await start(port, dataDir);
  const a = (await upload('keep.js', 'const original=1;'))[0];
  const b = (await upload('keep.js', 'const newer=2;'))[0];
  await t.test('same filename allocates a second path', () => assert.notEqual(a.path, b.path));
  await t.test('both JS byte strings remain addressable', async () => {
    assert.equal((await activate(a)).content, 'const original=1;');
    assert.equal((await activate(b)).content, 'const newer=2;');
  });
  const za = await upload('project.zip', Buffer.from(zip1, 'base64'));
  const zb = await upload('project.zip', Buffer.from(zip2, 'base64'));
  await t.test('ZIP originals receive separate paths', () => assert.notEqual(za[0].path, zb[0].path));
  await t.test('extracted ZIP files do not overwrite', async () => {
    assert.equal((await activate(za[1])).content, 'const version=1;');
    assert.equal((await activate(zb[1])).content, 'const version=2;');
  });
  const parallel = (await Promise.all(Array.from({ length: 5 }, (_, i) => upload('parallel.js', `const n=${i};`)))).map(x => x[0]);
  await t.test('five simultaneous same-name imports receive distinct paths', () => assert.equal(new Set(parallel.map(x => x.path)).size, 5));
  await t.test('all simultaneous originals retain their exact digest', async () => {
    for (const record of parallel) assert.equal((await activate(record)).meta.digest, record.digest);
  });
  await stop(child);
  child = await start(port, dataDir);
  await t.test('restart restores first JS and first ZIP member', async () => {
    assert.equal((await activate(a)).content, 'const original=1;');
    assert.equal((await activate(za[1])).content, 'const version=1;');
  });
  await t.test('restart restores all five concurrent records', async () => {
    for (const record of parallel) assert.equal((await activate(record)).meta.digest, record.digest);
  });
});
