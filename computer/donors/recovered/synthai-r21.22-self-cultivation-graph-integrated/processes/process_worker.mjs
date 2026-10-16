import { parentPort, workerData } from 'node:worker_threads';
import { createFunctionalAutomatonStack } from '../functional/automaton_stack.mjs';

const processId=String(workerData?.processId||'');
const members=[...new Set((workerData?.members||[]).map(String))].sort();
if(!processId || members.length===0) throw new Error('process_worker requires processId + members');

// A process receives the same supplied PASS6 substrate as every other process.
// We do NOT amputate the registry to force an identity. Membership describes
// what has actually composed into this process; execution is limited to those
// observed members while the common substrate remains intact and inspectable.
const stack=createFunctionalAutomatonStack();
const catalog=new Map(stack.tools().map(t=>[t.id,t]));
for(const member of members) if(!catalog.has(member)) throw new Error(`Unknown process member: ${member}`);
const baselineTools=new Set(stack.tools().map(t=>t.id));

parentPort.postMessage({
  type:'ready', processId,
  snapshot:{
    processRole:'emergent-capability-process', processId, members,
    memberDescriptors:members.map(id=>catalog.get(id)),
    runtimeSource:stack.source,
    substrateToolCount:baselineTools.size,
    identityRule:'membership-from-observed-composition; substrate-not-amputated'
  }
});

parentPort.on('message',async msg=>{
  if(msg?.type==='stop') return process.exit(0);
  if(msg?.type!=='execute') return;
  try{
    const toolId=String(msg.toolId||'');
    if(!members.includes(toolId)) throw new Error(`${toolId} is not a member of ${processId}`);
    const before=new Set(stack.tools().map(t=>t.id));
    const result=await stack.runtime.toolRegistry.executeTool(toolId,msg.context);
    const after=new Set(stack.tools().map(t=>t.id));
    const emerged=[...after].filter(id=>!before.has(id));
    const disappeared=[...before].filter(id=>!after.has(id));
    parentPort.postMessage({
      type:'result', id:msg.id, processId, toolId,
      result:{...result, processId, processMembers:members, substrateEvolution:{emerged,disappeared}}
    });
  }catch(error){
    parentPort.postMessage({type:'error',id:msg.id,processId,toolId:msg.toolId,error:String(error?.stack||error)});
  }
});
