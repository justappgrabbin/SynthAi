import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openComputer} from './foundation-node.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const c=openComputer(here+'.independent-state');
const source=await readFile(new URL('./project-intake.js',import.meta.url),'utf8');
const files={'project-intake.js':source};
const inspections=await c.inspect(files);
console.log('INGESTED complete existing source:',inspections.map(x=>({path:x.path,bytes:x.bytes,declarations:x.declarations.length})));
const acquired=await c.acquire({name:'project-intake',description:'Original complete project-intake module; CRC32 exercised independently.',files,entry:'project-intake.js',exportName:'default.crc32',cases:[{args:[[49,50,51,52,53,54,55,56,57]],expected:3421780262}],holdouts:[{args:[[]],expected:0}]});
console.log('ACQUIRED:',acquired.digest);
const archiveSource=`import intake from '@cap/project-intake';
export async function main(files){return Array.from(new Uint8Array(await intake.zip(files).arrayBuffer()));}`;
await c.construct({name:'workspace-archive',description:'Write complete ZIP bytes using the acquired original ProjectIntake ZIP mechanism.',files:{'archive.mjs':archiveSource},entry:'archive.mjs',cases:[{args:[[]],expected:[80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]});
const restarted=openComputer(here+'.independent-state');
const backup=await restarted.exportWorkspace('workspace-archive');
await mkdir(here+'evidence',{recursive:true});
await writeFile(here+'evidence/computer-backup.zip',new Uint8Array(backup));
console.log('SELF-USE: restarted computer exported its own persisted state through the newly acquired ZIP mechanism:',backup.length,'bytes');
// A later construction imports a constructed capability, not just an original donor.
await restarted.construct({name:'project-package',description:'Second-generation construction uses the persisted constructed archive capability.',
 files:{'package.mjs':`import {main as archive} from '@cap/workspace-archive';\nexport async function main(files){const bytes=await archive(files);return {bytes:bytes.length,signature:bytes.slice(0,4)};}`},entry:'package.mjs',
 cases:[{args:[[]],expected:{bytes:22,signature:[80,75,5,6]}}]});
const result=await restarted.run('project-package',[[{path:'hello.txt',text:'hello'}]]);
console.log('SUBSEQUENT CONSTRUCTION:',result);
const receipt={acquiredSourceBytes:source.length,acquiredDigest:acquired.digest,backupBytes:backup.length,subsequentConstruction:result,capabilities:await restarted.store.list(),scope:'Native JavaScript execution of complete captured source; contracts supplied explicitly; not autonomous semantic inference.'};
await writeFile(here+'evidence/foundation-receipt.json',JSON.stringify(receipt,null,2));
