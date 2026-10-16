import assert from 'node:assert/strict';
import {SynthiaUnit} from '../core/SynthiaUnit.mjs';

const memoryKey=`r21-development-${Date.now()}`;
const unit=new SynthiaUnit({autoStart:false,memoryKey,profile:{purpose:'support verified human cultivation'}});
const initial=unit.developmentalSnapshot().current;
assert.equal(initial.type,'developmental-self-resolution');
assert.match(initial.iam.statement,/living cultivation organism/i);
assert.ok(initial.becoming.dimensions.Movement);
assert.ok(initial.becoming.dimensions.Evolution);
assert.ok(initial.becoming.dimensions.Being);
assert.ok(initial.becoming.dimensions.Design);
assert.ok(initial.becoming.dimensions.Space);

const cycle=unit.createCultivationCycle({
  goal:'be coherent enough to launch yourself into the world',
  context:'the organism is alive and usable; the next step is coherent outward participation',
  purpose:'become a coherent orchestrator that can carry real needs to verified outcomes'
});
const before=unit.developmentalSnapshot().current;
assert.equal(before.iam.currentCultivation.id,cycle.id);
assert.match(before.becoming.statement,/launch yourself into the world/i);
assert.equal(before.lineage.cultivationCycleId,cycle.id);
assert.ok(before.distance>=0&&before.distance<=1);
assert.ok(Array.isArray(before.becoming.completionCriteria));
assert.ok(before.becoming.nearestNextState);

unit.observeCultivationCycle(cycle.id,{worked:true,actualOutcome:'awareness is explicit and usable',evidence:{source:'smoke-test',statement:'awareness stage verified'}});
const after=unit.developmentalSnapshot().current;
assert.equal(after.iam.currentCultivation.stage,'orientation');
assert.ok(after.distance<=before.distance,'verified stage progress should not increase developmental distance absent new pressure');
const why=unit.developmentalWhy();
assert.equal(why.developmentId,after.id);
assert.ok(why.evidence.length>=4);
assert.ok(why.lineage.previousId);

const pulse=await unit.living.pulse({dtMs:5000});
assert.ok(pulse.development);
assert.equal(pulse.development.id,unit.developmentalSnapshot().current.id);
assert.ok(unit.snapshot().development.current.becoming);
console.log('R21.2 DEVELOPMENT PASS: evidenced I AM + five-dimensional I AM BECOMING + traceable distance/lineage + LivingLoop refresh');
