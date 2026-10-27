import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wait = ms => new Promise(r => setTimeout(r, ms));
async function freePort() {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise(r => server.close(r));
  return port;
}
function http(port, path, method = 'GET', headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, res => {
      const chunks = [];
      res.on('data', b => chunks.push(b));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
test('full Computer rejects foreign HTTP origins and hosts without breaking local WebView', { timeout: 90000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-http-boundary-'));
  const port = await freePort();
  const host = '127.0.0.1:' + port;
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dir }, stdio: 'ignore',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const done = new Promise(r => child.once('exit', r));
      child.kill();
      await done;
    }
    await rm(dir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try { ready = (await http(port, '/api/status')).status === 200; } catch { /* booting */ }
    if (ready) break;
    if (child.exitCode !== null) throw new Error('Computer exited during boot');
    await wait(100);
  }
  assert.equal(ready, true, 'Computer boot');
  const post = (name, headers) => http(port, '/api/ingest', 'POST',
    { 'Content-Type': 'text/plain', ...headers },
    JSON.stringify({ name, base64: Buffer.from('const preserved=1;').toString('base64') }));
  await t.test('foreign Origin rejected', async () =>
    assert.equal((await post('foreign-origin.js', { Host: host, Origin: 'https://foreign.example' })).status, 403));
  await t.test('foreign Host rejected', async () =>
    assert.equal((await post('foreign-host.js', { Host: 'foreign.example:' + port })).status, 403));
  await t.test('cross-site Fetch Metadata rejected', async () =>
    assert.equal((await post('cross-site.js', { Host: host, 'Sec-Fetch-Site': 'cross-site' })).status, 403));
  await t.test('opaque Origin rejected', async () =>
    assert.equal((await post('opaque.js', { Host: host, Origin: 'null' })).status, 403));
  await t.test('Android WebView same-origin accepted', async () =>
    assert.equal((await post('webview.js', { Host: host, Origin: 'http://' + host, 'Sec-Fetch-Site': 'same-origin' })).status, 200));
  await t.test('native localhost client accepted', async () =>
    assert.equal((await post('native.js', { Host: host })).status, 200));
  await t.test('denied writes have no persistent records', async () => {
    const files = JSON.parse((await http(port, '/api/files')).body).map(x => x.path);
    for (const name of ['foreign-origin.js', 'foreign-host.js', 'cross-site.js', 'opaque.js'])
      assert.equal(files.some(x => x.endsWith('/' + name)), false, name);
    for (const name of ['webview.js', 'native.js'])
      assert.equal(files.some(x => x.endsWith('/' + name)), true, name);
  });
  await t.test('foreign Origin cannot read API GET', async () =>
    assert.equal((await http(port, '/api/files', 'GET', { Host: host, Origin: 'https://foreign.example' })).status, 403));
});
