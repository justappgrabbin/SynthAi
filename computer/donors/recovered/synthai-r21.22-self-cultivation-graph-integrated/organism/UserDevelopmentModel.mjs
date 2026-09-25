const clone=x=>x==null?x:structuredClone(x);
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const STAGES=['awareness','orientation','cultivation','action','integration'];

/** Evidence-only developmental model for the human side of the cultivation dyad. */
export class UserDevelopmentModel{
  constructor({unit,memory}={}){if(!unit)throw new Error('UserDevelopmentModel requires SynthiaUnit');this.unit=unit;this.memory=memory||unit.memory;this.latest=null;this.history=[];this.#load();}
  #load(){try{this.history=(this.memory.query('user-development')||[]).map(r=>r.value||r).filter(Boolean);this.latest=this.history.at(-1)||null}catch{}}
  resolve({reason='state-change'}={}){
    const cycle=this.unit.cultivationProgram?.current?.()||null;
    const outcomes=this.unit.outcomes?.snapshot?.()||{};
    const gaps=this.unit.complement?.open?.()||[];
    const cSnap=this.unit.cultivationProgram?.snapshot?.()||{};
    const verified=Number(cSnap.verifiedProgress||0);
    const stage=cycle?.stage||'awareness';const si=Math.max(0,STAGES.indexOf(stage));
    const distance=cycle?clamp(((STAGES.length-1-si)/(STAGES.length-1))*.65+(verified?0:.2)+Math.min(.15,gaps.length*.03)):0;
    const projection=cycle?.projection||{};
    const iam={type:'evidenced-human-state',statement:cycle?`The user is currently working on “${cycle.goal}” at the ${stage} stage.`:'No active cultivation goal is currently evidenced.',currentGoal:cycle?.goal||null,stage,verifiedProgress:verified,openFriction:gaps.map(g=>({capability:g.capability,friction:g.friction,persistence:g.persistence})),evidence:{cultivationCycleId:cycle?.id||null,humanOutcomeCount:Number(outcomes.total||outcomes.count||0),verifiedProgress:verified}};
    const becoming={type:'human-developmental-attractor',statement:cycle?`The nearest evidenced human development is to carry “${cycle.goal}” through the next real action and integrate what actually happens.`:'No human developmental target is invented without an active goal or evidenced friction.',nearestNextState:cycle?.next?.text||null,dimensions:{Space:projection.Who||null,Evolution:projection.What||null,Being:projection.Where||null,Movement:projection.When||null,Design:projection.Why||null},completionCriteria:cycle?[{kind:'real-world-action',test:'next move attempted'},{kind:'evidence',test:'actual outcome observed'},{kind:'integration',test:'cycle integrated'}]:[],distance};
    const rec={id:`user-development:${Date.now()}`,type:'user-development-resolution',reason,at:Date.now(),iam,becoming,distance,lineage:{previousId:this.latest?.id||null,cycleId:cycle?.id||null}};
    this.latest=clone(rec);this.history.push(clone(rec));this.memory?.upsert?.('user-development','current',rec);this.memory?.remember?.('user-development-history',rec);return clone(rec);
  }
  current(){return clone(this.latest||this.resolve({reason:'initial'}));}
  snapshot(){return {current:this.current(),history:this.history.slice(-32).map(clone)};}
}
export default UserDevelopmentModel;
