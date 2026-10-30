import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readZipMembers } from '../host/zip-members.mjs';

// Valid ZIPs and same-size corruptions: size checks alone cannot detect these.
const samples = [
  ['stored', 'UEsDBBQAAAAAAK98Xl1su8sMEAAAABAAAAAJAAAAc291cmNlLmpzY29uc3QgYW5zd2VyPTQyO1BLAQIUAxQAAAAAAK98Xl1su8sMEAAAABAAAAAJAAAAAAAAAAAAAACAAQAAAABzb3VyY2UuanNQSwUGAAAAAAEAAQA3AAAANwAAAAAA', 'UEsDBBQAAAAAAK98Xl1su8sMEAAAABAAAAAJAAAAc291cmNlLmpzY29uc3QgYW5zd2VyPTUyO1BLAQIUAxQAAAAAAK98Xl1su8sMEAAAABAAAAAJAAAAAAAAAAAAAACAAQAAAABzb3VyY2UuanNQSwUGAAAAAAEAAQA3AAAANwAAAAAA'],
  ['deflated', 'UEsDBBQAAAAIAK98Xl1su8sMEgAAABAAAAAJAAAAc291cmNlLmpzS87PKy5RSMwrLk8tsjUxsgYAUEsBAhQDFAAAAAgAr3xeXWy7ywwSAAAAEAAAAAkAAAAAAAAAAAAAAIABAAAAAHNvdXJjZS5qc1BLBQYAAAAAAQABADcAAAA5AAAAAAA=', 'UEsDBBQAAAAIAK98Xl1su8sMEgAAABAAAAAJAAAAc291cmNlLmpzS87PKy5RSMwrLk8tsjUxsgYAUEsBAhQDFAAAAAgAr3xeXW27ywwSAAAAEAAAAAkAAAAAAAAAAAAAAIABAAAAAHNvdXJjZS5qc1BLBQYAAAAAAQABADcAAAA5AAAAAAA='],
];
for (const [method, valid, invalid] of samples) {
  test(`${method} ZIP with matching CRC is accepted`, () => {
    assert.equal(readZipMembers(Buffer.from(valid, 'base64'))[0].content.toString(), 'const answer=42;');
  });
  test(`${method} ZIP with mismatched CRC is rejected`, () => {
    assert.throws(() => readZipMembers(Buffer.from(invalid, 'base64')), /ZIP CRC-32 mismatch/);
  });
}
test('authenticated ZIP import preserves damaged archive but does not register corrupt members', { timeout: 90000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-zip-crc-'));
  const socket = createServer();
  await new Promise(r => socket.listen(0, '127.0.0.1', r));
  const port = socket.address().port;
  await new Promise(r => socket.close(r));
  const token = randomBytes(32).toString('hex');
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dir,
      SYNTHIA_API_TOKEN: token, SYNTHIA_ALLOW_INSECURE_DEV: '0' }, stdio: 'ignore',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exit = new Promise(r => child.once('exit', r)); child.kill(); await exit;
    }
    await rm(dir, { recursive: true, force: true });
  });
  const api = async (method, route, payload) => {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method, headers: { Cookie: `synthia_session=${token}`, 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    return { status: response.status, data: await response.json() };
  };
  let ready = false;
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw Error('Computer exited before startup');
    try { if ((await api('GET', '/api/status')).status === 200) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready, 'Computer service started');
  const [,, corrupt] = samples[0];
  const bad = await api('POST', '/api/ingest', { name: 'damaged.zip', base64: corrupt });
  assert.equal(bad.status, 400);
  assert.match(bad.data.error, /ZIP CRC-32 mismatch/);
  const files = await api('GET', '/api/files');
  assert.equal(files.status, 200);
  assert.ok(files.data.some(x => x.path === '/home/user/Imports/damaged.zip'));
  assert.ok(!files.data.some(x => x.path.endsWith('/source.js')));
  const [, valid] = samples[0];
  const good = await api('POST', '/api/ingest', { name: 'clean.zip', base64: valid });
  assert.equal(good.status, 200);
  assert.equal(good.data.items.length, 2);
});
