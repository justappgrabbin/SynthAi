import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { Synthia57ResidentAdapter } from '../residents/synthia57-resident.mjs';

class FakeBody extends EventTarget {
  constructor() {
    super();
    this.components = new Map();
    this.activeActionTools = new Set();
    this.maxActiveActionTools = 26;
  }
  register(def) { this.components.set(def.id, def); if (def.active) this.activate(def.id); return def; }
  activate(id) { this.activeActionTools.add(id); this.dispatchEvent(new CustomEvent('activated', { detail: { type: 'activated', id } })); return this.components.get(id); }
  deactivate(id) { const removed=this.activeActionTools.delete(id); if(removed)this.dispatchEvent(new CustomEvent('deactivated',{detail:{type:'deactivated',id}})); return removed; }
  selectByResonance(field=[]) {
    const previous=new Set(this.activeActionTools);
    this.activeActionTools=new Set(field.filter(x=>x.resonance>0 && Object.keys(x.evidence??{}).length).slice(0,26).map(x=>x.id));
    const result={active:field,activated:[...this.activeActionTools].filter(x=>!previous.has(x)),deactivated:[...previous].filter(x=>!this.activeActionTools.has(x)),unexpressed:[],candidateCount:field.length};
    this.dispatchEvent(new CustomEvent('resonance-selected',{detail:{type:'resonance-selected',...result}}));
    return result;
  }
  async request(id,task,context={}) { const c=this.components.get(id); const output=await c.execute(task,context); const r={componentId:id,status:'completed',output}; this.dispatchEvent(new CustomEvent('request',{detail:{type:'request',...r}})); return r; }
  snapshot(){return {maxActiveActionTools:this.maxActiveActionTools,activeActionToolCount:this.activeActionTools.size,activeActionTools:[...this.activeActionTools],components:[...this.components.keys()]};}
}

test('SYNTHIA 5.7 RESIDENT: hand activation changes physiology and mesh presence', async () => {
  const bus=new EventBus();
  const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'synthia57-adapter'});
  await state.restore();
  const mesh=await new RelationalMeshKernel({state,bus}).boot();
  await mesh.registerParticipant('synthia',{kind:'resident-agent',publicState:{name:'Synthia'},residency:'active'});

  const body=new FakeBody();
  const embodiment={
    body,
    bindHost(def){ return body.register({...def,kind:'action',active:def.active!==false}); },
    request(id,task,context){return body.request(id,task,context);}
  };
  const outcomes=[];
  const ticks=[];
  const physiology={
    async observeOutcome(outcome){outcomes.push(outcome);return {id:'obs-'+outcomes.length};},
    async tick(){const r={felt:{feltState:'activated-'+(ticks.length+1)}};ticks.push(r);return r;},
    snapshot(){return {outcomes:outcomes.length,ticks:ticks.length};}
  };
  const worldPort={attach(){},observe(){},act(){},snapshot(){return {connected:false};}};
  const runtime={worldPort,physiology};
  const resident=new Synthia57ResidentAdapter({runtime,embodiment,mesh,bus});
  await resident.start();

  await resident.bindHand({
    id:'hand:file',
    capabilities:['file.write'],
    available:()=>true,
    permitted:()=>true,
    execute:async task=>({written:task.path}),
    active:false
  });
  resident.activateHand('hand:file');

  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(outcomes.some(o=>o.summary==='capability-body:activated:hand:file'));
  assert.ok(ticks.length>=1);
  assert.deepEqual(mesh.resolvePresence('synthia').publicState.embodiment.activeActionTools,['hand:file']);
});

test('SYNTHIA 5.7 RESIDENT: connection can recompose hands by resonance and feeds physiology', async () => {
  const bus=new EventBus();
  const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'synthia57-connection'});
  await state.restore();
  const mesh=await new RelationalMeshKernel({state,bus}).boot();
  await mesh.registerParticipant('synthia',{kind:'resident-agent',residency:'active'});
  const body=new FakeBody();
  body.register({id:'hand:grapple',kind:'action',active:false,execute:async()=>true});
  const embodiment={body,bindHost:def=>body.register({...def,kind:'action'}),request:(id,t,c)=>body.request(id,t,c)};
  const outcomes=[];
  const physiology={
    observeOutcome(o){outcomes.push(o);return {ok:true};},
    tick(){return {felt:{feltState:'connection-active'}};},
    snapshot(){return {};}
  };
  const runtime={worldPort:{attach(){},observe(){},act(){},snapshot(){return {}}},physiology};
  const resident=new Synthia57ResidentAdapter({runtime,embodiment,mesh,bus});
  await resident.start();
  const result=await resident.observeConnection({
    sourceId:'visitor:joe',
    type:'nearby',
    resonanceField:[{id:'hand:grapple',resonance:0.9,evidence:{world:'indiverse'}}]
  });
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(result.resonance.activated.includes('hand:grapple'));
  assert.ok(outcomes.some(o=>o.source==='relational-mesh'));
  assert.ok(outcomes.some(o=>o.summary==='capability-body:resonance-selected:body'));
});
