import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NeurosymbolicInventory, scanPackageTree, scanRuntime, CANONICAL_ADDRESS_FIELDS } from '../services/neurosymbolic-inventory.mjs';
import { EventBus } from '../core/kernel.mjs';

test('source scan is read-only, hashed, and records import relationships', async ()=>{
  const root=await mkdtemp(join(tmpdir(),'synthia-source-'));
  await mkdir(join(root,'services'),{recursive:true});
  const original="import { x } from './b.mjs';\nexport const y=x;\n";
  await writeFile(join(root,'services','a.mjs'),original);
  await writeFile(join(root,'services','b.mjs'),'export const x=1;\n');
  const result=await scanPackageTree(root);
  assert.equal(result.entries.length,2);
  assert.equal(result.relationships.filter(e=>e.type==='static-import-reference'&&e.resolved).length,1);
  assert.equal(await readFile(join(root,'services','a.mjs'),'utf8'),original);
  assert.ok(result.entries.every(x=>x.addressing.addressStatus==='UNRESOLVED_PRESERVED'));
});

test('legacy addressing is preserved, never rewritten or fabricated', ()=>{
  const address={planetary:1,gate:55,arcAxis:{axis:'Vertical'}};
  const c={vfs:{list:()=>[{path:'/home/user/a.js',content:'not for inventory',meta:{address,addressKey:'legacy',digest:'digest'}}]}};
  const entry=scanRuntime(c).entries[0];
  assert.deepEqual(entry.addressing.existingAddress,address);
  assert.equal(entry.addressing.existingAddressKey,'legacy');
  assert.equal(entry.addressing.addressStatus,'NONCANONICAL_SHAPE_PRESERVED');
  assert.equal(entry.dataRead,false);
  assert.equal(CANONICAL_ADDRESS_FIELDS.length,13);
});

test('boot and event-triggered inventory retain immutable snapshots and audit history',async()=>{
  const root=await mkdtemp(join(tmpdir(),'synthia-boot-'));
  const data=join(root,'data');
  await writeFile(join(root,'hello.mjs'),'export const x=1;\n');
  const bus=new EventBus();
  let records=[];
  const computer={bus,vfs:{list:()=>records},capabilityRegistryService:{listCapabilities:()=>[]}};
  const inventory=await new NeurosymbolicInventory({sourceRoot:root,dataDir:data,computer}).start();
  const first=inventory.getSummary();
  assert.equal(first.ready,true);
  assert.equal(first.counts.sources,1);
  assert.equal(first.neuralModel,'NOT_CONNECTED');
  records=[{path:'/home/user/private.txt',content:'secret contents',meta:{digest:'abc',source:'user'}}];
  bus.emit('vfs:write',{path:'/home/user/private.txt'});
  await inventory.refreshChain;
  const second=inventory.getSummary();
  assert.notEqual(first.fingerprint,second.fingerprint);
  assert.equal((await readdir(join(data,'inventory','snapshots'))).length,2);
  assert.equal((await readFile(join(data,'inventory','ledger.jsonl'),'utf8')).trim().split('\n').length,2);
  assert.equal(JSON.stringify(inventory.getFull()).includes('secret contents'),false);
  assert.equal((await inventory.proposeInterpretation(inventory.getFull().entries[0].id)).status,'NEURAL_PROVIDER_NOT_CONNECTED');
  inventory.stop();
});

test('unverified neural proposals cannot modify authoritative symbolic inventory',async()=>{
  const root=await mkdtemp(join(tmpdir(),'synthia-proposals-'));
  await writeFile(join(root,'a.js'),'const a=1;');
  const computer={bus:new EventBus(),vfs:{list:()=>[]}};
  const inventory=await new NeurosymbolicInventory({
    sourceRoot:root,dataDir:join(root,'private'),computer,
    neuralAnnotator:async()=>[{role:'agent',confidence:0.3}]
  }).start();
  const fingerprint=inventory.getSummary().fingerprint;
  const proposal=await inventory.proposeInterpretation(inventory.getFull().entries[0].id);
  assert.equal(proposal.status,'PROPOSED_UNVERIFIED');
  assert.equal(inventory.getSummary().fingerprint,fingerprint);
  inventory.stop();
});
