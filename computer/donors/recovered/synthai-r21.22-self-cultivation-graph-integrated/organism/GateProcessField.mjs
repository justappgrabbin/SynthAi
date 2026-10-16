import { StateSpaceKernel } from '../vendor/ato-core/src/state-space-kernel.mjs';
import GateLocus,{INTERROGATIVES} from './GateLocus.mjs';

const clone=x=>structuredClone(x);
const DIMS=Object.freeze(['Space','Evolution','Being','Movement','Design']);
export {INTERROGATIVES};

/**
 * The organism's 64 enduring gate processes. This object coordinates encounters
 * but does not become a 65th boss process. Organism-level summaries are views of
 * the participating loci and relations; they never replace local state.
 */
export class GateProcessField{
  constructor({kernel=new StateSpaceKernel(),memory=null}={}){
    this.kernel=kernel;this.memory=memory;this.last=null;this.relations=new Map();this.lastPersistAt=0;
    const saved=memory?.get?.('gate-process-field','loci')?.value||null;
    const byGate=new Map((saved?.loci||[]).map(x=>[Number(x.gate),x]));
    this.loci=Array.from({length:64},(_,i)=>new GateLocus({gate:i+1,kernel,saved:byGate.get(i+1)||null}));
    for(const r of saved?.relations||[])if(r?.id)this.relations.set(r.id,r);
  }

  evaluate(unit,{intent='',cycle=null}={}){
    if(!this.memory&&unit?.memory)this.memory=unit.memory;
    const life=unit.lifeSnapshot?.()||{}, success=unit.metabolism?.snapshot?.()||{}, world=unit.world?.snapshot?.()||{};
    const address=unit.resolveAddress?.(intent||'self')?.canonical||{};
    const inquiry=cycle?.inquiry||null;
    const participants=this.#participants(world,inquiry,unit);
    const text=String(intent||cycle?.goal||'').trim();
    const activeGate=Number(address.gate)||1;
    const inputKey=`${text}|${activeGate}|${cycle?.id||''}|${cycle?.stage||''}`;
    const ctx={
      now:Date.now(),inputKey,intent:text,activeGate,participants,
      vitality:Number(success.vitality??.68),adaptation:Number(success.adaptationBudget||0),repair:Number(success.repairPressure||0),
      pulses:Number(life.pulses||0),intervalMs:Number(unit.living?.intervalMs||5000),
      addressKnown:Boolean(address&&Number.isFinite(Number(address.gate))),
      whereKnown:Boolean(inquiry?.fields?.Where?.known),where:inquiry?.fields?.Where?.value||null,
      whenKnown:Boolean(inquiry?.fields?.When?.known),when:inquiry?.fields?.When?.value||null,
      whyKnown:Boolean(inquiry?.fields?.Why?.known),why:inquiry?.fields?.Why?.value||null,
      purpose:cycle?.purpose||unit.metabolism?.purpose||null
    };

    const gates=this.loci.map(l=>l.observe(ctx));
    const active=[...gates].sort((a,b)=>b.activity-a.activity||a.gate-b.gate).slice(0,8);
    this.#encounters(active,ctx);

    const dimensions={};
    for(const dim of DIMS){
      const ranked=[...gates].sort((a,b)=>b.decisions[dim].activation-a.decisions[dim].activation||a.gate-b.gate);
      const engaged=ranked.filter(g=>g.decisions[dim].activation>.45);
      const choices={};for(const g of engaged)choices[g.decisions[dim].choice]=(choices[g.decisions[dim].choice]||0)+1;
      dimensions[dim]={question:INTERROGATIVES[dim],activation:ranked[0]?.decisions[dim].activation||0,voices:engaged.length,strongest:ranked.slice(0,5).map(g=>g.gate),choices};
    }

    const openRelations=[...this.relations.values()].sort((a,b)=>b.strength-a.strength).slice(0,24);
    const inquiryDimension=this.#inquiryDimension(inquiry);
    const organism={
      identity:'Synthia',kind:'organized-multiprocess-organism',
      activeLoci:active.map(g=>g.gate),addressedGate:activeGate,
      relationCount:openRelations.length,
      inquiryDimension,
      // No avatar is presumed. The whole field is the default body until the
      // organism has grounded evidence for a specific embodiment choice.
      expressionChoice:{mode:'whole-field',embodiment:null,reason:'no imposed avatar; expression follows the organized field',focusGate:activeGate,focusDimension:inquiryDimension||null}
    };
    this.last={type:'64-persistent-gate-process-organism',at:ctx.now,intent:text,activeGate,dimensions,gates,relations:openRelations,organism};
    this.#persist(ctx.now);
    return clone(this.last);
  }

  locus(gate){const x=this.loci[Number(gate)-1];return x?x.snapshot():null;}
  snapshot(){return this.last?clone(this.last):null;}

  #participants(world,inquiry,unit){
    const out=[];
    const who=inquiry?.fields?.Who?.value;if(who)out.push(...String(who).split(/\s*\+\s*/).filter(Boolean));
    for(const e of world?.entities||[])out.push(e.id||e.label||e.kind);
    out.push(unit?.runtimeHandle||'@self');
    return [...new Set(out.map(String).filter(Boolean))].slice(0,32);
  }
  #encounters(active,ctx){
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=this.loci[active[i].gate-1],b=this.loci[active[j].gate-1];
      const relation=a.meet(b,{at:ctx.now,reason:'co-active-in-one-organism'});
      const previous=this.relations.get(relation.id);
      this.relations.set(relation.id,{...relation,encounters:Number(previous?.encounters||0)+1,firstSeenAt:previous?.firstSeenAt||ctx.now});
    }
    if(this.relations.size>128){const keep=[...this.relations.values()].sort((a,b)=>(b.at-a.at)||(b.strength-a.strength)).slice(0,128);this.relations=new Map(keep.map(x=>[x.id,x]));}
  }
  #inquiryDimension(inquiry){
    if(!inquiry)return null;
    const order=['Why','Who','What','Where','When'];
    const missing=order.find(k=>inquiry.missing?.includes(k));
    return missing?inquiry.fields?.[missing]?.dimension||({Why:'Design',Who:'Space',What:'Evolution',Where:'Being',When:'Movement'}[missing]):null;
  }
  #persist(now){
    if(!this.memory?.upsert||now-this.lastPersistAt<5000)return;
    this.lastPersistAt=now;
    this.memory.upsert('gate-process-field','loci',{version:1,at:now,loci:this.loci.map(x=>x.serialize()),relations:[...this.relations.values()].slice(-128)});
  }
}
export default GateProcessField;
