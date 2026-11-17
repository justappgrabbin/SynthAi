/** Dependency-aware, bounded-concurrency DAG executor with checkpoints.
 * Ready queues avoid repeatedly scanning every primitive after each completion.
 */
function graphIndex(nodes){
 const byId=new Map(nodes.map(n=>[n.id,n]));if(byId.size!==nodes.length)throw Error('DAG node ids must be unique');
 const remaining=new Map(),dependents=new Map(nodes.map(n=>[n.id,[]]));
 for(const node of nodes){const deps=[...new Set(node.dependsOn??[])];remaining.set(node.id,deps.length);for(const dep of deps){if(!byId.has(dep))throw Error(`node ${node.id} depends on missing node ${dep}`);dependents.get(dep).push(node.id);}}
 const counts=new Map(remaining),queue=nodes.filter(n=>counts.get(n.id)===0).map(n=>n.id);let cursor=0;
 while(cursor<queue.length){const id=queue[cursor++];for(const child of dependents.get(id)){const n=counts.get(child)-1;counts.set(child,n);if(n===0)queue.push(child);}}
 if(queue.length!==nodes.length)throw Error('cycle detected in DAG');
 return {byId,remaining,dependents};
}
export async function executeDAG(nodes,executor,options={}){
 const {byId,remaining,dependents}=graphIndex(nodes),concurrency=Math.max(1,options.concurrency??4);
 const status=new Map(nodes.map(n=>[n.id,'pending'])),results=new Map(),errors=new Map(),checkpoints=[];
 const ready=nodes.filter(n=>remaining.get(n.id)===0).map(n=>n.id);let cursor=0,running=0,terminal=0,settled=false;
 const checkpoint=(final=false)=>{if(options.checkpointMode==='final'&&!final)return;const cp={timestamp:Date.now(),status:Object.fromEntries(status),results:Object.fromEntries(results),errors:Object.fromEntries([...errors].map(([k,e])=>[k,String(e?.message??e)]))};checkpoints.push(structuredClone(cp));options.onCheckpoint?.(structuredClone(cp));};
 const blockDescendants=id=>{const queue=[...dependents.get(id)];for(let i=0;i<queue.length;i++){const child=queue[i];if(status.get(child)!=='pending')continue;status.set(child,'blocked');terminal++;queue.push(...dependents.get(child));}};
 return new Promise((resolve,reject)=>{
  const pump=()=>{
   if(settled)return;
   while(running<concurrency&&cursor<ready.length){const id=ready[cursor++];if(status.get(id)!=='pending')continue;const node=byId.get(id);status.set(id,'running');running++;
    Promise.resolve().then(()=>executor(node,{results:options.includeAllResults===false?{}:Object.fromEntries(results),dependencies:Object.fromEntries((node.dependsOn??[]).map(dep=>[dep,results.get(dep)]))}))
    .then(result=>{results.set(id,result);status.set(id,'done');terminal++;for(const child of dependents.get(id)){if(status.get(child)!=='pending')continue;const n=remaining.get(child)-1;remaining.set(child,n);if(n===0)ready.push(child);}})
    .catch(error=>{errors.set(id,error);status.set(id,'failed');terminal++;blockDescendants(id);})
    .finally(()=>{running--;checkpoint();pump();});
   }
   if(terminal===nodes.length&&running===0){settled=true;if(options.checkpointMode==='final')checkpoint(true);const output={ok:errors.size===0,status:Object.fromEntries(status),results:Object.fromEntries(results),errors:Object.fromEntries([...errors].map(([k,e])=>[k,String(e?.stack??e)])),checkpoints};if(!output.ok&&options.continueOnError===false)reject(Object.assign(Error('DAG execution failed'),{output}));else resolve(output);}
  };
  checkpoint();pump();
 });
}
