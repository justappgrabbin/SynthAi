import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { TriformWorldAdapter } from '../worlds/adapters/triform.mjs';
import { StellarLabAdapter } from '../worlds/adapters/stellar-lab.mjs';

test('TRIFORM ADAPTER: consequence changes diagnostic world while keeping resident identity', async()=>{
  const mod={
    createWorldState(chars){return {places:[{id:'atrium'}],presences:chars.map(c=>({characterId:c.id,placeId:'atrium'})),relationships:[],memories:[]};},
    addResidentToWorld(state,c){const n=structuredClone(state);n.presences.push({characterId:c.id,placeId:'atrium'});return n;},
    applyWorldConsequence(state,actor,chars,result,tick,eventId){const n=structuredClone(state);n.memories.unshift({characterId:actor.id,tick,eventId,statement:result.description});return n;}
  };
  const character={id:7,name:'Synthia',bodyProfile:{},mindProfile:{},heartProfile:{}};
  const lab=new TriformWorldAdapter({worldModule:mod,characters:[character]});
  lab.bindResident('synthia',character);
  const result=await lab.applyAction({actor:'synthia',type:'consequence',payload:{result:{description:'clarified relation',primaryLayer:'mind'}}});
  assert.equal(result.accepted,true);
  assert.equal(result.snapshot.state.memories[0].characterId,7);
  assert.equal(lab.residentCharacters.get('synthia'),7);
});

test('STELLAR ADAPTER: even compatibility path requires mesh and keeps execution as observation until classification', async()=>{
  const bus=new EventBus();
  const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'world-adapter-stellar'});
  await state.restore();
  const mesh=await new RelationalMeshKernel({state,bus}).boot();
  await mesh.registerParticipant('system:execution',{kind:'core-service',residency:'active',capabilities:['execution']});

  const calls=[];
  const experimentRecords=new Map([['exp-1',{id:'exp-1',method:'probe',runs:[]}]]);
  const loop={
    providerId:'test-hypothesis-provider',
    experiments:experimentRecords,
    async createHypothesis(p){calls.push(['hypothesis',p]);return {id:p.id,status:'hypothesized'};},
    async createExperiment(p){calls.push(['experiment',p]);const e={id:'exp-1',...p,runs:[]};experimentRecords.set(e.id,e);return e;},
    experiment(id){return experimentRecords.get(id)??null;},
    async run(id,executor,input){calls.push(['run',id]);const output=await executor(input);return {run:1,output};},
    async classify(id,{measure}){calls.push(['classify',id]);return {classification:'observation',replicated:false,measured:measure({value:1})};},
    async hypothesis(id){return {id};}
  };

  const lab=new StellarLabAdapter({mesh,state,bus,experiments:loop});
  lab.registerExecutor('probe',async x=>({value:x}));
  lab.registerMeasure('value',o=>o.value);
  await lab.mount();

  const observation=await mesh.request('lab:stellar',{operation:'experiment.run',payload:{experimentId:'exp-1',input:1}});
  assert.equal(observation.result.output.value,1);
  const classified=await mesh.request('lab:stellar',{operation:'evidence.classify',payload:{experimentId:'exp-1',measureId:'value'}});
  assert.equal(classified.result.classification,'observation');
  assert.equal(lab.snapshot().evidencePolicy,'execution-is-observation-until-explicit-replicated-classification');
});
