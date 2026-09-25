export class HumanDesignOrgan{
  constructor(network){if(!network)throw new Error('HumanDesignOrgan requires HumanDesignNetwork');this.id='human-design';this.capabilities=['human-design','design-path','authority','profile','relationship','experiment'];this.network=network;}
  accepts(input={}){return /human design|design path|authority|profile|bodygraph|relationship design/i.test(String(input.intent||''))||Boolean(input.humanDesign);}
  async execute(input={}){
    const spec=input.humanDesign||{};
    if(spec.profile){const profile=this.network.upsertProfile(spec.profile);return {ok:true,operation:'profile',profile,path:this.network.path(profile.id,input.intent||profile.goal)};}
    if(spec.compare){const {aId,bId}=spec.compare;return {ok:true,operation:'compare',comparison:this.network.compare(aId,bId)};}
    if(spec.experiment){return {ok:true,operation:'experiment',experiment:this.network.recordExperiment(spec.experiment)};}
    const profile=this.network.profile(spec.profileId);
    if(!profile)return {ok:true,operation:'needs-profile',needsProfile:true,required:['name','type','authority','profile','gates'],message:'Create or import a Human Design profile before asking for a personalized Design Path.'};
    return {ok:true,operation:'path',profile,path:this.network.path(profile.id,input.intent||profile.goal)};
  }
}
export default HumanDesignOrgan;
