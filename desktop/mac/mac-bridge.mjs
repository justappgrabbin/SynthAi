import { createServer } from 'node:http';
import { readdir } from 'node:fs/promises';
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const port = Number(process.env.SYNTHIA_MAC_BRIDGE_PORT || 8798);
const host = process.env.SYNTHIA_MAC_BRIDGE_HOST || '0.0.0.0';
const token = String(process.env.SYNTHIA_MAC_BRIDGE_TOKEN || '').trim();
if (!token) throw new Error('SYNTHIA_MAC_BRIDGE_TOKEN is required');

function json(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': bytes.length,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  });
  response.end(bytes);
}

async function bodyOf(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new RangeError('request body exceeds 1 MiB');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function authorized(request) {
  return request.headers.authorization === `Bearer ${token}`;
}

async function apps() {
  const roots = ['/Applications', '/System/Applications', join(homedir(), 'Applications')];
  const found = new Map();
  for (const root of roots) {
    let entries = [];
    try { entries = await readdir(root, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue;
      const name = entry.name.slice(0, -4);
      if (!found.has(name.toLowerCase())) found.set(name.toLowerCase(), { name, bundleId: '' });
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function openApp({ name = '', bundleId = '' } = {}) {
  if (bundleId) {
    await execute('/usr/bin/open', ['-b', String(bundleId)], { timeout: 8000 });
    return { ok: true, action: 'open-app', bundleId: String(bundleId) };
  }
  if (!String(name).trim()) throw new TypeError('name or bundleId is required');
  await execute('/usr/bin/open', ['-a', String(name)], { timeout: 8000 });
  return { ok: true, action: 'open-app', name: String(name) };
}

async function openUrl(raw) {
  const url = new URL(String(raw || ''));
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Only http/https URLs may be opened');
  await execute('/usr/bin/open', [url.href], { timeout: 8000 });
  return { ok: true, action: 'open-url', url: url.href };
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return json(response, 200, { ok: true });
    if (!authorized(request)) return json(response, 401, { ok: false, error: 'Pairing token required' });
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/status') {
      const catalog = await apps();
      return json(response, 200, {
        ok: true,
        residence: 'macos',
        hostname: hostname(),
        platform: process.platform,
        arch: process.arch,
        port,
        count: catalog.length,
      });
    }
    if (request.method === 'GET' && url.pathname === '/apps') {
      const catalog = await apps();
      return json(response, 200, { ok: true, count: catalog.length, apps: catalog });
    }
    if (request.method === 'POST' && url.pathname === '/open-app') {
      return json(response, 200, await openApp(await bodyOf(request)));
    }
    if (request.method === 'POST' && url.pathname === '/open-url') {
      const body = await bodyOf(request);
      return json(response, 200, await openUrl(body.url));
    }
    return json(response, 404, { ok: false, error: `Unknown Mac bridge route: ${request.method} ${url.pathname}` });
  } catch (error) {
    return json(response, 400, { ok: false, error: error.message || String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`Synthia Mac bridge listening on ${host}:${port}`);
});
