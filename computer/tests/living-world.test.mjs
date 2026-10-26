import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,buildObject,directAction,setMorph,setTheme,moveAgent,addAgent,summary,validateWorld} from '../games/living-world/world-core.mjs';

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

test('construction spends Sparks and newly built furniture is used',()=>{
 const s=createWorld();s.agents.forEach(a=>a.autonomy=false);
 const o=buildObject(s,'Snack stand',2,7);assert.equal(s.sparks,0);assert.equal(o.action,'Eat');
 const a=s.agents[0];a.needs.Eat=11;directAction(s,a.id,'Eat');assert.equal(a.goal.id,o.id);
 for(let i=0;i<12;i++)step(s);assert.ok(a.needs.Eat>11);
 assert.throws(()=>buildObject(s,'Spa',8,8),/Not enough Sparks/);
});
test('agent morph affects work outcome, earning extra construction Sparks',()=>{
 const worlds=['Gnome','Human'].map(form=>{const s=createWorld(7);s.agents.forEach(a=>a.autonomy=false);setMorph(s,1,form);directAction(s,1,'Create');for(let i=0;i<40;i++)step(s);return s});
 assert.ok(worlds[0].sparks>worlds[1].sparks);
});
