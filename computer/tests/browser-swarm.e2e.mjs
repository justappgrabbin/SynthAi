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

const ROOT = resolve(fileURLToPath(new URL('../../public/', import.meta.url)));
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
  const response = await page.goto(url + '/', { waitUntil: 'load' });
  assert.equal(response.status(), 200, 'existing Computer page served');
  try {
    await page.waitForFunction(
      () => Boolean(window.SynthAIComputer?.nativeKlein) &&
        document.getElementById('bootLabel')?.textContent === 'runtime online',
      null, { timeout: 10000 },
    );
  } catch (error) {
    console.error('BROWSER_BOOT_ERRORS', JSON.stringify(errors));
    console.error('BROWSER_BOOT_STATE', await page.evaluate(() => ({
      label: document.getElementById('bootLabel')?.textContent,
      scripts: [...document.scripts].map(s => s.src),
      title: document.title,
    })));
    throw error;
  }
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
  // Learning changes the REAL donor grammar, not a UI-only command list.
  await page.locator('.formation-teacher summary').click();
  await page.locator('#teachAutoling').click();
  await page.waitForFunction(() => document.getElementById('ruleMessage').textContent.includes('learned ADMIRES'));
  assert.match(await page.locator('#formationMemory').innerText(), /3 AUTOLING grammar rules/);
  await page.locator('#formationText').fill('owl admires moon');
  await page.locator('#runFormation').click();
  await page.waitForFunction(() => document.getElementById('formationOutput').textContent.includes('Recognized ADMIRES'));
  assert.match(await page.locator('#formationMemory').innerText(), /3 native lexical records/);

  // Fresh browser page over the SAME IndexedDB. Formations + native vectors
  // must be reconstructed from durable Computer grammar-v1 event history.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.SynthAIComputer?.nativeKlein && document.getElementById('bootLabel')?.textContent === 'runtime online');
  await page.locator('[data-view="systems"]').click();
  await page.waitForFunction(() => document.getElementById('formationStatus').textContent === '3 executable');
  assert.match(await page.locator('#formationMemory').innerText(), /3 native lexical records/);
  assert.match(await page.locator('#formationMemory').innerText(), /3 AUTOLING grammar rules/);
  await page.locator('#formationText').fill('bear admires stars');
  await page.locator('#runFormation').click();
  await page.waitForFunction(() => document.getElementById('formationMemory').textContent.includes('4 native lexical records'));
  assert.match(await page.locator('#formationOutput').innerText(), /Recognized ADMIRES/);
  const history = await page.evaluate(() => window.SynthAIComputer.formationHistory('klein:autoling+diseminer'));
  assert.ok(history.some(event => event.input.action === 'create'));
  assert.ok(history.some(event => event.input.action === 'execute'));
  const memoryHistory = await page.evaluate(() => window.SynthAIComputer.eventEmitter.history('klein:diseminer-memory'));
  assert.equal(memoryHistory.length, 4);
  const rules = await page.evaluate(() => window.SynthAIComputer.eventEmitter.history('klein:autoling-memory'));
  assert.equal(rules.length, 1);

  // REAL browser pixels: no stock art, mocked algorithm or off-device image.
  // These fixtures encode a measurable changing illumination field and texture.
  const images = await page.evaluate(() => {
    const w = 96, h = 128;
    const make = shifted => {
      const surface = document.createElement('canvas');
      surface.width = w; surface.height = h;
      const c = surface.getContext('2d');
      const image = c.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = 2 * x / (w - 1) - 1, dy = 2 * y / (h - 1) - 1;
        const disc = Math.max(0, 55 - Math.hypot(x - 44 - (shifted ? 3 : 0), y - 65) * 2);
        const rgb = [105 + disc + x * .35, 115 + disc / 2 + y * .25, 130 + disc / 3];
        const shift = shifted ? [9 + 16 * dx + 7 * dy, 5 - 11 * dx + 9 * dy, -4 + 6 * dx - 5 * dy] : [0, 0, 0];
        const offset = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) image.data[offset + ch] = Math.max(0, Math.min(255, rgb[ch] + shift[ch]));
        image.data[offset + 3] = 255;
      }
      c.putImageData(image, 0, 0);
      return surface.toDataURL('image/png').split(',')[1];
    };
    return { source: make(false), target: make(true) };
  });
  await page.locator('#fitnessMorphLab summary').click();
  await page.locator('#fitnessSource').setInputFiles({
    name: 'observed-source.png', mimeType: 'image/png', buffer: Buffer.from(images.source, 'base64'),
  });
  await page.locator('#fitnessTarget').setInputFiles({
    name: 'observed-target.png', mimeType: 'image/png', buffer: Buffer.from(images.target, 'base64'),
  });
  await page.locator('#runSwarmFit').click();
  await page.waitForFunction(() => {
    const t = document.getElementById('fitnessStatus')?.textContent || '';
    return t.includes('Accepted:') || t.includes('Not accepted:') || t.includes('requires');
  }, null, { timeout: 35000 });
  assert.match(await page.locator('#fitnessEvidence').innerText(), /held-out error/);
  const fitHistory = await page.evaluate(() =>
    window.SynthAIComputer.fitnessMorph.history('studio-lighting'));
  assert.equal(fitHistory.length, 1);
  assert.equal(fitHistory[0].input.samples, undefined,
    'real pixels and private images are absent from the append-only event history');
  const lightingImage = await page.locator('#fitnessPreview').evaluate(canvas =>
    Array.from(canvas.getContext('2d').getImageData(10, 15, 1, 1).data));
  assert.equal(lightingImage[3], 255);

  await page.locator('#runFrameMorph').click();
  await page.waitForFunction(() =>
    (document.getElementById('fitnessStatus')?.textContent || '').includes('Executable frame morph rendered'),
    null, { timeout: 35000 });
  assert.match(await page.locator('#fitnessEvidence').innerText(), /native Simlish mesh vertices/);
  const morphImage = await page.locator('#fitnessPreview').evaluate(canvas =>
    Array.from(canvas.getContext('2d').getImageData(10, 15, 1, 1).data));
  assert.equal(morphImage[3], 255);
  await page.locator('#evolveLighting').click();
  await page.waitForFunction(() => /^(Accepted:|Rejected:)/.test(
    document.getElementById('fitnessStatus')?.textContent || ''),
    null, { timeout: 35000 });
  assert.match(await page.locator('#fitnessEvidence').innerText(), /candidate selected/);
  const historyOfEvolution = await page.evaluate(() =>
    window.SynthAIComputer.fitnessMorph.evolutionHistory());
  assert.equal(historyOfEvolution.length, 1);
  assert.equal(historyOfEvolution[0].result.candidates.length, 2);
  assert.equal(historyOfEvolution[0].input.samples, undefined);
  const evolved = await page.evaluate(() =>
    window.SynthAIComputer.formations.describe('simlish:lighting-active'));
  assert.ok(evolved.activeRevision);
  assert.match(evolved.revisions[0].graph.edges[0].functionId, /simlish.evolution.constant/);

  const morphs = await page.evaluate(() => window.SynthAIComputer.formations.list()
    .filter(f => f.id.startsWith('simlish:')).map(f => f.id));
  assert.deepEqual(morphs, ['simlish:frame-geometry', 'simlish:lighting-active', 'simlish:lighting-constant', 'simlish:lighting-gradient', 'simlish:swarm-lighting']);

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.SynthAIComputer?.fitnessMorph));
  assert.equal((await page.evaluate(() => window.SynthAIComputer.fitnessMorph.history())).length, 1);
  assert.equal((await page.evaluate(() => window.SynthAIComputer.fitnessMorph.evolutionHistory())).length, 1);
  const restoredForms = await page.evaluate(() => window.SynthAIComputer.formations.list()
    .filter(f => f.id.startsWith('simlish:')).map(f => f.id));
  assert.deepEqual(restoredForms, morphs, 'real native geometry and fitness formations recover from IndexedDB');
  console.log('Real browser images: local Simlish CPU PSO fitness + triangle-warp image morph + IndexedDB replay: PASS');
  assert.equal(offDevice.length, 0, 'no off-device browser requests during test');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('Browser formation: native Klein + ATO execution, offline action, local memory replay, bottom navigation: PASS');
} finally {
  await page.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
