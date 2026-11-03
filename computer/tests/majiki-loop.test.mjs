import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MajikiLoop, inspectMajikiSources } from '../services/majiki-loop.mjs';

const good = {path:'/home/user/Imports/app.json',content:'{"ok": true,}',meta:{encoding:'utf8'}};
const bad = {path:'/home/user/Imports/unsolvable.json',content:'{"ok":',meta:{encoding:'utf8'}};
const note = {path:'/home/user/Projects/readme.md',content:'TODO: add tests',meta:{encoding:'utf8'}};

test('Majiki identifies actual local problems and never edits original source', async () => {
 const files = [good, bad, note];
 const findings = inspectMajikiSources(files);
 assert.equal(findings.filter(x=>x.type==='json-parse').length,2);
 assert.ok(findings.some(x=>x.type==='todo'));
 const original = good.content;
 const dir = await mkdtemp(join(tmpdir(),'majiki-'));
 const file = join(dir,'state.json');
 try {
   const work = await new MajikiLoop({file,listFiles:async()=>files}).boot({automatic:false});
   const job = await work.enqueue('Repair imported application source without replacing originals');
   for (let i=0;i<4;i++) await work.tick();
   let state = work.snapshot();
   assert.equal(state.jobs[0].stage,'complete');
   assert.equal(state.outbox.length,1);
   assert.deepEqual(JSON.parse(state.outbox[0].content),{ok:true});
   assert.equal(state.outbox[0].status,'verified-json-parse');
   assert.equal(good.content,original);
   assert.equal(state.outbox[0].originalPath,good.path);
   assert.ok((await readFile(file,'utf8')).includes(job.id));
   const next = await new MajikiLoop({file,listFiles:async()=>[]}).boot({automatic:false});
   assert.deepEqual(next.snapshot().outbox,state.outbox);
   work.close();next.close();
 } finally { await rm(dir,{recursive:true,force:true}); }
});
test('Majiki states a blocker rather than claiming to have coded an unverified fix',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'majiki-blocked-'));
 try{
  const m=await new MajikiLoop({file:join(dir,'state.json'),listFiles:async()=>[bad]}).boot({automatic:false});
  await m.enqueue('Please resolve broken JSON');
  for(let i=0;i<4;i++)await m.tick();
  assert.equal(m.snapshot().jobs[0].stage,'needs-input');
  assert.equal(m.snapshot().outbox.length,0);
  assert.match(m.snapshot().jobs[0].error,/No deterministic repair/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('Majiki refuses binary imports and unrelated system paths',()=>{
 assert.equal(inspectMajikiSources([{path:'/etc/passwd',content:'TODO'}, {path:'/home/user/Imports/private.bin',content:'TODO',meta:{encoding:'base64'}}]).length,0);
});

test('Majiki proactively queues only new reproducible defects and avoids duplicate work',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'majiki-watch-'));
 try {
   const m=await new MajikiLoop({file:join(dir,'state.json'),listFiles:async()=>[good]}).boot({automatic:false});
   await m.heartbeat();
   assert.equal(m.snapshot().jobs.length,1);
   for(let i=0;i<3;i++)await m.tick();
   assert.equal(m.snapshot().jobs[0].stage,'complete');
   const count=m.snapshot().jobs.length;
   await m.scan({autopilot:true});
   assert.equal(m.snapshot().jobs.length,count,'Do not repeat same unfixed source revision');
   const n=await new MajikiLoop({file:join(dir,'state.json'),listFiles:async()=>[good]}).boot({automatic:false});
   await n.scan({autopilot:true});
   assert.equal(n.snapshot().jobs.length,count,'Deduplication survives service restart');
   m.close();n.close();
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('JSON repair preserves quoted commas and bracket characters',()=>{
 const original = '{"string":"keep,} and ,] exactly","items":[1,2,]}';
 const issue=inspectMajikiSources([{path:'/home/user/Imports/tricky.json',content:original}])[0];
 assert.equal(issue.type,'json-parse');
 assert.equal(JSON.parse(issue.proposedFix).string,'keep,} and ,] exactly');
 assert.deepEqual(JSON.parse(issue.proposedFix).items,[1,2]);
});
