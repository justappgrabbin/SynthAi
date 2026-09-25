const PHASES=Object.freeze(['discovery','assessment','placement','activation','optimization','sustain']);
const clone=x=>x==null?x:structuredClone(x);
const safe=x=>String(x??'').trim().slice(0,4000);

/**
 * Pathways to Purpose translated from a cohort program into a general organism cycle.
 * No phase fabricates evidence: it only advances when the supplied evidence satisfies
 * that phase's completion contract.
 */
export class PathwaysCycle{
  constructor({memory=null,clock=()=>Date.now()}={}){this.memory=memory;this.clock=clock;this.cycles=new Map();}
  begin({goal,subject='synthia',context={}}={}){
    const id=`pathway:${this.clock()}:${this.cycles.size+1}`;
    const rec={id,goal:safe(goal),subject:safe(subject),context:clone(context),phase:'discovery',phaseIndex:0,status:'active',createdAt:this.clock(),updatedAt:this.clock(),evidence:[],history:[]};
    this.cycles.set(id,rec);this.#persist(rec);return clone(rec);
  }
  current(id){const r=this.cycles.get(id);return r?clone(r):null;}
  requiredEvidence(phase){
    return Object.freeze({
      discovery:['need-or-opportunity-observed'],
      assessment:['capability-and-fit-assessed'],
      placement:['address-and-dependencies-resolved'],
      activation:['real-execution-result'],
      optimization:['consequence-reviewed'],
      sustain:['retain-replace-retire-or-replicate-decision']
    }[phase]||[]);
  }
  record(id,evidence={}){
    const r=this.cycles.get(id);if(!r)throw new Error(`Unknown pathway cycle: ${id}`);
    const ev={id:evidence.id||`evidence:${this.clock()}:${r.evidence.length+1}`,type:safe(evidence.type),at:evidence.at||this.clock(),source:safe(evidence.source||'runtime'),data:clone(evidence.data??null),verified:evidence.verified!==false};
    r.evidence.push(ev);r.history.push({at:this.clock(),phase:r.phase,event:'evidence',evidenceId:ev.id,type:ev.type});r.updatedAt=this.clock();this.#persist(r);return clone(ev);
  }
  canAdvance(id){
    const r=this.cycles.get(id);if(!r)return {ok:false,reason:'missing-cycle'};
    const required=this.requiredEvidence(r.phase);const verified=new Set(r.evidence.filter(e=>e.verified).map(e=>e.type));const missing=required.filter(x=>!verified.has(x));return {ok:missing.length===0,phase:r.phase,missing};
  }
  advance(id){
    const r=this.cycles.get(id);if(!r)throw new Error(`Unknown pathway cycle: ${id}`);
    const check=this.canAdvance(id);if(!check.ok)return {advanced:false,...check,cycle:clone(r)};
    if(r.phaseIndex>=PHASES.length-1){r.status='complete';r.completedAt=this.clock();r.history.push({at:this.clock(),phase:r.phase,event:'complete'});this.#persist(r);return {advanced:true,complete:true,cycle:clone(r)};}
    const from=r.phase;r.phaseIndex++;r.phase=PHASES[r.phaseIndex];r.updatedAt=this.clock();r.history.push({at:this.clock(),from,to:r.phase,event:'advance'});this.#persist(r);return {advanced:true,complete:false,cycle:clone(r)};
  }
  #persist(r){this.memory?.upsert?.('pathways-cycles',r.id,clone(r));}
  snapshot(){return {phases:[...PHASES],cycles:[...this.cycles.values()].slice(-64).map(clone)};}
}
export {PHASES};
export default PathwaysCycle;
