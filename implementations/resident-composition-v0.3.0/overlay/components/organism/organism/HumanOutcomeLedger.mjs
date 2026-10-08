const clone=x=>x==null?x:structuredClone(x);
export class HumanOutcomeLedger{
  constructor({memory=null,purpose='User-defined success'}={}){this.memory=memory;this.purpose=purpose;this.records=[];this.seq=0;this.#load();}
  #load(){try{const rows=this.memory?.query?.('human-outcomes')||[];this.records=rows.map(r=>r.value||r).filter(Boolean);this.seq=this.records.reduce((m,r)=>Math.max(m,Number(r.sequence)||0),0);}catch{}}
  record({kind='observation',human='user',purpose=this.purpose,hypothesis=null,friction=null,action=null,predictedOutcome=null,actualOutcome=null,metrics=null,evidence=null,derived=null,speculative=null,status='observed',context=null}={}){
    const rec={id:`outcome-${Date.now()}-${++this.seq}`,sequence:this.seq,kind,human,purpose,hypothesis,friction,action,predictedOutcome,actualOutcome,metrics:clone(metrics),evidence:clone(evidence),derived:clone(derived),speculative:clone(speculative),status,context:clone(context),at:Date.now()};
    this.records.push(rec);this.memory?.upsert?.('human-outcomes',rec.id,rec);return clone(rec);
  }
  hypothesis({human='user',purpose=this.purpose,question,statement,nullHypothesis,predictions=[],method=null,metrics=[],evidence=null,context=null}={}){if(!statement)throw new Error('hypothesis statement required');return this.record({kind:'hypothesis',human,purpose,hypothesis:{question:question||null,statement,nullHypothesis:nullHypothesis||null,predictions:[...predictions],method,metrics:[...metrics]},metrics,evidence,status:'open',context});}
  observeResult(id,{actualOutcome,metrics=null,evidence=null,status='observed',derived=null,speculative=null}={}){
    const parent=this.records.find(r=>r.id===id);if(!parent)throw new Error(`unknown outcome record ${id}`);
    const rec=this.record({kind:'result',human:parent.human,purpose:parent.purpose,actualOutcome:clone(actualOutcome),metrics,evidence,status,derived,speculative,context:{parentId:id,hypothesisId:parent.kind==='hypothesis'?id:parent.context?.hypothesisId||null}});
    return rec;
  }
  recent(n=64){return this.records.slice(-n).map(clone);}
  snapshot(){return {purpose:this.purpose,count:this.records.length,records:this.recent(128)};}
}
export default HumanOutcomeLedger;
