import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';
import { ProactiveSynthia } from '../services/proactive-synthia.mjs';

test('proactive Synthia boots as service in ORIGINAL Computer, not a second app',async()=>{
 const computer=await new ComputerRuntime().boot();
 assert.equal(computer.services.get('synthia-proactive').provider,computer.proactive);
 assert.equal(computer.proactive.status().active,true);
 assert.equal(computer.proactive.status().noDelete,true);
 assert.equal(computer.proactive.status().gitPushRequiresOwnerApproval,true);
 assert.equal(computer.proactive.status().mode,'event-sensing-and-owner-original-model');
});

test('existing resident handles real observations and persists test-failure investigation',async()=>{
 const persistence=new MemoryPersistence();
 const computer=await new ComputerRuntime({persistence}).boot();
 const observation=await computer.proactive.observe({kind:'test-failure',summary:'Build failed because package has an incorrect import'});
 assert.ok(observation.readingId.startsWith('utterance:'));
 assert.equal(observation.toolEvidence.autoling,'executed');
 assert.equal(observation.toolEvidence.diseminer,'executed');
 const p=computer.proactive.snapshot().proposals.at(-1);
 assert.equal(p.action,'investigate-test-failure');
 assert.equal(p.status,'pending');
 const restored=await new ComputerRuntime({persistence}).boot();
 assert.ok(restored.proactive.snapshot().proposals.some(item=>item.id===p.id));
 assert.ok(restored.proactive.snapshot().events.some(item=>item.id===observation.id));
});

test('agent autonomously ADDS real app source to existing Computer project; cannot rewrite',async()=>{
 const computer=await new ComputerRuntime().boot();
 const built=await computer.proactive.buildNewFiles({
  goal:'Create a working page',name:'Synthia main',
  files:[
   {path:'index.html',content:'<!doctype html><title>Synthia</title><h1>Synthia is running</h1>',type:'text/html'},
   {path:'app.js',content:'document.querySelector("h1").dataset.started = "yes";',type:'text/javascript'},
  ],
 });
 assert.equal(built.status,'files-created');
 assert.equal(built.built,true);
 const id=built.receipt.projectId;
 assert.match(computer.projects.readFile(id,'index.html').content,/Synthia is running/);
 assert.match(computer.projects.readFile(id,'app.js').content,/dataset.started/);
 assert.equal(computer.proactive.snapshot().builds.at(-1).verifiedBuild,false,
  'source persistence is not fabricated as successful executable app test');
 await assert.rejects(computer.proactive.buildNewFiles({
   goal:'Modify existing file',name:'Synthia main',projectId:id,
   files:[{path:'index.html',content:'overwrite'}]
 }),/overwrite/);
 assert.match(computer.projects.readFile(id,'index.html').content,/Synthia is running/);
 await assert.rejects(computer.proactive.buildNewFiles({goal:'Delete it',name:'x',files:[
   {path:'../src/main.js',content:'x'}
 ]}),/Paths must be new/);
 assert.equal(computer.proactive.status().noDelete,true);
});

test('large build becomes persistent pending proposal, works only on explicit BUILD approval',async()=>{
 const computer=await new ComputerRuntime().boot();
 const files=[{path:'source/a.js',content:'export const value = '+JSON.stringify('x'.repeat(4200))+';'},
              {path:'source/b.js',content:'export const value = '+JSON.stringify('y'.repeat(4200))+';'}];
 const result=await computer.proactive.buildNewFiles({
   goal:'Add two substantial modules',name:'Big build',files
 });
 assert.equal(result.status,'owner-approval-required');
 assert.equal(computer.projects.list().some(p=>p.name==='Big build'),false);
 const id=result.proposal.id;
 await assert.rejects(computer.proactive.decide({proposalId:id,decision:'accept'}),/BUILD /);
 const permitted=await computer.proactive.decide({
  proposalId:id,decision:'accept',confirmation:'BUILD '+id
 });
 assert.equal(permitted.result.status,'files-created');
 const project=computer.projects.get(permitted.result.receipt.projectId);
 assert.equal(project.name,'Big build');
 assert.equal(computer.projects.readFile(project.id,'source/a.js').content,files[0].content);
 assert.equal(computer.proactive.snapshot().feedback.at(-1).decision,'accept');
});

test('no Git publication before explicit approval, and approval invokes actual Computer backend',async()=>{
 const computer=await new ComputerRuntime().boot();
 const project=await computer.projects.create({name:'Approved repo'});
 const calls=[];
 computer.backends.register('github',{request:async request=>{
  calls.push(request);return {ok:true,url:'https://github.com/example/approved'};
 }});
 const request=await computer.proactive.requestPublish({projectId:project.id});
 const id=request.proposal.id;
 assert.equal(calls.length,0);
 await assert.rejects(computer.proactive.decide({
  proposalId:id,decision:'accept',confirmation:'PUBLISH another'
 }),/PUBLISH /);
 assert.equal(calls.length,0);
 await computer.proactive.decide({
  proposalId:id,decision:'accept',confirmation:'PUBLISH '+project.id
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].action,'create-project');
 assert.equal(computer.projects.get(project.id).status,'published');
});

test('original AutoLing automatically analyzes a real imported file and records issue feedback',async()=>{
 const computer=await new ComputerRuntime().boot();
 await computer.vfs.write('/home/user/Imports/source-note.js','// TODO: verify this path\nexport const a = 5;',{
   encoding:'utf8',digest:'test-import-001'
 });
 await computer.proactive.pending;
 const report=computer.proactive.snapshot().reports.at(-1);
 assert.equal(report.engine,'owner-original-autoling');
 assert.equal(report.path,'/home/user/Imports/source-note.js');
 assert.equal(report.issues[0].line,1);
 assert.equal(computer.proactive.snapshot().proposals.at(-1).action,'review-source-issues');
});

test('no trained checkpoint: TRIDENT cannot pretend that it generated source code',async()=>{
 const computer=await new ComputerRuntime().boot();
 const r=await computer.proactive.draftWithTrident({
  goal:'Write an actual working neural integration',backend:'trident'
 });
 assert.equal(r.built,false);
 assert.equal(r.status,'model-not-connected');
 assert.equal(computer.proactive.snapshot().builds.length,0);
});