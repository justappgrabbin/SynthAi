import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

test('HUMAN AGENT: native seed routes daily-life mechanics to exact C# donor surfaces through mesh',async()=>{
  const calls=[];
  const host={
    id:'human-agent-csharp-host',
    async invoke(call){calls.push(call);return {ok:true,component:call.component,method:call.method,args:call.args};}
  };
  const runtime=await new NativeSeedRuntime({persistence:new MemoryPersistence(),namespace:'human-agent-mechanics'}).boot();
  const requests=[];runtime.bus.on('mesh:request',event=>requests.push(event.payload));
  const snapshot=await runtime.bindHumanAgentHost(host);

  assert.equal(snapshot.language,'C#');
  assert.equal(runtime.worldFederation.layer('mechanics:human-agent').bound,true);

  const character={id:'synthia-projection',name:'Synthia',source:'canonical-5.7'};
  const created=await runtime.humanAgentRequest('agent.create',{character});
  assert.equal(created.component,'AutonomousAgentEngine');
  assert.equal(created.method,'CreateAgent');

  const scenario={type:'Work',description:'behind-schedule project'};
  const dropped=await runtime.humanAgentRequest('scenario.drop',{agentId:'synthia-projection',scenario});
  assert.equal(dropped.method,'DropAgentIntoScenario');
  assert.equal(dropped.args[0],'synthia-projection');

  const journal=await runtime.humanAgentRequest('journal.reflect',{agentId:'synthia-projection',journalEntry:'I learned from the outcome.'});
  assert.equal(journal.component,'TamagotchiAgentEngine');
  assert.equal(journal.method,'ApplyNotebookReflection');

  const ticked=await runtime.humanAgentRequest('simulation.tick',{});
  assert.equal(ticked.component,'SimulationEngine');
  assert.equal(ticked.method,'Tick');

  assert.ok(requests.some(r=>r.targetId==='mechanics:human-agent'&&r.operation==='agent.create'));
  assert.ok(requests.some(r=>r.targetId==='mechanics:human-agent'&&r.operation==='scenario.drop'));
  assert.equal(calls.length,4);
});
