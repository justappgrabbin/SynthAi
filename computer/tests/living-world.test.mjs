import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,directAction,setMorph,setTheme,moveAgent,addAgent,summary,validateWorld} from '../games/living-world/world-core.mjs';

test('agents autonomously fulfill needs and create memories',()=>{
 const s=createWorld();assert.equal(s.agents.length,4);for(let i=0;i<80;i++)step(s);
 assert.ok(s.events.length>1);assert.ok(summary(s).memories>0);
});
test('command updates needs and records lived event',()=>{
 const s=createWorld(12),a=s.agents[0];a.needs.Eat=10;directAction(s,a.id,'Eat');
 for(let i=0;i<30;i++)step(s);
 assert.ok(a.memories.some(m=>m.text.startsWith('Eat')));assert.ok(a.needs.Eat>10);
});
test('social bonds are reciprocal',()=>{
 const s=createWorld(4),a=s.agents[0];directAction(s,a.id,'Socialize');
 for(let i=0;i<40;i++)step(s);
 const b=s.agents.find(b=>a.relationships[b.id]>0);
 assert.ok(b);assert.equal(a.relationships[b.id],b.relationships[a.id]);
});
test('controlled move reaches exact tile; morph and save roundtrip',()=>{
 const s=createWorld();setMorph(s,1,'Cat');setTheme(s,'Ember');
 assert.equal(s.agents[0].form,'Cat');assert.equal(s.theme,'Ember');
 s.agents[0].autonomy=false;
 assert.equal(moveAgent(s,1,9,7),false);assert.equal(moveAgent(s,1,8,7),true);
 for(let i=0;i<35;i++)step(s);assert.equal(s.agents[0].x,8);assert.equal(s.agents[0].y,7);
 addAgent(s,'Dew','Orb');assert.equal(validateWorld(JSON.parse(JSON.stringify(s))).agents.length,5);
});
