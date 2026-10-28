import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {StandaloneNeuralGateway} from '../services/standalone-neural-gateway.mjs';

test('No mount never fabricates original neural model or its trained weights',async()=>{
 const gateway=await new StandaloneNeuralGateway({home:null}).boot();
 assert.equal(gateway.summary().mounted,false);
 assert.equal(gateway.summary().noAutomaticGitPush,true);
 assert.equal(gateway.summary().noDeletionTools,true);
 assert.equal(gateway.summary().alignmentDimensions,6);
 await assert.rejects(gateway.generate({text:'Generate source'}),/Synthia-Neural-Standalone unavailable/);
 await assert.rejects(gateway.inspect({text:'Meaning'}),/Synthia-Neural-Standalone unavailable/);
 await assert.rejects(gateway.generate({text:''}),/nonempty/);
});
test('Invalid source fails closed; does not create its own substitute model',async t=>{
 const temporary=await mkdtemp(join(tmpdir(),'missing-owner-neural-'));
 t.after(()=>rm(temporary,{recursive:true,force:true}));
 const gateway=await new StandaloneNeuralGateway({home:temporary}).boot();
 assert.equal(gateway.summary().mounted,false);
 assert.equal(gateway.summary().configured,true);
 assert.match(gateway.summary().error,/ENOENT|original/i);
 await assert.rejects(gateway.generate({text:'hello'}),/unavailable/);
});
test('REAL original neural donor passes native semantic, trained TRIDENT and reload tests when mounted',
 {skip:!process.env.SYNTHIA_TEST_STANDALONE_HOME,timeout:120000},async t=>{
 const workspace=await mkdtemp(join(tmpdir(),'real-owner-neural-'));
 t.after(()=>rm(workspace,{recursive:true,force:true}));
 const gateway=await new StandaloneNeuralGateway({
   home:process.env.SYNTHIA_TEST_STANDALONE_HOME,
   workspace,python:process.env.SYNTHIA_PYTHON??'python3'
 }).boot();
 assert.equal(gateway.summary().mounted,true,gateway.summary().error);
 const status=await gateway.status();
 assert.equal(status.actual.trained,false);
 const reading=await gateway.inspect({text:'The tree depends on water',annotations:{context:{domain:'plants'}}});
 assert.ok(reading.reading);
 const cold=await gateway.generate({text:'What grows?'});
 assert.equal(cold.ready,false);
 const trained=await gateway.adapter.language.teach({
   prompt:'What grows?',response:'A tree grows.',steps:3,accepted:true
 },{ownerApproved:true});
 assert.equal(trained.steps,3);
 const generation=await gateway.generate({text:'What grows?',annotations:{max_new_bytes:16,seed:12}});
 assert.equal(generation.ready,true);
 assert.equal(generation.weightsLoaded,true);
 assert.equal(generation.generatedBy,'trained-trident-autoregressive-neural-decoder');
 assert.ok(generation.revision);
});
