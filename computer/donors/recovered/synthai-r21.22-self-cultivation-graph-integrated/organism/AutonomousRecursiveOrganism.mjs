const clone=x=>x==null?x:structuredClone(x);

/**
 * AutonomousRecursiveOrganism
 * Runs the already-existing organism pieces together on endogenous life pulses.
 * It is deliberately not a central decision-maker: loci decide locally, the
 * reconciliation mesh exchanges state, recursive views compose scales, and
 * organism expression is resolved from the resulting state.
 */
export class AutonomousRecursiveOrganism{
  constructor({unit,memory}={}){
    if(!unit)throw new Error('AutonomousRecursiveOrganism requires SynthiaUnit');
    this.unit=unit;this.memory=memory||unit.memory;this.cycles=[];this.sequence=0;this.#load();
  }
  #load(){try{const s=this.memory?.get?.('autonomous-recursive-organism','state')?.value;if(s){this.sequence=Number(s.sequence||0);this.cycles=s.cycles||[]}}catch{}}
  pulse({lifeEvent=null}={}){
    const intent=this.#endogenousIntent(lifeEvent);
    const field=this.unit.processField.evaluate(this.unit,{intent,cycle:{id:`endogenous:${this.sequence+1}`,goal:intent,purpose:'self-maintenance and continued organization',stage:'endogenous-pulse',inquiry:null}});
    const active=(field.organism?.activeLoci||[]).slice(0,12);
    for(const g of active)this.unit.reconciliation.publish(`gate:${g}`,'dimensional-state',field.gates?.[g-1]?.decisions||{});
    const shared=active.length>1?this.unit.reconciliation.reconcile(active.map(g=>`gate:${g}`)):{};
    const recursive=this.unit.recursiveField.resolve(field);
    const expression=this.unit.morphicExpression.resolve({intent,field,recursive});
    const experience=this.unit.subjectivity?.experience?.({input:intent,field,source:'endogenous-pulse'})||null;
    const cycle={id:`autonomous:${++this.sequence}`,sequence:this.sequence,at:Date.now(),kind:'endogenous-organism-cycle',intent,activeLoci:active,relations:field.relations?.length||0,recursive,expression,experience,sharedKeys:Object.keys(shared||{}),lifeEvent:lifeEvent?{pulse:lifeEvent.pulse,vitality:lifeEvent.vitality,openNeeds:lifeEvent.openNeeds,action:clone(lifeEvent.action)}:null};
    this.cycles.push(cycle);if(this.cycles.length>128)this.cycles.shift();this.#persist();return clone(cycle);
  }
  #endogenousIntent(lifeEvent){
    const need=this.unit.lifeSnapshot?.().needs?.open?.[0];
    if(need)return `self:${need.kind}:${need.subject}`;
    const dev=this.unit.development?.snapshot?.();
    if(dev?.becoming?.nearestNextState)return `self:development:${dev.becoming.nearestNextState}`;
    return `self:continue:${Number(lifeEvent?.pulse||this.sequence+1)}`;
  }
  snapshot(){return {sequence:this.sequence,last:this.cycles.at(-1)?clone(this.cycles.at(-1)):null,cycles:this.cycles.slice(-24).map(clone)};}
  #persist(){this.memory?.upsert?.('autonomous-recursive-organism','state',{sequence:this.sequence,cycles:this.cycles.slice(-128)});}
}
export default AutonomousRecursiveOrganism;
