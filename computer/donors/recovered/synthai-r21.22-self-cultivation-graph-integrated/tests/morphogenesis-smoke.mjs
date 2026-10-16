import assert from 'node:assert/strict';
import {SynthiaUnit} from '../core/SynthiaUnit.mjs';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
  clear(){this.map.clear();}
}
globalThis.localStorage=new MemoryStorage();

const rootKey='synthia.test.r9';
const parent=new SynthiaUnit({profile:{id:'synthia-root'},memoryKey:rootKey,autoStart:false});
const spawned=await parent.morph('Build an app specifically for Joe',{start:false});
assert.equal(spawned.ok,true);
assert.equal(spawned.spawned,true);
assert.equal(spawned.form,'app');
assert.equal(spawned.trace.lineage.parentId,'synthia-root');
assert.equal(spawned.trace.resolution.dimensions.Space.state,'subjective-relation-field');

const child=spawned.unit;
const childEvents=child.memory.query('events');
assert.ok(childEvents.length>=1,'spawn bootstrap should create durable child memory');

// Give this Morph one generated capability, but persist only the regenerative
// request trace — not a serialized live Automaton object.
const canonicalAddress=child.resolveAddress('regenerative persistence test capability').canonical;
const expression={
  channelActivationId:'r9-test',inputPorts:[],outputPorts:[],
  capabilities:['morph:r9:regenerative-capability'],
  parameters:{},constraints:['bounded-growth']
};
const context={
  sessionId:'r9-regenerative-tool',expression,
  inputValues:{intent:'regenerative capability',intentRecord:{dimension:5},canonicalAddress,structure:'hexagram',sourceState:null,targetState:null,messages:[]},
  runtimeState:null
};
const grown=await child.factory.ensureTool(expression,context);
assert.ok(grown,'factory should produce a regenerable tool');
child.runtime.registerTool(grown);
const generatedToolId=grown.toolId;
const traceBefore=parent.checkpointMorph(spawned.morphId);
assert.ok(traceBefore.generatedTools.length>=1);
assert.ok(traceBefore.generatedTools.some(t=>t.capabilities?.includes('morph:r9:regenerative-capability')));

parent.stopLife();child.stopLife();

// Simulate app/process reconstruction: no child object survives. Only local
// durable traces survive.
const parent2=new SynthiaUnit({profile:{id:'synthia-root'},memoryKey:rootKey,autoStart:false});
const restored=await parent2.restoreMorphs({start:false});
assert.equal(restored.length,1);
assert.equal(restored[0].morphId,spawned.morphId);
const child2=restored[0].unit;
assert.notEqual(child2,child);
assert.equal(child2.lineage.parentId,'synthia-root');
assert.ok(child2.memory.query('events').length>=childEvents.length,'episodic trace should reload');
const regenerated=child2.runtime.getRegisteredTools().find(t=>t.provides?.includes('morph:r9:regenerative-capability'));
assert.ok(regenerated,'generated capability should be reconstructed from regenerative trace');
assert.notEqual(regenerated.toolId,undefined);

const report={
  pass:true,
  morphId:spawned.morphId,
  form:spawned.form,
  parent:child2.lineage.parentId,
  episodicEvents:child2.memory.query('events').length,
  regenerativeToolTraces:child2.factory.regenerativeTraces().length,
  originalGeneratedToolId:generatedToolId,
  restoredGeneratedToolId:regenerated.toolId,
  sameIdentity:spawned.morphId===restored[0].morphId,
  sameLiveObject:child===child2,
  spaceRule:spawned.trace.resolution.dimensions.Space.state
};
console.log('morphogenesis-smoke: PASS',JSON.stringify(report));
