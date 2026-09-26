import { cp, rm, mkdir } from 'node:fs/promises';

const to = new URL('../public/computer-runtime/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });

for (const dir of ['core', 'runtime', 'adapters', 'micros', 'mobile', 'worlds', 'residents', 'services']) {
  await cp(new URL(`./${dir}/`, import.meta.url), new URL(`./${dir}/`, to), { recursive: true });
}

await mkdir(new URL('./donors/recovered/', to), { recursive: true });
await cp(
  new URL('./donors/recovered/you-n-i-verse-corrected/', import.meta.url),
  new URL('./donors/recovered/you-n-i-verse-corrected/', to),
  { recursive: true }
);

await cp(new URL('./ComputerRuntime.mjs', import.meta.url), new URL('./ComputerRuntime.mjs', to));
await cp(new URL('./BrowserComputerRuntime.mjs', import.meta.url), new URL('./BrowserComputerRuntime.mjs', to));
await cp(new URL('./phone-acceptance-report.mjs', import.meta.url), new URL('./phone-acceptance-report.mjs', to));

console.log('SynthAI browser and mobile Computer runtimes staged');
