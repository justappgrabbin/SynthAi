export class GapChannelFactory {
  constructor({mind}={}){if(!mind)throw new TypeError('FIRST_MIND_REQUIRED');this.mind=mind;this.candidates=new Map();}
  async identify(proposition,resolution){
    if(resolution.ready)return Object.freeze({status:'no-channel-required',propositionId:proposition.id});
    const intake=await this.mind.ingestText(`${proposition.goal}\nMissing: ${resolution.missing.map(item=>item.key).join(', ')}`,{kind:'gap-channel-request',citation:proposition.span.citation()});
    const address=intake.analysis.addressed.address,id=`channel:${proposition.id}:${address.gate}.${address.line}.${address.color}.${address.tone}.${address.base}`;
    const candidate=Object.freeze({id,status:'candidate',address,source:proposition.span.citation(),members:Object.freeze(resolution.missing.map(item=>item.key)),contract:Object.freeze({inputs:['source-evidence','known-tools'],outputs:['verified-primitive-or-tool'],constraints:['preserve-source','test-before-install','no-main-realm-eval']})});
    this.candidates.set(id,candidate);this.mind.pressure.register(id,{competence:0});this.mind.pressure.press(id,{need:1,unresolved:1,salience:.9});return candidate;
  }
}
