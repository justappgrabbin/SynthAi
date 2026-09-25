import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const unit=new SynthiaUnit({profile:{id:'adaya',micro:{gate:1,line:1,color:1,tone:1,base:1},macro:{planet:0,dimension:4,zodiac:0,house:0}}});
unit.stopLife();
await unit.ask('analyze gate 42 and remember this result');
await unit.autonomousCycle({intent:'continue analyzing gate 42'});
unit.stopLife();
assert.equal(unit.runtime.getRegisteredTools().length,19);

// Pressure alone cannot authorize growth: Evolution must have externally replenished capacity.
unit.metabolism.registerWork({cost:.06,kind:'5d-rule-pressure',failed:true,evidence:{kind:'bounded-test'}});
const held=await unit.pulse({dtMs:1000});
assert.notEqual(held.action?.action,'grew-and-retained-tool');
assert.equal(unit.runtime.getRegisteredTools().length,19);

// Verified outside progress supplies capacity; internal pressure decides whether to spend it.
unit.defineSuccessIndicator({id:'external-capacity',direction:'increase'});
unit.recordUserSuccess('external-capacity',1,{evidence:{kind:'external-baseline'}});
unit.recordUserSuccess('external-capacity',10,{evidence:{kind:'external-progress'}});
unit.metabolism.addRepairPressure(.20,{reason:'five-dimensional growth test',evidence:{kind:'bounded-test'}});
unit.living.observeCapabilityGap({capabilities:['organism:5d-test-support'],subject:'five-dimensional-test',pressure:.95,reason:'verified capability gap for five-dimensional rule test',evidence:[{type:'bounded-test'}],dimension:5});
const birth=await unit.pulse({dtMs:1000});
assert.equal(birth.action?.action,'grew-and-retained-tool');
const r=birth.action.resolution;
assert.equal(r?.permit,true);
for(const d of ['Movement','Evolution','Being','Design','Space']) assert.equal(r.dimensions[d].pass,true,`${d} must authorize growth`);
assert.ok(r.ruleHash);
assert.equal(birth.action.validation?.pass,true);
assert.equal(unit.runtime.getRegisteredTools().length,20);
const grown=unit.lifeSnapshot().growths.find(x=>x.toolId===birth.action.toolId);
assert.equal(grown?.resolution?.ruleHash,r.ruleHash);
assert.ok(grown?.resolution?.dimensions?.Being?.evidence?.canonicalAddress);
assert.ok((grown?.resolution?.dimensions?.Space?.evidence?.participants||[]).length>=2);
console.log('five-dimensional-rules-smoke: PASS',JSON.stringify({fromTools:19,toTools:20,ruleHash:r.ruleHash,dimensions:Object.fromEntries(Object.entries(r.dimensions).map(([k,v])=>[k,v.state]))}));
