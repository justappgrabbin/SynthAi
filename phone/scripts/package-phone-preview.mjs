import { cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
const destination=new URL('../android/app/preview-assets/preview/',import.meta.url);
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
await cp(new URL('../web/dist/',import.meta.url),destination,{recursive:true});
const index=new URL('index.html',destination);
await writeFile(index,(await readFile(index,'utf8')).replaceAll('"/assets/','"/assets/preview/assets/').replaceAll('"/favicon.svg"','"/assets/preview/favicon.svg"'));
console.log('Packaged the actual built interface and research protocols for offline inspection.');
