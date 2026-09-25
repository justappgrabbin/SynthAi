import gateTable from '../substrate/mesh072/real_gate_table.mjs';
import { EmergentMesh } from '../substrate/mesh072/mesh/emergent_mesh.mjs';
import PersistentLearningOrgan from '../substrate/mesh072/core/persistent_learning.mjs';
import { createTaskModel, advanceTaskModel, pickNextRunnable, TASK_STATUS } from '../substrate/mesh072/core/task_continuity.mjs';
import { fiveFieldCoherence, meanFiveFieldStates } from '../substrate/mesh072/core/five_field_state.mjs';
import EvidenceMetaLearner from '../organs/today/EvidenceMetaLearner.mjs';

const clone=x=>x==null?x:structuredClone(x);
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const gateFor=s=>(hash(s)%64)+1;

/**
 * Reconciles the older unified/phone learning-and-emergence ancestry with the
 * current living organism. It does not replace GraphRuntime or ATO. It gives
 * the living loop a persistent 5D learning mesh, causal trace, task continuity,
 * and evidence-driven developmental hypotheses.
 *
 * Meta-learning (EvidenceMetaLearner) participates: when pressure or a missing
 * capability appears, the organism forms learning goals before (or instead of)
 * immediately synthesizing tools.
 */
export class EmergenceEngine{
  constructor({unit,memory}={}){
    if(!unit)throw new Error('EmergenceEngine requires SynthiaUnit');
    this.unit=unit;this.memory=memory||unit.memory;
    this.mesh=new EmergentMesh(gateTable);
    this.learning=new PersistentLearningOrgan(this.mesh);
    this.metaLearner=new EvidenceMetaLearner({unit});
    this.hypotheses=[];this.sequence=0;this.#restore();
  }
  #restore(){
    for(const row of this.memory?.query?.('emergence-hypotheses')||[]){const v=row.value||row;if(v?.id&&!this.hypotheses.some(x=>x.id===v.id))this.hypotheses.push(v);}
  }
  beforeIntent(intent,context={}){return this.learning.beforeIntent(intent,context);}
  afterIntent(intent,result,context={}){
    const learned=this.learning.afterIntent(intent,result,context);
    const ok=result?.ok!==false;
    const dev=this.unit.development?.current?.();
    if(dev)this.observeDevelopment(dev,{trigger:'interaction',intent,ok});
    return learned;
  }
  ingestCode(files,context={}){return this.learning.ingestCode(files,context);}
  observeDevelopment(dev,{trigger='development',intent=null,ok=null}={}){
    const missing=dev?.becoming?.missingCapabilities||[];
    const gaps=this.unit.complement?.open?.()||[];
    const goal=dev?.iam?.currentCultivation?.goal||null;
    const evidence=[{type:'developmental-self',id:dev.id,distance:dev.distance},{type:'human-friction',count:gaps.length},{type:'trigger',value:trigger}];
    if(!missing.length&&!gaps.length)return null;
    const subject=missing[0]||`complement:${gaps[0]?.capability||'unknown'}`;
    const id=`emergent-hypothesis:${gateFor(`${subject}:${goal||''}`)}:${hash(`${subject}:${goal||''}`)}`;
    let h=this.hypotheses.find(x=>x.id===id);
    const observation=`Current evidenced development still requires ${subject}${goal?` while carrying “${goal}”`:''}.`;
    const prediction=`If Synthia acquires or composes ${subject}, the developmental distance should decrease without reducing verified human progress.`;
    if(!h){h={id,type:'developmental-capability-hypothesis',status:'candidate',subject,observation,prediction,tests:[],evidence,createdAt:Date.now(),updatedAt:Date.now(),gate:gateFor(id)};this.hypotheses.push(h);}else{h.evidence.push(...evidence);h.updatedAt=Date.now();}
    if(ok!==null&&intent){h.tests.push({at:Date.now(),intent,ok:Boolean(ok),distance:dev.distance});const successes=h.tests.filter(x=>x.ok).length;h.support=successes/Math.max(1,h.tests.length);if(h.tests.length>=2&&h.support>=.5)h.status='supported';}
    this.memory?.upsert?.('emergence-hypotheses',id,clone(h));
    try{if(!this.mesh.node(id))this.mesh.addState({id,kind:'developmental-hypothesis',scale:'development',text:observation,fields:dev.becoming?.dimensions?Object.fromEntries(Object.keys(dev.becoming.dimensions).map(k=>[k,1])):{Movement:1,Evolution:1,Being:1,Design:1,Space:1},address:{dimension:'Evolution',gate:h.gate,canonicalAddressStatus:'derived'},source:{type:'developmental-self'},provenance:evidence.map(x=>x.id||x.type),attributes:{prediction,status:h.status,subject}});}catch{}
    return clone(h);
  }
  createContinuityTask({goal,route=[],next=null,priority=1}={}){
    const id=`continuity:${hash(`${goal}:${Date.now()>>14}`)}`;
    const plan=[{key:'understand',label:'Understand current reality',executor:'server',operation:'derive',input:{goal}},{key:'prepare',label:'Prepare the next viable move',executor:'server',operation:'prepare',input:{route}},{key:'act',label:next?.text||'Carry out the real-world move',executor:'user',requires_user:true,authorization_type:'real-world-action',input:{next}},{key:'observe',label:'Record what actually happened',executor:'user',requires_user:true,authorization_type:'outcome-evidence'},{key:'integrate',label:'Integrate evidence into development',executor:'server',operation:'record'}];
    const task=createTaskModel({id,title:goal||'Cultivation cycle',type:'cultivation',plan,priority});
    this.memory?.upsert?.('continuity-tasks',id,task);return task;
  }
  advanceContinuity({authorizedSteps=[]}={}){
    const rows=this.memory?.query?.('continuity-tasks')||[];const tasks=rows.map(r=>r.value||r);const task=pickNextRunnable(tasks);if(!task)return null;
    const next=advanceTaskModel(task,{authorizedSteps:new Set(authorizedSteps),serverCapabilities:new Set(['prepare','derive','record','checkpoint'])});this.memory?.upsert?.('continuity-tasks',next.id,next);return next;
  }
  onPulse(development){
    const h=this.observeDevelopment(development,{trigger:'living-pulse'});
    const task=this.advanceContinuity();
    // Meta-learning decision surface: form learning goals from current pressure
    // before (or instead of) immediate tool synthesis.
    const coupled=this.unit.coupledDevelopment?.current?.()||this.unit.coupledDevelopment?.snapshot?.()?.current||null;
    const openNeeds=this.unit.living?.needs?.open?.()||[];
    const meta=this.metaLearner.decideFromPressure({development,coupled,openNeeds});
    if(meta?.goals?.length){
      // Promote the highest-priority learning goal into a developmental hypothesis
      // so the existing ATO / process path can see it with full lineage.
      for(const goal of meta.goals.slice(0,2)){
        this.observeDevelopment(development||{id:'pulse',distance:0,becoming:{missingCapabilities:[goal.subject],status:'learning'}},{
          trigger:'meta-learning',
          intent:goal.reason,
          ok:null
        });
      }
    }
    return {hypothesis:h,task,metaLearning:meta};
  }
  snapshot(){
    const states=[...this.mesh.nodes.values()];
    return {
      mesh:{nodes:this.mesh.nodes.size,edges:this.mesh.edges.size,traceEvents:this.mesh.trace?.events?.length||0,coherence:fiveFieldCoherence(meanFiveFieldStates(states.filter(x=>x.fields).slice(-64).map(x=>x.fields)))},
      learning:this.learning.snapshot(),
      metaLearning:this.metaLearner.snapshot(),
      hypotheses:this.hypotheses.slice(-64).map(clone),
      tasks:(this.memory?.query?.('continuity-tasks')||[]).map(r=>clone(r.value||r))
    };
  }
}
export default EmergenceEngine;
