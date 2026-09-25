import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-daemon-'));const state=path.join(dir,'state.json');const port=4597;
async function wait(url,tries=50){for(let i=0;i<tries;i++){try{const r=await fetch(url);if(r.ok)return r}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('daemon did not start');}
function start(){return spawn(process.execPath,['bootstrap/daemon.mjs'],{cwd:process.cwd(),env:{...process.env,SYNTHIA_PORT:String(port),SYNTHIA_STATE_PATH:state},stdio:['ignore','pipe','pipe']});}
async function stop(p){p.kill('SIGTERM');await new Promise(r=>p.once('exit',r));}
let p=start();await wait(`http://127.0.0.1:${port}/status`);
let status=await (await fetch(`http://127.0.0.1:${port}/status`)).json();assert.equal(status.residence.approved,true);assert.equal(status.life.running,true);
let ask=await fetch(`http://127.0.0.1:${port}/ask`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intent:'hello',options:{organ:'advice'}})});assert.equal(ask.status,200,'daemon interaction must not require residence approval');await stop(p);
p=start();await wait(`http://127.0.0.1:${port}/status`);status=await (await fetch(`http://127.0.0.1:${port}/status`)).json();assert.equal(status.residence.approved,true);assert.equal(status.life.running,true);await stop(p);fs.rmSync(dir,{recursive:true,force:true});console.log('DAEMON PASS: local runtime is active immediately and remains active across restart');
