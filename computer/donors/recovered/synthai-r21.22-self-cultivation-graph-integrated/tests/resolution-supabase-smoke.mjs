import assert from 'node:assert/strict';
import ResolutionPipeline from '../runtime/ResolutionPipeline.js';

const calls=[];
const poster={async postResolution({artifact,analysis,address,extraPosts}){
  calls.push({artifact,analysis,address,extraPosts});
  return {ok:true,ingestedFileId:'f1',analysisId:'a1',addressId:'m1',receipts:[
    {stage:'ingest',table:'ingested_files',id:'f1'},
    {stage:'analyze',table:'intake_analyses',id:'a1'},
    {stage:'address',table:'morph_addresses',id:'m1'},
    {stage:'derived-post',table:'os_nodes',id:'n1'},
    {stage:'finalize-analysis',table:'intake_analyses',id:'a1'},
    {stage:'finalize-ingest',table:'ingested_files',id:'f1'}
  ]};
}};
const pipeline=new ResolutionPipeline({
  analyzer:async artifact=>({ok:true,summary:'tested artifact',dimension:'Space',fiveW:{who:'Synthia'},semanticTriples:[],dependencyGraph:{},extraPosts:[{table:'os_nodes',row:{node_key:'r16'}}]}),
  addressResolver:async()=>({planetary:1,dimension:'Space',gate:25,line:3,color:2,tone:4,base:5,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1}),
  poster
});
const result=await pipeline.resolve({id:'r16',filename:'r16.zip',fileType:'application/zip',fileSize:123});
assert.equal(result.resolved,true);
assert.equal(result.trace.status,'resolved');
assert.equal(calls.length,1);
assert.equal(calls[0].extraPosts.length,1);
assert.ok(result.post.receipts.length>=4);

const failed=new ResolutionPipeline({
  analyzer:async()=>({ok:true,dimension:'Space'}),
  addressResolver:async()=>({dimension:'Space',gate:25,line:3,color:2,tone:4,base:5}),
  poster:{async postResolution(){throw new Error('network down');}}
});
const no=await failed.resolve({id:'not-resolved'});
assert.equal(no.resolved,false);
assert.match(no.trace.status,/failed:supabase-posts/);
console.log('RESOLUTION PASS: ingest → analyze → address/classify → Supabase post(s) confirmed → RESOLVED; failed post stays unresolved');
