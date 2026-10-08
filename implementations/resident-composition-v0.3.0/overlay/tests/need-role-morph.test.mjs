import test from 'node:test';
import assert from 'node:assert/strict';
import { ScientificSynthiaAssembly, NeedRoleMorph, executeWithResidentFallback } from '../src/index.mjs';
const address={planetary:'Sun',dimension:'Being',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
function store(){const entries=new Map();return {get:(a,b)=>entries.has(a+b)?{value:structuredClone(entries.get(a+b))}:null,upsert:(a,b,v)=>entries.set(a+b,structuredClone(v))};}
test('one identity can enact authored tree/person/building roles with actual dimensional work and history',async()=>{
 const memory=store(),runtime=new NeedRoleMorph({memory,identity:()=> 'participant'});
 for(const actor of ['tree','person','building'])runtime.register({id:actor,address,provides:[`actor:${actor}`],
  perform:({identityId,input})=>({identityId,actor,action:input.action,result:actor==='tree'?'shade':actor==='person'?'greeting':'shelter'}),
  verify:out=>({pass:out.identityId==='participant',evidence:{actor:out.actor,action:out.action,result:out.result}})});
 const first=await runtime.morph({need:'actor:tree',address,input:{action:'offer shade'}});
 assert.equal(first.status,'verified');assert.equal(first.workup.Movement.output.result,'shade');
 for(const actor of ['person','building']){
  const next=await runtime.morph({need:`actor:${actor}`,address,input:{action:'act'}});
  assert.equal(next.identityId,first.identityId);assert.equal(next.status,'verified');
 }
 const again=await runtime.morph({need:'actor:tree',address,input:{action:'offer shade'}});
 assert.equal(again.workup.Evolution.prior[0].id,first.id);
 for(const [dimension,unit] of Object.entries(again.workup)){assert.equal(unit.addressBinding.address.dimension,dimension);assert.equal(unit.projection.originAddress.dimension,'Being');}
 assert.deepEqual(again.workup.Space.contributors,['Movement','Evolution','Being','Design']);
 assert.equal(new NeedRoleMorph({memory,identity:()=> 'participant'}).snapshot().history.length,4);
 const unknown=await runtime.morph({need:'actor:river',address});assert.equal(unknown.status,'held');
 runtime.register({id:'another-tree',address,provides:['actor:tree'],perform:()=>{throw Error('must not execute')},verify:()=>({pass:true})});
 assert.equal((await runtime.morph({need:'actor:tree',address})).reason,'ambiguous-role');
 await assert.rejects(runtime.morph({need:'actor:tree',address:{gate:1}}),/Complete address/);
});
test('backend outage can become a verified runtime role example with transparent local fallback',async()=>{
 const originalFetch=globalThis.fetch,originalWorker=globalThis.Worker;
 globalThis.fetch=()=>{throw Error('network forbidden')};globalThis.Worker=class{constructor(){throw Error('workers forbidden')}};
 const system=new ScientificSynthiaAssembly({autoStart:false,executionMode:'resident',residentFallback:true,
  executionSurface:{register(){},async execute(){return {ok:false,path:'backend-unavailable',error:'backend offline'}}}});
 try{
  system.registerMorphRole({id:'runtime-example',address,provides:['execute-example'],
   perform:({input,executeArtifact})=>executeArtifact(input,{fallbackScope:'example'}),
   verify:record=>({pass:record.execution.ok&&record.execution.result.returnValue===42,evidence:{value:record.execution.result.returnValue,path:record.execution.path}})});
  const result=await system.morphForNeed({need:'execute-example',address,input:{name:'example.js',content:'return 6 * 7;'}});
  assert.equal(result.status,'verified');
  assert.equal(system.embodiment.snapshot().avatar.manifestation.roleId,'runtime-example');
  const execution=result.workup.Movement.output.execution;
  assert.equal(execution.fallback.used,true);assert.equal(execution.backendUsed,false);assert.equal(execution.workerUsed,false);
  assert.match(execution.fallback.disclosure,/executed locally/);
  assert.equal(execution.fallback.attempts[0].ok,false);
  const recalled=await system.recallArtifact(result.workup.Movement.output.fingerprint);
  assert.equal(recalled.execution.fallback.used,true);
  const blocked=await system.executeArtifact({name:'example.js',content:'return 42;'},{organismAddress:address});
  assert.equal(blocked.execution.ok,false);assert.equal(blocked.execution.fallback.status,'scope-required');
 }finally{await system.close();globalThis.fetch=originalFetch;globalThis.Worker=originalWorker;}
});
test('fallback is optional, preserves failures, and never runs when primary succeeds',async()=>{
 let localCalls=0;const resident=()=>{localCalls++;return {ok:true}};
 assert.equal((await executeWithResidentFallback({primary:()=>({ok:true}),resident,enabled:true})).fallback.used,false);
 assert.equal((await executeWithResidentFallback({primary:()=>{throw Error('offline')},resident})).ok,false);
 assert.equal(localCalls,0);
 const failed=await executeWithResidentFallback({primary:()=>({ok:false}),resident:()=>({ok:false,error:'missing capability'}),enabled:true,context:{fallbackScope:'example'}});
 assert.equal(failed.ok,false);assert.match(failed.fallback.disclosure,/could not execute/);
});
