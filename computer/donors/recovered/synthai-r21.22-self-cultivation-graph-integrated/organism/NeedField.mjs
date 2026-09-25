const clone=x=>structuredClone(x);
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));

/**
 * NeedField
 * Needs are state discrepancies with provenance, not commands injected by a
 * supervisor. They can be observed, intensified, satisfied, superseded, or
 * projected to interaction scale without losing their evidence chain.
 */
export class NeedField {
  constructor(){this.needs=new Map();this.sequence=0;this.events=[];}
  observe({kind,subject='organism',pressure=.1,reason,evidence=[],context=null,actionable=true}={}){
    if(!kind)throw new Error('need kind required');
    const contextKey=JSON.stringify(context||{});
    const key=`${kind}|${subject}|${contextKey}`;
    let need=[...this.needs.values()].find(n=>n.key===key&&n.status==='open');
    if(!need){need={id:`need-${String(++this.sequence).padStart(6,'0')}`,key,kind,subject,status:'open',pressure:0,reason:reason||kind,evidence:[],context:clone(context),actionable,createdAt:Date.now(),updatedAt:Date.now(),attempts:[],parents:[]};this.needs.set(need.id,need);this.events.push({type:'need-emerged',needId:need.id,kind,at:Date.now()});}
    need.pressure=clamp(need.pressure+Math.max(0,Number(pressure)||0));need.updatedAt=Date.now();
    for(const e of evidence||[]){const item=typeof e==='string'?{ref:e}:{...e};need.evidence.push(item);if(item.id)need.parents.push(item.id);}
    if(reason)need.reason=reason;return clone(need);
  }
  satisfy(id,{evidence=null,result=null}={}){const n=this.needs.get(id);if(!n)return null;n.status='satisfied';n.pressure=0;n.satisfiedAt=Date.now();n.result=clone(result);if(evidence)n.evidence.push(clone(evidence));this.events.push({type:'need-satisfied',needId:id,at:n.satisfiedAt});return clone(n);}
  attempt(id,attempt){const n=this.needs.get(id);if(!n)return null;const a={at:Date.now(),...clone(attempt)};n.attempts.push(a);n.updatedAt=a.at;if(a.ok===false)n.pressure=clamp(n.pressure+.08);this.events.push({type:'need-attempt',needId:id,ok:a.ok!==false,at:a.at});return clone(n);}
  decay(factor=.985){for(const n of this.needs.values())if(n.status==='open')n.pressure=clamp(n.pressure*factor);}
  open(){return [...this.needs.values()].filter(n=>n.status==='open').sort((a,b)=>b.pressure-a.pressure).map(clone);}
  inspect(id){const n=this.needs.get(id);return n?clone(n):null;}
  project(id){const n=this.needs.get(id);if(!n)return null;return {semanticId:id,type:'need',status:n.status,pressure:n.pressure,question:n.status==='open'?`What would reduce ${n.kind} pressure here?`:`${n.kind} pressure resolved`,reason:n.reason,evidence:clone(n.evidence),context:clone(n.context)};}
  snapshot(){return {open:this.open(),all:[...this.needs.values()].map(clone),events:this.events.slice(-64).map(clone)};}
}
export default NeedField;
