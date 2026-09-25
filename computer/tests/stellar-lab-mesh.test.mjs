import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { RelationalMeshKernel } from '../runtime/mesh-kernel.mjs';
import { StellarLabAdapter } from '../labs/stellar-lab-adapter.mjs';

test('STELLAR LAB: execution stays observation until replicated explicit classification', async()=>{
  const bus=new EventBus();
  const state=new StateStore({bus,persistence:new MemoryPersistence(),namespace:'stellar-mesh-test'});
  await state.restore();
  const mesh=await new RelationalMeshKernel({state,bus}).boot();

  await mesh.registerParticipant('system:execution',{
    kind:'core-service',residency:'active',capabilities:['execution']
  });
  await mesh.registerParticipant('reality:consciousness-realm',{
    kind:'world-home',residency:'active',capabilities:['world.event']
  });

  const lab=new StellarLabAdapter({mesh,state,bus});
  lab.registerExecutor('deterministic-probe', async input=>({value:Number(input.value)}));
  lab.registerMeasure('value', output=>output.value);
  await lab.mount();

  await mesh.connect('lab:stellar','reality:consciousness-realm',{type:'observes'});

  const h=await mesh.request('lab:stellar',{
    operation:'hypothesis.create',
    payload:{
      id:'h-repeat',
      claim:'identical input yields identical measured value',
      nullHypothesis:'identical input does not yield identical measured value',
      metric:'value',
      test:'run deterministic probe twice',
      threshold:0.99
    }
  });
  assert.equal(h.delivered,true);
  assert.equal(h.result.status,'hypothesized');

  const created=await mesh.request('lab:stellar',{
    operation:'experiment.create',
    payload:{
      hypothesisId:'h-repeat',
      conditions:{environment:'triform-control'},
      variables:{value:1},
      method:'deterministic-probe'
    }
  });
  const experimentId=created.result.id;

  await mesh.request('lab:stellar',{
    operation:'experiment.run',
    payload:{experimentId,input:{value:1}}
  });

  const first=await mesh.request('lab:stellar',{
    operation:'evidence.classify',
    payload:{experimentId,measureId:'value'}
  });
  assert.equal(first.result.classification,'observation');
  assert.equal(first.result.replicated,false);

  await mesh.request('lab:stellar',{
    operation:'experiment.run',
    payload:{experimentId,input:{value:1}}
  });

  const second=await mesh.request('lab:stellar',{
    operation:'evidence.classify',
    payload:{experimentId,measureId:'value'}
  });
  assert.equal(second.result.classification,'supported_result');
  assert.equal(second.result.replicated,true);

  assert.ok(mesh.relationshipsFor('lab:stellar').some(e=>e.type==='uses-execution'&&e.to==='system:execution'));
  assert.ok(mesh.relationshipsFor('lab:stellar').some(e=>e.type==='observes'&&e.to==='reality:consciousness-realm'));
  assert.ok(Object.keys(state.get('stellar.receipts',{})).length>=5);
});
