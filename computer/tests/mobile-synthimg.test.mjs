import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { MemoryPersistence } from '../core/kernel.mjs';
import { parseSynthImage } from '../mobile/SynthImageRuntime.mjs';
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
