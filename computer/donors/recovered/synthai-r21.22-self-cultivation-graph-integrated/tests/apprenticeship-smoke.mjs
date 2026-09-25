import assert from 'node:assert/strict';
import { ApprenticeshipBridge } from '../runtime/ApprenticeshipBridge.js';

let nativeReady = false, externalCalls = 0, nativeCalls = 0;
const nativeGenerator = {
  async ensureTool(expression, context) {
    nativeCalls++;
    if (!nativeReady && !context?.apprenticeship) return null;
    if (context?.apprenticeship) nativeReady = true;
    if (!nativeReady) return null;
    return {
      toolId:'native.demo', name:'native demo', provides:['demo'], requires:[],
      accepts:()=>true,
      async execute(){ return {success:true,outputValues:{output:'native'},expressionNodes:[],provenance:[]}; }
    };
  }
};
const bridge = new ApprenticeshipBridge({nativeGenerator});
bridge.addExternalProvider({
  id:'teacher',
  async learn(){ externalCalls++; return {output:'worked-example', recipe:['observe','derive','test']}; }
});
const expression={capabilities:['demo']};
const context={sessionId:'s1',expression,inputValues:{intent:'do demo'}};

const learned = await bridge.ensureTool(expression, context);
assert.equal(learned.toolId, 'native.demo');
assert.equal(externalCalls, 1);
assert.equal((await learned.execute(context)).success, true);
assert.deepEqual(bridge.snapshot().mastered, ['demo']);

const reused = await bridge.ensureTool(expression, context);
assert.equal(reused.toolId, 'native.demo');
assert.equal(externalCalls, 1, 'external provider must not be called after mastery');
assert.ok(nativeCalls >= 2);

console.log('APPRENTICESHIP PASS: native-first → outsource-to-learn → internalize → native-only reuse');
