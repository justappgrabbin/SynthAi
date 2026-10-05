import { cp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = new URL('./donors/consciousness-realm/', import.meta.url);
for (const args of [['ci', '--no-audit', '--no-fund'], ['exec', 'vite', 'build']]) {
  const result = spawnSync('npm', args, { cwd: fileURLToPath(source), stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Consciousness Realm build failed (${result.status})`);
}
const output = new URL('../public/realm/', import.meta.url);
await rm(output, { recursive: true, force: true });
await cp(new URL('./dist/public/', source), output, { recursive: true });
