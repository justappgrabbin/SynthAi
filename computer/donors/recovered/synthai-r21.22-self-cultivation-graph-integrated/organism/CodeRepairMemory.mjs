const clone=x=>x==null?x:structuredClone(x);
export class CodeRepairMemory{
  constructor({memory}={}){this.memory=memory;this.records=[];this.#load();}
  #load(){try{this.records=(this.memory?.query?.('code-repair-memory')||[]).map(x=>x.value||x).slice(-256)}catch{this.records=[]}}
  remember({fingerprint,diagnosis,strategy,outcome,evidence=[]}={}){if(!fingerprint||!strategy)throw new Error('repair memory requires fingerprint and strategy');const rec={id:`repair:${Date.now()}:${this.records.length+1}`,at:Date.now(),fingerprint:String(fingerprint),diagnosis:clone(diagnosis),strategy:clone(strategy),outcome:outcome==='success'?'success':outcome==='failure'?'failure':'unknown',evidence:clone(evidence)};this.records.push(rec);if(this.records.length>256)this.records.shift();this.memory?.remember?.('code-repair-memory',rec);return clone(rec);}
  recall(fingerprint){const rows=this.records.filter(x=>x.fingerprint===String(fingerprint));const score=new Map();for(const r of rows){const k=JSON.stringify(r.strategy);const s=score.get(k)||{strategy:r.strategy,success:0,failure:0,lastAt:0};if(r.outcome==='success')s.success++;if(r.outcome==='failure')s.failure++;s.lastAt=Math.max(s.lastAt,r.at||0);score.set(k,s);}return [...score.values()].sort((a,b)=>(b.success-b.failure)-(a.success-a.failure)||b.lastAt-a.lastAt).map(clone);}
  snapshot(){return {records:this.records.slice(-64).map(clone)};}
}
export default CodeRepairMemory;
