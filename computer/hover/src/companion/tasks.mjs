// Evidence-first task queue with unattended read-only audits.
// No autonomous command execution, merges, APK installation or device taps.
import { randomUUID } from 'node:crypto';
const TYPES=new Set(['manual','audit','repo-refresh','research']);
const STATES=new Set(['proposed','queued','review','done','blocked','canceled']);
const SAFE=new Set(['audit','repo-refresh']);
const DAY=86400000;
const trim=(x,n=1000)=>String(x??'').trim().slice(0,n);
function repoName(x) {
  if(x==null||x==='')return null;
  if(typeof x!=='string'||!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(x)||x.includes('..'))throw Error('Invalid project');
  return x;
}
export function createContinuityTasks({ledger,contexts,repos,library}) {
  const tasks=new Map();
  let enabled=true,lastSweep=null,busy=null;
  for(const ev of ledger.read({after:0,limit:2000})) {
    if(ev.type==='continuity_task') {
      try {const t=JSON.parse(ev.content);if(t.id)tasks.set(t.id,t);}catch{}
    }
    if(ev.type==='continuity_sweep') {try{const value=JSON.parse(ev.content);if(value.finishedAt)lastSweep=value.finishedAt;}catch{}}
    if(ev.type==='continuity_auto_setting'){try{enabled=JSON.parse(ev.content).enabled===true;}catch{}}
  }
  async function record(task) {
    const receipt=await ledger.append({type:'continuity_task',actor:task.actor||'human',ref:task.id,content:JSON.stringify(task)});
    tasks.set(task.id,task);
    return {...task,receipt:{seq:receipt.seq,hash:receipt.hash}};
  }
  function list({repository,status,limit=150}={}) {
    return [...tasks.values()].filter(t=>(!repository||t.repository===repository)&&(!status||t.status===status))
      .slice(-Math.min(Math.max(Number(limit)||150,1),300)).reverse();
  }
  async function add({title,description='',repository=null,type='manual',auto=false,source='human',evidence=''}={}) {
    title=trim(title,180);description=trim(description,1300);repository=repoName(repository);
    if(!title||!TYPES.has(type))throw Error('A title and supported action type are required');
    const prior=list({repository}).find(t=>t.title===title&&t.type===type&&!['done','canceled'].includes(t.status));
    if(prior)return {...prior,duplicate:true};
    const now=new Date().toISOString();
    const task={id:randomUUID(),repository,title,description,type,source:trim(source,40),
      status:auto&&SAFE.has(type)?'queued':'proposed',createdAt:now,updatedAt:now,
      evidence:trim(evidence,500),result:null,actor:source};
    return record(task);
  }
  async function set({id,status,evidence=''}={}) {
    const prior=tasks.get(id);
    if(!prior||!STATES.has(status))throw Error('Invalid task or status');
    if(status==='queued'&&!SAFE.has(prior.type))throw Error('Unattended queue accepts read-only checks only');
    if(status==='done'&&!trim(evidence)&&!prior.result)throw Error('Completion requires a test result or receipt');
    return record({...prior,status,evidence:trim(evidence,1000)||prior.evidence,actor:'human',updatedAt:new Date().toISOString()});
  }
  function gaps() {
    const output=[];
    const all=contexts.all();
    for(const repo of repos.selected()) {
      const p=all[repo.repository],name=repo.repository;
      const add=(title,description,evidence)=>output.push({repository:name,title,description,evidence});
      if(!p?.purpose) { add('Record the purpose of '+name,'Project is missing a purpose record.','context-missing');continue; }
      if(!p.releaseCriteria) add('Define release acceptance criteria','Release requirements not recorded.','project-context');
      if(!p.milestones?.length) add('Define verifiable milestones','Cannot assess progress until goals are recorded.','project-context');
      for(const m of p.milestones||[])if(m.status!=='verified')add('Verify goal: '+m.name,
        m.status==='blocked'?'Recorded blocker needs investigation.':'Missing verification evidence.','milestone:'+m.status);
      if(p.whatIsMissing) add('Investigate declared missing parts',trim(p.whatIsMissing,500),'project-context');
      for(const item of library.list({project:name,limit:500}).filter(x=>x.includeInBuild&&x.verification!=='verified')) {
        add('Test imported piece: '+item.name,'File is selected for a build but lacks working-test receipt.',item.address);
      }
    }
    return output.slice(0,200);
  }
  async function audit({create=true}={}) {
    const items=gaps();
    let added=0;
    if(create)for(const g of items) {
      const result=await add({...g,type:'manual',source:'synthia-audit'});
      if(!result.duplicate)added++;
    }
    return {observed:items.length,newTasks:added,gaps:items};
  }
  async function perform(task) {
    if(!SAFE.has(task.type))throw Error('Only read-only tasks run without user review');
    try {
      let output;
      if(task.type==='audit')output=await audit({create:true});
      else if(task.type==='repo-refresh')output=await repos.refresh();
      const receipt=await ledger.append({type:'receipt',actor:'synthia-auto',ref:task.id,
        content:JSON.stringify({action:task.type,summary:{newTasks:output.newTasks,changes:output.changes,checked:output.checked},finishedAt:new Date().toISOString()})});
      await record({...task,status:'review',result:{receiptSeq:receipt.seq,summary:'Read-only check finished; review findings'},
        actor:'synthia-auto',updatedAt:new Date().toISOString()});
      return {id:task.id,receiptSeq:receipt.seq,status:'review'};
    }catch(error){
      await record({...task,status:'blocked',result:{error:trim(error.message,350)},actor:'synthia-auto',updatedAt:new Date().toISOString()});
      return {id:task.id,status:'blocked',error:trim(error.message,350)};
    }
  }
  async function sweep({force=false}={}) {
    if(busy)return busy;
    busy=(async()=>{
      if(!enabled&&!force)return {ran:false,reason:'automatic checks disabled'};
      if(!force&&lastSweep&&Date.now()-Date.parse(lastSweep)<DAY)return {ran:false,reason:'not due',lastSweep};
      const audited=await audit({create:true});
      const queued=list({status:'queued'}).filter(t=>SAFE.has(t.type)).slice(0,5);
      const results=[];
      for(const task of queued)results.push(await perform(task));
      lastSweep=new Date().toISOString();
      await ledger.append({type:'continuity_sweep',actor:'synthia-auto',
        content:JSON.stringify({finishedAt:lastSweep,checkedProjects:repos.selected().length,newTasks:audited.newTasks,
          completedChecks:results.length,policy:'read-only; no remote changes'})});
      return {ran:true,finishedAt:lastSweep,created:audited.newTasks,checked:audited.observed,results};
    })();
    try{return await busy;}finally{busy=null;}
  }
  async function setAuto({enabled:next}={}) {
    if(typeof next!=='boolean')throw Error('Expected boolean automation setting');
    enabled=next;
    await ledger.append({type:'continuity_auto_setting',actor:'human',content:JSON.stringify({enabled,updatedAt:new Date().toISOString()})});
    return status();
  }
  function status() {
    return {enabled,lastSweep,due:!lastSweep||Date.now()-Date.parse(lastSweep)>=DAY,
      tasks:tasks.size,policy:'Safe unattended read-only goal audits and user-approved repo checks; no code execution, merges or installs.'};
  }
  async function seedFutureGateStudy() {
    return add({title:'Validate Gate ↔ function ↔ system interaction correspondences',
      description:'Future research only: use the existing Synthia canonical Gate/Line/Color/Tone/Base codec and actual tool-execution/interaction receipts. Do not infer a Gate from a ZIP hash or autoassign speculative meanings. Map only validated relations with provenance.',
      type:'research',source:'human',evidence:'User request to defer mapping until actual runtime is connected'});
  }
  return Object.freeze({list,add,set,audit,sweep,status,setAuto,seedFutureGateStudy});
}