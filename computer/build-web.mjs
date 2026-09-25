import { cp, rm, mkdir } from 'node:fs/promises';

const to = new URL('../public/computer-runtime/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });

for (const d of ['core', 'runtime', 'adapters', 'micros', 'mobile']) {
  await cp(new URL(`./${d}/`, import.meta.url), new URL(`./${d}/`, to), { recursive: true });
}

await mkdir(new URL('./donors/recovered/', to), { recursive: true });
await cp(
  new URL('./donors/recovered/you-n-i-verse-corrected/', import.meta.url),
  new URL('./donors/recovered/you-n-i-verse-corrected/', to),
  { recursive: true }
);

await cp(new URL('./ComputerRuntime.mjs', import.meta.url), new URL('./ComputerRuntime.mjs', to));

console.log('Computer desktop + mobile SynthIMG runtimes staged');
