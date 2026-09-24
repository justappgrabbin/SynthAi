import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

function fakeTriformModule(){
  return {
    createWorldState(characters){
      return {presences:characters.map(c=>({characterId:c.id,place:'square'})),relationships:[],memories:[]};
    },
    addResidentToWorld(state,character){
      return {...state,presences:[...(state.presences??[]),{characterId:character.id,place:'square'}]};
    },
    applyWorldConsequence(state,actor,characters,result,tick,eventId,intent){
      return {
        ...state,
        relationships:[...(state.relationships??[]),{actorId:actor.id,result:result.kind,tick,eventId,intent}],
        memories:[...(state.memories??[]),{characterId:actor.id,text:result.memory??result.kind,tick}],
      };
    }
  };
}

test('TRIFORM: native seed mounts real world contract, routes consequence through mesh, and restores checkpoint',async()=>{
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'triform-native-test'}).boot();
  const requests=[];runtime.bus.on('mesh:request',event=>requests.push(event.payload));
  const character={id:7,name:'Synthia Control',traits:{},state:{}};
  const mounted=await runtime.mountTriform({module:fakeTriformModule(),characters:[character]});
  assert.equal(runtime.worldFederation.layer('lab:triform').bound,true);

  await runtime.worldFederation.invoke('lab:triform','bind-resident',{residentId:'synthia',character});
  const outcome=await runtime.worldFederation.invoke('lab:triform','apply-action',{
    action:{
      actor:'synthia',
      type:'consequence',
      payload:{result:{kind:'relationship-change',memory:'Met someone'},intent:'Connect'}
    }
  });
  assert.equal(outcome.accepted,true);
  assert.equal(outcome.snapshot.state.relationships.length,1);
  assert.ok(requests.some(r=>r.targetId==='lab:triform'&&r.operation==='apply-action'));

  const saved=mounted.adapter.snapshot();
  mounted.adapter.state={presences:[],relationships:[],memories:[]};
  mounted.adapter.hydrate(saved);
  assert.equal(mounted.adapter.snapshot().state.relationships.length,1);
  assert.equal(mounted.adapter.snapshot().state.memories[0].text,'Met someone');
});
