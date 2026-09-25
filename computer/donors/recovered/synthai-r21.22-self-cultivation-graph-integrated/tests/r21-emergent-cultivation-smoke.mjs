import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const u=new SynthiaUnit({autoStart:false,residence:{approved:true}});
const base=u.emergenceSnapshot();
assert.equal(base.mesh.nodes,320,'5D mesh should seed 5x64 structural gate nodes');
assert.equal(base.mesh.edges,960,'5D mesh should seed inverse/reverse/nuclear relations for every dimension/gate');

const c=u.createCultivationCycle({goal:'finish a useful real-world task',context:'limited time and resources'});
let e=u.emergenceSnapshot();
assert.ok(e.tasks.some(t=>t.title===c.goal),'cultivation goal should become a persistent continuity task');

const r=await u.ask('help me understand what needs to change and prepare the next move');
assert.equal(r.ok,true);
e=u.emergenceSnapshot();
assert.ok(e.learning.grammarRules>=1,'successful interaction should teach the persistent AUTOLING learner');

const dna=u.ingestCodeDNA([{filename:'sample.js',content:'export function x(){return 1}\n// TODO replace temporary branch'}],{test:true});
assert.equal(dna.pieces,1);
assert.ok(dna.gaps.some(g=>g.type==='explicit-incomplete-marker'));

const coupled=u.coupledDevelopmentSnapshot().current;
assert.equal(coupled.type,'coupled-development');
assert.ok(coupled.user?.becoming);
assert.ok(coupled.synthia?.becoming);

const pulse=await u.pulse({dtMs:5000});
assert.ok(pulse.coupled,'living pulse should resolve coupled human/Synthia development');
assert.ok('emergence' in pulse,'living pulse should run the emergence layer');

for(const breed of ['luminal','mythic','synthetic','terrane']){
  const dir=path.resolve('assets/sprites',breed);
  assert.equal(fs.readdirSync(dir).filter(x=>x.endsWith('.png')).length,16,`${breed} should preserve all 16 semantic frames`);
}

u.stopLife();
console.log(JSON.stringify({ok:true,mesh:u.emergenceSnapshot().mesh,learning:u.emergenceSnapshot().learning,coupledSupportGap:coupled.supportGap,sprites:64},null,2));
