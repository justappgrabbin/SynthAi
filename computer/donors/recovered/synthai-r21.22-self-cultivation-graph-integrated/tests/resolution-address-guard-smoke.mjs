import assert from 'node:assert/strict';
import ResolutionPipeline from '../runtime/ResolutionPipeline.js';
let posted=0;
const pipeline=new ResolutionPipeline({analyzer:async()=>({ok:true}),addressResolver:async()=>({dimension:'Space',gate:0,line:0,color:0,tone:0,base:0}),poster:{async postResolution(){posted++;return {ok:true,receipts:[1]}}}});
const r=await pipeline.resolve({id:'bad-zero'});assert.equal(r.resolved,false);assert.equal(posted,0);assert.match(r.trace.status,/failed:address/);
console.log('ADDRESS GUARD PASS: zero-filled canonical coordinates cannot become RESOLVED');
