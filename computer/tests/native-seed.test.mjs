import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

test('NATIVE SEED: boots mesh-first with state space, execution, compiler, resident host and world federation', async()=>{
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'native-seed-test'}).boot();
  for(const id of ['computer:self','system:state-space','system:execution','system:compiler','system:resident-host','system:indiverse','system:purpose-guide']){
    assert.ok(runtime.meshKernel.participant(id),id+' missing');
  }
  assert.ok(runtime.worldFederation.layer('reality:consciousness-realm'));
  assert.ok(runtime.worldFederation.layer('mechanics:human-agent'));
  assert.ok(runtime.worldFederation.layer('lab:triform'));
  assert.ok(runtime.worldFederation.layer('lab:stellar'));
  assert.equal(runtime.worldFederation.layer('lab:stellar').bound,true);
  assert.equal(runtime.stellarLab.snapshot().mounted,true);
  assert.equal(runtime.meshKernel.participant('lab:stellar').residency,'active');
});

test('NATIVE SEED: state-space and automata calls travel through relational mesh', async()=>{
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'native-seed-routing'}).boot();
  const requests=[];runtime.bus.on('mesh:request',event=>requests.push(event.payload));
  const state=await runtime.activateAddress({gate:25,line:2,color:4,tone:4,base:2,degree:25,minute:59,second:31,arc:93571});
  assert.equal(state.node.gate,25);
  assert.equal(state.node.dimension,'Space');
  runtime.automata.register({id:'echo',execute:async({input})=>({echo:input})});
  const result=await runtime.runAutomaton('echo',{hello:'world'});
  assert.deepEqual(result,{echo:{hello:'world'}});
  assert.ok(requests.some(r=>r.targetId==='system:state-space'&&r.operation==='activate'));
  assert.ok(requests.some(r=>r.targetId==='system:execution'&&r.operation==='automata.run'));
});

test('NATIVE SEED: compiler sleeps after build and reuses unchanged artifact', async()=>{
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'native-seed-compiler'}).boot();
  let builds=0;
  runtime.registerCompilerBackend('test',{
    compile:async spec=>({artifactHash:'artifact-'+(++builds),artifactRef:'/cache/'+spec.id,target:'test'})
  });
  const a=await runtime.ensureCompiled({id:'hand:file',sourceHash:'src-1',target:'test'});
  const b=await runtime.ensureCompiled({id:'hand:file',sourceHash:'src-1',target:'test'});
  assert.equal(a.reused,false);
  assert.equal(b.reused,true);
  assert.equal(builds,1);
  assert.equal(runtime.compiler.lifecycle,'dormant');
});

test('NATIVE SEED: IndiVerse preserves canonical object while host grammar transforms expression', async()=>{
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'native-seed-indiverse'}).boot();
  await runtime.registerCanonicalWorldObject({
    id:'house-1',kind:'building',function:'home',
    affordances:[{id:'enter',requires:['threshold.reach']}],
    entryPoints:[{id:'front-door'}],
    presentation:{color:'shared-white',material:'wood',orientation:{roof:'up'},scale:1},
  });
  await runtime.createIndiVerse('adaya',{
    grammar:{
      colors:{building:'violet'},
      materials:{building:'soft-glass'},
      orientation:{building:{roof:'floor'}},
      thresholds:{building:{requires:['vertical.grapple'],alternatives:{'vertical.grapple':{capability:'hand:grapple',mode:'acquire-or-morph'}}}},
    },
  });
  const shared=runtime.viewSharedWorldObject('house-1');
  const local=runtime.viewIndiVerseObject('indiverse:adaya','house-1');
  const visitor=runtime.visitorMorphContract({
    worldId:'indiverse:adaya',objectId:'house-1',
    visitor:{id:'visitor:joe',identity:{id:'joe'},capabilities:['threshold.reach']},
  });
  assert.equal(shared.canonical.id,local.canonical.id);
  assert.equal(shared.expression.color,'shared-white');
  assert.equal(local.expression.color,'violet');
  assert.equal(local.expression.orientation.roof,'floor');
  assert.ok(visitor.missingAffordances.includes('vertical.grapple'));
  assert.equal(visitor.suggestedAdaptations[0].capability,'hand:grapple');
});


test('NATIVE SEED: Pathways to Purpose persists roadmap and outcome across restart', async()=>{
  const persistence=new MemoryPersistence();
  const namespace='native-seed-purpose';
  const first=await new NativeSeedRuntime({persistence,namespace}).boot();

  const roadmap=await first.buildPurposeRoadmap({
    userId:'user:purpose-native',
    goal:'Turn the phone world into a useful daily environment',
    profile:{strategy:'Respond',authority:'Emotional'},
    currentState:{
      strengths:['building'],
      constraints:['phone-first'],
      requiredCapabilities:['purpose-guide','world.qualia-contract'],
      resources:['native phone world'],
    },
  });

  assert.equal(roadmap.phases.map(p=>p.name).join('>'),'Discover>Map>Prepare>Activate>Optimize>Sustain');
  assert.equal(first.meshKernel.participant('system:purpose-guide').residency,'active');

  await first.recordPurposeOutcome({
    userId:'user:purpose-native',
    outcome:{
      action:'install-native-world',
      result:{installed:true},
      observableEffect:'native phone world opened successfully',
      evidence:{kind:'device-test',ref:'user-observed'},
    },
  });

  const second=await new NativeSeedRuntime({persistence,namespace}).boot();
  const restored=await second.getPurposeRoadmap('user:purpose-native');
  assert.equal(restored.id,roadmap.id);
  assert.equal(restored.outcomes.length,1);
  assert.equal(restored.outcomes[0].result.installed,true);
  assert.ok(second.state.get('events.log',[]).some(e=>e.observable_effect==='native phone world opened successfully'));
});
