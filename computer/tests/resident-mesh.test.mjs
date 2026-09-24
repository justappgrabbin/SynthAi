import test from 'node:test';
import assert from 'node:assert/strict';
import {EventBus,MemoryPersistence,StateStore} from '../core/kernel.mjs';
import {MeshKernel,MeshContinuity} from '../runtime/mesh-kernel.mjs';
import {DormantCompiler,CompilerBackends} from '../runtime/dormant-compiler.mjs';
import {IndiVerseRegistry} from '../runtime/indiverse.mjs';

async function rig(clock=()=>1000){
  const bus=new EventBus();
  const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'resident-test'});
  await state.restore();
  const mesh=new MeshKernel({bus,state});
  await mesh.boot();
  return {bus,state,mesh,clock};
}

test('MESH FIRST: participants and relationships are persistent runtime state',async()=>{
  const r=await rig();
  await r.mesh.join('synthia',{kind:'agent',residency:'hot'});
  await r.mesh.join('realm',{kind:'reality',residency:'warm'});
  await r.mesh.relate('synthia','realm',{type:'resides-in'});
  assert.equal(r.mesh.snapshot().nodes.length,2);
  assert.equal(r.mesh.snapshot().edges[0].type,'resides-in');
  assert.equal(r.state.get('mesh').nodes.length,2);
});

test('DORMANCY: queued events survive sleep and replay on wake',async()=>{
  let now=1000;
  const r=await rig(()=>now);
  await r.mesh.join('synthia',{kind:'agent',residency:'hot'});
  const c=new MeshContinuity({...r,clock:()=>now});
  await c.queue({id:'connection-1',at:1500,type:'connection',to:'synthia'});
  await c.sleep();
  assert.equal(r.mesh.get('synthia').residency,'warm');
  now=2000;
  const wake=await c.wake({resolveEvent:async(e,ctx)=>({id:e.id,elapsed:ctx.elapsed,status:'replayed'})});
  assert.equal(wake.pending,1);
  assert.equal(wake.receipts[0].status,'replayed');
  assert.equal(wake.elapsed,1000);
});

test('DORMANT COMPILER: compiles only changed state then sleeps',async()=>{
  const r=await rig();
  let builds=0;
  const backends=new CompilerBackends();
  backends.register('wasm',{compile:async spec=>({artifactHash:'artifact-'+(++builds),location:'/cache/'+spec.id+'.wasm'})});
  const compiler=new DormantCompiler({...r,backends});
  const a=await compiler.ensure({id:'hand.file',target:'wasm',sourceHash:'source-a'});
  const b=await compiler.ensure({id:'hand.file',target:'wasm',sourceHash:'source-a'});
  assert.equal(a.reused,false); assert.equal(b.reused,true); assert.equal(builds,1); assert.equal(compiler.lifecycle,'dormant');
});

test('INDIVERSE: host qualia changes expression without changing canonical identity',async()=>{
  const r=await rig();
  const worlds=new IndiVerseRegistry(r); await worlds.restore();
  await worlds.define('adaya',{grammar:{orientation:'roof-on-floor',threshold:'door-extends-to-floor',palette:'host-qualia'},invariants:{identity:true}});
  const house={id:'house-1',type:'building',function:'home',entrance:'front'};
  const view=worlds.render('adaya',house,{id:'visitor'});
  assert.equal(view.canonicalId,'house-1');
  assert.equal(view.rendered.id,'house-1');
  assert.equal(view.rendered.qualiaGrammar.orientation,'roof-on-floor');
  assert.equal(view.canonical.entrance,'front');
});
