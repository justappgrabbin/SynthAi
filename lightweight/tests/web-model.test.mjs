import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.env.ADAPTIVE_WEB_ROOT;
if(!root)throw Error('Set ADAPTIVE_WEB_ROOT to the Lite APK extracted web assets');
const {ensureEmbeddedModel}=await import(pathToFileURL(root+'/proactive/model.mjs'));
test('model progress gates inference until native readiness',async()=>{
 let reads=0,progress=[];
 const result=await ensureEmbeddedModel({native:{startLocalModel:()=>JSON.stringify({ok:true}),getLocalModelStatus:()=>JSON.stringify(++reads<3?{ok:true,ready:false,phase:'Downloading model · 42%'}:{ok:true,ready:true})},delay:async()=>{},onProgress:x=>progress.push(x)});
 assert.equal(result.ready,true);assert.equal(progress.length,2);assert.ok(progress.every(x=>x.includes('42%')));
});
test('checksum error reaches the user instead of starting inference',async()=>{
 await assert.rejects(ensureEmbeddedModel({native:{startLocalModel:()=>JSON.stringify({ok:true}),getLocalModelStatus:()=>JSON.stringify({ok:false,error:'checksum failed'})},delay:async()=>{}}),/checksum failed/);
});
test('first download can take longer than the old four minute limit',async()=>{
 const original=Date.now;let clock=0,reads=0;
 try{
  Date.now=()=>clock+=300000;
  const result=await ensureEmbeddedModel({native:{startLocalModel:()=>JSON.stringify({ok:true}),getLocalModelStatus:()=>JSON.stringify(++reads<3?{ok:true,ready:false,phase:'Downloading model'}:{ok:true,ready:true})},delay:async()=>{}});
  assert.equal(result.ready,true);assert.ok(clock>240000);
 }finally{Date.now=original;}
});
