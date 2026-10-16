/**
 * Stage only the Computer modules used by the existing browser shell.
 * The Node backend services stay in /computer and are dynamically mounted
 * there, not bundled into Android/browser. ATO Core is the live donor executed
 * by ComputerFormationService, not a second copy of the runtime architecture.
 */
import { cp, rm, mkdir } from 'node:fs/promises';

const to = new URL('../public/computer-runtime/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
for (const dir of ['core', 'runtime', 'adapters', 'micros']) {
  await cp(new URL('./' + dir + '/', import.meta.url), new URL('./' + dir + '/', to),
    { recursive: true });
}
for (const dir of ['events', 'registry', 'services']) {
  await mkdir(new URL('./' + dir + '/', to), { recursive: true });
}
const files = [
  'ComputerRuntime.mjs',
  'events/event-grammar.mjs',
  'events/browser-event-emitter.mjs',
  'registry/capability-registry.mjs',
  'registry/capability-registry.json',
  'services/executable-formations.mjs',
  'services/native-klein-memory.mjs',
  'services/fitness-morph.mjs',
];
for (const file of files) {
  await cp(new URL('./' + file, import.meta.url), new URL('./' + file, to));
}
const ato = 'donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/vendor/ato-core/src/';
await mkdir(new URL('./' + ato, to), { recursive: true });
await cp(new URL('./' + ato, import.meta.url), new URL('./' + ato, to), { recursive: true });
const morph = 'donors/verified/simlish/';
await mkdir(new URL('./' + morph, to), { recursive: true });
await cp(new URL('./' + morph, import.meta.url), new URL('./' + morph, to), { recursive: true });

console.log('Computer browser runtime staged with recovered ATO Core and IndexedDB event history');
