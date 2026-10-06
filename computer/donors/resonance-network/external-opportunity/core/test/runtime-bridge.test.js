import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaRuntimeBridge, createExternalRelationshipOrganism, wiringAudit } from '../src/index.js';

test('runtime bridge normalizes demands and knowledge gaps', () => {
  const science={formulateQuestion:q=>({id:'q1',question:q}),recordExperiment:(...args)=>({args})};
  const runtime={
    intent:{getDemands:()=>[{type:'housing',intensity:.9}]},
    agent:{getAspiration:()=>({getTopGaps:()=>[{id:'g1',domain:'transportation',question:'Need a ride',urgency:.8}]}),getScience:()=>science}
  };
  const bridge=new SynthiaRuntimeBridge({runtime});
  const needs=bridge.getOpenNeeds();
  assert.equal(needs.length,2);
  assert.equal(needs[0].source,'IntentFlow');
  assert.equal(needs[1].source,'AspirationCore');
});

test('single organism factory wires all membrane components', () => {
  const runtime={intent:{getDemands:()=>[]},agent:{getAspiration:()=>({getTopGaps:()=>[]}),getScience:()=>({formulateQuestion:()=>({id:'q'}),recordExperiment:()=>({})})}};
  const system=createExternalRelationshipOrganism({runtime});
  const audit=wiringAudit(system);
  assert.ok(Object.values(audit).every(Boolean));
  assert.ok(system.runtimeBridge);
});

test('external outcome returns to science and mesh', async () => {
  let scienceCalled=false, meshCalled=false;
  const science={formulateQuestion:()=>({id:'q1'}),recordExperiment:()=>{scienceCalled=true; return {ok:true}}};
  const runtime={intent:{getDemands:()=>[]},agent:{getAspiration:()=>({getTopGaps:()=>[]}),getScience:()=>science}};
  const mesh={emit:async(type,payload)=>{ if(type==='external.outcome' && payload.opportunityId==='opp1') meshCalled=true; }};
  const system=createExternalRelationshipOrganism({runtime,mesh});
  await system.orchestrator.recordOutcome({opportunityId:'opp1',reciprocalValue:{predictedMutualBenefit:.8}},{perceivedBenefitA:.9,perceivedBenefitB:.8});
  assert.equal(scienceCalled,true);
  assert.equal(meshCalled,true);
});
