import assert from 'node:assert/strict';
import { resolveGate, kingWenGateForBinaryValue } from '../vendor/ato-core/src/gate-address.mjs';
import { matchGates } from '../vendor/ato-core/src/shell-bridge.mjs';
import SemanticArtifactCompiler from '../runtime/SemanticArtifactCompiler.js';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

const gate1=resolveGate(1);
assert.equal(gate1.kingWenGate,1);
assert.equal(gate1.bits,'111111');
assert.equal(kingWenGateForBinaryValue(gate1.binaryValue),1);
const conflict=matchGates('conflict',{limit:3});
assert.ok(conflict.some(x=>x.gate===6));

const compiler=new SemanticArtifactCompiler();
const files=compiler.compile(null,'WEB_APP',[{toolIds:[],output:{signal:{intent:'create an image with three dark triangles below a glowing gold circle'}}}]);
assert.ok(files.some(f=>f.path==='synthia/semantic-spec.json'));
assert.ok(files.some(f=>f.path.endsWith('.png') || f.path.includes('render')));

const unit=new SynthiaUnit({autoStart:false,profile:{micro:{gate:4,line:2,color:1,tone:1,base:1},macro:{dimension:0}}}); // canonical Gate 5, Line 3; triggers sacral via Gate5+Line5 only if set below
const browser=await unit.ask('research conflict on website',{organ:'browser-planner'});
const browserOut=browser.outputs?.[0]?.out;
assert.ok(Array.isArray(browserOut?.grounding));
assert.ok(browserOut.grounding.some(x=>x.gate===6));
const cultivation=await unit.ask('teach this gate',{organ:'cultivation',address:{micro:{gate:0,line:0,color:0,tone:0,base:0},macro:{dimension:0}}});
assert.equal(cultivation.outputs[0].out.gateResolution.kingWenGate,1);

// Explicitly construct a Sacral-ready state through canonical Gate 5, Line 5.
const sacral=unit.registry.get('sacral-create');
const created=await sacral.execute({intent:'sacral analogy',canonicalAddress:{dimension:'Movement',gate:5,line:6,color:6,tone:5,base:5,degree:200,minute:0,second:0,arc:0,house:1},domain:'language'});
assert.equal(created.ok,true);
assert.equal(created.activated,true);
assert.ok(created.creations.length>=1);
unit.stopLife();
console.log('RECOVERED PIECES PASS: King Wen gate bridge + semantic compiler + browser grounding + cultivation content + Sacral analogy active');
