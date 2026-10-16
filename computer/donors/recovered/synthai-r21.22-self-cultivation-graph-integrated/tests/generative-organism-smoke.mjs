import assert from 'node:assert/strict';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import InterrogativeField,{INTERROGATIVE_PROJECTION} from '../organism/InterrogativeField.mjs';
import OrganismExpression from '../browser/OrganismExpression.mjs';

assert.deepEqual(INTERROGATIVE_PROJECTION,{Who:'Space',What:'Evolution',Where:'Being',When:'Movement',Why:'Design'});
const i=new InterrogativeField();
const p=i.resolve({goal:'Joseph stop popping my pimples',human:'user'});
assert.equal(p.fields.Who.dimension,'Space');
assert.equal(p.fields.What.dimension,'Evolution');
assert.equal(p.fields.Where.dimension,'Being');
assert.equal(p.fields.When.dimension,'Movement');
assert.equal(p.fields.Why.dimension,'Design');
assert.match(p.fields.Who.value,/Joseph/);
assert.match(p.question,/Why did you bring up/i);
assert.match(p.question,/pimple/i);

const unit=new SynthiaUnit({autoStart:false,residence:{approved:true,address:null,addressComplete:false}});
const field=unit.processField.evaluate(unit,{intent:'Joseph stop popping my pimples'});
assert.equal(field.gates.length,64);
for(const gate of field.gates){
  assert.deepEqual(Object.keys(gate.decisions),['Space','Evolution','Being','Movement','Design']);
  for(const d of Object.values(gate.decisions))assert.ok(d.activation>=0&&d.activation<=1);
}
const root={body:{setAttribute(){}}};
const expression=new OrganismExpression({unit,root});
const out=expression.apply('Joseph stop popping my pimples');
assert.equal(out.field.gates.length,64);
assert.equal(out.choice.embodiment,null);
unit.stopLife();
console.log('generative organism smoke passed');
