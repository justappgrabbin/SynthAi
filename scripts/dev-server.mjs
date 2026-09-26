import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve('public');
const args = process.argv.slice(2);
const option = (name, fallback) => args[args.indexOf(name) + 1] || fallback;
const host = option('--host', '0.0.0.0');
const port = Number(option('--port', '4173'));
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json' };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (target !== root && !target.startsWith(root + sep)) throw new Error('outside public root');
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    const extension = target.slice(target.lastIndexOf('.'));
    response.setHeader('Content-Type', types[extension] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
}).listen(port, host, () => console.log(`Computer preview ready on ${host}:${port}`));
