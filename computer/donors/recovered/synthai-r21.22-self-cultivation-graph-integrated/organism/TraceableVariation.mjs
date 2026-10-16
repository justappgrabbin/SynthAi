/** Traceable process reproduction with bounded structural variation. */
export class TraceableVariation {
  constructor({fabric,coordinator,metabolism}={}){this.fabric=fabric;this.coordinator=coordinator;this.metabolism=metabolism;this.variants=new Map();this.sequence=0;}
  candidate(parent,{kind='reverse-order',reason='repair-pressure'}={}){if(!parent?.members?.length||parent.members.length<2)return null;let members=[...parent.members];if(kind==='reverse-order')members.reverse();else if(kind==='rotate')members=[...members.slice(1),members[0]];else return null;if(members.join('|')===parent.members.join('|'))return null;const id=`variant-${String(++this.sequence).padStart(6,'0')}`;const rec={id,kind:'process-variant',parentId:parent.id,parentTypeId:parent.typeId||null,members,status:'candidate',variation:{kind},reason,createdAt:Date.now(),evidence:[{type:'parent-lineage',parentId:parent.id}]};this.variants.set(id,rec);return structuredClone(rec);}
  retain(id,{evidence,score}={}){const v=this.variants.get(id);if(!v)return null;v.status='retained';v.score=score;v.evidence.push(structuredClone(evidence));v.retainedAt=Date.now();return structuredClone(v);}
  reject(id,{evidence,reason='not-better'}={}){const v=this.variants.get(id);if(!v)return null;v.status='rejected';v.reason=reason;v.evidence.push(structuredClone(evidence));v.rejectedAt=Date.now();return structuredClone(v);}
  snapshot(){return [...this.variants.values()].map(x=>structuredClone(x));}
}
export default TraceableVariation;
