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
test('SYNTHIA 5.7 LOADER: mounts full package contract as resident without flattening it', async()=>{
  const computer=await new MobileComputerRuntime({persistence:new MemoryPersistence(),namespace:'synthia-loader'}).boot();
  const body=new FakeBody();
  const embodiment={body,bindHost:def=>def,request:async()=>({status:'completed'})};
  const worldPort={attach(){return {connected:true}},detach(){},observe(){},act(){},snapshot(){return {connected:false}}};
  const physiology={observeOutcome(){return {}},tick(){return {felt:{}}},snapshot(){return {}}};
  const fakeRuntime={
    worldPort,physiology,
    configureBirthMirror:async input=>({configured:true,input}),
  };
  class FakeFederatedSynthia { static async create(){return fakeRuntime;} }
  const importModule=async spec=>spec.includes('federated-synthia')?{FederatedSynthia:FakeFederatedSynthia}:{embodiment};
  const loader=new Synthia57PackageLoader({computer,importModule});
  const mounted=await loader.mount({base:'file:///synthia57',birthMirror:{birthDate:'example'}});
  assert.equal(mounted.runtime,fakeRuntime);
  assert.equal(computer.meshKernel.participant('synthia').metadata.version,'0.5.7');
  assert.ok(computer.meshKernel.relationshipsFor('synthia').some(e=>e.type==='resident-of'));
  assert.equal(loader.get('synthia').adapter.started,true);
});
