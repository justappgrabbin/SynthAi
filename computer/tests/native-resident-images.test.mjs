import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { EventBus, MemoryPersistence, StateStore } from '../core/kernel.mjs';
import { NativeSynthImagePackageStore } from '../residents/native-synthimg-package-store.mjs';
import { NativeImageResidentLoader } from '../residents/native-image-resident-loader.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

function octal(value, width) {
  return value.toString(8).padStart(width - 1, '0') + '\0';
}

function tarFile(name, data) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const h = Buffer.alloc(512);
  h.write(name, 0, 100, 'utf8');
  h.write(octal(0o644, 8), 100, 8, 'ascii');
  h.write(octal(0, 8), 108, 8, 'ascii');
  h.write(octal(0, 8), 116, 8, 'ascii');
  h.write(octal(body.length, 12), 124, 12, 'ascii');
  h.write(octal(0, 12), 136, 12, 'ascii');
  h.fill(0x20, 148, 156);
  h[156] = '0'.charCodeAt(0);
  h.write('ustar\0', 257, 6, 'ascii');
  h.write('00', 263, 2, 'ascii');
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  h[154] = 0;
  h[155] = 0x20;
  return Buffer.concat([h, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

function residentImage({ id, name, residentType, residentEntry, files = {}, mobileEntry = null }) {
  const tar = Buffer.concat([
    ...Object.entries(files).map(([file, data]) => tarFile(file, data)),
    Buffer.alloc(1024),
  ]);
  const payload = gzipSync(tar, { level: 9, mtime: 0 });
  const manifestObject = {
    id, name, version: 'test', resident_type: residentType, resident_entry: residentEntry,
    ...(mobileEntry ? { mobile_entry: mobileEntry } : {}),
  };
  const manifest = Buffer.from(JSON.stringify(manifestObject));
  const header = Buffer.alloc(49);
  header.write('SYNTHIMG', 0, 8, 'ascii');
  header[8] = 1;
  header.writeUInt32LE(1, 9);
  header.writeUInt32LE(manifest.length, 13);
  createHash('sha256').update(payload).digest().copy(header, 17);
  return Buffer.concat([header, manifest, payload]);
}

test('NATIVE RESIDENT IMAGE STORE: verifies and extracts whole resident image', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'synthimg-native-'));
  const state = new StateStore({ bus: new EventBus(), persistence: new MemoryPersistence(), namespace: 'native-image-store-test' });
  const store = new NativeSynthImagePackageStore({ state, root });
  const image = residentImage({
    id: 'prime-test',
    name: 'Synthia Prime',
    residentType: 'synthia58',
    residentEntry: 'src/ui/server.mjs',
    files: {
      'src/ui/server.mjs': 'export default function start(){}',
      'ui/index.html': '<!doctype html><title>Prime</title>',
    },
  });
  try {
    const installed = await store.installSynthImageStream(Readable.from(image), { contentLength: image.length, source: 'test' });
    assert.equal(installed.residentType, 'synthia58');
    assert.equal(installed.preservation, 'archive-and-whole-extracted-image-retained');
    assert.match(await readFile(path.join(installed.base, 'src/ui/server.mjs'), 'utf8'), /function start/);
    const verified = await store.verify('prime-test');
    assert.equal(verified.installed, true);
    assert.equal(store.list()[0].id, 'prime-test');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('NATIVE RESIDENT LOADER: Echo and Prime start distinct resident processes and route mesh operations', async () => {
  const runtime = await new NativeSeedRuntime({ persistence: new MemoryPersistence(), namespace: 'image-loader-test' }).boot();
  const hosted = [];
  runtime.terminal = {
    async hostApp(spec) { hosted.push(spec); return { pid: 100 + hosted.length, id: spec.id, url: spec.url, status: 'active' }; },
    async stopApp(id) { return { stopped: true, id }; },
  };
  const records = {
    echo: {
      id: 'echo', name: 'Echo', residentType: 'echo', residentEntry: 'packages/stellar-machine/src/control-server.mjs',
      payloadSha256: 'a'.repeat(64), base: '/tmp/echo',
      manifest: { id: 'echo', name: 'Echo', resident_type: 'echo', resident_entry: 'packages/stellar-machine/src/control-server.mjs' },
    },
    prime: {
      id: 'prime', name: 'Synthia Prime', residentType: 'synthia58', residentEntry: 'src/ui/server.mjs',
      payloadSha256: 'b'.repeat(64), base: '/tmp/prime',
      manifest: { id: 'prime', name: 'Synthia Prime', resident_type: 'synthia58', resident_entry: 'src/ui/server.mjs' },
    },
  };
  const packageStore = { async verify(id) { return { installed: Boolean(records[id]), record: records[id] ?? null }; } };
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method ?? 'GET', body: options.body ?? null });
    return new Response(JSON.stringify({ ok: true, url: String(url) }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const loader = new NativeImageResidentLoader({ computer: runtime, packageStore, fetchImpl });

  const echo = await loader.mount({ imageId: 'echo' });
  assert.equal(echo.residentId, 'echo');
  assert.equal(runtime.meshKernel.participant('echo').residency, 'active');
  const echoStatus = await runtime.meshKernel.request('echo', { operation: 'machine.status' });
  assert.equal(echoStatus.delivered, true);
  assert.match(requests.at(-1).url, /:4580\/status$/);

  const prime = await loader.mount({ imageId: 'prime' });
  assert.equal(prime.residentId, 'synthia-prime');
  assert.equal(prime.url, 'http://127.0.0.1:17759');
  const chat = await runtime.meshKernel.request('synthia-prime', { operation: 'chat', payload: { message: 'hello' } });
  assert.equal(chat.delivered, true);
  assert.match(requests.at(-1).url, /:17759\/api\/chat$/);
  assert.equal(requests.at(-1).method, 'POST');

  assert.equal(hosted.length, 2);
  assert.match(hosted[0].argv[1], /control-server\.mjs$/);
  assert.match(hosted[1].argv[1], /server\.mjs$/);
});

test('MOBILE COMPUTER: resident_type echo and synthia58 delegate to the native residence bridge', async () => {
  const calls = [];
  const nativeResidents = {
    async mount(imageId, options) {
      calls.push({ imageId, options });
      return {
        residentId: imageId === 'echo-image' ? 'echo' : 'synthia-prime',
        url: imageId === 'echo-image' ? 'http://127.0.0.1:4580' : 'http://127.0.0.1:17759',
      };
    },
  };
  const runtime = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'mobile-native-resident-test',
    nativeResidents,
  }).boot();

  await runtime.state.set('images.echo-image', {
    id: 'echo-image', name: 'Echo', version: '0.1.0', payloadSha256: 'c'.repeat(64),
    base: '/__synthimg/echo/', entry: 'packages/computer-core/index.html',
    residentEntry: 'packages/stellar-machine/src/control-server.mjs',
    manifest: { resident_type: 'echo' }, lifecycle: 'warm',
  }, { source: 'test' });
  await runtime.state.set('images.prime-image', {
    id: 'prime-image', name: 'Prime', version: '0.5.8', payloadSha256: 'd'.repeat(64),
    base: '/__synthimg/prime/', entry: null, residentEntry: 'src/ui/server.mjs',
    manifest: { resident_type: 'synthia58' }, lifecycle: 'warm',
  }, { source: 'test' });

  const echo = await runtime.mountResidentSynthImage('echo-image');
  assert.equal(echo.residentType, 'echo');
  assert.match(echo.launchUrl, /packages\/computer-core\/index\.html$/);

  const prime = await runtime.mountResidentSynthImage('prime-image');
  assert.equal(prime.residentType, 'synthia58');
  assert.equal(prime.launchUrl, 'http://127.0.0.1:17759');
  assert.deepEqual(calls.map(call => call.imageId), ['echo-image', 'prime-image']);
});
