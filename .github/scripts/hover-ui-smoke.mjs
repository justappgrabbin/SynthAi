import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startSynthiaFrontScreen } from '../../computer/donors/synthia58/Synthia-Solo-Hover-v0.5.8/src/ui/server.mjs';
const { chromium } = await import(pathToFileURL(process.env.HOVER_PLAYWRIGHT || '/tmp/hover-ui-test/node_modules/playwright/index.mjs'));
const dir = await mkdtemp(join(tmpdir(), 'hover-ui-'));
const app = await startSynthiaFrontScreen({ port: 0, persistenceDir: dir });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await page.locator('#planet').click();
  const buttons = page.locator('.radial-item');
  await page.waitForTimeout(400);
  const boxes = await Promise.all(Array.from({ length: 5 }, (_, i) => buttons.nth(i).boundingBox()));
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    assert.ok(a && a.x >= 0 && a.y >= 0 && a.x + a.width <= 360 && a.y + a.height <= 640);
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      // Circular touch surfaces must not overlap.
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.width - 1);
    }
  }
  await page.locator('[data-open-surface="chat"]').click();
  await page.locator('#chat-input').fill('Hello from the repaired hover');
  await page.locator('#chat-form button').click();
  await page.locator('#setup-dialog[open]').waitFor();
  await page.locator('#birth-place').fill('Test Place');
  await page.reload();
  await page.locator('#planet').click();
  await page.locator('[data-open-surface="chat"]').click();
  await page.locator('#chat-input').fill('Continue after setup');
  await page.locator('#chat-form button').click();
  await page.locator('#setup-dialog[open]').waitFor();
  assert.equal(await page.locator('#birth-place').inputValue(), 'Test Place');
  for (const [id, value] of Object.entries({ 'birth-date':'2000-01-01', 'birth-time':'12:34:56', 'birth-timezone':'America/New_York', 'birth-latitude':'40.7128', 'birth-longitude':'-74.006' })) await page.locator('#' + id).fill(value);
  await page.locator('#identity-form button[type=submit]').click();
  await page.locator('#setup-dialog').waitFor({ state: 'hidden', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#planet-label').textContent.includes('online'));
  await page.locator('#planet').click();
  await page.locator('#planet').click();
  await page.locator('[data-open-surface="build"]').click();
  await page.locator('#build-studio').click();
  const studio = page.frameLocator('#build-frame');
  await studio.locator('#log').getByText(/"ready": true/).waitFor();
  await studio.locator('#fileInput').setInputFiles({ name: 'double.js', mimeType: 'application/javascript', buffer: Buffer.from('function double(n) { return n * 2; }') });
  await studio.locator('#fileList').getByText('double.js').waitFor();
  await studio.locator('[data-tab="functions"]').click();
  await studio.locator('#functionList').getByText('double', { exact: true }).waitFor();
  await studio.locator('#executeBtn').click();
  await page.waitForTimeout(1200);
  const studioExecution = await studio.locator('#log').textContent();
  assert.match(studioExecution, /"ok": true/, `Studio execution result: ${studioExecution}`);
  await page.locator('#build-tools').click();
  await page.frameLocator('#build-frame').locator('#tray.active').waitFor();
  const tools = page.frameLocator('#build-frame');
  await tools.locator('#factory-purpose').fill('AutoLing resident language architecture');
  await tools.locator('#factory-dimension').selectOption('Design');
  await tools.locator('#factory-create').click();
  await tools.locator('#factory-state').getByText('mounted').waitFor();
  await tools.locator('#factory-input').fill('quality-aware language system');
  await tools.locator('#factory-run').click();
  await tools.locator('#factory-state').getByText('executed').waitFor();
  await tools.locator('#factory-output').getByText('quality').waitFor();
  await page.locator('#build-talk').click();
  await page.frameLocator('#build-frame').locator('#msg').fill('next steps');
  await page.frameLocator('#build-frame').locator('button[type=submit]').click();
  await page.frameLocator('#build-frame').getByText(/near.term route to success/).waitFor();
  assert.deepEqual(errors, []);
  console.log('Hover phone UI: distinct radial targets, editable and retained birth entry, configuration, embedded tools and Talk passed');
} finally {
  await browser.close();
  await new Promise(resolve => app.server.close(resolve));
  await rm(dir, { recursive: true, force: true });
}
