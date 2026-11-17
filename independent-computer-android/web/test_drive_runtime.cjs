// Exercises ACTUAL source extracted unchanged from the user's Drive Synthia v11 HTML.
// Tests transport-source integrity and the real FoundationComputer execution path.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const base=__dirname;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const origin=fs.readFileSync(path.join(base,'donors/Synthia-Resonance-Computer-Integrated-v11.original.html'));
const prov=JSON.parse(fs.readFileSync(path.join(base,'SOURCE-PROVENANCE.json'),'utf8'));
assert.equal(sha(origin),prov.verified_donors[1].sha256,'Original Drive donor must match its source hash');
const importmap=JSON.parse(origin.toString().match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const names=Object.keys(importmap);
assert.equal(names.length,216,'The whole actual Drive donor module graph must be preserved');
for(const name of names){
  const bytes=Buffer.from(importmap[name].split(',')[1],'base64');
  const recovered=fs.readFileSync(path.join(base,'recovered/synthia-v11-modules',name));
  assert.equal(sha(recovered),sha(bytes),'Byte mismatch in recovered donor '+name);
}
const world=fs.readFileSync(path.join(base,'world-engine-foundry-4.adapter.html'),'utf8');
const host=fs.readFileSync(path.join(base,'index.html'),'utf8');
assert.ok(!world.includes("String(payload.content||'').slice(0,5000)"),'World adapter must not clip imported source');
assert.ok(!host.includes('content:content.slice(0,5000)'),'Host must not clip source before sending');
const embedded=host.match(/<script id="living-world-source" type="application\/octet-stream">([^<]+)<\/script>/)[1];
assert.equal(sha(Buffer.from(embedded,'base64')),sha(Buffer.from(world)),'Embedded world adapter must match the executable adapter');
const child=String.raw`
import {DesktopRuntime} from 'synthia/src/desktop-runtime.mjs';
const rt=new DesktopRuntime({document:{title:'Independent Computer Source Test'}});
await rt.computer.boot();
const p=await rt.computer.projects.create({name:'Source Transport Verification',description:'Unchanged Synthia v11 actual source'});
const text='function integrate(){return "π🔬";}\\n'+'/*original source*/'.repeat(370)+'\\nconst answer=42;';
await rt.computer.projects.writeFile(p.id,'roundtrip.js',text,{type:'text/javascript'});
const fromStore=rt.computer.projects.readFile(p.id,'roundtrip.js').content;
if(fromStore!==text||text.length<5000)throw Error('Source was shortened or altered');
const output=await rt.calculate('6 * 7');
if(output!==42||rt.lastReceipt?.ok!==true)throw Error('Original Synthia execution did not produce a valid result and receipt');
console.log(JSON.stringify({sourceReadback:'exact',characters:text.length,realExecution:output,receiptOk:rt.lastReceipt.ok}));
`;
const result=execFileSync(process.execPath,['--no-warnings','--experimental-loader',path.join(base,'recovered/synthia-v11-loader.mjs'),'--input-type=module','-e',child],{encoding:'utf8',timeout:25000});
const actual=JSON.parse(result.trim().split('\n').at(-1));
assert.equal(actual.sourceReadback,'exact');
assert.equal(actual.realExecution,42);
assert.equal(actual.receiptOk,true);
console.log('PASS Drive v11 216 modules unchanged; original Computer runtime boots; 5K+ source exact readback; actual 6*7=42 with receipt; Living World bridge untruncated.');
