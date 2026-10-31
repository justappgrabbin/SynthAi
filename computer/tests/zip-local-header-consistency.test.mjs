import test from 'node:test';
import assert from 'node:assert/strict';
import { readZipMembers } from '../host/zip-members.mjs';

// Python zipfile fixtures: STORED, DEFLATE, and a non-seekable ZIP stream
// using a data descriptor (general-purpose flag bit 3).
const samples = {
  stored: 'UEsDBBQAAAAAAHl6X11su8sMEAAAABAAAAAJAAAAc291cmNlLmpzY29uc3QgYW5zd2VyPTQyO1BLAQIUAxQAAAAAAHl6X11su8sMEAAAABAAAAAJAAAAAAAAAAAAAACAAQAAAABzb3VyY2UuanNQSwUGAAAAAAEAAQA3AAAANwAAAAAA',
  deflated: 'UEsDBBQAAAAIAHl6X11su8sMEgAAABAAAAAJAAAAc291cmNlLmpzS87PKy5RSMwrLk8tsjUxsgYAUEsBAhQDFAAAAAgAeXpfXWy7ywwSAAAAEAAAAAkAAAAAAAAAAAAAAIABAAAAAHNvdXJjZS5qc1BLBQYAAAAAAQABADcAAAA5AAAAAAA=',
  descriptor: 'UEsDBBQACAAIAHl6X10AAAAAAAAAAAAAAAAJAAAAc291cmNlLmpzS87PKy5RSMwrLk8tsjUxsgYAUEsHCGy7ywwSAAAAEAAAAFBLAQIUAxQACAAIAHl6X11su8sMEgAAABAAAAAJAAAAAAAAAAAAAACAAQAAAABzb3VyY2UuanNQSwUGAAAAAAEAAQA3AAAASQAAAAAA',
};
const make = (kind = 'stored') => Buffer.from(samples[kind], 'base64');
const centralAt = data => data.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
const expectMismatch = data => assert.throws(() => readZipMembers(data), /ZIP local\/central header mismatch/);

for (const kind of Object.keys(samples)) {
  test('valid ' + kind + ' ZIP remains accepted', () => {
    const entries = readZipMembers(make(kind));
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, 'source.js');
    assert.equal(entries[0].content.toString(), 'const answer=42;');
  });
}
test('rejects central filename spoofing despite matching CRC and payload', () => {
  const data = make();
  data.write('shadow.js', centralAt(data) + 46, 'utf8');
  expectMismatch(data);
});
test('rejects local filename spoofing despite matching central filename', () => {
  const data = make();
  data.write('shadow.js', 30, 'utf8');
  expectMismatch(data);
});
test('rejects disagreement between local and central compression methods', () => {
  const data = make();
  data.writeUInt16LE(8, 8);
  expectMismatch(data);
});
test('rejects disagreement between local and central flags', () => {
  const data = make();
  data.writeUInt16LE(8, 6);
  expectMismatch(data);
});
test('rejects disagreement between local and central CRC without a descriptor', () => {
  const data = make();
  data.writeUInt32LE(0, 14);
  expectMismatch(data);
});
test('rejects disagreement between local and central compressed size', () => {
  const data = make();
  data.writeUInt32LE(17, 18);
  expectMismatch(data);
});
test('rejects disagreement between local and central uncompressed size', () => {
  const data = make();
  data.writeUInt32LE(17, 22);
  expectMismatch(data);
});

test('authenticated import rejects mismatched local/central ZIP names without admitting a spoofed file', { timeout: 90000 }, async t => {
  const { spawn } = await import('node:child_process');
  const { createServer } = await import('node:net');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { randomBytes } = await import('node:crypto');
  const dataDir = await mkdtemp(join(tmpdir(), 'synthia-zip-local-'));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const token = randomBytes(32).toString('hex');
  const child = spawn(process.execPath, ['host/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SYNTHIA_PORT: String(port), SYNTHIA_DATA_DIR: dataDir,
      SYNTHIA_API_TOKEN: token, SYNTHIA_ALLOW_INSECURE_DEV: '0' }, stdio: 'ignore',
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exit = new Promise(resolve => child.once('exit', resolve));
      child.kill(); await exit;
    }
    await rm(dataDir, { recursive: true, force: true });
  });
  const api = async (method, route, body) => {
    const response = await fetch('http://127.0.0.1:' + port + route, {
      method, headers: { Cookie: 'synthia_session=' + token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw Error('Computer service exited before startup');
    try { if ((await api('GET', '/api/status')).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Computer service started');
  const damaged = make();
  damaged.write('shadow.js', centralAt(damaged) + 46, 'utf8');
  const rejected = await api('POST', '/api/ingest', { name: 'spoof.zip', base64: damaged.toString('base64') });
  assert.equal(rejected.status, 400);
  assert.match(rejected.data.error, /ZIP local\/central header mismatch/);
  const files = await api('GET', '/api/files');
  assert.equal(files.status, 200);
  assert.ok(files.data.some(file => file.path === '/home/user/Imports/spoof.zip'), 'source archive retained');
  assert.ok(!files.data.some(file => file.path.endsWith('/shadow.js')), 'spoofed member not admitted');
  const accepted = await api('POST', '/api/ingest', { name: 'clean.zip', base64: make().toString('base64') });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.items.length, 2);
});
