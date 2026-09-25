import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import AutoCoder from '../processes/AutoCoder.mjs';import SourceMutationProcess from '../processes/SourceMutationProcess.mjs';import BuildProcess from '../processes/BuildProcess.mjs';
const coder=new AutoCoder();const code=coder.synthesize({name:'doubleValue',inputs:['value'],body:'return value * 2;',reason:'test sovereign synthesis'});assert.match(code.source,/return value \* 2/);assert.equal(coder.snapshot().history.length,1);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'synthia-mutation-'));const mutation=new SourceMutationProcess({stagingRoot:root});await mutation.stage({target:code.target,operation:'replace',payload:code.source,reason:code.reason});assert.match(await fs.readFile(path.join(root,code.target),'utf8'),/doubleValue/);
const calls=[];const build=new BuildProcess({runner:async step=>{calls.push(step);return {ok:true}}});const artifact=await build.run({workspace:root,steps:['verify','package']});assert.equal(artifact.status,'verified');assert.deepEqual(calls,['verify','package']);
// Independence contract: none of these constructors require or create SynthiaUnit.
assert.equal(coder.unit,undefined);assert.equal(mutation.unit,undefined);assert.equal(build.unit,undefined);
console.log('r21.14 sovereign code/build smoke passed');
