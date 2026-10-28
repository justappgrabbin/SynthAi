import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

const newComputer=async(persistence=new MemoryPersistence())=>{
 const computer=await new ComputerRuntime({persistence,namespace:'proactive-acceptance'}).boot();
 return computer;
};
test('Proactive observer is an actual Computer resident with original Klein source analysis',async()=>{
 const c=await newComputer();
 try{
  assert.equal(c.proactive.status().active,true);
  assert.equal(c.proactive.status().noDelete,true);
  assert.equal(c.proactive.status().gitPushRequiresOwnerApproval,true);
  const source='// TODO: connect this existing module to Trident\nexport const answer = 42;\n';
  await c.vfs.write('/home/user/Imports/candidate.mjs',source,{encoding:'utf8',digest:'sha-candidate'});
  await c.proactive.pending;
  const r=c.proactive.snapshot().reports.at(-1);
  assert.equal(r.engine,'owner-original-autoling');
  assert.equal(r.path,'/home/user/Imports/candidate.mjs');
  assert.equal(r.issues.length,1);
  assert.equal(r.issues[0].line,1);
  assert.ok(c.proactive.snapshot().proposals.some(x=>x.action==='review-source-issues'));
  assert.equal(c.vfs.read('/home/user/Imports/candidate.mjs').content,source);
  await c.proactive.inspectImportedSource('/home/user/Imports/candidate.mjs');
  assert.equal(c.proactive.snapshot().reports.length,1,'same source digest is not re-analyzed');
 }finally{c.proactive.stop()}
});

test('Own original Synthia Klein observation is persisted with provenance and feedback',async()=>{
 const c=await newComputer();
 try{
  const observed=await c.proactive.observe({kind:'test-failure',summary:'The Node model integration acceptance has a failing assertion'});
  assert.equal(observed.toolEvidence.autoling,'executed');
  assert.equal(observed.toolEvidence.diseminer,'executed');
  assert.ok(observed.readingId.startsWith('utterance:'));
  assert.equal(observed.proposal.action,'investigate-test-failure');
  const result=await c.proactive.decide({proposalId:observed.proposal.id,decision:'reject'});
  assert.equal(result.proposal.status,'rejected');
  assert.equal(c.proactive.snapshot().feedback.at(-1).decision,'reject');
  await assert.rejects(c.proactive.decide({proposalId:observed.proposal.id,decision:'accept'}),/Pending proposal/);
 }finally{c.proactive.stop()}
});

test('Autonomous small builds persist genuinely new source with no overwrite or delete',async()=>{
 const c=await newComputer();
 try{
  const result=await c.proactive.buildNewFiles({name:'Trident-Test',goal:'Add a real two-number sum',
   files:[{path:'src/math.mjs',content:'export const sum = (a, b) => a + b;'},
          {path:'test/sum.test.mjs',content:"import {sum} from '../src/math.mjs';\nif (sum(2,3)!==5) throw Error('broken');"}]});
  assert.equal(result.status,'files-created');
  assert.equal(result.receipt.verifiedBuild,false,'writing source is not verification');
  const p=result.receipt.projectId;
  assert.match(c.projects.readFile(p,'src/math.mjs').content,/a \+ b/);
  assert.equal(c.projects.listFiles(p).length,2);
  await assert.rejects(c.proactive.buildNewFiles({name:'Trident-Test',projectId:p,goal:'overwrite',
   files:[{path:'src/math.mjs',content:'export const sum = () => 0;'}]}),/Cannot overwrite/);
  assert.equal(c.projects.readFile(p,'src/math.mjs').content,'export const sum = (a, b) => a + b;');
  await assert.rejects(c.proactive.buildNewFiles({name:'Bad',goal:'escape',
   files:[{path:'../foundry/internal.py',content:'delete_original()'}]}),/Paths must be new/);
  assert.equal(c.proactive.status().built,1);
 }finally{c.proactive.stop()}
});

test('Large builds remain proposals until exact human approval, no mutation before then',async()=>{
 const c=await newComputer();
 try{
  const files=['one','two','three','four'].map((n,i)=>({path:n+'.mjs',content:'export default '+i+';'}));
  const planned=await c.proactive.buildNewFiles({name:'Four-part-project',goal:'Build 4 new parts',files});
  assert.equal(planned.status,'owner-approval-required');
  assert.equal(c.projects.list().length,0);
  await assert.rejects(c.proactive.decide({proposalId:planned.proposal.id,decision:'accept'}),/Large build requires/);
  assert.equal(c.projects.list().length,0);
  const actual=await c.proactive.decide({proposalId:planned.proposal.id,decision:'accept',
    confirmation:'BUILD '+planned.proposal.id});
  assert.equal(actual.result.receipt.files.length,4);
  assert.equal(actual.proposal.status,'accepted');
  assert.equal(c.projects.list().length,1);
 }finally{c.proactive.stop()}
});

test('Git publication cannot execute without a separate explicit owner confirmation',async()=>{
 const c=await newComputer();
 try{
  const p=await c.projects.create({name:'Project for review'});
  let called=0;c.projects.publish=async()=>{called++;return {url:'https://example.invalid'};};
  const publication=await c.proactive.requestPublish({projectId:p.id});
  assert.equal(publication.status,'owner-approval-required');
  assert.equal(c.proactive.snapshot().status.gitPushRequiresOwnerApproval,true);
  assert.equal(called,0);
  await assert.rejects(c.proactive.decide({proposalId:publication.proposal.id,decision:'accept'}),
   /Publishing requires/);
  assert.equal(called,0);
  const rejected=await c.proactive.decide({proposalId:publication.proposal.id,decision:'reject'});
  assert.equal(rejected.proposal.status,'rejected');
  assert.equal(called,0);
  const newRequest=await c.proactive.requestPublish({projectId:p.id});
  const accepted=await c.proactive.decide({proposalId:newRequest.proposal.id,decision:'accept',
    confirmation:'PUBLISH '+p.id});
  assert.equal(accepted.proposal.status,'accepted');
  assert.equal(called,1,'Only exact approval invokes existing Computer publication capability');
 }finally{c.proactive.stop()}
});

test('No false trained model completion when real TRIDENT is absent or gibberish',async()=>{
 const c=await newComputer();
 try{
  let report=await c.proactive.draftWithTrident({goal:'Build a working live coding assistant'});
  assert.equal(report.status,'model-not-connected');
  assert.equal(c.projects.list().length,0);
  c.proactive.modelGateway={generate:async()=>({weightsLoaded:true,inferenceVerified:true,output:'ir o e'})};
  report=await c.proactive.draftWithTrident({goal:'Build a working live coding assistant'});
  assert.equal(report.status,'invalid-model-source');
  assert.equal(c.projects.list().length,0);
  c.proactive.modelGateway={generate:async()=>({weightsLoaded:false,inferenceVerified:false,output:'{}'})};
  report=await c.proactive.draftWithTrident({goal:'Build a working live coding assistant'});
  assert.equal(report.status,'unverified-generation');
  assert.equal(c.projects.list().length,0);
 }finally{c.proactive.stop()}
});

test('Proactive state survives Computer restart without fabricating model weights',async()=>{
 const persistence=new MemoryPersistence();
 const a=await newComputer(persistence);
 const p=await a.proactive.buildNewFiles({name:'persistent',goal:'save real file',
   files:[{path:'src/index.js',content:'export const answer = 7;'}]});
 a.proactive.stop();
 const b=await newComputer(persistence);
 try{
  assert.equal(b.proactive.status().built,1);
  assert.equal(b.projects.readFile(p.receipt.projectId,'src/index.js').content,'export const answer = 7;');
  assert.equal(b.proactive.status().modelConnected,false);
 }finally{b.proactive.stop()}
});
