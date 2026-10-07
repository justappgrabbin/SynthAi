import test from 'node:test';
import assert from 'node:assert/strict';
import { UniversalExecutionBridge } from '../components/state-math/src/integration/universal-execution-bridge.js';
import { ScientificSynthiaAssembly } from '../src/index.mjs';

test('resident execution runs and derives capabilities with network and workers inaccessible', async () => {
  const saved = new Map();
  const touched = [];
  for (const name of ['Worker','SharedWorker','fetch','XMLHttpRequest','WebSocket']) {
    saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,get(){touched.push(name);throw new Error(`EXTERNAL_ACCESS:${name}`);}});
  }
  try {
    const bridge=new UniversalExecutionBridge();
    const js=await bridge.execute({name:'resident.js',content:'const values=[3,5,7]; console.log(values.reduce((a,b)=>a+b,0)); return values.map(x=>x*x);'});
    assert.equal(js.path,'direct');
    assert.deepEqual(js.result.returnValue,[9,25,49]);
    assert.deepEqual(js.result.stdout,['15']);

    let derivations=0;
    bridge.register({name:'resident-addition',gateAddress:34,provides:['addition'],
      canHandle:gap=>gap.requiredCapability==='artifact.realize',
      derive:async()=>{derivations++;return {execute:async({artifact})=>{
        const data=JSON.parse(artifact.content);
        return {handled:true,value:{ok:true,engine:'resident-addition',returnValue:data.left+data.right}};
      }};}});
    const artifact={name:'sum.foreign',content:'{"left":19,"right":23}',canonicalAddress:{gate:35},requirements:['addition']};
    const first=await bridge.execute(artifact);
    assert.equal(first.path,'mesh-derived');
    assert.equal(first.result.returnValue,42);
    assert.equal(first.trace[0].donor,'resident-addition');
    assert.ok(first.capability.donors[0].relation.xor!==undefined);
    const replay=await bridge.execute(artifact);
    assert.equal(replay.result.returnValue,42);
    assert.equal(derivations,1);

    const empty=new UniversalExecutionBridge();
    const unresolved=await empty.execute({name:'unavailable.foreign',content:'unknown',requirements:['unavailable.behavior']});
    assert.equal(unresolved.ok,false);
    assert.equal(unresolved.path,'capability-unresolved');
    assert.deepEqual(touched,[]);
    const assembly=new ScientificSynthiaAssembly({autoStart:false,executionMode:'resident'});
    try {
      const address={planetary:'Sun',dimension:'Movement',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
      const record=await assembly.executeArtifact({name:'retained.js',content:'return 6 * 7;'}, {organismAddress:address});
      assert.equal(record.admitted,true);
      assert.equal(record.execution.ok,true);
      assert.equal(record.execution.path,'direct');
      assert.deepEqual(touched,[]);
      assert.equal(assembly.execution.execution instanceof UniversalExecutionBridge,true);
    } finally {await assembly.close();}
  } finally {
    for(const [name,descriptor] of saved) {
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  }
});
