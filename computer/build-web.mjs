import { cp, rm, mkdir } from 'node:fs/promises';

const to = new URL('../public/computer-runtime/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
for (const directory of ['core', 'runtime', 'adapters', 'micros', 'services', 'registry', 'events']) {
  await cp(new URL(`./${directory}/`, import.meta.url), new URL(`./${directory}/`, to), { recursive: true });
}
await cp(new URL('./ComputerRuntime.mjs', import.meta.url), new URL('./ComputerRuntime.mjs', to));
const klein = './donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/vendor/ato-core/src/';
await cp(new URL(klein, import.meta.url), new URL(klein, to), { recursive: true });
console.log('Computer browser runtime and native Klein tools staged');
