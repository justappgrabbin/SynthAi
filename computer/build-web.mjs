import { cp, rm, mkdir } from 'node:fs/promises';
const to = new URL('../public/computer-runtime/',import.meta.url);
await rm(to,{recursive:true,force:true});
await mkdir(to,{recursive:true});
for(const d of ['core','runtime','adapters','micros']) {
  await cp(new URL(`./${d}/`,import.meta.url),new URL(`./${d}/`,to),{recursive:true});
}
// Expose only the existing browser-compatible Computer donor language modules and
// archive bridge. Original donor files remain read-only and unchanged.
await mkdir(new URL('./services/',to),{recursive:true});
for(const name of ['synthia-resident.mjs','browser-archive-connector.mjs','proactive-synthia.mjs']) {
  await cp(new URL(`./services/${name}`,import.meta.url),new URL(`./services/${name}`,to));
}
await cp(new URL('./engines/unified-execution-spine/src/pure-synthia/',import.meta.url),
         new URL('./engines/unified-execution-spine/src/pure-synthia/',to),{recursive:true});
await cp(new URL('./ComputerRuntime.mjs',import.meta.url),new URL('./ComputerRuntime.mjs',to));
console.log('Computer browser source, resident, donor engines, and archive bridge staged');
