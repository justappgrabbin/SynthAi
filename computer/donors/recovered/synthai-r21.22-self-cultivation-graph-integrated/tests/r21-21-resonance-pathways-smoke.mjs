import assert from 'node:assert/strict';
import LocalMemory from '../organs/LocalMemory.js';
import PathwaysCycle,{PHASES} from '../resonance/PathwaysCycle.mjs';
import ResonanceNetwork from '../resonance/ResonanceNetwork.mjs';
import SemanticWorld from '../world/SemanticWorld.mjs';
import MovementStateKnowledge from '../movement/MovementStateKnowledge.mjs';
import ResonantAutopoieticRuntime from '../autopoiesis/ResonantAutopoieticRuntime.mjs';

const memory=new LocalMemory('test.r21.21');
const p=new PathwaysCycle({memory,clock:(()=>{let t=100;return()=>++t})()});
const c=p.begin({goal:'repair capability'});assert.equal(c.phase,'discovery');
for(const [i,type] of ['need-or-opportunity-observed','capability-and-fit-assessed','address-and-dependencies-resolved','real-execution-result','consequence-reviewed','retain-replace-retire-or-replicate-decision'].entries()){
 p.record(c.id,{type,verified:true});const a=p.advance(c.id);if(i<5)assert.equal(a.cycle.phase,PHASES[i+1]);else assert.equal(a.complete,true);
}
const rn=new ResonanceNetwork({memory});rn.addNode('a');rn.addNode('b');rn.observe({a:'a',b:'b',outcome:1,verified:true});assert.ok(rn.score(['a','b']).score>0);
const sw=new SemanticWorld({memory});sw.assert('part','status','missing');sw.addRule({id:'repair-needed',when:w=>w.query({relation:'status',object:'missing'}).length>0,then:w=>w.assert('system','need','repair')});const tick=await sw.tick();assert.equal(tick.fired.length,1);assert.equal(sw.query({subject:'system',relation:'need',object:'repair'}).length,1);
const mk=new MovementStateKnowledge({memory});mk.register({mode:'macro',gate:1,line:1,color:1,tone:1,base:1},{forms:{movement:'registered test meaning'},provenance:{source:'test'}});const lookup=mk.lookup({mode:'macro',gate:1,line:1,color:1,tone:1,base:1});assert.equal(lookup.generatesLanguage,false);assert.equal(lookup.decidesConclusions,false);assert.equal(lookup.meaning.forms.movement,'registered test meaning');
const fakeUnit={inspectComposition:async()=>({viable:true}),planSelfBuild:()=>({parts:[{id:'x',address:'a',dependencies:[]}]}),selfBuild:async()=>({status:'verified-staged',build:{status:'verified'}})};
const ar=new ResonantAutopoieticRuntime({unit:fakeUnit,memory});const cycle=await ar.run('build missing organ',{execute:true});assert.equal(cycle.pathway.status,'complete');assert.equal(cycle.consequence.accepted,true);
console.log('r21.21 resonance/pathways/autopoietic smoke: PASS');
