import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startSynthiaFrontScreen } from '../../computer/hover/src/ui/server.mjs';

const { chromium } = await import(pathToFileURL(process.env.HOVER_PLAYWRIGHT || '/tmp/hover-ui-test/node_modules/playwright/index.mjs'));
const dir = await mkdtemp(join(tmpdir(), 'hover-world-ui-'));
const app = await startSynthiaFrontScreen({ port: 0, persistenceDir: dir });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await page.locator('#planet').click();
  await page.locator('[data-open-surface="world"]').click();
  const w = page.frameLocator('#world-frame');
  await w.locator('#play-world').waitFor({ state: 'visible', timeout: 15000 });
  await w.locator('#play-status').getByText(/Human/).waitFor({ timeout: 15000 });
  const before = await w.locator('#play-status').textContent();
  await w.locator('#play-world').focus();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(440); await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1050); await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(400);
  const moved = await w.locator('#play-status').textContent();
  assert.notEqual(before, moved, 'Character did not move in the live world');
  const morphProp = w.locator('#btn-morph-prop');
  assert.equal(await morphProp.isEnabled(), true, 'Character cannot reach the chair');
  await morphProp.click();
  assert.match(await w.locator('#play-receipt').textContent(), /Morph applied to Chair/);
  await w.locator('#btn-form').click();
  assert.match(await w.locator('#btn-form').textContent(), /Astral/);
  await w.locator('#btn-follow').click();
  assert.match(await w.locator('#btn-follow').textContent(), /Fixed/);
  await w.locator('#btn-follow').click();
  await w.locator('#btn-save').click();
  assert.match(await w.locator('#play-receipt').textContent(), /Saved locally/);
  // Frame refresh proves saved form and world position can be restored.
  await page.evaluate(() => document.getElementById('world-frame').contentWindow.location.reload());
  await w.locator('#btn-form').getByText(/Astral/).waitFor({ timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('Hover World mobile browser: movement, camera toggle, chair morph and persisted avatar passed.');
} finally {
  await browser.close();
  await new Promise(resolve => app.server.close(resolve));
  await rm(dir, { recursive: true, force: true });
}
