import assert from 'node:assert/strict';
import OrganRegistry from '../core/OrganRegistry.mjs';
import OrganismCoordinator from '../organism/OrganismCoordinator.mjs';
import SuccessMetabolism from '../organism/SuccessMetabolism.mjs';
import {SynthiaSubstrate} from '../runtime/SynthiaSubstrate.js';

const registry=new OrganRegistry();
registry.register({id:'sense',capabilities:['observe'],async execute(input){return {ok:true,summary:`saw:${input.intent}`}}});
registry.register({id:'build',capabilities:['construct'],async execute(input){return {ok:true,summary:'built',usedContext:input.collectiveContext?.length||0}}});
const metabolism=new SuccessMetabolism({personId:'u',indicators:[{id:'goal',name:'goal completion'}]});
const organism=new OrganismCoordinator({registry,metabolism});
const collective=await organism.execute(['sense','build'],{intent:'make a useful thing'});
assert.equal(collective.type,'organism-collective');
assert.deepEqual(collective.contributors,['sense','build']);
assert.equal(collective.outputs[1].out.usedContext,1,'second specialist must receive first specialist contribution');

// Internal execution is NOT user success.
assert.equal(metabolism.snapshot().adaptationBudget,0);
metabolism.observe('goal',1,{evidence:{kind:'user-observed',note:'baseline'}});
metabolism.observe('goal',2,{evidence:{kind:'user-observed',note:'verified progress'}});
assert.ok(metabolism.snapshot().adaptationBudget>0,'verified user progress must feed adaptation');

const substrate=new SynthiaSubstrate();
const coord={side:0,planet:0,dimension:0,gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:0,house:0};
substrate.activate(coord,.8);
assert.equal(substrate.getActiveNodes().length,1,'active substrate state must be self-observable');
assert.equal(substrate.getActiveNodes()[0].gate,1);
console.log('organism-smoke: PASS');
