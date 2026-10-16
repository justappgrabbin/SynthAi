import assert from 'node:assert/strict';
import { MCPHub } from '../runtime/MCPHub.js';
import { ApprenticeshipBridge } from '../runtime/ApprenticeshipBridge.js';
const lessons=[];
const apprenticeship=new ApprenticeshipBridge();
apprenticeship.recordLesson=(capability,lesson,source)=>lessons.push({capability,lesson,source});
const hub=new MCPHub({apprenticeship,maxParallel:3});
let active=0,maxActive=0;
const provider=(id,capabilities,delay,quality)=>({id,capabilities,async execute(task){
 active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,delay));active--;
 return {success:true,output:`${id}:${task.id}`,quality,recipe:['receive','work','return']};
}});
hub.registerProvider(provider('gpt',['research','code'],35,.92));
hub.registerProvider(provider('claude',['review','research'],35,.95));
hub.registerProvider(provider('gemini',['visual'],35,.90));
const project=await hub.runProject({id:'large-project',tasks:[
 {id:'research',capability:'research'},{id:'review',capability:'review'},{id:'visual',capability:'visual'},
 {id:'integrate',capability:'code',dependsOn:['research','review','visual']}
]},{sessionId:'s1',projectId:'large-project'});
assert.equal(Object.keys(project.completed).length,4);
assert.equal(Object.keys(project.failed).length,0);
assert.ok(maxActive>=3);
assert.ok(lessons.length>=4);
const snap=hub.snapshot();
assert.ok(snap.evidence.every(e=>e.verifiedSuccesses===1));
assert.ok(snap.audit.some(e=>e.type==='PROJECT_COMPLETE'));
console.log('MCP HUB PASS: dependency graph → parallel specialists → verify → reputation → apprenticeship evidence');
