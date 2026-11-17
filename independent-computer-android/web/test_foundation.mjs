import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openComputer,executor,parser} from './foundation-node.mjs';
import {graph,moduleURL,canonical} from './foundation.mjs';
import {LocalAgent} from './local-agent.mjs';
import {Workspace} from './workspace.mjs';
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'independent-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,c:openComputer(dir)};}
const spec=(name,source,cases)=>({name,description:'Behavior tested independently',entry:'entry.mjs',files:{'entry.mjs':source},cases});

test('full multi-file modules: classes, closure, async, builtins and independent holdout',async t=>{
 const {c}=await fixture(t);
 const artifact=await c.acquire({name:'novel',description:'Stateful mapper with a private multiplier',entry:'main.mjs',files:{
  'main.mjs':`import {Mapper} from './lib/map.js';export async function main(values){await Promise.resolve();return new Mapper(7).map(values);}`,
  'lib/map.js':`export class Mapper{#factor;constructor(f){this.#factor=f;}map(xs){return xs.map(x=>x*this.#factor);}}`},
  cases:[{args:[[2,3]],expected:[14,21]}],holdouts:[{args:[[-1,0,8]],expected:[-7,0,56]}]});
 assert.equal(Object.keys(artifact.modules).length,2);
 assert.deepEqual(await c.run('novel',[[4]]),[28]);
});

test('new constructions remain usable after restart; dependencies pinned by digest',async t=>{
 const {c,dir}=await fixture(t);
 await c.acquire(spec('base','export const main=x=>x*7;',[{args:[2],expected:14}]));
 await c.construct(spec('twice',`import {main as f} from '@cap/base';export const main=x=>f(f(x));`,[{args:[2],expected:98}]));
 await c.acquire(spec('base','export const main=x=>x*100;',[{args:[2],expected:200}]));
 const restarted=openComputer(dir);
 await restarted.construct(spec('again',`import {main as f} from '@cap/twice';export const main=x=>f(x)+1;`,[{args:[2],expected:99}]));
 assert.equal(await restarted.run('again',[3]),148);
 assert.equal(await restarted.run('twice',[2]),98);
 const stored=await restarted.store.export();assert.equal(Object.keys(stored.artifacts).length,4);
});

test('actual original ZIP implementation is preserved and serves the computer itself',async t=>{
 const {c}=await fixture(t),source=await readFile(new URL('./project-intake.js',import.meta.url),'utf8');
 const a=await c.acquire({name:'intake',description:'Original CRC32 and complete ZIP source',entry:'intake.cjs',exportName:'default.crc32',files:{'intake.cjs':source},cases:[{args:[[49,50,51,52,53,54,55,56,57]],expected:3421780262}]});
 assert.equal(a.modules[a.entry].source,source);
 await c.construct(spec('archive',`import intake from '@cap/intake';export async function main(files){return Array.from(new Uint8Array(await intake.zip(files).arrayBuffer()));}`,[{args:[[]],expected:[80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]));
 const bytes=await c.exportWorkspace('archive');assert.deepEqual(bytes.slice(0,4),[80,75,3,4]);assert.ok(bytes.length>source.length);
});

test('actual recovered VersionLineageRegistry class executes intact, including private methods',async t=>{
 const {c}=await fixture(t),source=await readFile(new URL('./recovered/synthia-v11-modules/synthia/vendor/VersionLineageRegistry.js',import.meta.url),'utf8');
 await c.acquire({name:'lineage',description:'Original recovered version registry class',entry:'lineage.js',exportName:'default',files:{'lineage.js':source},cases:[{invocation:{construct:true,calls:[{method:'active',args:['missing']}]},expected:[null]}]});
 await c.construct(spec('promote',`import Registry from '@cap/lineage';export function main(hash){const r=new Registry();r.register({name:'module',hash});r.verify('module',hash,{ok:true,tests:['contract']});r.promote('module',hash,{reason:'verified'});return {active:r.active('module').hash,events:r.snapshot().events.length};}`,[{args:['abc'],expected:{active:'abc',events:3}}]));
 assert.deepEqual(await c.run('promote',['new-version']),{active:'new-version',events:3});
});

test('native ES module live bindings and diamond imports retain behavior',async t=>{
 const {c}=await fixture(t);
 await c.acquire({name:'live',description:'Shared module identity and live mutable bindings',entry:'entry.mjs',files:{
 'entry.mjs':`import {n,bump} from './state.mjs';import {read} from './reader.mjs';export function main(){bump();return [n,read()];}`,
 'state.mjs':`export let n=0;export function bump(){n++;}`,
 'reader.mjs':`import {n} from './state.mjs';export const read=()=>n;`},cases:[{args:[],expected:[1,1]}]});
});

test('failed contracts do not publish; prior verified version stays active',async t=>{
 const {c}=await fixture(t);
 await c.acquire(spec('keep','export const main=x=>x+1;',[{args:[2],expected:3}]));
 await assert.rejects(c.acquire(spec('keep','export const main=x=>0;',[{args:[2],expected:3}])),/Verification failed/);
 assert.equal(await c.run('keep',[2]),3);
});

test('missing dependencies, cycles and unsupported environment accesses fail explicitly',async t=>{
 const {c}=await fixture(t);
 await assert.rejects(c.acquire(spec('missing',`import x from './absent.mjs';export const main=()=>x;`,[{args:[],expected:0}])),/Missing dependency/);
 await assert.rejects(c.acquire(spec('builtin',`import fs from 'node:fs';export const main=()=>0;`,[{args:[],expected:0}])),/Unresolved dependency/);
 await assert.rejects(c.acquire({name:'cycle',description:'cycle',entry:'a.mjs',files:{'a.mjs':`import './b.mjs';export const main=()=>0;`,'b.mjs':`import './a.mjs';`},cases:[{args:[],expected:0}]}),/Cyclic/);
});

test('worker deadline terminates infinite loops and promises',async()=>{
 for(const source of ['export function main(){while(true){}}','export function main(){return new Promise(()=>{});}']){
  const artifact=await graph(parser,{'entry.mjs':source},'entry.mjs',()=>{});
  await assert.rejects(executor({url:moduleURL(artifact),entry:'main',invocation:{args:[]}},150),/timed out/);
 }
});

test('persistent integrity detects source modification',async t=>{
 const {c,dir}=await fixture(t);
 await c.acquire(spec('secure','export const main=x=>x;',[{args:[3],expected:3}]));
 const path=join(dir,'state.json'),state=JSON.parse(await readFile(path,'utf8'));
 state.artifacts[state.active.secure].description='changed';await writeFile(path,JSON.stringify(state));
 await assert.rejects(c.run('secure',[3]),/integrity/);
});

test('agent executes real tools, preserves history and reuses acquired capability',async t=>{
 const {c}=await fixture(t);let state;
 const workspace=new Workspace({read:async()=>structuredClone(state),update:async fn=>{state=fn(structuredClone(state));}});
 await workspace.write('base.mjs','export function main(x){return x*3;}');
 const commands=[{cmd:'inspect',args:{paths:['base.mjs']}},{cmd:'read_file',args:{path:'base.mjs'}},{cmd:'acquire',args:{name:'triple',description:'Triples a number',entry:'base.mjs',exportName:'main',cases:[{args:[2],expected:6}]}},
 {cmd:'write_file',args:{path:'built.mjs',source:`import {main as f} from '@cap/triple';export const main=x=>f(x)+1;`}},
 {cmd:'construct',args:{name:'built',description:'Use acquired triple',entry:'built.mjs',cases:[{args:[2],expected:7}]}},{cmd:'execute',args:{name:'built',args:[]}},{cmd:'execute',args:{name:'built',args:[4]}},{cmd:'finish',args:{message:'Incomplete replay',capabilities:['built']}},{cmd:'finish',args:{message:'Verified',capabilities:['triple','built']}}];
 const agent=new LocalAgent({computer:c,workspace,model:{next:async()=>commands.shift()}});
 const run=await agent.run('Acquire and reuse');
 assert.equal(run.events.filter(e=>e.cmd==='execute'&&!e.ok).length,1);assert.equal(run.events.filter(e=>e.cmd==='finish'&&!e.ok).length,1);assert.equal(run.status,'finished');assert.equal(run.events.find(e=>e.cmd==='execute'&&e.ok).result,13);
 assert.equal((await workspace.history()).length,1);
 await workspace.write('base.mjs','export const main=()=>0;');assert.equal(state.versions.length,1);
 // This test exercises the tool controller with scripted commands; it does not claim model inference.
});

test('non-JSON outputs cannot masquerade as passing null or object contracts',async t=>{
 const {c}=await fixture(t);
 await assert.rejects(c.acquire(spec('nan','export const main=()=>NaN;',[{args:[],expected:null}])),/finite/);
 await assert.rejects(c.acquire(spec('map','export const main=()=>new Map();',[{args:[],expected:{}}])),/plain JSON/);
});

test('the actual Klein CPU executes tools and its three-input ATO recalls witnessed trajectories',async()=>{
 const K=await import('./klein_ato.js');const {KleinLocalHat}=await import('./klein-local-hat.mjs');
 const workspace={history:async()=>[{id:'prior',status:'finished',events:['inspect','read_file','acquire','construct','execute','verify'].map(cmd=>({cmd,ok:true}))}]};
 const hat=new KleinLocalHat(K,workspace);hat.bind({double:args=>args.x*2});
 assert.equal(hat.execute('double',{x:4}),8);
 const context=await hat.context({id:'current',events:[{cmd:'inspect',ok:true}]});
 assert.equal(context.proposal,new K.ATO().solve('000000','111111','100000').toString());
 assert.equal(context.priorRun,'prior');assert.equal(context.advisory,true);
});

test('source-backed import maps capture complete bare-namespace dependencies',async t=>{
 const {c}=await fixture(t);
 const a=await c.acquire({name:'mapped',description:'Execute exact namespace import through an explicit source map',entry:'main.mjs',files:{'main.mjs':`import {scale} from 'synthia/math.mjs';export const main=x=>scale(x);`,'recovered/synthia/math.mjs':'export const scale=x=>x*9;'},importMap:{'synthia/':'recovered/synthia/'},cases:[{args:[2],expected:18}],holdouts:[{args:[3],expected:27}]});
 assert.equal(Object.keys(a.modules).length,2);assert.equal(await c.run('mapped',[4]),36);
});

test('model execution schema requires every verified input and preserves the requested value',async()=>{
 const {executionContracts,executionSchema,invocationArgs}=await import('./tool-contracts.mjs');
 const contracts=executionContracts([{name:'double',description:'Double',cases:[{args:[2],expected:4}],holdouts:[{args:[7],expected:14}]}]);
 const schema=executionSchema(contracts)[0];
 assert.deepEqual(schema.properties.args.properties.inputs.required,['arg0']);
 assert.deepEqual(invocationArgs({name:'double',inputs:{arg0:21}},contracts),[21]);
 assert.throws(()=>invocationArgs({name:'double',inputs:{}},contracts),/Required named inputs/);
 assert.throws(()=>invocationArgs({name:'double',args:[]},contracts),/Argument count/);
 assert.throws(()=>invocationArgs({name:'double',inputs:{arg0:21,arg1:0}},contracts),/Required named inputs/);
});

test('Klein executes named model inputs through the actual verified capability',async t=>{
 const {c}=await fixture(t);let state;
 const workspace=new Workspace({read:async()=>structuredClone(state),update:async fn=>{state=fn(structuredClone(state));}});
 await c.acquire(spec('double','export const main=x=>x*2;',[{args:[2],expected:4}]));
 const {KleinLocalHat}=await import('./klein-local-hat.mjs'),K=await import('./klein_ato.js');const hat=new KleinLocalHat(K,workspace);
 const commands=[{cmd:'execute',args:{name:'double',inputs:{arg0:21}}},{cmd:'finish',args:{message:'Executed and replayed',capabilities:['double']}}];
 const agent=new LocalAgent({computer:c,workspace,hat,model:{next:async()=>commands.shift()}});hat.bind({execute:args=>agent.tool('execute',args),finish:args=>agent.tool('finish',args)});
 const run=await agent.run('Double 21');assert.equal(run.status,'finished');assert.equal(run.events[0].result,42);assert.ok(run.events[1].result.evidence[0].results.every(r=>r.pass));
});

test('local generation stops after a complete command without waiting for extra whitespace or EOS',async()=>{
 const {WebLLMModel}=await import('./local-agent.mjs');let interrupted=false,request;
 const engine={interruptGenerate(){interrupted=true;},chat:{completions:{async create(options){request=options;return(async function*(){yield{choices:[{delta:{content:'{"cmd":"execute","args":{"name":"double",'}}]};yield{choices:[{delta:{content:'"inputs":{"arg0":21}}}'}}]};if(!interrupted)throw Error('Decoder continued after a complete command');})();}}}};
 const model=new WebLLMModel(engine);model.setContracts(async()=>[{name:'double',arity:1,inputs:{arg0:{example:2}}}]);
 assert.deepEqual(await model.next([]),{cmd:'execute',args:{name:'double',inputs:{arg0:21}}});assert.equal(request.stream,true);assert.equal(interrupted,true);
});
