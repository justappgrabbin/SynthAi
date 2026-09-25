const clone=x=>x==null?x:structuredClone(x);
export class ComplementaryGapModel{
  constructor({memory=null}={}){this.memory=memory;this.gaps=[];this.seq=0;this.#load();}
  #load(){try{const rows=this.memory?.query?.('complement-gaps')||[];this.gaps=rows.map(r=>r.value||r).filter(Boolean);this.seq=this.gaps.reduce((m,r)=>Math.max(m,Number(r.sequence)||0),0);}catch{}}
  observe({human='user',capability,friction,evidence=null,persistence=1,existingSupport=[],constraint='preserve-human-agency',context=null}={}){if(!capability)throw new Error('capability required');const id=`gap-${human}-${String(capability).replace(/[^a-z0-9_-]+/gi,'-')}`;let gap=this.gaps.find(g=>g.id===id);if(!gap){gap={id,sequence:++this.seq,human,capability,friction,observations:0,persistence:0,existingSupport:[...existingSupport],constraint,status:'open',createdAt:Date.now()};this.gaps.push(gap);}gap.observations++;gap.persistence=Math.max(gap.persistence,Number(persistence)||0);gap.friction=friction||gap.friction;gap.evidence=clone(evidence);gap.context=clone(context);gap.updatedAt=Date.now();this.memory?.upsert?.('complement-gaps',gap.id,gap);return clone(gap);}
  satisfy(id,{evidence=null,by=null}={}){const g=this.gaps.find(x=>x.id===id);if(!g)return null;g.status='satisfied';g.satisfiedBy=by;g.satisfactionEvidence=clone(evidence);g.updatedAt=Date.now();this.memory?.upsert?.('complement-gaps',g.id,g);return clone(g);}
  open(){return this.gaps.filter(g=>g.status==='open').map(clone);}
  snapshot(){return {open:this.open(),all:this.gaps.map(clone)};}
}
export default ComplementaryGapModel;
