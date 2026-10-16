/**
 * Real headless Chromium verification of the existing SynthAI Computer shell.
 * Static file delivery only. Actual browser IndexedDB, recovered ATO modules,
 * native AUTOLING and Disseminer; NO app backend, workers or remote API.
 * Playwright is a CI-only test dependency, not packaged with the app.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../../public/', import.meta.url));
const types = {
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const raw = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(ROOT, '.' + (raw === '/' ? '/index.html' : raw));
    if (!target.startsWith(ROOT + sep) && target !== ROOT) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    res.writeHead(404).end('Missing local module');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 850 } });
const errors = [];
const offDevice = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (!request.url().startsWith(url + '/')) offDevice.push(request.url());
});
try {
  await page.goto(url + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.SynthAIComputer?.nativeKlein && document.getElementById('bootLabel')?.textContent === 'runtime online', { timeout: 25000 });
  assert.equal(await page.locator('#runtimeStatus').innerText(), 'LOCAL');
  await page.locator('[data-view="systems"]').click();
  await page.locator('#assembleKlein').click();
  await page.waitForFunction(() => document.getElementById('formationStatus').textContent === '3 executable');
  assert.equal(await page.locator('#formationPicker').inputValue(), 'klein:autoling+diseminer');
  assert.match(await page.locator('#formationList').innerText(), /klein:autoling\+diseminer/);
  await page.locator('#runFormation').click();
  await page.waitForFunction(() => document.getElementById('formationOutput').textContent.includes('Recognized'));
  assert.match(await page.locator('#formationOutput').innerText(), /Recognized HAS_PROPERTY/);
  assert.match(await page.locator('#formationMemory').innerText(), /1 native lexical records/);

  const shellBottom = await page.locator('.rail').evaluate(el => Math.round(el.getBoundingClientRect().bottom));
  assert.equal(shellBottom, 850, 'phone navigation is fixed to bottom');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  assert.equal(hasOverflow, false, 'phone-first interface has no horizontal overflow');

  // All modules have loaded. Prevent network requests before a second action.
  // The ATO/Klein execution must continue without backend or external LLM.
  await page.route('**/*', route => route.abort());
  await page.locator('#formationText').fill('dragon is alert');
  await page.locator('#runFormation').click();
  await page.waitForFunction(() => document.getElementById('formationOutput').textContent.includes('dragon / is / alert'));
  assert.match(await page.locator('#formationMemory').innerText(), /2 native lexical records/);
  await page.unroute('**/*');

  // Fresh browser page over the SAME IndexedDB. Formations + native vectors
  // must be reconstructed from durable Computer grammar-v1 event history.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.SynthAIComputer?.nativeKlein && document.getElementById('bootLabel')?.textContent === 'runtime online');
  await page.locator('[data-view="systems"]').click();
  await page.waitForFunction(() => document.getElementById('formationStatus').textContent === '3 executable');
  assert.match(await page.locator('#formationMemory').innerText(), /2 native lexical records/);
  await page.locator('#runFormation').click();
  await page.waitForFunction(() => document.getElementById('formationMemory').textContent.includes('3 native lexical records'));
  const history = await page.evaluate(() => window.SynthAIComputer.formationHistory('klein:autoling+diseminer'));
  assert.ok(history.some(event => event.input.action === 'create'));
  assert.ok(history.some(event => event.input.action === 'execute'));
  const memoryHistory = await page.evaluate(() => window.SynthAIComputer.eventEmitter.history('klein:diseminer-memory'));
  assert.equal(memoryHistory.length, 3);
  assert.equal(offDevice.length, 0, 'no off-device browser requests during test');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('Browser formation: native Klein + ATO execution, offline action, local memory replay, bottom navigation: PASS');
} finally {
  await page.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
