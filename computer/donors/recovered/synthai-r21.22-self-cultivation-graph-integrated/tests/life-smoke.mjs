import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import {computeCHNOPS,computeResonance} from '../organs/today/CHNOPS.js';

const unit=new SynthiaUnit({profile:{micro:{gate:1,line:1,color:1,tone:1,base:1},macro:{planet:0,dimension:4,zodiac:0,house:0}}});
const before=unit.successSnapshot().vitality;
const pulse=await unit.pulse({dtMs:60000});
assert.ok(unit.successSnapshot().vitality<before,'maintenance must deplete vitality without an external command');
assert.equal(pulse.type,'life-pulse');

// Verified progress creates adaptation capacity; internal execution alone does not.
unit.defineSuccessIndicator({id:'progress',direction:'increase'});
unit.recordUserSuccess('progress',1,{evidence:{kind:'verified-baseline'}});
unit.recordUserSuccess('progress',10,{evidence:{kind:'verified-progress'}});
const funded=unit.successSnapshot().adaptationBudget;
assert.ok(funded>=.25,'verified progress should fund a bounded adaptation experiment');

// Give the fabric a traceable selected process and real recent input.
const parent=unit.fabric.registerExternalProcess({id:'process:test-parent',members:['advice','resonance'],origin:{type:'test'}});
unit.fabric.processes.get(parent.id).status='selected';
await unit.ask('talk about resonance',{gates:[1,2,3,4],comparison:[41,42,43,44]});
unit.metabolism.addRepairPressure(.25,{reason:'regression-test pressure',evidence:{kind:'test'}});
unit.living.needs.observe({kind:'repair',subject:'organism',pressure:.9,reason:'force repair path for bounded regression',evidence:[{type:'test'}]});
const budgetBefore=unit.successSnapshot().adaptationBudget;
const alive=await unit.pulse({dtMs:1000});
const budgetAfter=unit.successSnapshot().adaptationBudget;
assert.ok(budgetAfter<budgetBefore,'endogenous repair must actually spend adaptation budget');
assert.ok(alive.action?.selfOriginated,'repair action should originate from the life loop');
assert.ok(unit.lifeSnapshot().variations.length>=1,'structural variation must carry parent lineage even when rejected');

// Resonance regression carried forward: disjoint gates cannot collapse to ~1.
const a=computeCHNOPS([1,2,3,4],'unit'),b=computeCHNOPS([41,42,43,44],'unit');
const r=computeResonance({...a.normalized,activatedGates:a.activatedGates,successProfile:a.successProfile},{...b.normalized,activatedGates:b.activatedGates,successProfile:b.successProfile});
assert.equal(r.gateOverlap,0);
assert.ok(r.similarity<.70,`disjoint resonance must discriminate; got ${r.similarity}`);

unit.stopLife();
console.log('life-smoke: PASS',JSON.stringify({vitality:unit.successSnapshot().vitality,budgetSpent:budgetBefore-budgetAfter,action:alive.action?.action,variants:unit.lifeSnapshot().variations.length,resonance:r.similarity}));
