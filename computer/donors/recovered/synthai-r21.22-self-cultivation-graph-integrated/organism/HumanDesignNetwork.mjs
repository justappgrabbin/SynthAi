import { CANONICAL_CHANNEL_PAIRS, canonicalChannelId } from '../runtime/ChannelRegistry.js';

export const CENTERS = Object.freeze({
  Head:[64,61,63], Ajna:[47,24,4,17,43,11], Throat:[62,23,56,35,12,45,33,8,31,20,16],
  G:[1,2,7,10,13,15,25,46], Heart:[21,26,40,51], Spleen:[18,28,32,44,48,50,57],
  Solar:[6,22,30,36,37,49,55], Sacral:[3,5,9,14,27,29,34,42,59], Root:[19,38,39,41,52,53,54,58,60]
});
const gateCenter = new Map(Object.entries(CENTERS).flatMap(([c,gs])=>gs.map(g=>[g,c])));
const uniq=a=>[...new Set(a.map(Number).filter(n=>n>=1&&n<=64))].sort((a,b)=>a-b);
const channelSet=gates=>{const s=new Set(gates);return CANONICAL_CHANNEL_PAIRS.filter(([a,b])=>s.has(a)&&s.has(b)).map(([a,b])=>canonicalChannelId(a,b));};
const definedCenters=channels=>[...new Set(channels.flatMap(id=>id.split('-').map(Number).map(g=>gateCenter.get(g))).filter(Boolean))];

export class HumanDesignNetwork {
  constructor(storage=globalThis.localStorage){ this.storage=storage; this.key='hd.success.network.v1'; this.state=this.load(); }
  blank(){return {profiles:[],activeProfile:null,connections:[],experiments:[]};}
  load(){try{return JSON.parse(this.storage?.getItem(this.key))||this.blank()}catch{return this.blank()}}
  save(){try{this.storage?.setItem(this.key,JSON.stringify(this.state))}catch{} return this.state;}
  upsertProfile(input){
    const p={id:input.id||crypto.randomUUID(),name:String(input.name||'Design').trim(),birth:input.birth||{},type:input.type||'Unknown',authority:input.authority||'Unknown',profile:input.profile||'Unknown',gates:uniq(input.gates||[]),goal:String(input.goal||'').trim(),createdAt:input.createdAt||Date.now()};
    p.channels=channelSet(p.gates); p.centers=definedCenters(p.channels);
    const i=this.state.profiles.findIndex(x=>x.id===p.id); if(i>=0)this.state.profiles[i]={...this.state.profiles[i],...p}; else this.state.profiles.push(p);
    this.state.activeProfile=p.id; this.save(); return p;
  }
  profile(id=this.state.activeProfile){return this.state.profiles.find(p=>p.id===id)||null;}
  compare(aId,bId){
    const a=this.profile(aId),b=this.profile(bId); if(!a||!b) throw new Error('Two designs are required.');
    const A=new Set(a.gates),B=new Set(b.gates), companionship=a.channels.filter(c=>b.channels.includes(c));
    const electromagnetic=CANONICAL_CHANNEL_PAIRS.filter(([x,y])=>(A.has(x)&&B.has(y))||(A.has(y)&&B.has(x))).map(([x,y])=>canonicalChannelId(x,y)).filter(c=>!companionship.includes(c));
    const dominance=[...a.channels.filter(c=>!b.channels.includes(c)).map(c=>({from:a.id,channel:c})),...b.channels.filter(c=>!a.channels.includes(c)).map(c=>({from:b.id,channel:c}))];
    const compromise=[]; for(const [x,y] of CANONICAL_CHANNEL_PAIRS){const id=canonicalChannelId(x,y);if(a.channels.includes(id)&&((B.has(x))^(B.has(y)))) compromise.push({channel:id,whole:a.id});if(b.channels.includes(id)&&((A.has(x))^(A.has(y)))) compromise.push({channel:id,whole:b.id});}
    const composite=uniq([...a.gates,...b.gates]), compositeChannels=channelSet(composite), compositeCenters=definedCenters(compositeChannels);
    return {a,b,companionship,electromagnetic,dominance,compromise,compositeChannels,compositeCenters,bridges:compositeCenters.filter(c=>!a.centers.includes(c)||!b.centers.includes(c))};
  }
  path(profileId=this.state.activeProfile,goal){
    const p=this.profile(profileId); if(!p) throw new Error('Create a design first.'); const g=String(goal||p.goal||'move forward').trim();
    const strategy={Manifestor:'Initiate after informing the people materially affected.',Generator:'Put concrete options in front of yourself and respond before committing.', 'Manifesting Generator':'Respond first, then move quickly and correct course without worshipping the original plan.',Projector:'Make expertise visible; pursue recognition and invitations where access matters.',Reflector:'Sample the environment and people before locking the decision.'}[p.type]||'Use your actual decision process before commitment.';
    const authority={Emotional:'Do not force certainty at the emotional peak or trough; revisit the decision across time.',Sacral:'Use an immediate bodily yes/no response to a concrete choice.',Splenic:'Honor the quiet first-hit instinct; it usually does not repeat.',Ego:'Commit only where the desire and bargain are genuinely yours.',Self:'Speak the direction aloud and listen for the identity that sounds like you.',Mental:'Use trusted environments and sounding boards; do not outsource the decision.',Lunar:'For major commitments, observe the choice through a full lunar cycle.'}[p.authority]||'Separate decision timing from mental pressure.';
    const strengths=p.centers.length?`Defined centers available as consistent resources: ${p.centers.join(', ')}.`:'Treat consistency as something to observe rather than assume.';
    return {goal:g,steps:[`Define one observable outcome for: ${g}`,strategy,authority,strengths,'Choose one action small enough to complete now and record the result.','Review the outcome as evidence: keep what worked, change the route—not the design.']};
  }
  recordExperiment({profileId=this.state.activeProfile,goal,action,outcome,result='unknown'}){const e={id:crypto.randomUUID(),profileId,goal,action,outcome,result,at:Date.now()};this.state.experiments.unshift(e);this.save();return e;}
}
export default HumanDesignNetwork;
