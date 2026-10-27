import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const html = await readFile(resolve('public/fielddesk.html'),'utf8');
const match = html.match(/<script type="importmap">([\\s\\S]*?)<\\/script>/);
assert.ok(match,'FieldDesk single-file app must embed a resolved import map');
const imports=JSON.parse(match[1]).imports;
const original=Object.keys(imports).filter(key=>key.startsWith('ato:'));
assert.equal(original.length,33,'Preserve 33 owner-original ATO/Klein modules');
assert.ok(imports['fd:core'],'Bundled executable app logic must exist');
assert.match(html,/id="searchBtn"/);
assert.match(html,/id="compareBtn"/);
assert.match(html,/id="hexBtn"/);
assert.match(html,/id="exportMd"/);
assert.match(html,/id="upload"/);

const dir=await mkdtemp(join(tmpdir(),'synthia-fielddesk-test-'));
try{
 for(const [key,src] of Object.entries(imports)){
   assert.ok(src.startsWith('data:text/javascript;base64,'),'Imports must be self contained');
   const name=key==='fd:core'?'core.mjs':key.slice(4);
   const decoded=Buffer.from(src.split(',')[1],'base64').toString('utf8')
      .replace(/(['"])ato:([a-z0-9-]+\\.mjs)\\1/g,(_,q,n)=>q+'./'+n+q);
   await writeFile(join(dir,name),decoded);
 }
 const core=await import(pathToFileURL(join(dir,'core.mjs')));
 test('Actual owner AutoLing, DISEMINER and source retrieval work end to end',()=>{
   const docs=[{id:'real',name:'source.md',text:core.sampleText}];
   const hits=core.searchEvidence('What does AutoLing do?',docs);
   assert.ok(hits.length>0);
   assert.equal(hits[0].title,'source.md');
   assert.ok(hits[0].text.includes('AutoLing'));
   assert.ok(core.suggestedActions(docs).length>=3);
   const klein=core.createKlein(docs);
   assert.equal(klein.grammar.recognize('we should verify sources').ok,true);
   assert.ok(klein.lexicon.neighbors('klein',{limit:3}).length>0);
 });
 test('Real dimensional associations, original ATO and bounded source semantics',()=>{
   const address=x=>({gate:x,line:1,color:1,tone:1,base:1});
   const result=core.compareAddresses(address(11),address(12));
   assert.equal(result.gateRelation.resultantGate,63);
   assert.equal(core.hexagramAnalogy(11,12,13).resultNumber,14);
   assert.throws(()=>core.hexagramAnalogy(0,12,13),/1 to 64/);
   assert.equal(core.searchEvidence('impossible-never-present',[{id:'x',name:'x.txt',text:'A dog sleeps'}]).length,0);
 });
 test('No original Foundry mutation, no remote dependency or mocked neural generation',()=>{
   assert.ok(!html.includes('https://cdn.'));
   assert.ok(!html.includes('api.openai.com'));
   assert.match(html,/TRIDENT's PyTorch checkpoint requires a Python runtime/);
 });
}finally{
 await rm(dir,{recursive:true,force:true});
}