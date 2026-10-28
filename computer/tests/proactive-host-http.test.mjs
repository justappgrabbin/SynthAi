import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

test('Actual loopback Computer HTTP boots proactive native Synthia and persists a build', {timeout:60000},async t=>{
 const socket=createServer();
 await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));
 const port=socket.address().port;
 await new Promise(ok=>socket.close(ok));
 const storage=await mkdtemp(join(tmpdir(),'synthia-proactive-host-'));
 const processServer=spawn(process.execPath,[resolve('computer/host/server.mjs')],{
  env:{...process.env,SYNTHIA_PORT:String(port),SYNTHIA_DATA_DIR:storage},
  stdio:['ignore','pipe','pipe']
 });
 let errorLog='',log='';
 processServer.stderr.on('data',b=>errorLog+=b.toString());
 processServer.stdout.on('data',b=>log+=b.toString());
 t.after(async()=>{
  processServer.kill('SIGTERM');
  await rm(storage,{recursive:true,force:true});
 });
 const url='http://127.0.0.1:'+port;
 let ready=false;
 for(let i=0;i<80;i++){
  if(processServer.exitCode!==null)throw Error('Computer process exited: '+errorLog);
  try{
   const r=await fetch(url+'/api/proactive/status');
   if(r.ok){ready=true;break}
  }catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 assert.ok(ready,'Computer did not expose proactive HTTP routes: '+errorLog+' '+log);
 const read=await (await fetch(url+'/api/proactive/status')).json();
 assert.equal(read.status.active,true);
 assert.equal(read.status.noDelete,true);
 assert.equal(read.status.modelConnected,true,'uses actual Computer model gateway even if no weights loaded');
 const send=async(path,data,origin=url)=>{
  const res=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(data)});
  return {code:res.status,value:await res.json()};
 };
 const observed=await send('/api/proactive/observe',{
   kind:'test-failure',summary:'The original TRIDENT integration test failed to import its checkpoint'});
 assert.equal(observed.code,200);
 assert.equal(observed.value.toolEvidence.autoling,'executed');
 assert.equal(observed.value.proposal.action,'investigate-test-failure');
 const feedback=await send('/api/proactive/decide',{
   proposalId:observed.value.proposal.id,decision:'reject'});
 assert.equal(feedback.code,200);
 assert.equal(feedback.value.proposal.status,'rejected');
 const created=await send('/api/proactive/build',{
   name:'Actual local Computer build',goal:'Persist a new actual JS math module',
   files:[{path:'src/math.mjs',content:'export const multiply = (a,b) => a*b;'}]
 });
 assert.equal(created.code,200);
 assert.equal(created.value.status,'files-created');
 assert.equal(created.value.receipt.verifiedBuild,false);
 const exported=await (await fetch(url+'/api/files')).json();
 assert.ok(exported.some(f=>f.path.endsWith('/src/math.mjs')));
 const attemptedBypass=await send('/api/proactive/build',{
  name:'BYPASS-ATTEMPT',goal:'Try to bypass large build approval',approved:true,
  files:[1,2,3,4].map(n=>({path:'src/part'+n+'.mjs',content:'export default '+n+';'}))
 });
 assert.equal(attemptedBypass.code,200);
 assert.equal(attemptedBypass.value.status,'owner-approval-required',
  'HTTP approved=true must never bypass explicit proposal approval');
 const crossOrigin=await send('/api/proactive/build',{name:'intruder',goal:'test',files:[{path:'x.js',content:'export default 1'}]},'https://evil.invalid');
 assert.equal(crossOrigin.code,400);
 assert.match(crossOrigin.value.error,/Cross-origin/);
 const model=await send('/api/proactive/draft',{goal:'Complete the original TRIDENT model backend'});
 assert.equal(model.code,200);
 assert.equal(model.value.built,false,'must fail closed when original model weights are missing/unusable');
 const noDelete=await send('/api/proactive/delete',{path:'src/math.mjs'});
 assert.equal(noDelete.code,404);
 const later=await (await fetch(url+'/api/proactive/status')).json();
 assert.equal(later.status.built,1);
 assert.ok(later.events.some(x=>x.kind==='test-failure'));
});
