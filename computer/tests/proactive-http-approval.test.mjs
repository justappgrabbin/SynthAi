import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const hostScript=fileURLToPath(new URL('../host/server.mjs',import.meta.url));

test('real local Computer HTTP: no bypass for major build or Git publish; no deletion', {timeout:50000},async t=>{
 const temp=await mkdtemp(join(tmpdir(),'synthia-proactive-host-'));
 const socket=createServer();
 await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));
 const port=socket.address().port;
 await new Promise(ok=>socket.close(ok));
 const child=spawn(process.execPath,[hostScript],{
   env:{...process.env,SYNTHIA_PORT:String(port),SYNTHIA_DATA_DIR:temp},
   stdio:['ignore','pipe','pipe']
 });
 let stderr='';child.stderr.setEncoding('utf8');child.stderr.on('data',s=>stderr+=s);
 t.after(async()=>{child.kill('SIGTERM');await rm(temp,{recursive:true,force:true})});
 const base='http://127.0.0.1:'+port;
 let online=false;
 for(let i=0;i<120;i++){
   if(child.exitCode!==null)throw Error('Computer host crashed: '+stderr);
   try{const response=await fetch(base+'/api/status');
     if(response.ok){online=true;break;}
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(online,'Host did not boot: '+stderr);
 const post=async(path,input,extra={})=>{
   const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...extra},body:JSON.stringify(input)});
   return {status:response.status,data:await response.json()};
 };
 const malicious=await post('/api/proactive/build',{goal:'tamper',name:'bad',approved:true,
   files:[{path:'../original/secret.js',content:'delete originals'}]});
 assert.notEqual(malicious.status,200);
 const files=['one','two','three','four'].map((name,i)=>({path:'src/'+name+'.mjs',content:'export const n = '+i+';'}));
 const build=await post('/api/proactive/build',{goal:'Four actual modules',name:'Synthia HTTP',files,approved:true});
 assert.equal(build.status,200);
 assert.equal(build.data.status,'owner-approval-required',
   'HTTP approved=true may never bypass approval');
 const id=build.data.proposal.id;
 const pending=await(await fetch(base+'/api/proactive/status')).json();
 assert.equal(pending.builds.length,0);
 assert.ok(pending.proposals.some(p=>p.id===id&&p.status==='pending'));
 const bad=await post('/api/proactive/decide',{proposalId:id,decision:'accept',confirmation:'I said yes'});
 assert.notEqual(bad.status,200);
 const ok=await post('/api/proactive/decide',{proposalId:id,decision:'accept',confirmation:'BUILD '+id});
 assert.equal(ok.status,200);
 assert.equal(ok.data.result.status,'files-created');
 assert.equal(ok.data.result.receipt.files.length,4);
 const active=(await(await fetch(base+'/api/proactive/status')).json());
 assert.equal(active.builds.length,1);
 const projectId=ok.data.result.receipt.projectId;
 const publish=await post('/api/proactive/request-publish',{projectId});
 assert.equal(publish.status,200);
 const denial=await post('/api/proactive/decide',{proposalId:publish.data.proposal.id,decision:'accept'});
 assert.notEqual(denial.status,200);
 const crossOrigin=await post('/api/proactive/decide',{proposalId:publish.data.proposal.id,decision:'reject'},
   {origin:'https://untrusted.example'});
 assert.notEqual(crossOrigin.status,200);
 const latest=(await(await fetch(base+'/api/proactive/status')).json());
 assert.ok(latest.proposals.some(p=>p.id===publish.data.proposal.id&&p.status==='pending'));
});
