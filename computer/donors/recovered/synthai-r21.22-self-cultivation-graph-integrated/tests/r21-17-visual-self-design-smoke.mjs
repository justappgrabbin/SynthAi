import assert from 'node:assert/strict';
import VisualSelfDesignProcess from '../processes/VisualSelfDesignProcess.mjs';
import {SynthiaUnit} from '../core/SynthiaUnit.mjs';

const visual=new VisualSelfDesignProcess();
const fakeRoot={documentElement:{style:{values:{},setProperty(k,v){this.values[k]=v;}}},body:{dataset:{}}};
const spec=visual.design({
  root:fakeRoot,
  phenotype:{state:'gift',dominantDimension:'Design',material:{baseColor:'#c7b7d9',glowColor:'#c57cff'},vitality:.8,repairPressure:.1},
  morph:{mode:'body',habitat:{openness:.7,density:.45,coherence:.8},behavior:{motion:.5,pressure:.1}},
  viewport:{width:390,height:844}
});
assert.equal(spec.type,'visual-self-design');
assert.equal(spec.layout.shell,'phone-single-column');
assert.ok(fakeRoot.documentElement.style.values['--accent']);
assert.ok(spec.accessibility.textContrast>=7);

const unit=new SynthiaUnit({autoStart:false});
assert.ok(unit.visualSelfDesign?.propose);
const audit=unit.capabilityAudit.inspect();
assert.equal(audit.checks.organismVisualSelfDesign,true);
assert.equal(audit.pass,true);
console.log('r21.17 visual self-design smoke passed');
