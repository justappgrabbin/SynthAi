import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createContinuityLedger, verifyLedger } from '../src/companion/continuity.mjs';
import { createArtifactLibrary } from '../src/companion/artifact-library.mjs';
import { createProjectContexts } from '../src/companion/project-context.mjs';
import { createContinuityTasks } from '../src/companion/tasks.mjs';
import { createConversationLearning } from '../src/companion/conversation-learning.mjs';
import { createCompanionBridge } from '../src/companion/bridge.mjs';

test('durable authentic ledger preserves append-only receipts across reload',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'synthia-ledger-'));
  try{
    const ledger=await createContinuityLedger({dataDir:dir});
    assert.equal(ledger.status().seq,0);
    const one=await ledger.append({type:'checkpoint',actor:'human',content:'Synthia continuity starts from a real record'});
    assert.equal(one.seq,1);
    const two=await ledger.append({type:'checkpoint',actor:'gpt',content:'No invented runtime claims'});
    assert.equal(two.seq,2);
    assert.equal(verifyLedger(ledger.read({after:0})).head,two.hash);
    assert.equal(ledger.authorized('a'.repeat(64)),false);
    const reopened=await createContinuityLedger({dataDir:dir});
    assert.equal(reopened.status().head,two.hash);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('uploaded source gets SHA-256 address before it can be selected for build',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'synthia-artifacts-'));
  try{
    const ledger=await createContinuityLedger({dataDir:dir});
    const library=await createArtifactLibrary({ledger});
    const source=Buffer.from('export const live = true;');
    const opened=await library.begin({name:'module.js',size:source.length});
    assert.equal(opened.chunkSize>0,true);
    const progress=await library.chunk(opened.uploadId,Readable.from([source]));
    assert.equal(progress.offset,source.length);
    const original=await library.finish(opened.uploadId);
    assert.match(original.address,/^artifact:sha256:[a-f0-9]{64}$/);
    assert.equal(original.route,'unassigned-inbox');
    await assert.rejects(library.update({address:original.address,includeInBuild:true}),/Assign a project/);
    const assigned=await library.update({address:original.address,project:'justappgrabbin/Synthai2',
      purpose:'Already-finished editor module',starred:true,includeInBuild:true});
    assert.equal(assigned.route,'build-candidate');
    assert.equal(library.buildManifest('justappgrabbin/Synthai2').artifacts[0].address,original.address);
    assert.equal((await library.read(original.address)).record.contentSha256,original.contentSha256);
    assert.equal((await library.finish(await library.begin({name:'empty.txt',size:0}).then(x=>x.uploadId))).size,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('project goals require evidence, and queued unattended tasks cannot edit apps',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'synthia-tasks-'));
  try{
    const ledger=await createContinuityLedger({dataDir:dir});
    const contexts=createProjectContexts({ledger});
    await assert.rejects(contexts.save({repository:'justappgrabbin/Synthai2',purpose:'IDE',milestones:[
      {name:'Launch APK',status:'verified',evidence:''}
    ]}),/needs actual evidence/);
    const project=await contexts.save({repository:'justappgrabbin/Synthai2',purpose:'Control IDE',
      category:'computer',releaseCriteria:'Device-tested APK',milestones:[
        {name:'Source exists',status:'verified',evidence:'verified source ref'},
        {name:'Runs on phone',status:'blocked',evidence:''},
      ]});
    assert.equal(project.progress.percent,50);
    assert.equal(project.category,'computer');
    const library=await createArtifactLibrary({ledger});
    const watched={selected:()=>[{repository:'justappgrabbin/Synthai2'}],refresh:async()=>({changes:0,checked:1})};
    const tasks=createContinuityTasks({ledger,contexts,repos:watched,library});
    const found=await tasks.audit();
    assert.ok(found.observed>=1);
    const edit=await tasks.add({title:'Change App UI',type:'manual'});
    await assert.rejects(tasks.set({id:edit.id,status:'queued'}),/read-only/);
    const audit=await tasks.add({title:'Check goals',type:'audit',auto:true});
    assert.equal(audit.status,'queued');
    const sweep=await tasks.sweep({force:true});
    assert.equal(sweep.ran,true);
    const outcome=tasks.list().find(t=>t.id===audit.id);
    assert.equal(outcome.status,'review');
    await tasks.seedFutureGateStudy();
    assert.ok(tasks.list().some(t=>/Gate/.test(t.title)));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('conversation review uses source messages and never claims to have executed a solution',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'synthia-learning-'));
  try{
    const ledger=await createContinuityLedger({dataDir:dir});
    const library=await createArtifactLibrary({ledger});
    const learning=createConversationLearning({ledger,library});
    const reviewed=await learning.reviewText({name:'User transcript',
      content:'User: Please fix the upload system.\nUser: It does not work.\nUser: It should remember the project purpose.'});
    assert.equal(reviewed.messageCount,3);
    assert.ok(reviewed.findings.length>0);
    assert.ok(reviewed.solutions.every(s=>s.status==='suggested-not-executed'));
    assert.equal(learning.stats().automaticEdits,false);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('embedded MCP initializes and rejects access without an install key',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'synthia-mcp-'));
  try{
    const companion=await createCompanionBridge({persistenceDir:dir});
    const fake=(headers={},body={})=>({
      headers,method:'POST',
      async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body));}
    });
    const url=new URL('http://127.0.0.1:4183/mcp');
    const denied=await companion.handle(fake({},{
      jsonrpc:'2.0',id:1,method:'initialize'}),url);
    assert.equal(denied.code,401);
    const key=(await import('node:fs/promises')).readFile(companion.ledger.secretFile,'utf8');
    const headers={authorization:'Bearer '+(await key).trim()};
    const initialized=await companion.handle(fake(headers,{jsonrpc:'2.0',id:2,method:'initialize'}),url);
    assert.equal(initialized.data.result.serverInfo.name,'gpt-synthai-continuity');
    const tools=await companion.handle(fake(headers,{jsonrpc:'2.0',id:3,method:'tools/list'}),url);
    assert.ok(tools.data.result.tools.some(t=>t.name==='project_gap_audit'));
  }finally{await rm(dir,{recursive:true,force:true});}
});
