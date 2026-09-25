import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import { StateSpaceKernel } from '../vendor/ato-core/src/state-space-kernel.mjs';
import { ATOEngine, FunctionRegistry } from '../vendor/ato-core/src/index.mjs';

const unit = new SynthiaUnit({ autoStart:false, memoryKey:`atomic-smoke-${Date.now()}` });

// Full resident organism stack.
assert.ok(unit.stack?.ato?.tools?.length >= 13, 'full supplied ATO tool set must be resident');
assert.equal(unit.factory?.constructor?.name, 'FactoryToolGenerator');
assert.equal(unit.rules?.constructor?.name, 'FiveDimensionalRuleCouncil');
assert.equal(unit.processField?.loci?.length, 64, '64 persistent gate loci required');
assert.ok(unit.recursiveField && unit.reconciliation && unit.emergence && unit.selfConstruction);
assert.ok(unit.selfEdit && unit.codeImmune && unit.autopoiesis && unit.resonantAutopoiesis);

// State-space remains executable.
const kernel = new StateSpaceKernel();
assert.equal(kernel.states.size, 64, 'StateSpaceKernel must mount all 64 primitive gate states');
const s1 = kernel.get({mode:'macro',gate:1,line:1,color:1,tone:1,base:1});
assert.ok(s1?.value?.vector?.length >= 6);

// ATO engine remains independently executable.
const registry = new FunctionRegistry().register('identity', async value => value);
const ato = new ATOEngine({registry});
const built = ato.compile({
  address:{mode:'macro',gate:1,line:1,color:1,tone:1,base:1},
  purpose:'atomic integration verification',
  graph:{nodes:[{id:'a'},{id:'b'}],edges:[{id:'a-b',from:'a',to:'b',functionId:'identity',fromPort:{type:'json'},toPort:{type:'json'}}]}
});
const execution = await built.execute({ok:true});
assert.equal(execution.outputs.b.ok,true);

// Relationship evidence can produce a capability composition without erasing members.
const context = sid => ({sessionId:sid,inputValues:{intentRecord:{executionContext:{lane:'atomic-test'}}},expression:{capabilities:['atomic-test']}});
unit.fabric.recordRelationEvidence('autoling','grammar',context('atomic-rel-1'),{type:'dataflow',details:{test:true}});
unit.fabric.recordRelationEvidence('autoling','grammar',context('atomic-rel-2'),{type:'dataflow',details:{test:true}});
const hypothesis = unit.fabric.hypothesisStatus().find(h => h.members.includes('autoling') && h.members.includes('grammar'));
assert.ok(hypothesis && hypothesis.status === 'supported','relationship must become supported from repeated causal evidence');
const composed = unit.fabric.processStatus().find(p => p.members?.length===2 && p.members.includes('autoling') && p.members.includes('grammar'));
assert.ok(composed,'supported relationship must be selectable as an emergent process');
assert.ok(composed.parents?.length,'emergent process must preserve lineage/evidence');

// 5D organism field is live, not merely documentation.
const field = unit.processField.evaluate(unit,{intent:'learn build remember relate and grow'});
for(const d of ['Movement','Evolution','Being','Design','Space']) assert.ok(field.dimensions[d],`missing ${d} dimension`);

await unit.fabric.close();
unit.stopLife();
console.log('ATOMIC ORGANISM PASS', JSON.stringify({
  atoTools:unit.stack.ato.tools.length,
  runtimeTools:unit.runtime.getRegisteredTools().length,
  stateNodes:kernel.states.size,
  gateLoci:unit.processField.loci.length,
  relationship:hypothesis.id,
  emergentProcess:composed.id,
  dimensions:Object.keys(field.dimensions)
}));
