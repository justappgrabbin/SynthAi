import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.on('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const address=server.address();
      const port=address.port;
      server.close(()=>resolve(port));
    });
  });
}

async function waitHealth(base,timeoutMs=8000){
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    try{
      const res=await fetch(base+'/health');
      if(res.ok) return res.json();
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('native seed server did not become healthy');
}

function startServer({port,statePath}){
  return spawn(process.execPath,['computer/native/native-seed-server.mjs'],{
    cwd:process.cwd(),
    env:{
      ...process.env,
      SYNTHAI_NATIVE_HOST:'127.0.0.1',
      SYNTHAI_NATIVE_PORT:String(port),
      SYNTHAI_NATIVE_STATE:statePath,
      SYNTHAI_IDLE_EXIT_MS:'0',
    },
    stdio:['ignore','pipe','pipe'],
  });
}

async function stop(child){
  if(child.exitCode!==null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    new Promise(resolve=>setTimeout(resolve,3000)),
  ]);
  if(child.exitCode===null) child.kill('SIGKILL');
}

test('NATIVE SEED SERVER: phone world survives checkpointed process restart',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'synthai-native-server-'));
  const statePath=path.join(dir,'state.json');
  const port=await freePort();
  const base='http://127.0.0.1:'+port;
  let child=startServer({port,statePath});

  try{
    const health=await waitHealth(base);
    assert.equal(health.ok,true);

    const sync=await fetch(base+'/phone/sync',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        applications:[
          {packageName:'com.openai.chatgpt',label:'ChatGPT',category:'communication',launchable:true},
          {packageName:'com.example.pixart',label:'PixArt',category:'creative',launchable:true},
        ]
      })
    });
    assert.equal(sync.ok,true);

    const snapshot1=await (await fetch(base+'/snapshot')).json();
    assert.equal(snapshot1.phoneWorld.apps.length,2);
    assert.ok(snapshot1.indiverse.canonicalObjects.some(o=>o.id==='app:com.openai.chatgpt'));

    const replay=await fetch(base+'/phone/native-events',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({events:[
        {id:'evt-1',type:'notification',residentId:'synthia',notification:{id:'n1',packageName:'com.openai.chatgpt',title:'Reply',text:'hello'}}
      ]})
    });
    assert.equal(replay.ok,true);

    await fetch(base+'/sleep',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    await stop(child);

    child=startServer({port,statePath});
    await waitHealth(base);
    const snapshot2=await (await fetch(base+'/snapshot')).json();

    assert.ok(snapshot2.indiverse.canonicalObjects.some(o=>o.id==='app:com.openai.chatgpt'));
    assert.ok(snapshot2.mesh.participants.some(p=>p.id==='phone:app:com.openai.chatgpt'));
  }finally{
    await stop(child);
    await rm(dir,{recursive:true,force:true});
  }
});
