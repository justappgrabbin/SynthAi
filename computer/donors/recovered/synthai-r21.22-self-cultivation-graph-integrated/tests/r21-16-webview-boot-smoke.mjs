import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const staticImport=/(?:^|\n)\s*(?:import|export)\s+(?!\()(?:(?:[^'"\n]*?)\s+from\s+)?['"]([^'"]+)['"]/g;
const seen=new Set(),queue=['app.mjs'],bad=[];
while(queue.length){const rel=queue.shift();if(seen.has(rel))continue;seen.add(rel);const file=path.join(root,rel);if(!fs.existsSync(file))continue;const src=fs.readFileSync(file,'utf8');for(const m of src.matchAll(staticImport)){const spec=m[1];if(spec.startsWith('node:')){bad.push({rel,spec});continue;}if(!spec.startsWith('.'))continue;let next=path.normalize(path.join(path.dirname(rel),spec)).replaceAll('\\','/');if(!path.extname(next)){for(const ext of ['.mjs','.js','.json'])if(fs.existsSync(path.join(root,next+ext))){next+=ext;break;}}if(fs.existsSync(path.join(root,next)))queue.push(next);}}
assert.deepEqual(bad,[],`WebView startup graph contains Node-only static imports: ${JSON.stringify(bad)}`);
const shell=fs.readFileSync(path.join(root,'index.html'),'utf8');const html=fs.readFileSync(path.join(root,'synthia-runtime.html'),'utf8');assert.match(html,/app\.mjs\?v=r21\.16-webview-bootfix-1/);assert.match(shell,/synthia-runtime\.html/);
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');assert.match(sw,/synthia-r21-22-closure-v1/);
console.log(`r21.16 WebView boot graph PASS: ${seen.size} statically reachable modules, zero Node-only imports`);
