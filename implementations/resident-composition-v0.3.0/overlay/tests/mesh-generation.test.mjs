import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { ScientificSynthiaAssembly } from '../src/index.mjs';
import { MeshArtifactGenerator } from '../components/organism/processes/MeshArtifactGenerator.mjs';
import { deriveMeshAnalogy } from '../components/organism/processes/MeshAnalogyContext.mjs';
import { BehaviorArtifactProducer } from '../components/organism/processes/BehaviorArtifactProducer.mjs';
import { SemanticWorld } from '../components/organism/world/SemanticWorld.mjs';

const address = { planetary:'Sun', dimension:'Movement', gate:1, line:1, color:1, tone:1, base:1, degree:0, minute:0, second:0, arc:0, zodiac:1, house:1 };
const experience = {
  id:'crossing', inheritAddress:true, initial:'bank', states:[
    { id:'bank', inheritAddress:true, label:'At the bank', actions:[{id:'cross',inheritAddress:true,label:'Cross the bridge',to:'other-bank'}] },
    { id:'other-bank', inheritAddress:true, label:'Across the river', actions:[{id:'return',inheritAddress:true,label:'Return',to:'bank'}] }
  ]
};
const analogy = {
  source:{id:'authored-crossing-features', revision:'1'}, mode:'equivalence',
  features:[{id:'location',zero:'near bank',one:'far bank'}, {id:'route',zero:'waiting',one:'crossing'}],
  examples:{a:{id:'a',vector:'00'},b:{id:'b',vector:'01'},c:{id:'c',vector:'10'}},
  candidates:[{id:'crossing-experience',vector:'11',experience}], plan:{states:['00','01']}
};
const memoryStore = () => {
  const values = new Map();
  return { get:(ns,key)=>values.get(`${ns}:${key}`), upsert:(ns,key,value)=>values.set(`${ns}:${key}`,{value:structuredClone(value)}) };
};
async function checkBehavior(record) {
  const file = record.proposal.files.find(f=>f.path.endsWith('.mjs'));
  const module = await import(`data:text/javascript,${encodeURIComponent(file.source)}`);
  const session = module.createExperience(record.context.identityId);
  const arrived = session.act('cross');
  assert.equal(arrived.state.id,'other-bank');
  assert.equal(arrived.identityId,record.context.identityId);
  assert.throws(()=>session.act('cross'),/unavailable/);
  const returned = session.act('return');
  assert.equal(returned.state.id,'bank');
  assert.equal(returned.history.length,2);
  return {pass:true,evidence:{identityId:arrived.identityId,arrived:arrived.state.id,returned:returned.state.id,history:returned.history}};
}

test('source-qualified analogy preserves meanings, exact ambiguity, and transition structure',()=>{
  const derived = deriveMeshAnalogy(analogy);
  assert.equal(derived.result,'11');
  assert.equal(derived.matchStatus,'unique');
  assert.deepEqual(derived.interpretation.map(f=>f.meaning),['far bank','crossing']);
  assert.deepEqual(derived.plan.states,['10','11']);
  assert.equal(deriveMeshAnalogy({...analogy,candidates:[]}).matchStatus,'unmapped');
  assert.equal(deriveMeshAnalogy({...analogy,candidates:[...analogy.candidates,{id:'another',vector:'11'}]}).matchStatus,'ambiguous');
  assert.throws(()=>deriveMeshAnalogy({...analogy,source:{id:'unknown'}}),/revision/);
  assert.throws(()=>deriveMeshAnalogy({...analogy,mode:undefined}),/explicit/);
  assert.throws(()=>deriveMeshAnalogy({...analogy,features:[{id:'guessed'}]}),/meanings/);
  assert.throws(()=>deriveMeshAnalogy({...analogy,examples:{...analogy.examples,c:{id:'c',vector:'100'}}}),/Expected 2 bits/);
});

test('assembly generates an executable addressed game and app, retaining identity and revision evidence',async t=>{
  const system = new ScientificSynthiaAssembly({autoStart:false,executionMode:'resident',artifactGeneration:{verify:checkBehavior}});
  t.after(()=>system.close());
  let calls=0;
  const held = await system.generateArtifact({purpose:'reach the other bank',kind:'game',source:{address:{gate:1}}});
  assert.equal(held.status,'held');assert.ok(held.finishedAt);assert.equal(held.proposal,undefined);
  const game = await system.generateArtifact({purpose:'reach the other bank',kind:'game',source:{address},analogy,parentId:held.id});
  assert.equal(game.status,'verified');
  const ambiguous = await system.generateArtifact({purpose:'resolve competing authored experiences',kind:'game',source:{address},analogy:{...analogy,candidates:[...analogy.candidates,{id:'alternative',vector:'11',experience}]}});
  assert.equal(ambiguous.status,'held');
  assert.equal(ambiguous.proposal.reason,'analogy-ambiguous');
  assert.equal(ambiguous.verification,undefined);
  assert.equal(game.analogy.source.id,analogy.source.id);
  assert.deepEqual(game.lifecycle.map(e=>e.status),['resolving','proposing','verifying','verified']);
  assert.equal(game.proposal.provenance.producer,'authored-behavior-compiler');
  assert.equal(game.verification.evidence.identityId,system.embodiment.snapshot().identityId);
  const app = await system.generateArtifact({purpose:'make the crossing interaction reusable',kind:'app',source:{address,experience},parentId:game.id});
  assert.equal(app.status,'verified');
  assert.equal(app.parentId,game.id);
  assert.equal(system.embodiment.world.query({relation:'GENERATED'}).length,2);
  assert.equal(system.snapshot().artifactGeneration.length,4);
  assert.throws(()=>system.mountArtifactGenerator({verify:()=>{calls++;}}),/already mounted/);
  assert.equal(calls,0);
  const failed = await system.generateArtifact({purpose:'encode a clip',kind:'video',source:{address,experience},parentId:app.id});
  assert.equal(failed.status,'failed');
  assert.match(failed.error,/install a producer/);
  assert.equal(system.artifactGenerator.snapshot()[1].status,'verified');
});

test('portable HTML executes authored actions and treats authored labels as text',()=>{
  const payload='</script><script>throw new Error("injected")</script>';
  const producer=new BehaviorArtifactProducer();
  const authored = {...experience, states:experience.states.map((state,index)=>({...state,label:index===0?payload:state.label}))};
  const result=producer.propose({kind:'app',purpose:'cross',resolution:{address,source:{experience:authored}},analogy:null,context:{identityId:'person-a'}});
  const html=result.files.find(f=>f.path==='index.html').source;
  assert.equal((html.match(/<script/g)||[]).length,1);
  const script=html.match(/<script type="module">([\s\S]*)<\/script>/)[1].replace(/export /g,'');
  const root={children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);}};
  vm.runInNewContext(script,{document:{querySelector:()=>root,createElement:tag=>({tag})}});
  assert.equal(root.children[0].textContent,payload);
  root.children.find(node=>node.tag==='button').onclick();
  assert.equal(root.children[0].textContent,'Across the river');
  root.children.find(node=>node.tag==='button').onclick();
  assert.equal(root.children[0].textContent,payload);
  assert.throws(()=>producer.propose({kind:'app',resolution:{address,source:{experience:{...experience,states:[...experience.states,{id:'stranded',inheritAddress:true,label:'Stranded'}]}}},context:{identityId:'person-a'}}),/unreachable/);
});

test('generation reload preserves verified parents and records interrupted work without replaying it',async()=>{
  const memory=memoryStore();const world=new SemanticWorld();const producer=new BehaviorArtifactProducer();
  let proposals=0;
  const options={memory,world,resolve:source=>({complete:true,address,source}),propose:input=>{proposals++;return producer.propose(input);},verify:checkBehavior};
  const first=new MeshArtifactGenerator(options);
  const landed=await first.generate({purpose:'cross',kind:'app',source:{experience},context:{identityId:'person-a'}});
  memory.upsert('mesh-artifact-generation','history',[landed,{id:'mesh-artifact:interrupted',status:'verifying',lifecycle:[{status:'verifying',at:1}]}]);
  const restored=new MeshArtifactGenerator(options);
  assert.deepEqual(restored.snapshot()[0],landed);
  assert.equal(restored.snapshot()[1].status,'interrupted');
  assert.equal(proposals,1);
  const revision=await restored.generate({purpose:'cross again',kind:'app',source:{experience},context:{identityId:'person-a'},parentId:landed.id});
  assert.equal(revision.status,'verified');assert.notEqual(revision.id,landed.id);
  assert.deepEqual(restored.snapshot()[0],landed);
  const missingEvidence=new MeshArtifactGenerator({...options,verify:()=>({pass:true})});
  const unverified=await missingEvidence.generate({purpose:'cross',kind:'app',source:{experience},context:{identityId:'person-a'}});
  assert.equal(unverified.status,'unverified');
  assert.equal(world.query({subject:unverified.id}).length,0);
});

test('concurrent generation captures request data and retains distinct identities',async()=>{
  const world=new SemanticWorld();const memory=memoryStore();
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const generator=new MeshArtifactGenerator({world,memory,
    resolve:async source=>{await pending;return {complete:true,address,source};},
    propose:({resolution,analogy})=>{
      assert.equal(resolution.source.marker,'original');
      assert.equal(analogy.result,'11');
      return {files:[{path:'proof.mjs',inheritAddress:true,source:'export const proof = true;'}]};
    },verify:()=>({pass:true,evidence:{observed:'proof'}})});
  const source={marker:'original'};const authored=structuredClone(analogy);
  const one=generator.generate({purpose:'first',kind:'code',source,analogy:authored});
  const two=generator.generate({purpose:'second',kind:'code',source,analogy:authored});
  source.marker='changed';authored.examples.a.vector='11';release();
  const records=await Promise.all([one,two]);
  assert.ok(records.every(r=>r.status==='verified'));
  assert.notEqual(records[0].id,records[1].id);
  assert.equal(memory.get('mesh-artifact-generation','history').value.length,2);
});
