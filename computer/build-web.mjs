import { cp, rm, mkdir } from 'node:fs/promises';

const to = new URL('../public/computer-runtime/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });

for (const dir of ['core', 'runtime', 'adapters', 'micros']) {
  await cp(new URL(`./${dir}/`, import.meta.url), new URL(`./${dir}/`, to), { recursive: true });
}

await cp(new URL('./BrowserComputerRuntime.mjs', import.meta.url), new URL('./BrowserComputerRuntime.mjs', to));

console.log('SynthAI browser-host runtime staged');
