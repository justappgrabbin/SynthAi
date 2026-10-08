import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceExperience,createReducedSession} from '../components/organism/processes/AutomataReduction.mjs';
test('qualitative reduction merges equivalent states but lifts distinct identity after scaled execution',()=>{
 const address={planetary:'Sun',dimension:'Movement',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
 const definition={address,id:'cycle',initial:'a',states:[
  {id:'a',inheritAddress:true,label:'Ready',actions:[{id:'next',inheritAddress:true,label:'Next',to:'b'}]},
  {id:'b',inheritAddress:true,label:'Ready',actions:[{id:'next',inheritAddress:true,label:'Next',to:'a'}]}]};
 const work=reduceExperience(definition);
 assert.equal(work.primitiveStateCount,1);assert.equal(work.verification.pass,true);
 assert.deepEqual(work.lifting['primitive:0'],['a','b']);
 const session=createReducedSession(work,'person');
 assert.equal(session.act('next').stateId,'b');assert.equal(session.act('next').stateId,'a');
 assert.equal(session.snapshot().identityId,'person');assert.deepEqual(work.reconstruction.definition,definition);
 assert.throws(()=>session.act('unknown'),/unavailable/);
});
test('future qualitative differences refine initially similar states without arbitrary equivalence',()=>{
 const work=reduceExperience({id:'fork',initial:'a',states:[
  {id:'a',label:'Ready',actions:[{id:'next',inheritAddress:true,label:'Next',to:'c'}]},
  {id:'b',label:'Ready',actions:[{id:'next',inheritAddress:true,label:'Next',to:'d'}]},
  {id:'c',label:'Finished',actions:[]},{id:'d',label:'Damaged',actions:[]}]});
 assert.equal(work.rounds[0].stateCount,3);assert.equal(work.primitiveStateCount,4);
 assert.equal(work.verification.pass,true);
 assert.throws(()=>reduceExperience({id:'bad',initial:'a',states:[{id:'a',actions:[{id:'x',to:'a'},{id:'x',to:'a'}]}]}),/Deterministic/);
});
