import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import AutopoieticComposer from '../autopoiesis/AutopoieticComposer.mjs';
import CONSTITUTION from '../autopoiesis/ConstitutionalSeed.mjs';

assert.match(CONSTITUTION.identity,/organization/i);
assert.equal(CONSTITUTION.acceptance.requiresVerification,true);
const unit=new SynthiaUnit({autoStart:false});
const composition=await unit.inspectComposition();
assert.equal(composition.type,'autopoietic-inspection');
assert.equal(composition.requiredMissing.length,0,`required missing: ${composition.requiredMissing.join(', ')}`);
const plan=unit.planSelfBuild('repair and build a new local tool using Acode Linux');
assert(plan.wantedCapabilities.includes('synthesize-code'));
assert(plan.wantedCapabilities.includes('linux'));
assert(plan.parts.some(p=>p.id==='builder.autocoder'));
assert(plan.parts.some(p=>p.id==='residence.acode'));
const planned=await unit.selfBuild('repair and build a new local tool using Acode Linux',{execute:false});
assert.equal(planned.status,'planned');
assert(planned.tools.some(t=>t.id==='autocoder'&&t.available));
assert(unit.fabric.status().processes.some(p=>p.id==='process:autopoietic-composer'));
assert(unit.snapshot().autopoiesis);
unit.stopLife();

const missingComposer=new AutopoieticComposer({exists:async p=>!String(p).includes('AutoCoder.mjs')});
const inspected=await missingComposer.inspect();
assert(inspected.requiredMissing.includes('builder.autocoder'));
console.log('r21.20 autopoietic composition smoke passed');

const hostEvents=[];
unit.autopoiesis.setHost({kind:'test-residence',stageFile:async req=>{hostEvents.push(['stage',req.target]);return {ok:true,target:req.target};},runBuild:async req=>{hostEvents.push(['build',req.steps]);return {status:'verified',results:req.steps.map(step=>({step,ok:true}))};}});
const built=await unit.selfBuild('build local capability',{execute:true,projectFiles:[{path:'seed.mjs',content:'export default 1'}],changes:[{target:'generated/ping.mjs',source:'export const ping=()=>"pong";'}],workspace:'test-workspace'});
assert.equal(built.status,'verified-staged');
assert.equal(hostEvents[0][0],'stage');
assert.equal(hostEvents[1][0],'build');
assert.match(built.note,/explicit adoption/i);
