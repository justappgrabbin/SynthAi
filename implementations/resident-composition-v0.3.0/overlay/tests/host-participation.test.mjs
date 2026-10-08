import test from 'node:test';
import assert from 'node:assert/strict';
import HostParticipationLoop from '../components/organism/organism/HostParticipationLoop.mjs';
import ComplementaryGapModel from '../components/organism/organism/ComplementaryGapModel.mjs';
import LivingLoop from '../components/organism/organism/LivingLoop.mjs';
import LocalMemory from '../components/organism/organs/LocalMemory.js';
import AutoCoder from '../components/organism/processes/AutoCoder.mjs';

const copy = value => structuredClone(value);
const binding = {hostId:'story-maker', revision:'1'};
const work = {
  id:'characters', revision:'1', goal:'Manage character states', capability:'characters:update',
  requirements:[{key:'responsibility', question:'Should I control appearance or only behavior?', choices:['appearance','behavior']}]
};
let memorySequence = 0;

function fixture({needs=[work], authorize=null, ask=true, inline=false, memory=null, host=binding}={}) {
  const tools = [], calls = [], grants = [], gaps = [];
  memory ||= new LocalMemory(`host-test-${++memorySequence}`);
  const unit = {memory, runtime:{getRegisteredTools:()=>tools}, complement:new ComplementaryGapModel({memory}),
    living:{observeCapabilityGap:gap=>gaps.push(copy(gap))}};
  const add = (capability, execute, endpoint=false) => {
    const tool = {toolId:`tool:${capability}`, provides:[capability], execute:async context=>{
      calls.push({capability, input:copy(context.inputValues)});
      return execute(context);
    }};
    if (endpoint) tool.hostBinding=copy(host);
    tools.push(tool);
    return tool;
  };
  add('host:observe', ()=>({success:true,outputValues:{observation:{...host,needs:copy(needs)}}}), true);
  const answer = (questionId, value='behavior') => ({...host,questionId,value,responder:'application-owner',evidence:{source:'owner-response'}});
  const addAsk = () => add('host:ask', context=>{
    const questionId=context.inputValues.questionId;
    return {success:true,outputValues:{receipt:{questionId,delivered:true,evidence:{source:'local-host-ui'}},
      ...(inline?{answer:answer(questionId)}:{})}};
  }, true);
  if (ask) addAsk();
  add('characters:update', context=>({success:true,outputValues:{receipt:{...host,needId:context.inputValues.need.id,
    needRevision:context.inputValues.need.revision,completed:true,evidence:{source:'character-state-store'}}}}));
  const permission = async request=>{
    grants.push(copy(request));
    return authorize ? authorize(request) : {allowed:true,evidence:{source:'fixture-host-policy',operation:request.operation}};
  };
  const loop = new HostParticipationLoop({unit,...host,authorize:permission});
  return {unit,loop,tools,calls,grants,gaps,add,addAsk,answer,needs,permission};
}

test('discovers a compatible action without assigning a role', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  const result=await f.loop.pulse();
  assert.equal(result.results[0].status,'completed');
  assert.deepEqual(f.calls.map(c=>c.capability),['host:observe','characters:update']);
  await f.loop.pulse();
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,1);
});

test('asks, integrates a scoped answer, and resumes the discovered action', async () => {
  const f=fixture();
  assert.equal((await f.loop.pulse()).results[0].status,'awaiting-clarification');
  const question=f.loop.snapshot().questions[0];
  assert.equal(f.calls.find(c=>c.capability==='host:ask').input.question,work.requirements[0].question);
  await f.loop.pulse();
  assert.equal(f.calls.filter(c=>c.capability==='host:ask').length,1);
  assert.equal((await f.loop.answer(question.id,f.answer(question.id))).status,'integrated');
  assert.equal(f.unit.complement.open().length,0);
  assert.equal((await f.loop.pulse()).results[0].status,'completed');
  assert.deepEqual(f.calls.find(c=>c.capability==='characters:update').input.answers,{responsibility:'behavior'});
  assert.equal(f.grants.filter(g=>g.operation==='execute').length,1);
});

test('establishes contact before asking, with distinct host grants', async () => {
  const f=fixture({ask:false,inline:true});
  f.add('host:establish-contact',()=>{
    f.addAsk();
    return {success:true,outputValues:{receipt:{...binding,established:true,evidence:{source:'host-contact-created'}}}};
  },true);
  assert.equal((await f.loop.pulse()).results[0].status,'completed');
  assert.deepEqual(f.calls.map(c=>c.capability),['host:observe','host:establish-contact','host:ask','characters:update']);
  assert.deepEqual(f.grants.map(g=>g.operation),['observe','establish-contact','ask','integrate-answer','execute']);
  assert.ok(f.gaps.some(g=>g.capabilities.includes('host:ask')));
});

test('denied observation performs no host operation', async () => {
  const f=fixture({authorize:()=>({allowed:false,evidence:{source:'denied'}})});
  assert.equal((await f.loop.pulse()).operation,'observe');
  assert.equal(f.calls.length,0);
});

test('a grant without evidence is not authorization', async () => {
  const f=fixture({authorize:()=>({allowed:true})});
  assert.equal((await f.loop.pulse()).status,'authorization-required');
  assert.equal(f.calls.length,0);
});

test('denied contact establishment neither creates a path nor sends a question', async () => {
  const f=fixture({ask:false,authorize:r=>({allowed:r.operation!=='establish-contact',evidence:{source:'policy'}})});
  f.add('host:establish-contact',()=>{throw new Error('must not execute');},true);
  await f.loop.pulse();
  assert.deepEqual(f.calls.map(c=>c.capability),['host:observe']);
  assert.equal(f.loop.snapshot().questions[0].status,'open');
});

test('answers do not grant execution rights', async () => {
  let executeAllowed=false;
  const f=fixture({inline:true,authorize:r=>({allowed:r.operation!=='execute'||executeAllowed,evidence:{source:'host-policy'}})});
  assert.equal((await f.loop.pulse()).results[0].status,'authorization-required');
  assert.equal(f.loop.snapshot().questions[0].status,'answered');
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
  executeAllowed=true;
  assert.equal((await f.loop.pulse()).results[0].status,'completed');
  assert.equal(f.calls.filter(c=>c.capability==='host:ask').length,1);
});

test('answers from another host, question, or unauthorized responder are rejected', async () => {
  const f=fixture({authorize:r=>({allowed:r.operation!=='integrate-answer',evidence:{source:'policy'}})});
  await f.loop.pulse();
  const id=f.loop.snapshot().questions[0].id;
  assert.equal((await f.loop.answer(id,{...f.answer(id),hostId:'another-app'})).status,'unresolved-answer');
  assert.equal((await f.loop.answer(id,f.answer('another-question'))).status,'unresolved-answer');
  assert.equal((await f.loop.answer(id,f.answer(id))).status,'authorization-required');
  assert.equal(f.loop.snapshot().questions[0].status,'awaiting-answer');
});

test('unsupported choice and conflicting answers remain unresolved', async () => {
  const f=fixture();await f.loop.pulse();const id=f.loop.snapshot().questions[0].id;
  assert.equal((await f.loop.answer(id,f.answer(id,'everything'))).status,'unresolved-answer');
  assert.equal((await f.loop.answer(id,f.answer(id))).status,'integrated');
  assert.equal((await f.loop.answer(id,f.answer(id))).status,'already-integrated');
  assert.equal((await f.loop.answer(id,f.answer(id,'appearance'))).status,'answer-conflict');
});

test('unavailable communication produces growth needs and stays unresolved', async () => {
  const f=fixture({ask:false});await f.loop.pulse();
  assert.ok(f.gaps.some(g=>g.capabilities.includes('host:ask')));
  assert.ok(f.gaps.some(g=>g.capabilities.includes('host:establish-contact')));
  assert.equal(f.unit.complement.open().length,1);
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('unbound or foreign host endpoints cannot be used', async () => {
  const f=fixture({ask:false});
  f.add('host:ask',()=>{throw new Error('unbound');});
  const foreign=f.add('host:ask',()=>{throw new Error('foreign');},true);foreign.hostBinding.hostId='another-host';
  await f.loop.pulse();assert.deepEqual(f.calls.map(c=>c.capability),['host:observe']);
});

test('pending questions and answers survive real LocalMemory restart', async () => {
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const store=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  try {
    const memory=new LocalMemory('restart-fixture');
    const first=fixture({memory});await first.loop.pulse();const id=first.loop.snapshot().questions[0].id;
    const second=fixture({memory:new LocalMemory('restart-fixture')});await second.loop.pulse();
    assert.equal(second.calls.filter(c=>c.capability==='host:ask').length,0);
    await second.loop.answer(id,second.answer(id));
    const third=fixture({memory:new LocalMemory('restart-fixture')});
    assert.equal((await third.loop.pulse()).results[0].status,'completed');
    assert.equal(third.calls.filter(c=>c.capability==='host:ask').length,0);
    assert.equal(third.unit.complement.open().length,0);
    const fourth=fixture({memory:new LocalMemory('restart-fixture')});await fourth.loop.pulse();
    assert.equal(fourth.calls.filter(c=>c.capability==='characters:update').length,0);
  } finally {if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('a new host revision does not reuse the old answer', async () => {
  const first=fixture({inline:true});await first.loop.pulse();
  const second=fixture({memory:first.unit.memory,host:{...binding,revision:'2'}});await second.loop.pulse();
  assert.equal(second.calls.filter(c=>c.capability==='host:ask').length,1);
  assert.equal(second.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('overlapping pulses dispatch each question only once', async () => {
  const f=fixture();
  await Promise.all([f.loop.pulse(),f.loop.pulse(),f.loop.pulse()]);
  assert.equal(f.calls.filter(c=>c.capability==='host:observe').length,1);
  assert.equal(f.calls.filter(c=>c.capability==='host:ask').length,1);
});

test('uncertain deliveries are not resent automatically', async () => {
  const f=fixture();f.tools.find(t=>t.provides.includes('host:ask')).execute=async()=>{throw new Error('lost acknowledgment');};
  await f.loop.pulse();assert.equal(f.loop.snapshot().questions[0].status,'uncertain');
  const restarted=fixture({memory:f.unit.memory});await restarted.loop.pulse();
  assert.equal(restarted.calls.filter(c=>c.capability==='host:ask').length,0);
});

test('generic success is not evidence that a host task completed', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  f.tools.find(t=>t.provides.includes('characters:update')).execute=async()=>({success:true});
  assert.equal((await f.loop.pulse()).results[0].status,'execution-uncertain');
  const restarted=fixture({memory:f.unit.memory,needs:f.needs});
  assert.equal((await restarted.loop.pulse()).results[0].status,'execution-uncertain');
  assert.equal(restarted.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('an unanswered need does not block independent compatible work', async () => {
  const f=fixture({needs:[work,{...work,id:'independent',requirements:[]}]});
  const result=await f.loop.pulse();
  assert.deepEqual(result.results.map(r=>r.status),['awaiting-clarification','completed']);
});

test('missing executable support enters the existing growth path', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  f.tools.splice(f.tools.findIndex(t=>t.provides.includes('characters:update')),1);
  assert.equal((await f.loop.pulse()).results[0].status,'capability-unavailable');
  assert.ok(f.gaps.some(g=>g.capabilities.includes('characters:update')));
});

test('malformed observations do not partially act on a valid earlier need', async () => {
  const f=fixture({needs:[{...work,requirements:[]},{id:'bad'}]});
  assert.equal((await f.loop.pulse()).status,'unresolved-observation');
  assert.equal(f.loop.snapshot().needs.length,0);
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('changed semantics require a new need revision', async () => {
  const f=fixture({inline:true});await f.loop.pulse();
  f.needs[0]={...work,goal:'Change every appearance'};
  assert.equal((await f.loop.pulse()).status,'need-revision-required');
});

test('LivingLoop pulses drive participation without a user intent', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  Object.assign(f.unit,{
    metabolism:{vitality:1,repairPressure:0,adaptationBudget:0,tick:()=>{}},
    fabric:{status:()=>({})},coordinator:{},rules:{},hostParticipation:f.loop
  });
  f.unit.living=new LivingLoop({unit:f.unit});
  const event=await f.unit.living.pulse();
  assert.equal(event.hostParticipation.results[0].status,'completed');
  assert.equal(event.type,'life-pulse');
});

test('repairs a missing page and broken button from existing definitions without asking', async () => {
  // The page and handler exist; their mounts were omitted. Repairs restore
  // authored behavior rather than inventing page content or button semantics.
  let source=`
    const profile = {title:'Profile'};
    const save = state => ({...state, saved:true});
    const pages = {};
    const buttons = {};
    export const visit = route => pages[route];
    export const click = (name,state) => buttons[name](state);
  `;
  const load = async () => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const initial=await load();
  assert.equal(initial.visit('/profile'),undefined);
  assert.throws(()=>initial.click('save',{}),TypeError);
  const needs=[];
  const f=fixture({needs,ask:false});
  const coder=new AutoCoder();
  f.tools.find(t=>t.provides.includes('host:observe')).execute=async()=>{
    const app=await load();const observed=[];
    if(!app.visit('/profile'))observed.push({id:'missing-profile',revision:'1',kind:'repair',goal:'Restore the existing Profile page route',capability:'app:restore-profile',requirements:[]});
    try{app.click('save',{});}catch{observed.push({id:'broken-save',revision:'1',kind:'repair',goal:'Reconnect the existing Save handler',capability:'app:restore-save',requirements:[]});}
    return {success:true,outputValues:{observation:{...binding,needs:observed}}};
  };
  const addRepair=(capability,find,withText,check)=>f.add(capability,async context=>{
    const before=source;
    source=coder.repair({target:'app.mjs',source,problem:context.inputValues.need.goal,replacement:{find,with:withText}}).source;
    const app=await load();
    const pass=check(app);
    return {success:true,outputValues:{receipt:{...binding,needId:context.inputValues.need.id,needRevision:'1',completed:pass,
      changes:[{target:'app.mjs',before,after:source}],verification:{pass,evidence:{source:'functional-page-and-button-check'}},evidence:{source:'AutoCoder.repair'}}}};
  });
  addRepair('app:restore-profile','const pages = {};',"const pages = {'/profile':profile};",app=>app.visit('/profile')?.title==='Profile');
  addRepair('app:restore-save','const buttons = {};','const buttons = {save};',app=>app.click('save',{}).saved===true);
  const result=await f.loop.pulse();
  assert.deepEqual(result.results.map(r=>r.status),['completed','completed']);
  const repaired=await load();
  assert.equal(repaired.visit('/profile').title,'Profile');
  assert.equal(repaired.click('save',{}).saved,true);
  assert.equal(f.grants.filter(g=>g.operation==='ask').length,0);
  const records=f.unit.memory.query('host-repairs').map(r=>r.value);
  assert.equal(records.length,2);
  assert.ok(records.every(r=>r.verification.pass&&r.changes[0].before!==r.changes[0].after));
  assert.deepEqual((await f.loop.pulse()).results,[]);
});

test('an unverified repair is not recorded as fixed', async () => {
  const f=fixture({needs:[{...work,kind:'repair',requirements:[]}]});
  assert.equal((await f.loop.pulse()).results[0].status,'execution-uncertain');
  assert.equal(f.unit.memory.query('host-repairs').length,0);
});

test('foreign host task tools are excluded even when the capability name matches', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  f.tools.find(t=>t.provides.includes('characters:update')).hostBinding={hostId:'foreign',revision:'1'};
  assert.equal((await f.loop.pulse()).results[0].status,'capability-unavailable');
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('field-specific capabilities receive the same composition and named chart qualities', async () => {
  const qualities=[{name:'Care',dimension:'Being',value:'provided-quality',source:{type:'provided-chart',id:'chart:person-a'},address:{gate:27}}];
  const world={...work,id:'world-expression',capability:'world:express',field:'world',qualities,requirements:[],reference:{id:'photo:person-a',purpose:'face-reference'}};
  const page={...world,id:'page-expression',capability:'page:express',field:'page'};
  const f=fixture({needs:[world,page]});
  const composition={nodes:[{id:'letter-a',kind:'occurrence',symbol:'A'},{id:'sentence-a',kind:'composition',members:[{position:0,id:'letter-a'}]}],events:[]};
  const organismField={dimensions:Object.fromEntries(['Movement','Evolution','Being','Design','Space'].map(name=>[name,{name,voices:1}]))};
  f.unit.compositions={snapshot:()=>copy(composition)};
  f.unit.processField={snapshot:()=>copy(organismField)};
  const expressions=[];
  for(const capability of ['world:express','page:express'])f.add(capability,context=>{
    expressions.push(copy(context.inputValues));
    return {success:true,outputValues:{receipt:{...binding,needId:context.inputValues.need.id,needRevision:'1',completed:true,evidence:{source:capability}}}};
  });
  await f.loop.pulse();
  assert.deepEqual(expressions.map(e=>e.expression.field),['world','page']);
  assert.deepEqual(expressions[0].expression.composition,expressions[1].expression.composition);
  assert.deepEqual(expressions[0].expression.qualities,qualities);
  assert.deepEqual(expressions[1].expression.organismField,organismField);
  assert.deepEqual(expressions[0].need.reference,world.reference);
  assert.deepEqual(f.grants.filter(g=>g.operation==='execute').map(g=>g.input.expression),expressions.map(e=>e.expression));
  assert.deepEqual(f.unit.compositions.snapshot(),composition);
});

test('unnamed or unsourced chart qualities stay unresolved rather than acquiring invented labels', async () => {
  const f=fixture({needs:[{...work,requirements:[],qualities:[{dimension:'Being',value:'unknown'}]}]});
  assert.equal((await f.loop.pulse()).status,'unresolved-qualities');
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('a denied ask leaves the question open and sends no message', async () => {
  const f=fixture({authorize:r=>({allowed:r.operation!=='ask',evidence:{source:'host-policy'}})});
  await f.loop.pulse();
  assert.equal(f.loop.snapshot().questions[0].status,'open');
  assert.equal(f.calls.filter(c=>c.capability==='host:ask').length,0);
});

test('unmounted organisms retain their ordinary pulse behavior', async () => {
  const f=fixture();Object.assign(f.unit,{metabolism:{vitality:1,repairPressure:0,adaptationBudget:0,tick:()=>{}},fabric:{status:()=>({})},coordinator:{},rules:{}});
  f.unit.living=new LivingLoop({unit:f.unit});
  const result=await f.unit.living.pulse();
  assert.equal(result.hostParticipation,null);
  assert.equal(f.calls.length,0);
});

test('global delivery cannot reuse the full local expression payload', () => {
  const f=fixture();
  assert.throws(()=>new HostParticipationLoop({unit:f.unit,...binding,authorize:f.permission,scope:'global'}),/IdentityBoundary/);
});

test('an interrupted persisted execution stays uncertain after restart', async () => {
  const f=fixture({needs:[{...work,requirements:[]}]});
  await f.loop.pulse();
  const saved=f.loop.snapshot();saved.needs[0].status='executing';
  f.unit.memory.upsert('host-participation',JSON.stringify([binding.hostId,binding.revision]),saved);
  const restarted=fixture({memory:f.unit.memory,needs:f.needs});
  assert.equal((await restarted.loop.pulse()).results[0].status,'execution-uncertain');
  assert.equal(restarted.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('a generic contact success cannot satisfy the communication condition', async () => {
  const f=fixture({ask:false});
  f.add('host:establish-contact',()=>({success:true}),true);
  await f.loop.pulse();
  assert.equal(f.loop.snapshot().contacts[0].status,'uncertain');
  assert.equal(f.loop.snapshot().questions[0].status,'open');
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});

test('switching hosts preserves the same organism and keeps each host context separate', async () => {
  const f=fixture();f.unit.profile={id:'same-swarm'};
  await f.loop.pulse();const question=f.loop.snapshot().questions[0].id;
  await f.loop.answer(question,f.answer(question));
  await f.loop.close();assert.equal((await f.loop.pulse()).status,'unmounted');
  const other={hostId:'research-app',revision:'1'};
  f.tools.push({toolId:'research:observe',hostBinding:other,provides:['host:observe'],execute:async()=>({success:true,outputValues:{observation:{...other,needs:[]}}})});
  const research=new HostParticipationLoop({unit:f.unit,...other,authorize:f.permission});
  await research.pulse();assert.equal(research.snapshot().questions.length,0);
  await research.close();
  const returned=new HostParticipationLoop({unit:f.unit,...binding,authorize:f.permission});
  assert.equal(returned.snapshot().questions[0].answer.value,'behavior');
  assert.equal((await returned.pulse()).results[0].status,'completed');
  assert.equal(f.unit.profile.id,'same-swarm');
});

test('unmounting during authorization prevents the effect from starting', async () => {
  let release;const decision=new Promise(resolve=>{release=resolve;});
  const f=fixture({needs:[{...work,requirements:[]}],authorize:r=>r.operation==='execute'?decision:{allowed:true,evidence:{source:'policy'}}});
  const running=f.loop.pulse();
  while(!f.grants.some(r=>r.operation==='execute'))await new Promise(resolve=>setImmediate(resolve));
  const closing=f.loop.close();release({allowed:true,evidence:{source:'policy'}});
  await Promise.all([running,closing]);
  assert.equal(f.calls.filter(c=>c.capability==='characters:update').length,0);
});
