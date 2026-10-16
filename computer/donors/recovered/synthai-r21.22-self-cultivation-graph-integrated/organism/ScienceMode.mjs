const clone=x=>x==null?x:structuredClone(x);
export class ScienceMode{
  constructor({ledger}={}){if(!ledger)throw new Error('ledger required');this.ledger=ledger;}
  createHypothesis(spec){return this.ledger.hypothesis(spec);}
  recordResult(id,result){return this.ledger.observeResult(id,result);}
  paper({title='Synthia Observation Report',human=null,purpose=null,limit=32}={}){let rows=this.ledger.recent(limit);if(human)rows=rows.filter(r=>r.human===human);if(purpose)rows=rows.filter(r=>r.purpose===purpose);const hypotheses=rows.filter(r=>r.kind==='hypothesis');const observations=rows.filter(r=>r.kind!=='hypothesis');return {title,generatedAt:Date.now(),purpose:purpose||this.ledger.purpose,sections:{question:hypotheses.at(-1)?.hypothesis?.question||null,background:'Generated only from the persistent evidence ledger; unsupported mechanisms remain speculative.',hypotheses:hypotheses.map(r=>({id:r.id,...clone(r.hypothesis),status:r.status})),observations:observations.map(r=>({id:r.id,actualOutcome:r.actualOutcome,metrics:clone(r.metrics),evidence:clone(r.evidence)})),derived:rows.filter(r=>r.derived!=null).map(r=>({id:r.id,value:clone(r.derived)})),speculative:rows.filter(r=>r.speculative!=null).map(r=>({id:r.id,value:clone(r.speculative)})),limitations:['Observed, derived, and speculative claims are kept separate.','Synthia activity is not counted as human success.'],nextQuestions:hypotheses.filter(r=>r.status==='open').flatMap(r=>r.hypothesis?.predictions||[])}};}
}
export default ScienceMode;
