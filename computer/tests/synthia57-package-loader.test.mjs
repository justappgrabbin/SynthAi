import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';
import { Synthia57PackageLoader } from '../residents/synthia57-package-loader.mjs';

class FakeBody extends EventTarget {
  constructor(){super();this.activeActionTools=new Set();this.components=new Map();this.maxActiveActionTools=26;}
  snapshot(){return {maxActiveActionTools:26,activeActionToolCount:this.activeActionTools.size,activeActionTools:[...this.activeActionTools],components:[]};}
  addEventListener(...args){return super.addEventListener(...args)}
  removeEventListener(...args){return super.removeEventListener(...args)}
}

test('SYNTHIA 5.7 LOADER: mounts full package contract and exposes real runtime organs on mesh', async()=>{
  const computer=await new MobileComputerRuntime({persistence:new MemoryPersistence(),namespace:'synthia-loader'}).boot();
  const body=new FakeBody();
  const embodiment={body,bindHost:def=>def,request:async()=>({status:'completed'})};
  const worldPort={attach(){return {connected:true}},detach(){},observe(event){return event},act(action){return {action}},pull(){return {connected:true}},snapshot(){return {connected:false}}};
  const physiology={observeOutcome(){return {}},tick(){return {felt:{}}},context(){return {felt:{feltState:'steady'}}},snapshot(){return {kind:'physiology'}}};

  const automata=new Map([
    ['klein-analogy',{id:'klein-analogy',run:(input)=>({ok:true,result:['mapped'],input})}],
    ['iching-grammar',{id:'iching-grammar',run:(input)=>({ok:true,input})}],
  ]);
  const atoMesh={automata,get:id=>automata.get(id)??null};
  const fakeRuntime={
    worldPort,physiology,
    configureBirthMirror:async input=>({configured:true,input}),
    system:{
      engine:{mesh:atoMesh},
      coordinatePopulation:(input)=>({accepted:true,input}),
      executeArtifact:async artifact=>({strategy:'INTERNAL',artifact}),
      route:async task=>({routed:true,task}),
    },
    stateSpaceRuntime:{
      execute:async input=>({executed:true,input}),
      runInstrument:async(id,input)=>({id,input}),
      catalog:()=>[{id:'five-level-state-space'}],
    },
    swarm:{
      submit:async tasks=>({cycle:1,executions:tasks.map(task=>({taskId:task.id,capability:task.capability,status:'complete',output:{status:'generated',tool:{id:'tool-1'}}}))}),
    },
    morphState:async spec=>({kind:'state-morph',spec}),
    embodimentMorph:async spec=>({kind:'embodiment-morph',spec}),
  };
  class FakeFederatedSynthia { static async create(){return fakeRuntime;} }
  const importModule=async spec=>spec.includes('federated-synthia')?{FederatedSynthia:FakeFederatedSynthia}:{embodiment};
  const loader=new Synthia57PackageLoader({computer,importModule});
  const mounted=await loader.mount({base:'file:///synthia57',birthMirror:{birthDate:'example'}});

  assert.equal(mounted.runtime,fakeRuntime);
  assert.equal(computer.meshKernel.participant('synthia').metadata.version,'0.5.7');
  assert.ok(computer.meshKernel.relationshipsFor('synthia').some(e=>e.type==='resident-of'));
  assert.equal(loader.get('synthia').adapter.started,true);
  assert.equal(loader.get('synthia').organs.mounted,true);

  for (const id of ['synthia:ato','synthia:tool-factory','synthia:klein','synthia:execution','synthia:state-space']) {
    assert.equal(computer.meshKernel.participant(id).residency,'active');
    assert.ok(computer.meshKernel.relationshipsFor(id).some(edge=>edge.type==='organ-of'&&edge.to==='synthia'));
  }

  const klein=await computer.meshKernel.request('synthia:klein',{operation:'run',payload:{input:{A:['a'],B:['b'],C:['c']}}});
  assert.equal(klein.delivered,true);
  assert.equal(klein.result.ok,true);

  const grown=await computer.meshKernel.request('synthia:tool-factory',{operation:'synthesize',payload:{purpose:'make a useful hand',input:'make a useful hand'}});
  assert.equal(grown.delivered,true);
  assert.equal(grown.result.executions[0].capability,'tool.synthesize');

  const executed=await computer.meshKernel.request('synthia:execution',{operation:'execute-artifact',payload:{artifact:{kind:'task'}}});
  assert.equal(executed.result.strategy,'INTERNAL');

  const state=await computer.meshKernel.request('synthia:state-space',{operation:'catalog',payload:{}});
  assert.equal(state.result[0].id,'five-level-state-space');

  for (const id of ['synthia:body','synthia:physiology','synthia:world-port','synthia:morph']) {
    assert.equal(computer.meshKernel.participant(id).residency,'active');
    assert.ok(computer.meshKernel.relationshipsFor(id).some(edge=>edge.type==='organ-of'&&edge.to==='synthia'));
  }
  assert.equal(computer.meshKernel.participant('synthia:physiology').visibility,'private');
  const bodyState=await computer.meshKernel.request('synthia:body',{operation:'snapshot',payload:{}});
  assert.equal(bodyState.result.maxActiveActionTools,26);
  const physiologyState=await computer.meshKernel.request('synthia:physiology',{operation:'snapshot',payload:{}});
  assert.equal(physiologyState.result.kind,'physiology');
  const worldState=await computer.meshKernel.request('synthia:world-port',{operation:'snapshot',payload:{}});
  assert.equal(worldState.result.connected,false);
  const morphState=await computer.meshKernel.request('synthia:morph',{operation:'state',payload:{spec:{pose:'reach'}}});
  assert.equal(morphState.result.kind,'state-morph');
});
