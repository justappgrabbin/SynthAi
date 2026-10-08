import test from 'node:test';
import assert from 'node:assert/strict';
import {ComplementaryGapModel} from '../components/organism/organism/ComplementaryGapModel.mjs';
import SynthiaUnit from '../components/organism/core/SynthiaUnit.mjs';

test('provision executes support, preserves failures and verifies actual repaired function after restart',async()=>{
 const saved=new Map();const memory={query:()=>[...saved.values()].map(value=>({value:structuredClone(value)})),upsert:(_,id,value)=>saved.set(id,structuredClone(value))};
 const model=new ComplementaryGapModel({memory});
 const gap=model.observe({human:'person-a',capability:'remember-location',friction:'Location disappears between visits'});
 const failed=await model.provision(gap.id,{execute:async()=>({success:false,error:'storage unavailable'})});
 assert.equal(failed.status,'open');assert.equal(failed.attempts[0].status,'failed');
 let stored=null,calls=0;
 const pending=await model.provision(gap.id,{execute:async()=>{calls++;stored='chosen shelf';return {success:true};}});
 assert.equal(pending.status,'open');assert.equal(pending.attempts[1].status,'provided-unverified');
 const restored=new ComplementaryGapModel({memory});assert.equal(restored.open()[0].attempts.length,2);
 const execute=async()=>{calls++;stored='chosen shelf';return {success:true};};
 const verify=async()=>({pass:stored==='chosen shelf',evidence:{readBack:stored}});
 const a=restored.provision(gap.id,{execute,verify,by:'memory-support'});
 const b=restored.provision(gap.id,{execute,verify,by:'memory-support'});
 assert.equal(a,b);const repaired=await a;
 assert.equal(calls,2);assert.equal(repaired.status,'satisfied');assert.equal(repaired.attempts.length,3);
 assert.equal(new ComplementaryGapModel({memory}).open().length,0);
});

test('life pulse supplies an existing support and checks the missing function without success reward budget',async()=>{
 const unit=new SynthiaUnit({autoStart:false,memoryKey:'gap-provision-test'});
 const gap=unit.observeHumanFriction({capability:'retain-note',friction:'A note is missing'});
 let calls=0;
 unit.runtime.registerTool({toolId:'test-note-support',provides:['complement:retain-note'],execute:async()=>{calls++;unit.memory.upsert('notes','chosen','remember this');return {success:true};},verifyRepair:async()=>({pass:unit.memory.get('notes','chosen')?.value==='remember this',evidence:{readBack:unit.memory.get('notes','chosen')?.value}})});
 assert.equal(unit.metabolism.adaptationBudget,0);
 const pulse=await unit.living.pulse({dtMs:1});
 assert.equal(calls,1);assert.equal(pulse.provisions[0].attempt,'verified');
 assert.equal(unit.complement.snapshot().all.find(g=>g.id===gap.id).status,'satisfied');
 await unit.living.pulse({dtMs:1});assert.equal(calls,1);
});
