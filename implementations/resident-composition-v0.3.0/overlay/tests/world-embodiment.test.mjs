import test from 'node:test';
import assert from 'node:assert/strict';
import WorldEmbodiment from '../components/organism/integration/WorldEmbodiment.mjs';
import LivingWorldView from '../components/organism/browser/LivingWorldView.mjs';

test('world expressions differ while identity, actual object transitions and recovery survive reload',()=>{
 const address={planetary:'Sun',dimension:'Movement',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
 const stored=new Map();const memory={get:(a,b)=>stored.has(a+b)?{value:structuredClone(stored.get(a+b))}:null,upsert:(a,b,v)=>stored.set(a+b,structuredClone(v))};
 const unit={profile:{id:'person-a'},memory};const session=unit.embodiment=new WorldEmbodiment({unit});
 const objects=[{id:'seat',inheritAddress:true,state:'available',actions:[{id:'sit',inheritAddress:true,from:'available',to:'occupied',avatarState:'seated'},{id:'recover',inheritAddress:true,from:'occupied',to:'available',recover:true}]}];
 session.defineWorld({id:'cosmic',address,expression:{palette:'magenta',form:'armored'},objects});
 session.defineWorld({id:'garden',address,expression:{palette:'green',form:'botanical'},objects:[]});
 session.enter('cosmic');session.setSelfState('standing');
 const seated=session.interact('seat','sit');assert.equal(seated.avatar.selfState,'standing');assert.equal(seated.avatar.interaction.avatarState,'seated');
 assert.equal(session.world.query({subject:'seat',relation:'state'})[0].object,'occupied');
 assert.throws(()=>session.interact('seat','sit'),/unavailable/);
 const restored=new WorldEmbodiment({unit});assert.equal(restored.snapshot().currentWorld.objects[0].state,'occupied');
 assert.equal(restored.world.query({subject:'seat',relation:'state'})[0].object,'occupied');
 restored.interact('seat','recover');assert.equal(restored.snapshot().avatar.interaction,null);assert.equal(restored.snapshot().avatar.selfState,'standing');
 const identity=restored.snapshot().identityId;restored.enter('garden');assert.equal(restored.world.query({subject:'seat'}).length,0);assert.equal(restored.snapshot().identityId,identity);assert.equal(restored.snapshot().currentWorld.expression.form,'botanical');
 restored.enter('cosmic');assert.equal(restored.snapshot().currentWorld.expression.form,'armored');
 assert.equal(restored.snapshot().history.filter(e=>e.type==='object-interaction').length,2);
 unit.embodiment=restored;let rendered,perform;
 const view=new LivingWorldView({root:{},unit,worldRenderer:({session,interact})=>{rendered=session;perform=interact;return {world:session.activeWorld};}});
 assert.deepEqual(view.render(),{world:'cosmic'});perform('seat','sit');assert.equal(rendered.currentWorld.objects[0].state,'occupied');
});

test('unaddressed worlds and actions are retained before interaction without activation',()=>{
 const session=new WorldEmbodiment({unit:{profile:{id:'person-boundary'}}});
 assert.equal(session.defineWorld({id:'pending',objects:[]}).status,'held');
 assert.throws(()=>session.enter('pending'),/unknown world/);
 const address={planetary:'Sun',dimension:'Movement',gate:1,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};
 assert.equal(session.defineWorld({id:'pending-action',address,objects:[{id:'seat',inheritAddress:true,actions:[{id:'sit'}]}]}).status,'held');
 assert.equal(session.snapshot().heldWorlds.length,2);
 assert.equal(session.snapshot().worlds.length,0);
});
