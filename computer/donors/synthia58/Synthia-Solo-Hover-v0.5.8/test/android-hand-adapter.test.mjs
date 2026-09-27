import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { AndroidHandBridge } from '../src/solo/android-hand-adapter.mjs';

async function fakeBridge() {
  const calls = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    calls.push({ method: req.method, url: req.url, body });
    const payload = req.url === '/status'
      ? { ok: true, accessibilityEnabled: true, overlayAllowed: true }
      : { ok: true, accepted: true, url: req.url, body };
    const text = JSON.stringify(payload);
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
    res.end(text);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return { calls, server, url: `http://127.0.0.1:${address.port}` };
}

test('AndroidHandBridge reaches localhost host and translates direct commands', async (t) => {
  const fake = await fakeBridge();
  t.after(() => fake.server.close());
  const hand = new AndroidHandBridge({ baseUrl: fake.url });

  const status = await hand.status();
  assert.equal(status.available, true);

  await hand.command('tap 120 340');
  await hand.command('scroll down');
  await hand.command('back');
  await hand.command('click Continue');
  await hand.command('type hello Cynthia');

  assert.deepEqual(fake.calls.slice(1).map((x) => x.url), [
    '/tap', '/scroll', '/global', '/click-text', '/set-text',
  ]);
  assert.deepEqual(fake.calls[1].body, { x: 120, y: 340 });
  assert.equal(fake.calls[3].body.action, 'BACK');
});

test('AndroidHandBridge leaves non-device chat untouched', async () => {
  const hand = new AndroidHandBridge({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 50 });
  const result = await hand.command('tell me about the moon');
  assert.equal(result.status, 'NO_DIRECT_ANDROID_ACTION');
  assert.equal(result.action, null);
});
