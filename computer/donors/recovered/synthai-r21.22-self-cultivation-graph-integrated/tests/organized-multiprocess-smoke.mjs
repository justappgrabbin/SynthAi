import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import GateLocus,{INTERROGATIVES} from '../organism/GateLocus.mjs';
import {StateSpaceKernel} from '../vendor/ato-core/src/state-space-kernel.mjs';
import OrganismExpression from '../browser/OrganismExpression.mjs';

assert.deepEqual(INTERROGATIVES,{Space:'Who',Evolution:'What',Being:'Where',Movement:'When',Design:'Why'});
const locus=new GateLocus({gate:1,kernel:new StateSpaceKernel()});
const first=locus.observe({now:1000,inputKey:'a',intent:'hello',activeGate:1,participants:['self','other'],vitality:.68,pulses:1,addressKnown:true,whyKnown:false});
const second=locus.observe({now:2000,inputKey:'b',intent:'changed',activeGate:1,participants:['self','other'],vitality:.68,pulses:2,addressKnown:true,whyKnown:false});
assert.equal(second.observations,2);
assert.equal(second.history.length,2);
assert.equal(second.decisions.Design.choice,'question-purpose');
assert.equal(second.decisions.Space.question,'Who');
assert.equal(second.decisions.Being.question,'Where');

const unit=new SynthiaUnit({autoStart:false,residence:{approved:true,address:null,addressComplete:false}});
const a=unit.processField.evaluate(unit,{intent:'Joseph stop popping my pimples'});
const g1obs=a.gates[0].observations;
const b=unit.processField.evaluate(unit,{intent:'Joseph stop popping my pimples again'});
assert.equal(b.gates.length,64);
assert.equal(b.gates[0].observations,g1obs+1,'gate loci must endure across evaluations');
assert.equal(b.organism.identity,'Synthia');
assert.equal(b.organism.kind,'organized-multiprocess-organism');
assert.equal(b.organism.expressionChoice.embodiment,null,'renderer may not impose an avatar');
assert.ok(b.relations.length>0,'co-active gate processes should form inspectable relation fields');
for(const gate of b.gates){
  assert.deepEqual(Object.keys(gate.decisions),['Space','Evolution','Being','Movement','Design']);
  assert.ok(gate.observations>=2);
}
const root={body:{setAttribute(){}}};
const out=new OrganismExpression({unit,root}).resolve('Joseph stop popping my pimples');
assert.ok(['field','network','habitat','body','symbol'].includes(out.choice.mode));
assert.equal(out.choice.authority,'organism');
assert.ok(out.choice.embodiment===null||out.choice.embodiment==='emergent-body');
unit.stopLife();
console.log('organized multiprocess organism smoke passed');
