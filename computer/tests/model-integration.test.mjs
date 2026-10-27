import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join,resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ModelIntegrationGateway } from '../services/model-integration-gateway.mjs';
import { GenerativeAddressGateway } from '../services/generative-address-gateway.mjs';
import { EventBus, MemoryPersistence, StateStore } from '../core/kernel.mjs';

test('Model integration inspects real checkpoint availability and cannot fabricate an answer',async()=>{
 const p=new MemoryPersistence(),bus=new EventBus();
 const state=new StateStore({bus,persistence:p,namespace:'models-test'});
 await state.restore();
 const gateway=new ModelIntegrationGateway({env:{SYNTHIA_PYTHON:'python3'},state,bus,timeoutMs:15000});
 const status=await gateway.status();
 assert.equal(status.trident.inference_ready,false);
 assert.equal(status.modelmaker.inference_ready,false);
 assert.equal(status.trident_address_onnx,'separate-authority-not-substituted');
 await assert.rejects(gateway.generate({text:'Can you write real code?',backend:'trident',
   maxNewTokens:2}),/checkpoint|required|architecture/i);
 await assert.rejects(gateway.generate({text:'Generate something',backend:'modelmaker',
   maxNewTokens:2}),/model|directory/i);
 assert.equal(state.get('models.inferenceReceipts',[]).length,0);
});

test('Modelmaker training requires original source, real corpus and configured output',async()=>{
 const gateway=new ModelIntegrationGateway({env:{},python:'python3'});
 await assert.rejects(gateway.trainModelmaker({name:'synthia-seed',corpus:'x'.repeat(1000)}),
    /Configure existing Modelmaker/);
 assert.throws(()=>gateway.args('trident','train'),/Only original Modelmaker/);
});

test('Model gateway rejects unsafe backend and invalid generation sizes before process launch',async()=>{
 const gateway=new ModelIntegrationGateway({env:{},python:'python3'});
 assert.throws(()=>gateway.args('made-up','generate'),/Unknown backend/);
 await assert.rejects(gateway.generate({text:'prompt',maxNewTokens:1000}),/output length/);
 await assert.rejects(gateway.generate({text:''}),/Nonempty prompt/);
});

test('Generative Address adapter preserves Klein/Morph boundaries and stores real downstream receipts',async t=>{
 let seen=[];
 const server=createServer(async(req,res)=>{
   if(req.method==='GET'&&req.url==='/api/audit'){
     res.writeHead(200,{'content-type':'application/json'});
     return res.end(JSON.stringify({architecture:'original-engine-test-fixture',mounted:true}));
   }
   if(req.method==='POST'&&req.url==='/api/chat'){
     let raw='';for await(const chunk of req)raw+=chunk;
     const data=JSON.parse(raw);seen.push(data);
     res.writeHead(200,{'content-type':'application/json'});
     return res.end(JSON.stringify({processingMode:data.mode,utterance:'original '+data.mode+' fixture reply',transportTest:true,morphology:data.mode==='morph'?{policy:'fixture-morph'}:undefined}));
   }
   res.writeHead(404);res.end();
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 t.after(()=>new Promise(ok=>server.close(ok)));
 const state=new StateStore({persistence:new MemoryPersistence(),namespace:'address-test'});
 await state.restore();
 const bus=new EventBus();
 const bridge=new GenerativeAddressGateway({
   endpoint:'http://127.0.0.1:'+server.address().port,state,bus
 });
 assert.equal((await bridge.status()).connected,true);
 const klein=await bridge.chat({text:'examine grammar',mode:'klein'});
 const morph=await bridge.chat({text:'trace relations',mode:'morph',addresses:[]});
 assert.equal(klein.mode,'klein');
 assert.equal(morph.mode,'morph');
 assert.deepEqual(seen.map(v=>v.mode),['klein','morph']);
 assert.deepEqual(seen[1].addresses,[]);
 assert.equal(state.get('models.generativeAddressReceipts',[]).length,2);
 await assert.rejects(bridge.chat({text:'hello',mode:'communication'}),/original Computer/);
 assert.throws(()=>new GenerativeAddressGateway({endpoint:'https://example.com/'}),/loopback/i);
});

test('Original Generative Address donor executes genuine Klein + Morph pathways if checkout present',
 {timeout:85000},async t=>{
 const root=process.env.SYNTHIA_GENERATIVE_TEST_ROOT;
 if(!root){t.skip('Requires original external repo checkout; unit adapter alone is insufficient');return;}
 const serverFile=resolve(root,'src/generative-server.mjs');
 if(!existsSync(serverFile))throw new Error('Missing external original Generative Address donor');
 const socket=createServer();
 await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));
 const port=socket.address().port;
 await new Promise(ok=>socket.close(ok));
 const child=spawn(process.execPath,[serverFile],{
   cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']
 });
 t.after(()=>{child.kill('SIGTERM')});
 let stderr='';
 child.stderr.setEncoding('utf8');child.stderr.on('data',s=>{stderr+=s});
 const bridge=new GenerativeAddressGateway({endpoint:'http://127.0.0.1:'+port,timeoutMs:20000});
 let online=false;
 for(let i=0;i<60;i++){
   if(child.exitCode!==null)throw Error('Original engine terminated: '+stderr);
   const status=await bridge.status();if(status.connected){online=true;break;}
   await new Promise(ok=>setTimeout(ok,250));
 }
 assert.ok(online,'Original engine failed to boot: '+stderr);
 const klein=await bridge.chat({mode:'klein',text:'Please analyze the movement of language'});
 const morph=await bridge.chat({mode:'morph',text:'Please analyze the movement of language'});
 assert.equal(klein.output.processingMode,'klein');
 assert.equal(morph.output.processingMode,'morph');
 assert.notDeepEqual(klein.output,morph.output,'Morph and Klein must take distinct routes');
});
