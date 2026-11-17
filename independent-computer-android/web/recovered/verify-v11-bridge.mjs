// Tests the appended browser message adapter against the unchanged Drive runtime.
// A Node VM supplies ONLY browser messaging primitives; the Synthia computer,
// persistence APIs, source readback and expression execution are actual donor code.
import {DesktopRuntime} from 'synthia/src/desktop-runtime.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'synthia-resonance-connected.html'),'utf8');
const match=html.match(/<script id="independent-computer-synthia-v11-bridge">([\s\S]*?)<\/script>/);
assert.ok(match,'Actual connected Synthia runtime must contain bridge');
const rt=new DesktopRuntime({document:{title:'Independent source adapter test'}});
await rt.computer.boot();
rt.store=rt.computer.foundation.store;
rt.tasks=[];rt.messages=[];rt.installed=[];
const reports=[];
const parent={postMessage:msg=>reports.push(msg)};
let handler;
const browser={
  SynthiaDesktop:rt, parent, File, TextEncoder,
  setInterval, clearInterval,
  addEventListener:(name,fn)=>{if(name==='message')handler=fn;},
  console,
};
browser.globalThis=browser;
vm.createContext(browser);
vm.runInContext(match[1],browser,{timeout:3000});
await new Promise(resolve=>setTimeout(resolve,300));
assert.ok(reports.some(r=>r.type==='runtime.ready'),'Synthia bridge did not announce ready');
let i=0;
async function request(type,payload={}){
  const id=++i;
  await handler({source:parent,data:{source:'IndependentComputerSynthia',type,payload,requestId:id}});
  const response=reports.find(m=>m.requestId===id);
  assert.ok(response, 'Missing response '+type);
  if(response.type==='runtime.failure')throw Error(response.payload.error);
  return response.payload;
}
const text='/* original source from Independent Computer */\n'+'SOURCE_BINDING_π_◈\n'.repeat(400)+'const value=42;';
const saved=await request('source.save',{name:'long-source.js',content:text});
assert.equal(saved.exactReadback,true);
assert.equal(saved.characters,text.length);
const listed=await request('source.list');
assert.ok(listed.files.some(f=>f.path==='long-source.js'));
const read=await request('source.read',{projectId:saved.projectId,path:saved.path});
assert.equal(read.content,text,'Readback must be untruncated and byte exact');
const result=await request('runtime.ask',{prompt:'calculate 6 * 7'});
assert.equal(result.text,'42');
assert.equal(result.acted,true);
const state=await request('runtime.state');
assert.ok(state.files>=1);
console.log(JSON.stringify({bridge:'actual-donor-executed',sourceBytes:saved.bytes,sourceReadback:'exact',agentResponse:result.text,agentActed:result.acted,runtimeFileCount:state.files}));
