import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

// The verifier receives an app file, not the server credentials or job database.
const html = await readFile(process.argv[2], 'utf8');
const server = createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin);
  await page.locator('#text').fill('Worker verification entry');
  await page.locator('form button').click();
  if (await page.locator('#items li span').textContent() !== 'Worker verification entry') throw new Error('Entry creation failed');
  const complete = page.getByRole('button', { name: 'Done', exact: true });
  const isTracker = Boolean(await complete.count());
  if (isTracker) { await complete.click(); if (await page.locator('.done').count() !== 1) throw new Error('Task completion failed'); }
  await page.reload();
  if (await page.locator('#items li span').textContent() !== 'Worker verification entry') throw new Error('Saved data recovery failed');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  if (await page.locator('#items li').count()) throw new Error('Delete failed');
  if (errors.length) throw new Error(errors.join('; '));
  console.log(JSON.stringify({ ok: true, checks: ['entry creation', 'saved data recovery', 'deletion', ...(isTracker ? ['task completion'] : [])] }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
