import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const delay = ms => new Promise(r => setTimeout(r, ms));
const token = () => randomBytes(32).toString('hex');
async function port() {
  const s = createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise(r => s.close(r));
  return p;
}
async function stop(p) {
  if (p.exitCode !== null) return;
  const done = new Promise(r => p.once('exit', r));
  p.kill();
  await done;
}
test('local Computer API requires Android-issued session capability', { timeout: 90000 }, async t => {
  const p = await port(), dir = await mkdtemp(join(tmpdir(), 'synthia-auth-'));
  const first = token(), second = token();
  let child;
  const api = async (method, path, key, headers = {}) => {
    const r = await fetch(`http://127.0.0.1:${p}${path}`, {
      method,
      headers: { ...(key ? { Cookie: `synthia_session=${key}` } : {}), ...headers },
      body: method === 'POST' ? JSON.stringify({ name: 'protected.js', base64: 'Y29uc3QgeD0xOw==' }) : undefined,
    });
    return { status: r.status, text: await r.text() };
  };
  const boot = async key => {
    const proc = spawn(process.execPath, ['host/server.mjs'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, SYNTHIA_PORT: String(p), SYNTHIA_DATA_DIR: dir,
        SYNTHIA_API_TOKEN: key, SYNTHIA_ALLOW_INSECURE_DEV: '0' }, stdio: 'ignore',
    });
    for (let i = 0; i < 120; i++) {
      if (proc.exitCode !== null) throw Error('Host exited');
      try { if ((await api('GET', '/api/status', key)).status === 200) return proc; } catch {}
      await delay(100);
    }
    proc.kill(); throw Error('Host not ready');
  };
  t.after(async () => { if (child) await stop(child); await rm(dir, { recursive: true, force: true }); });
  child = await boot(first);
  await t.test('unauthenticated local GET and POST rejected', async () => {
    assert.equal((await api('GET', '/api/files')).status, 401);
    assert.equal((await api('POST', '/api/ingest')).status, 401);
  });
  await t.test('incorrect or duplicate cookie rejected', async () => {
    assert.equal((await api('GET', '/api/files', second)).status, 401);
    assert.equal((await api('GET', '/api/files', first + '; synthia_session=' + first)).status, 401);
  });
  await t.test('valid session can ingest and retrieve', async () => {
    assert.equal((await api('POST', '/api/ingest', first)).status, 200);
    assert.match((await api('GET', '/api/files', first)).text, /protected\.js/);
  });
  await t.test('foreign origin forbidden even with valid session', async () => {
    assert.equal((await api('GET', '/api/files', first, { Origin: 'https://foreign.example' })).status, 403);
  });
  await stop(child);
  child = await boot(second);
  await t.test('restart rotates token and preserves file bytes', async () => {
    assert.equal((await api('GET', '/api/files', first)).status, 401);
    assert.match((await api('GET', '/api/files', second)).text, /protected\.js/);
  });
});
