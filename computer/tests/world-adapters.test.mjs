import test from 'node:test';
import assert from 'node:assert/strict';
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

test('STELLAR ADAPTER: successful execution remains an observation until classification', async()=>{
  const calls=[];
  const loop={
    async createHypothesis(p){calls.push(['hypothesis',p]);return {id:p.id,status:'hypothesized'};},
    async createExperiment(p){calls.push(['experiment',p]);return {id:'exp-1',...p};},
    async run(id,executor,input){calls.push(['run',id]);return {run:1,output:await executor(input)};},
    async classify(id,{measure}){calls.push(['classify',id]);return {classification:'observation',replicated:false,measured:measure({value:1})};},
    async hypothesis(id){return {id};}
  };
  const lab=new StellarLabAdapter({experimentLoop:loop});
  const observation=await lab.request({operation:'run',payload:{experimentId:'exp-1',executor:async x=>({value:x}),input:1}});
  assert.equal(observation.output.value,1);
  const classified=await lab.request({operation:'classify',payload:{experimentId:'exp-1',measure:o=>o.value}});
  assert.equal(classified.classification,'observation');
  assert.equal(lab.snapshot().evidencePolicy,'execution-is-observation-until-explicit-classification');
});
