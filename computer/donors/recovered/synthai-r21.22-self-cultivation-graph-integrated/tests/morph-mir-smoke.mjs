import assert from 'node:assert/strict';
import {morphMirAdapter} from '../UPGRADES/adapters/MorphMirAdapter.js';
const tool=morphMirAdapter();
const ctx={sessionId:'morph-smoke',expression:{capabilities:['ingest'],parameters:{}},inputValues:{name:'hello.js',content:'// says hello to the user\nexport function greet(name){ return `hello ${name}`; }',mode:'morph_runtime'},runtimeState:{}};
const out=await tool.execute(ctx);
assert.equal(out.success,true);
assert.ok(out.outputValues.output.understanding);
assert.ok(out.outputValues.output.regeneration);
console.log(JSON.stringify({pass:true,tool:'morph-mir',understood:true,regenerated:true}));
