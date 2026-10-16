import fs from 'node:fs';
const idx=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../synthia-runtime.html',import.meta.url),'utf8');
for(const bad of ['residenceGate','approveResidence'])if(idx.includes(bad)||app.includes(bad))throw new Error(`blocking residence surface remains: ${bad}`);
// R21.5 intentionally restores installable PWA surfaces; they are installation UX, not residence approval gates.
if(!app.includes('approved:true'))throw new Error('local runtime does not start approved');
if(!runtime.includes('data-tab="ground"')||!runtime.includes('data-tab="world"')||!runtime.includes('data-tab="workshop"')||!runtime.includes('data-tab="learn"')||!runtime.includes('data-tab="system"'))throw new Error('R21 cultivation runtime surfaces missing');
if(!idx.includes('synthia-runtime.html'))throw new Error('phone shell is not wired to the cultivation runtime');
console.log('r20.3 local-runtime constraint retained inside R21: PASS');
