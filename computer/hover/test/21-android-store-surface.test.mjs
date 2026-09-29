import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);

test('Synthia Android exposes Android, Google Play, and compatibility fallbacks', async () => {
  const [html, app, adapter, bridge, gradle] = await Promise.all([
    readFile(new URL('computer/hover/ui/index.html', root), 'utf8'),
    readFile(new URL('computer/hover/ui/app.mjs', root), 'utf8'),
    readFile(new URL('computer/hover/src/solo/android-hand-adapter.mjs', root), 'utf8'),
    readFile(new URL('android-app/app/src/hover/java/app/synthai/hover/LocalBridgeServer.java', root), 'utf8'),
    readFile(new URL('android-app/app/build.gradle', root), 'utf8'),
  ]);

  assert.match(html, /data-surface="android"/);
  assert.match(html, /com\.openai\.chatgpt/);
  assert.match(html, /com\.anthropic\.claude/);
  assert.match(html, /tech\.butterfly\.app/);
  assert.match(html, /https:\/\/chatgpt\.com\//);
  assert.match(html, /https:\/\/claude\.ai\//);
  assert.match(html, /https:\/\/manus\.im\//);

  assert.match(app, /\/api\/solo\/android\/apps/);
  assert.match(app, /\/api\/solo\/android\/store/);
  assert.match(adapter, /\/play-store/);
  assert.match(adapter, /\/store-status/);
  assert.match(bridge, /"\/apps"/);
  assert.match(bridge, /"\/play-store"/);
  assert.match(bridge, /com\.android\.vending/);
  assert.match(gradle, /applicationId 'app\.synthai\.android'/);
  assert.match(gradle, /versionName '0\.6\.0-android-runtime-store'/);
});
