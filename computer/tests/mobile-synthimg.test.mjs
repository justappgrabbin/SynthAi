import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { MemoryPersistence } from '../core/kernel.mjs';
import { parseSynthImage, SynthImageRuntime } from '../mobile/SynthImageRuntime.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

globalThis.crypto ??= webcrypto;

function octal(value, width) {
  const s = value.toString(8).padStart(width - 1, '0');
  return s + '\0';
}

function tarFile(name, data) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const h = Buffer.alloc(512);
  h.write(name, 0, 100, 'utf8');
  h.write(octal(0o644, 8), 100, 8, 'ascii');
  h.write(octal(0, 8), 108, 8, 'ascii');
  h.write(octal(0, 8), 116, 8, 'ascii');
  h.write(octal(body.length, 12), 124, 12, 'ascii');
  h.write(octal(Math.floor(Date.now() / 1000), 12), 136, 12, 'ascii');
  h.fill(0x20, 148, 156);
  h[156] = '0'.charCodeAt(0);
  h.write('ustar\0', 257, 6, 'ascii');
  h.write('00', 263, 2, 'ascii');
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  h[154] = 0;
  h[155] = 0x20;
  const pad = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([h, body, pad]);
}

function synthImage({ corrupt = false } = {}) {
  const payload = Buffer.concat([
    tarFile('index.html', '<!doctype html><title>Phone Synth</title><h1>hello</h1>'),
    tarFile('app.js', 'document.body.dataset.running="true"'),
    Buffer.alloc(1024),
  ]);
  const manifest = Buffer.from(JSON.stringify({
    id: 'phone-demo',
    name: 'Phone Demo',
    version: '1',
    arch: 'any',
    mobile_entry: 'index.html',
    entrypoint: ['/bin/sh'],
  }));
  const hash = createHash('sha256').update(payload).digest();
  if (corrupt) hash[0] ^= 0xff;
  const header = Buffer.alloc(49);
  header.write('SYNTHIMG', 0, 8, 'ascii');
  header[8] = 1;
  header.writeUInt32LE(0, 9);
  header.writeUInt32LE(manifest.length, 13);
  hash.copy(header, 17);
  return Buffer.concat([header, manifest, payload]);
}

function residentSynthImage() {
  const payload = Buffer.concat([
    tarFile('src/federated-synthia.mjs', 'export class FederatedSynthia {}'),
    tarFile('vendor/pure-synthia-v0.4.0/src/synthia/synthiaRuntime.mjs', 'export const embodiment = {}'),
    Buffer.alloc(1024),
  ]);
  const manifest = Buffer.from(JSON.stringify({
    id: 'synthia57-demo',
    name: 'Synthia 5.7 Demo Resident',
    version: '0.5.7',
    arch: 'any',
    resident_type: 'synthia57',
    resident_entry: 'src/federated-synthia.mjs',
    embodiment_entry: 'vendor/pure-synthia-v0.4.0/src/synthia/synthiaRuntime.mjs',
  }));
  const hash = createHash('sha256').update(payload).digest();
  const header = Buffer.alloc(49);
  header.write('SYNTHIMG', 0, 8, 'ascii');
  header[8] = 1;
  header.writeUInt32LE(0, 9);
  header.writeUInt32LE(manifest.length, 13);
  hash.copy(header, 17);
  return Buffer.concat([header, manifest, payload]);
}

test('MOBILE SYNTHIMG: verifies synthctl-compatible image and exposes web payload', async () => {
  const image = await parseSynthImage(synthImage());
  assert.equal(image.manifest.id, 'phone-demo');
  assert.equal(image.manifest.mobile_entry, 'index.html');
  assert.equal(image.files.size, 2);
  assert.match(new TextDecoder().decode(image.files.get('index.html')), /Phone Synth/);
  assert.equal(image.payloadSha256.length, 64);
});

test('MOBILE SYNTHIMG: refuses a payload whose embedded digest is wrong', async () => {
  await assert.rejects(() => parseSynthImage(synthImage({ corrupt: true })), /sha256 mismatch/);
});

test('MOBILE SYNTHIMG: resident package installs without pretending it is an HTML app', async () => {
  const previousCaches = globalThis.caches;
  globalThis.caches = {
    async open() {
      return { async put() {} };
    }
  };
  try {
    const runtime = new SynthImageRuntime();
    const record = await runtime.install(residentSynthImage());
    assert.equal(record.kind, 'resident');
    assert.equal(record.entry, null);
    assert.equal(record.residentEntry, 'src/federated-synthia.mjs');
    assert.equal(record.manifest.resident_type, 'synthia57');
  } finally {
    if (previousCaches === undefined) delete globalThis.caches;
    else globalThis.caches = previousCaches;
  }
});

test('MOBILE COMPUTER: full address activates real five-stage state-space and relocates checkpoint', async () => {
  const runtime = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'mobile-test',
  }).boot();

  const address = {
    planetary: 'Sun',
    dimension: 'Movement',
    gate: 25,
    line: 2,
    color: 4,
    tone: 4,
    base: 2,
    degree: 25,
    minute: 59,
    second: 31,
    arc: 93571,
    zodiac: 'Virgo',
    house: 5,
  };

  const activated = await runtime.activateAddress(address);
  assert.equal(activated.status, 'resolved');
  assert.equal(activated.state.node.dimension, 'Space');
  assert.equal(activated.state.node.gate, 25);
  assert.ok(activated.key.startsWith('addr:'));
  assert.match(activated.sentence, /Gate 25/);

  const relocated = await runtime.relocateAddress(address);
  assert.equal(relocated.source, 'local');
  assert.equal(relocated.key, activated.key);
  assert.equal(relocated.checkpoint.node.gate, 25);
});

test('MOBILE COMPUTER: micro/macro addressing remains reversible', async () => {
  const runtime = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'mobile-codec-test',
  }).boot();

  const encoded = runtime.encodeAddressSpace({
    micro: { gate: 24, line: 1, color: 3, tone: 3, base: 1 },
    macro: { planet: 0, dimension: 0, zodiac: 5, house: 4 },
  });
  const decoded = runtime.decodeAddressSpace(encoded);
  assert.deepEqual(decoded.micro, { gate: 24, line: 1, color: 3, tone: 3, base: 1 });
  assert.deepEqual(decoded.macro, { planet: 0, dimension: 0, zodiac: 5, house: 4 });
});


test('MESH COMPUTER: dormant state holds events and resumes without losing mesh identity', async () => {
  let now = 1000;
  const runtime = await new MobileComputerRuntime({ persistence: new MemoryPersistence(), namespace: 'mesh-sleep-test' }).boot();
  runtime.continuity.clock = () => now;
  await runtime.meshKernel.join('synthia', { kind: 'resident-agent', residency: 'hot', publicState: { identity: 'Synthia' } });
  await runtime.sleep();
  assert.equal(runtime.meshKernel.get('synthia').residency, 'warm');
  now += 86_400_000;
  await runtime.queueDormantEvent({ type: 'world:event', payload: { kind: 'visitor-arrived' }, at: now - 1000 });
  const woke = await runtime.wake({ resolveEvent: async event => ({ eventId: event.id, status: 'reconciled' }) });
  assert.equal(woke.pending, 1);
  assert.equal(woke.elapsed, 86_400_000);
  assert.equal(runtime.meshKernel.get('synthia').publicState.identity, 'Synthia');
});

test('INDIVERSE: canonical object remains invariant while host qualia grammar changes expression', async () => {
  const runtime = await new MobileComputerRuntime({ persistence: new MemoryPersistence(), namespace: 'indiverse-test' }).boot();
  await runtime.defineIndiVerse('adaya', {
    grammar: { orientation: { roof: 'ground-plane' }, threshold: { entry: 'extends-to-floor' }, palette: 'host-defined' },
    invariants: { preserve: ['identity','function','relationships','entry'] },
  });
  const house = { id: 'house-1', type: 'building', function: 'home', entry: { id: 'front-door' }, relationships: ['resident:adaya'] };
  const view = runtime.renderIndiVerse('adaya', house, { id: 'visitor' });
  assert.equal(view.canonical.id, 'house-1');
  assert.equal(view.rendered.id, 'house-1');
  assert.equal(view.grammar.orientation.roof, 'ground-plane');
  assert.equal(view.rendered.qualiaGrammar.threshold.entry, 'extends-to-floor');
});

test('DORMANT COMPILER: compiles only on cache miss then sleeps again', async () => {
  const runtime = await new MobileComputerRuntime({ persistence: new MemoryPersistence(), namespace: 'compiler-test' }).boot();
  let calls = 0;
  runtime.registerCompilerBackend('wasm', { compile: async spec => { calls++; return { artifactHash: 'artifact-'+spec.sourceHash, location: '/cache/'+spec.id+'.wasm' }; } });
  const first = await runtime.ensureCompiled({ id: 'grapple-hand', target: 'wasm', sourceHash: 'abc123' });
  const second = await runtime.ensureCompiled({ id: 'grapple-hand', target: 'wasm', sourceHash: 'abc123' });
  assert.equal(calls, 1);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(runtime.compiler.lifecycle, 'dormant');
});
