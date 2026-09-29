import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { MacHandBridge } from '../src/solo/mac-hand-adapter.mjs';

test('Mac residence adapter authenticates, lists apps and opens an app through the shared protocol', async (t) => {
  const token = 'pair-test-token';
  const calls = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      assert.equal(request.headers.authorization, `Bearer ${token}`);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
      calls.push({ method: request.method, url: request.url, body });
      const payload = request.url === '/status'
        ? { ok: true, residence: 'macos', hostname: 'Test-Mac', arch: 'arm64' }
        : request.url === '/apps'
          ? { ok: true, count: 1, apps: [{ name: 'Safari', bundleId: 'com.apple.Safari' }] }
          : { ok: true, action: 'open-app', name: body.name };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(payload));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const bridge = new MacHandBridge({ baseUrl: `http://127.0.0.1:${address.port}`, token });

  const status = await bridge.status();
  assert.equal(status.reachable, true);
  assert.equal(status.residence, 'macos');
  const apps = await bridge.apps();
  assert.equal(apps.apps[0].name, 'Safari');
  const opened = await bridge.openApp({ name: 'Safari' });
  assert.equal(opened.ok, true);
  assert.deepEqual(calls.map(call => call.url), ['/status', '/apps', '/open-app']);
});

test('front screen contains both Android and Mac runtime surfaces', async () => {
  const root = new URL('../../../', import.meta.url);
  const [html, app, solo, server, swift] = await Promise.all([
    readFile(new URL('computer/hover/ui/index.html', root), 'utf8'),
    readFile(new URL('computer/hover/ui/app.mjs', root), 'utf8'),
    readFile(new URL('computer/hover/src/solo/solo-runtime.mjs', root), 'utf8'),
    readFile(new URL('computer/hover/src/ui/server.mjs', root), 'utf8'),
    readFile(new URL('desktop/mac/SynthiaHost.swift', root), 'utf8'),
  ]);
  assert.match(html, /data-surface="android"/);
  assert.match(html, /data-surface="mac"/);
  assert.match(app, /\/api\/solo\/mac\/configure/);
  assert.match(app, /\/api\/solo\/mac\/apps/);
  assert.match(solo, /new MacHandBridge/);
  assert.match(server, /\/api\/solo\/mac\/open-app/);
  assert.match(swift, /SYNTHIA_MAC_BRIDGE_TOKEN/);
  assert.match(swift, /WKWebView/);
});
