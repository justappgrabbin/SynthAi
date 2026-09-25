import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const unit=new SynthiaUnit({profile:{id:'adaya',micro:{gate:1,line:1,color:1,tone:1,base:1},macro:{planet:0,dimension:4,zodiac:0,house:0}}});
unit.stopLife(); // deterministic pulse control; the production constructor starts it automatically.

// Warm the ordinary runtime until its existing channel-growth path reaches the observed 19-tool anatomy.
await unit.ask('analyze gate 42 and remember this result');
await unit.autonomousCycle({intent:'continue analyzing gate 42'});
unit.stopLife();
const before=unit.runtime.getRegisteredTools().length;
assert.equal(before,19,'regression fixture should begin developmental-growth test at 19 active tools');

// Verified progress funds adaptation; mere activity still cannot mint growth budget.
unit.defineSuccessIndicator({id:'growth-fuel',direction:'increase'});
unit.recordUserSuccess('growth-fuel',1,{evidence:{kind:'growth-baseline'}});
unit.recordUserSuccess('growth-fuel',10,{evidence:{kind:'growth-progress'}});
assert.ok(unit.successSnapshot().adaptationBudget>=.25,'growth requires funded adaptation budget');

// Failed real work changes internal state. No grow(), factory, or registerTool call is made by the test.
unit.metabolism.registerWork({cost:.06,kind:'growth-smoke-failure',failed:true,evidence:{kind:'bounded-test'}});
assert.ok(unit.successSnapshot().repairPressure>.15,'failure must create enough internal repair pressure to expose a capability gap');

const birth=await unit.pulse({dtMs:1000});
const after=unit.runtime.getRegisteredTools().length;
assert.equal(birth.action?.action,'grew-and-retained-tool','living pulse must autonomously choose developmental growth');
assert.equal(after,20,'the 19-tool organism must be able to grow tool #20');
assert.equal(after,before+1,'accepted growth must increase the active executable tool count');
assert.ok(birth.action?.toolId,'growth must identify the retained new tool');
assert.ok(unit.runtime.getRegisteredTools().some(t=>t.toolId===birth.action.toolId),'new tool must be mounted in the active runtime registry');
assert.ok(unit.lifeSnapshot().growths.some(g=>g.toolId===birth.action.toolId&&g.accepted),'growth must retain provenance and acceptance evidence');

// Prove the new anatomy is functional rather than decorative: later repair pressure
// must cause a subsequent endogenous pulse to execute the retained grown capability.
unit.metabolism.addRepairPressure(.20,{reason:'reuse-test pressure',evidence:{kind:'growth-smoke'}});
unit.living.needs.observe({kind:'repair',subject:'reuse-test',pressure:.95,reason:'force the already-emerged repair discrepancy to the front of the bounded test',evidence:[{type:'growth-smoke'}]});
const reuse=await unit.pulse({dtMs:1000});
assert.equal(reuse.action?.action,'reused-grown-tool','later endogenous repair must execute retained grown anatomy');
assert.equal(reuse.action?.toolId,birth.action.toolId,'repair must reuse the retained generated tool');

console.log('growth-smoke: PASS',JSON.stringify({fromTools:before,toTools:after,toolId:birth.action.toolId,birth:birth.action.action,reuse:reuse.action.action}));
