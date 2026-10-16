const clone=x=>x==null?x:structuredClone(x);
const DIM_BY_Q=Object.freeze({Who:'Space',What:'Evolution',Where:'Being',When:'Movement',Why:'Design'});
const STATUS=Object.freeze({known:'known',inferred:'inferred',proposed:'proposed',tested:'tested',contradicted:'contradicted',unresolved:'unresolved'});

/**
 * Co-development layer: Synthia, the person, and the system learn together.
 * It does not replace the underlying automata. It records what the organism
 * currently knows, what remains unresolved, and the smallest testable next move.
 */
export class CoDevelopmentalSynthia{
  constructor({unit,memory}={}){
    if(!unit)throw new Error('CoDevelopmentalSynthia requires SynthiaUnit');
    this.unit=unit;this.memory=memory||unit.memory;this.currentEpisode=null;this.history=[];this.#load();
  }
  #load(){try{this.history=(this.memory.query('co-development-history')||[]).map(r=>r.value||r).filter(Boolean).slice(-128);this.currentEpisode=this.memory.get?.('co-development','current')?.value||this.history.at(-1)||null}catch{}}

  observe(input,{context='',purpose='',source='interaction'}={}){
    const text=String(input??'').trim();
    const inquiry=this.unit.cultivationProgram?.interrogatives?.resolve?.({goal:text,context,purpose,human:this.unit.profile?.name||'user'})||null;
    const field=this.unit.processField.evaluate(this.unit,{intent:text,cycle:{goal:text,purpose,inquiry,stage:'awareness'}});
    const user=this.unit.userDevelopment.resolve({reason:'co-development-observation'});
    const self=this.unit.development.resolve({reason:'co-development-observation'});
    const coupled=this.unit.coupledDevelopment.resolve({reason:'co-development-observation',userState:user,synthiaState:self});

    const claims={};
    for(const [q,d] of Object.entries(DIM_BY_Q)){
      const f=inquiry?.fields?.[q]||{};
      claims[q]={dimension:d,status:f.known?STATUS.known:STATUS.unresolved,value:f.known?f.value:null,evidence:f.known?[{source:'current-input',text}]:[]};
    }
    const unresolved=Object.entries(claims).filter(([,x])=>x.status===STATUS.unresolved).map(([q])=>q);
    const strongest=this.#strongestProcesses(field);
    const question=inquiry?.question||null;
    const candidate=this.#candidate({text,inquiry,coupled,strongest});
    const episode={
      id:`codev:${Date.now()}:${Math.random().toString(36).slice(2,7)}`,type:'co-development-episode',at:Date.now(),source,input:text,context:String(context||''),purpose:String(purpose||''),
      claims,unresolved,question,
      organism:{identity:'Synthia',activeGate:field.activeGate,activeLoci:field.organism.activeLoci,focusDimension:field.organism.inquiryDimension,strongestProcesses:strongest,relations:field.relations.slice(0,12)},
      userDevelopment:{id:user.id,iam:user.iam,becoming:user.becoming,distance:user.distance},
      synthiaDevelopment:{id:self.id,iam:self.iam,becoming:self.becoming,distance:self.distance},
      coupled:{statement:coupled.statement,supportGap:coupled.supportGap},
      candidate,
      next:question?{kind:'question',text:question}:{kind:'test',text:candidate.text},
      epistemicLegend:STATUS
    };
    this.currentEpisode=clone(episode);this.history.push(clone(episode));if(this.history.length>128)this.history.shift();
    this.memory?.upsert?.('co-development','current',episode);this.memory?.remember?.('co-development-history',episode);
    return clone(episode);
  }

  recordOutcome({worked=null,statement='',evidence=null}={}){
    if(!this.currentEpisode)return null;
    const rec=clone(this.currentEpisode);const ok=worked===null?null:Boolean(worked);
    rec.outcome={worked:ok,statement:String(statement||''),evidence:clone(evidence),at:Date.now(),status:ok===true?STATUS.tested:ok===false?STATUS.contradicted:STATUS.inferred};
    rec.completedAt=Date.now();
    this.currentEpisode=rec;this.history.push(clone(rec));if(this.history.length>128)this.history.shift();
    this.memory?.upsert?.('co-development','current',rec);this.memory?.remember?.('co-development-history',rec);
    return clone(rec);
  }

  snapshot(){return {current:clone(this.currentEpisode),history:this.history.slice(-32).map(clone),legend:STATUS};}

  #strongestProcesses(field){
    return [...(field?.gates||[])].sort((a,b)=>b.activity-a.activity||a.gate-b.gate).slice(0,8).map(g=>({gate:g.gate,activity:g.activity,choices:Object.fromEntries(Object.entries(g.decisions).map(([d,v])=>[d,v.choice]))}));
  }
  #candidate({text,inquiry,coupled,strongest}){
    if(inquiry?.missing?.length)return {status:STATUS.proposed,kind:'resolve-context',text:inquiry.question,basis:{missing:inquiry.missing,strongestGates:strongest.map(x=>x.gate)}};
    if(coupled?.supportGap?.length)return {status:STATUS.proposed,kind:'grow-capability',text:`Test or construct the smallest support for: ${coupled.supportGap[0]}.`,basis:{supportGap:coupled.supportGap}};
    return {status:STATUS.proposed,kind:'real-world-test',text:`Make the smallest reversible move that tests the current reading of “${text}”, then observe what actually changes.`,basis:{strongestGates:strongest.map(x=>x.gate)}};
  }
}
export default CoDevelopmentalSynthia;
