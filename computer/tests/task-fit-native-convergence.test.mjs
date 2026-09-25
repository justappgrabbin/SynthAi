import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';

const unresolved = {
  intention:'unresolved', conversation:'unresolved', klein:'unresolved',
  eventAddress:'unresolved', knownRouting:'unresolved',
};

const fixture = {
  task: {
    id:'community-build', actions:[
      { id:'write', requiresCapabilities:['writing'] },
      { id:'travel', requiresCapabilities:['travel'] },
      { id:'organize', requiresCapabilities:['organizing'] },
    ],
  },
  person: {
    id:'person-1',
    capabilities:[{ id:'writing', evidenceIds:['e-write'] }],
    workableQualities:[{ id:'clear-explanations', evidenceIds:['e-write'] }],
    constraints:[{ actionId:'travel', reason:'Travel is unavailable this week.', evidenceIds:['e-travel'] }],
  },
  evidence:[
    { id:'e-write', source:'observed-work', observation:'Published a draft.' },
    { id:'e-travel', source:'reported-context', observation:'No transport this week.' },
    { id:'e-remote', source:'available-support', observation:'A remote contribution channel exists.' },
  ],
  context:{ routes:[{
    kind:'parallel', actionIds:['travel'], description:'Contribute remotely in parallel.',
    available:true, evidenceIds:['e-remote'],
  }] },
};

test('TASKFIT: Computer waits for upstream resolution and gives explained, possibility-first action paths', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence:new MemoryPersistence(), namespace:'task-fit-corrected', clock:() => 1000,
  }).boot();
  const participant = runtime.meshKernel.participant('system:task-fit');
  assert.deepEqual(participant.capabilities, [
    'task-fit.assess','task-fit.observe','task-fit.science-log',
  ]);

  const pending = await runtime.assessTaskFit(fixture);
  assert.equal(pending.status,'awaiting-upstream-resolution');
  assert.equal(pending.findings,undefined);

  const handled = await runtime.assessTaskFit({
    ...fixture, resolution:{ ...unresolved, conversation:'resolved' },
  });
  assert.equal(handled.status,'already-resolved');
  assert.equal(handled.resolvedBy,'conversation');

  const result = await runtime.assessTaskFit({ ...fixture, resolution:unresolved });
  assert.equal(result.status,'assessed');
  assert.equal(result.findings.find(item => item.actionId==='write').status,'can-now');
  const travel=result.findings.find(item => item.actionId==='travel');
  assert.equal(travel.status,'can-with-route');
  assert.match(travel.why.join(' '),/Travel is unavailable this week/);
  assert.equal(travel.alternatives[0].kind,'parallel');
  assert.equal(result.recommendation.find(item => item.actionId==='travel').path,'parallel');
  const organizing=result.findings.find(item => item.actionId==='organize');
  assert.equal(organizing.status,'unknown');
  assert.match(organizing.openQuestions[0],/observed evidence/);
  assert.equal(result.fit,undefined);
  assert.equal(result.tier,undefined);
  assert.equal(result.workableQualities[0].id,'clear-explanations');
});

test('TASKFIT: unverified claims do not become inability or capability', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence:new MemoryPersistence(), namespace:'task-fit-unknown',
  }).boot();
  const result=await runtime.assessTaskFit({
    task:{ id:'task', actions:[{ id:'act' }] },
    person:{ id:'person', workableQualities:[{ id:'unverified' }],
      constraints:[{ actionId:'act', reason:'Cannot do it', evidenceIds:['absent'] }] },
    resolution:unresolved, evidence:[],
  });
  assert.equal(result.findings[0].status,'unknown');
  assert.deepEqual(result.workableQualities,[]);
  assert.deepEqual(result.recommendation,[]);
});

test('TASKFIT: frozen chart hypothesis survives evidence log updates and restart', async () => {
  const persistence=new MemoryPersistence();
  const first=await new NativeSeedRuntime({
    persistence, namespace:'task-fit-science', clock:() => Date.UTC(2026,8,25),
  }).boot();
  const input={ ...fixture, resolution:unresolved, hypothesis:{
    statement:'Remote writing is a workable route.',
    chartPerspectives:{ tropical:{ gate:'example' }, sidereal:{ gate:'example-2' }, draconic:{} },
    derivedData:{ natal:{}, progressed:{}, transit:{}, cycle:{}, geo:{}, asteroid:{}, star:{}, hd:{} },
  }};
  const assessed=await first.assessTaskFit(input);
  const id=assessed.frozenHypothesis.id;
  await first.recordTaskFitObservation({
    personId:'person-1', taskId:'community-build', hypothesisId:id,
    observation:'The remote draft was completed.', evidenceIds:['e-write'],
  });
  const second=await new NativeSeedRuntime({
    persistence, namespace:'task-fit-science', clock:() => Date.UTC(2026,8,26),
  }).boot();
  const log=await second.taskFitScienceLog('person-1','community-build');
  assert.equal(log.hypotheses.length,1);
  assert.equal(log.hypotheses[0].id,id);
  assert.equal(log.hypotheses[0].statement,input.hypothesis.statement);
  assert.equal(log.observations.length,1);
  assert.equal(log.observations[0].observation,'The remote draft was completed.');
  await second.assessTaskFit(input);
  const repeated=await second.taskFitScienceLog('person-1','community-build');
  assert.equal(repeated.hypotheses.length,1);
});
