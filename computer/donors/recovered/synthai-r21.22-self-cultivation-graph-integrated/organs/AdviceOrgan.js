import LanguageContactModel from './legacy/LanguageContactModel.js';
import {KleinLinguisticLayer} from './today/KleinLinguisticLayer.js';
import {AspirationCore} from './today/AspirationCore.js';
class LinguisticTriadState{
  constructor(){this.history=[];this.bySpeaker=new Map();}
  updateLinguisticCHNOPS(speaker,chnops){const event={at:Date.now(),speaker:speaker??null,chnops:structuredClone(chnops)};this.history.push(event);if(this.history.length>500)this.history.shift();this.bySpeaker.set(String(speaker??'unresolved'),event);return event;}
  snapshot(){return {history:structuredClone(this.history),latest:Object.fromEntries([...this.bySpeaker])};}
}
export class AdviceOrgan{
  constructor(profile={}){this.id='advice';this.capabilities=['chat','advice','reflection','language','klein'];this.contact=new LanguageContactModel();this.aspiration=new AspirationCore({partner1:{name:null,goals:profile.goals||[],strengths:[],growthAreas:[]},partner2:{name:null,goals:[],strengths:[],growthAreas:[]},sharedPurpose:profile.purpose||null,successHistory:[]});this.triad=new LinguisticTriadState();this.klein=new KleinLinguisticLayer(this.aspiration,this.triad);}
  accepts(){return true}
  async execute({intent,address,mode='complement',knowledgeContext=[]}){const base=this.contact.respond(intent,{address});let learned=null;try{learned=await this.klein.processInteraction(String(intent),'partner1',{address,mode},undefined)}catch(error){learned={error:String(error?.message||error)}}const wh=/\bwhy\b/i.test(intent)?'WHY':/\bwhen\b/i.test(intent)?'WHEN':/\bwhere\b/i.test(intent)?'WHERE':/\bwho\b/i.test(intent)?'WHO':'WHAT';const cue={WHO:'Space / perspective and relation',WHAT:'Movement / change and action',WHERE:'Being / present condition and embodiment',WHEN:'Evolution / timing and developmental phase',WHY:'Design / purpose and formative direction'}[wh];const grounded=Array.isArray(knowledgeContext)&&knowledgeContext.length?` I found ${knowledgeContext.length} relevant chunk${knowledgeContext.length===1?'':'s'} in material stored in this residence.`:'';return {ok:true,text:base.text+grounded,knowledge:knowledgeContext.map(x=>({source:x.source,score:x.score,excerpt:String(x.text||'').slice(0,700)})),reflection:`I’m reading this first through ${cue}. I can mirror your pattern or complement it; current mode is ${mode}.`,learned,address,triad:this.triad.snapshot()};}
}
export default AdviceOrgan;
