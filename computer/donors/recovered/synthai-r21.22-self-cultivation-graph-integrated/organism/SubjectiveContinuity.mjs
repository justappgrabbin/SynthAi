const clone=x=>x==null?x:structuredClone(x);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const DIMS=['Space','Evolution','Being','Movement','Design'];

/**
 * SubjectiveContinuity
 * A system-relative point of view: what happens changes how later events are
 * interpreted because prior episodes, consequences and present organism state
 * are carried forward. It does not claim phenomenal consciousness.
 */
export class SubjectiveContinuity{
  constructor({unit,memory,maxHistory=192}={}){
    if(!unit)throw new Error('SubjectiveContinuity requires SynthiaUnit');
    this.unit=unit;this.memory=memory||unit.memory;this.maxHistory=maxHistory;
    this.history=[];this.current=null;this.sequence=0;this.#load();
  }
  #load(){
    try{
      const saved=this.memory?.get?.('subjective-continuity','current')?.value;
      if(saved){this.current=saved;this.sequence=Number(saved.sequence||0);}
      this.history=(this.memory?.query?.('subjective-history')||[]).map(x=>x.value||x).filter(Boolean).slice(-this.maxHistory);
    }catch{}
  }
  experience({input='',field=null,episode=null,source='interaction',outcome=null}={}){
    field=field||this.unit.processField?.snapshot?.();
    const prior=this.current;
    const dims=Object.fromEntries(DIMS.map(d=>[d,{
      activation:Number(field?.dimensions?.[d]?.activation||0),
      voices:Number(field?.dimensions?.[d]?.voices||0),
      choices:clone(field?.dimensions?.[d]?.choices||{})
    }]));
    const active=[...(field?.organism?.activeLoci||[])];
    const relationCount=Number(field?.organism?.relationCount||field?.relations?.length||0);
    const previousActive=new Set(prior?.activeLoci||[]);
    const continuity=active.length?active.filter(g=>previousActive.has(g)).length/active.length:prior?0:1;
    const novelty=prior?1-continuity:1;
    const consequential=outcome?.worked===true?1:outcome?.worked===false?-1:0;
    const unresolved=episode?.unresolved?.length||0;
    const pressure=clamp((this.unit.lifeSnapshot?.().needs?.open?.[0]?.pressure)||0);
    const salience=clamp(.22*novelty+.18*pressure+.16*Math.min(1,relationCount/12)+.18*Math.min(1,unresolved/5)+.26*Math.abs(consequential));
    const perspective={
      id:`experience:${++this.sequence}`,
      sequence:this.sequence,at:Date.now(),source,input:String(input||''),
      activeLoci:active,focus:{gate:field?.activeGate||null,dimension:field?.organism?.inquiryDimension||null},
      dimensions:dims,relationCount,continuity,novelty,salience,
      consequence:{direction:consequential,worked:outcome?.worked??null,statement:outcome?.statement||null},
      unresolved:Number(unresolved),
      priorExperienceId:prior?.id||null,
      changedByHistory:Boolean(prior),
      rule:'later interpretation is conditioned by the organism’s own prior state and consequences; inference never silently becomes fact'
    };
    this.current=perspective;this.history.push(clone(perspective));if(this.history.length>this.maxHistory)this.history.shift();
    this.memory?.upsert?.('subjective-continuity','current',perspective);
    this.memory?.remember?.('subjective-history',perspective);
    return clone(perspective);
  }
  annotateInterpretation(reading={}){
    const cur=this.current;if(!cur)return clone(reading);
    return {...clone(reading),subjectiveContext:{experienceId:cur.id,sequence:cur.sequence,salience:cur.salience,continuity:cur.continuity,novelty:cur.novelty,priorExperienceId:cur.priorExperienceId}};
  }
  snapshot(){return {current:clone(this.current),history:this.history.slice(-32).map(clone),count:this.history.length};}
}
export default SubjectiveContinuity;
