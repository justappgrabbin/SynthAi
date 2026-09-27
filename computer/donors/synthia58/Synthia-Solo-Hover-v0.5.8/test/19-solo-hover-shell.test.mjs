import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SoloTaskStore } from '../src/solo/solo-task-store.mjs';
import { SoloBrowserHand } from '../src/solo/browser-hand-adapter.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('solo hover shell contains five persistent surfaces and planet body', async () => {
  const html = await readFile(join(ROOT, 'ui', 'index.html'), 'utf8');
  for (const surface of ['browser','chat','world','todo','build']) assert.match(html, new RegExp(`data-open-surface="${surface}"`));
  assert.match(html, /id="planet"/);
  assert.match(html, /synthia-planet\.png/);
});

test('solo task store persists tasks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-solo-task-'));
  try {
    const store = new SoloTaskStore({ persistenceDir: dir });
    const task = await store.add({ text: 'Wire the hover shell' });
    await store.update(task.id, { done: true });
    const restored = new SoloTaskStore({ persistenceDir: dir });
    const tasks = await restored.list();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].done, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('browser hand can inspect, screenshot and fill approved fields through Chromium', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-solo-browser-'));
  const browser = new SoloBrowserHand({ persistenceDir: dir, width: 430, height: 760 });
  t.after(async () => { await browser.close(); await rm(dir, { recursive: true, force: true }); });
  if (!browser.status().available) return t.skip('Chromium/Chrome not available');
  const opened = await browser.loadHTML(`<!doctype html><html><head><title>Form Test</title></head><body><h1>Apply</h1><form id="f"><label>Name<input name="name" required></label><button type="button" onclick="document.body.dataset.clicked='yes'">Continue</button></form></body></html>`, { url: 'https://synthia.local/form' });
  assert.equal(opened.page.title, 'Form Test');
  assert.match(opened.screenshot, /^data:image\/png;base64,/);
  const filled = await browser.fillFields({ name: 'Synthia' });
  assert.equal(filled.validation.valid, true);
  const page = await browser.executor.inspectPage();
  assert.equal(page.forms[0].fields.find((f) => f.name === 'name').value, 'Synthia');
});
