import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const projectDir=fileURLToPath(new URL('../../',import.meta.url));
const hostScript=fileURLToPath(new URL('../host/server.mjs',import.meta.url));

test('Local Computer serves working model workspace and enforces real source admission', {timeout:90000},async t=>{
 execFileSync(process.execPath,['computer/build-web.mjs'],{cwd:projectDir,stdio:'pipe'});
 const tmp=await mkdtemp(join(tmpdir(),'synthia-integrated-workspace-'));
 const holder=createServer();
 await new Promise(ok=>holder.listen(0,'127.0.0.1',ok));
 const port=holder.address().port;
 await new Promise(ok=>holder.close(ok));
 const child=spawn(process.execPath,[hostScript],{
  cwd:join(projectDir,'computer'),
  env:{...process.env,SYNTHIA_PORT:String(port),SYNTHIA_DATA_DIR:tmp},
  stdio:['ignore','pipe','pipe']
 });
 let errors='';
 child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{errors+=chunk});
 t.after(async()=>{child.kill('SIGTERM');await rm(tmp,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+port;
 let ready=false;
 for(let i=0;i<150;i++){
   if(child.exitCode!==null)throw Error('Computer crashed: '+errors);
   try{
     const r=await fetch(base+'/api/status');
     if(r.ok&& (await r.json()).ready){ready=true;break}
   }catch{}
   await new Promise(ok=>setTimeout(ok,100));
 }
 assert.ok(ready,'Computer failed to boot: '+errors);
 const html=await fetch(base+'/workspace.html');
 assert.equal(html.status,200);
 assert.match(await html.text(),/Model Lab/);
 const script=await fetch(base+'/workspace.mjs');
 assert.equal(script.status,200);
 assert.match(await script.text(),/api\/models\/generate/);
 const actualDonor=await fetch(base+'/computer-runtime/services/browser-archive-connector.mjs');
 assert.equal(actualDonor.status,200);
 assert.match(await actualDonor.text(),/BrowserArchiveConnector/);
 const modelStatus=await fetch(base+'/api/models/status');
 assert.equal(modelStatus.status,200);
 const systems=await modelStatus.json();
 assert.equal(systems.service,'owner-local-model-inference');
 assert.equal(systems.trident.inference_ready,false);
 const modelRequest=await fetch(base+'/api/models/generate',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({backend:'trident',text:'Generate genuine text',maxNewTokens:2})
 });
 assert.notEqual(modelRequest.status,200);
 const source='Synthia grammar corpus. '.repeat(50);
 const uploaded=await fetch(base+'/api/ingest',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({name:'model-training-corpus.txt',base64:Buffer.from(source).toString('base64')})
 });
 assert.equal(uploaded.status,200);
 const receipt=(await uploaded.json()).items[0];
 assert.ok(receipt.addressKey);
 assert.match(receipt.path,/\/home\/user\/Imports\/model-training-corpus\.txt/);
 const trained=await fetch(base+'/api/models/train',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({sourcePath:receipt.path,name:'synthia-training-test',epochs:1})
 });
 assert.notEqual(trained.status,200,'Training must fail without original configured Modelmaker; no fabricated weights');
 const post=await trained.json();
 assert.match(post.error,/Configure existing Modelmaker/);
 const runtimeStatus=await fetch(base+'/api/generative-address/status');
 assert.equal(runtimeStatus.status,200);
 assert.equal((await runtimeStatus.json()).connected,false);
});
