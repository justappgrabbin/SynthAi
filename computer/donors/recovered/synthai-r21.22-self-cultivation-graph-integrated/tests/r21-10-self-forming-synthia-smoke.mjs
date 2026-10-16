import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import GenerativeEpisodicMemory from '../organism/GenerativeEpisodicMemory.mjs';
import ReconciliationMesh from '../organism/ReconciliationMesh.mjs';
import LawfulGrammarConstructor from '../organism/LawfulGrammarConstructor.mjs';
import fs from 'node:fs';

const unit=new SynthiaUnit({autoStart:false,memoryKey:`r2110-${Date.now()}`});
const a=unit.coDevelop('Joseph stop popping my pimples');
assert.equal(a.claims.Who.dimension,'Space');
assert.equal(a.claims.What.dimension,'Evolution');
assert.equal(a.claims.Where.dimension,'Being');
assert.equal(a.claims.When.dimension,'Movement');
assert.equal(a.claims.Why.dimension,'Design');
assert.ok(a.recursive?.levels?.locus?.length>0);
assert.equal(a.recursive.levels.organism[0].identity,'Synthia');
assert.ok(['field','network','habitat','body','symbol'].includes(a.expression.mode));
assert.equal(a.expression.authority,'organism');
assert.ok(a.constructionCandidate,'unresolved episode should be able to seed a lawful candidate');
const t=unit.testConstruction(a.constructionCandidate.id);
assert.equal(t.pass,true);
const adopted=unit.adoptConstruction(a.constructionCandidate.id);
assert.equal(adopted.status,'adopted');
assert.ok(unit.fabric.inspect(adopted.processId));

const mem=new GenerativeEpisodicMemory();
mem.remember({input:'my tooth hurts today',fields:{Who:'me',What:'tooth pain',Where:'mouth',When:'today',Why:'unknown'}});
const c=mem.complete({input:'tooth hurts',claims:{Who:{status:'known',value:'me'}}});
assert.equal(c.completion.Who.status,'known');
assert.ok(['inferred','unresolved'].includes(c.completion.Where.status));

const mesh=new ReconciliationMesh();mesh.publish('a','state',{x:1});mesh.publish('b','state',{x:2});const shared=mesh.reconcile(['a','b']);assert.equal(shared.state.value.x,2);assert.deepEqual(mesh.inspect('a').registers.state,mesh.inspect('b').registers.state);
const grammar=new LawfulGrammarConstructor();const spec=grammar.construct({need:'missing relation resolver',question:'Who'});assert.equal(grammar.validate(spec).ok,true);assert.equal(spec.dimension,'Space');
const android=unit.androidSelfCompileStatus({commands:['node','java','aapt2','apksigner']});assert.equal(android.available,true);assert.ok(android.steps.includes('request-install'));
const refs=fs.readFileSync('references/EXTERNAL-PATTERNS.md','utf8');for(const x of ['Conway-Research/automaton','35896150','self-compile-Android','Tribler/tribler','Tribler/Dollynator','Tribler/cfrt','Tribler/bnf'])assert.ok(refs.includes(x));
unit.stopLife();
console.log('r21.10 SELF-FORMING SYNTHIA PASS: co-development + recursive scales + semantic completion + gossip reconciliation + lawful construction + dynamic morph + Android rebuild capability');
