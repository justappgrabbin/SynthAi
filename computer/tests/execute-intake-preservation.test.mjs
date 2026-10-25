import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const digest = text => createHash('sha256').update(text).digest('hex');

async function availablePort() {
  const s = createServer();
  await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise(resolve => s.close(resolve));
  return port;
}
async function request(port, method, path, value) {
  const response = await fetch('http://127.0.0.1:' + port + path, {
    method, headers: { 'content-type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  return { status: response.status, value: await response.json() };
}
async function start(port, dir) {
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dir },
    stdio: 'ignore',
  });
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Computer host exited');
    try {
      if ((await request(port, 'GET', '/api/status')).status === 200) return child;
    } catch {}
    await sleep(100);
  }
  child.kill();
  throw new Error('Computer host unavailable');
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, sleep(5000).then(() => child.kill('SIGKILL'))]);
}

test('execute intake preserves identities and rejects mismatched addressed paths', async t => {
  const port = await availablePort();
  const dir = await mkdtemp(join(tmpdir(), 'synthia-execute-'));
  let child;
  const expected = new Map();
  try {
    child = await start(port, dir);
    await t.test('same-name sequential and concurrent source admissions remain distinct', async () => {
      const sequential = ['const one = 101;', 'const two = 202;'];
      for (const source of sequential) {
        const result = await request(port, 'POST', '/api/execute', { name: 'same.js', content: source, type: 'javascript' });
        assert.equal(result.status, 200);
      }
      const parallel = Array.from({ length: 8 }, (_, i) => 'const p' + i + ' = ' + i + ';');
      const results = await Promise.all(parallel.map(source =>
        request(port, 'POST', '/api/execute', { name: 'parallel.js', content: source, type: 'javascript' })));
      assert.ok(results.every(result => result.status === 200));
      const files = (await request(port, 'GET', '/api/files')).value;
      const selected = files.filter(f => f.path.startsWith('/home/user/Documents/'));
      assert.equal(selected.length, 10);
      assert.equal(new Set(selected.map(f => f.path)).size, 10);
      assert.deepEqual(new Set(selected.map(f => f.meta.digest)), new Set([...sequential, ...parallel].map(digest)));
      for (const file of selected) expected.set(file.path, file.meta.digest);
    });
    await t.test('address with explicit wrong path cannot execute a fallback artifact', async () => {
      const files = (await request(port, 'GET', '/api/files')).value;
      const first = files.find(f => f.path === '/home/user/Documents/same.js');
      assert.ok(first);
      const response = await request(port, 'POST', '/api/execute', {
        addressKey: first.meta.addressKey, path: '/home/user/Documents/incorrect.js', type: 'javascript',
      });
      assert.equal(response.status, 400);
    });
    await t.test('all ten path and digest pairs survive service restart', async () => {
      await stop(child);
      child = await start(port, dir);
      const files = (await request(port, 'GET', '/api/files')).value;
      const actual = new Map(files.map(f => [f.path, f.meta.digest]));
      assert.equal(expected.size, 10);
      for (const [path, sha] of expected) assert.equal(actual.get(path), sha, path);
    });
  } finally {
    await stop(child);
    await rm(dir, { recursive: true, force: true });
  }
});
