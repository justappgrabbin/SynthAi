// Hover face ARM64 smoke: boots Synthia 5.8 (node src/ui/server.mjs) inside the hover rootfs
// image under QEMU with the same env HoverRuntime uses on the phone, then probes it.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const image = process.argv[2];
assert.ok(image, 'pass the built ARM64 hover image tag');

const port = 4183;
const base = `http://127.0.0.1:${port}`;
const volume = `synthia-hover-smoke-${process.pid}`;
let container;

async function docker(...args) {
  const result = await exec('docker', args, { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  return result.stdout.trim();
}

async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
  const text = await response.text();
  assert.equal(response.status, 200, `${path} -> ${response.status} ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  const arch = await docker('run', '--rm', '--platform', 'linux/arm64', image, 'uname', '-m');
  assert.equal(arch, 'aarch64', `expected aarch64 guest, got ${arch}`);
  await docker('run', '--rm', '--platform', 'linux/arm64', image, 'sh', '-c',
    'test -x /opt/talk-venv/bin/python3 && test ! -e /opt/synthia-server && test -f /opt/synthia58/src/ui/server.mjs && node --version');

  container = await docker('run', '--detach', '--rm', '--platform', 'linux/arm64', '--network', 'host',
    '--volume', `${volume}:/var/lib/synthai`,
    '--workdir', '/opt/synthia58',
    '--env', `PORT=${port}`, '--env', 'HOST=127.0.0.1',
    '--env', 'SYNTHIA_DATA_DIR=/var/lib/synthai/synthia58',
    '--env', 'SYNTHIA_ANDROID_BRIDGE_URL=http://127.0.0.1:8797',
    image, 'node', '/opt/synthia58/src/ui/server.mjs');

  const deadline = Date.now() + 180000;
  let status;
  while (Date.now() < deadline) {
    try { status = JSON.parse(await get('/api/status')); break; } catch { /* still booting under QEMU */ }
    if (await docker('inspect', '--format', '{{.State.Running}}', container) !== 'true') {
      throw new Error(`hover runtime exited before /api/status: ${await docker('logs', container)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(status, `hover /api/status timed out: ${await docker('logs', container)}`);
  assert.equal(status.ok, true, JSON.stringify(status).slice(0, 400));

  const index = await get('/');
  assert.match(index, /id="workspace"/, 'front screen index is missing the workspace');
  assert.match(index, /id="veil"/, 'front screen index is missing the veil');

  const solo = JSON.parse(await get('/api/solo/status'));
  assert.equal(solo.ok, true);
  assert.equal(solo.mode, 'solo-hover');
  assert.equal(solo.android?.baseUrl, 'http://127.0.0.1:8797', JSON.stringify(solo.android));

  const talkResponse = await fetch(base + '/api/solo/talk/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'next steps' }), signal: AbortSignal.timeout(30000),
  });
  assert.equal(talkResponse.status, 200);
  assert.match((await talkResponse.json()).reply, /near.term route to success/);
  assert.match(await get('/talk/index.html'), /Cynthia/);
  const logs = await docker('logs', container);
  assert.match(logs, /Synthia front screen: http:\/\/127\.0\.0\.1:4183/, logs);
  const data = await docker('exec', container, 'sh', '-c', 'ls -A /var/lib/synthai/synthia58 | head -20');
  console.log(`hover data dir entries:\n${data || '(empty)'}`);
  console.log(`ARM64 hover smoke ok: ${base} status.ok=true, index has workspace, android bridge ${solo.android.baseUrl}`);
}

try {
  await main();
} finally {
  if (container) await docker('stop', '--time', '3', container).catch(() => {});
  await docker('volume', 'rm', '-f', volume).catch(() => {});
}
