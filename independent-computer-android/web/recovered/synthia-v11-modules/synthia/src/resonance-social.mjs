const clone=v=>structuredClone(v);
const now=()=>new Date().toISOString();
const rid=p=>`${p}:${crypto.randomUUID()}`;

function activationMatches(a,r){
  if(!a)return false;
  for(const key of ['gate','line','color','tone','base']){
    if(r[key]!=null && r[key]!=='' && Number(a[key])!==Number(r[key]))return false;
  }
  return true;
}

export class ResonanceSocialStore{
  constructor(runtime){this.runtime=runtime;this.foundation=runtime.computer.foundation;this.key='resonance:social:v1';this.state={version:1,entities:[],projects:[],openings:[],invitations:[],feed:[]};}
  async load(){const saved=await this.runtime.store.get(this.key);if(saved?.version===1)this.state={...this.state,...saved};return this.snapshot();}
  snapshot(){return clone(this.state);}
  async save(){await this.runtime.store.put(this.key,this.state);return this.snapshot();}
  async land(type,payload,actorId=null){
    const item={id:rid('feed'),type,actorId,at:now(),payload:clone(payload)};this.state.feed.unshift(item);this.state.feed=this.state.feed.slice(0,200);await this.save();
    try{const receipt=await this.foundation.ingest({kind:'resonance-social-event',event:item},{name:'resonance-social-event.json',source:'resonance-social',matterOwner:actorId||'network'});item.receiptId=receipt?.id||null;await this.save();}catch{}
    return item;
  }
  async ensurePair(profile,pair){
    if(!profile||!pair)return this.snapshot();
    const upsert=(id,kind,name)=>{const next={id,kind,name,configurationHash:pair.configurationHash,home:'local-indie-verse',originAt:pair.createdAt||now()};const i=this.state.entities.findIndex(x=>x.id===id);if(i>=0)this.state.entities[i]={...this.state.entities[i],...next};else this.state.entities.push(next);};
    upsert(pair.humanId,'human',profile.name||'Human');upsert(pair.isoId,'isohuman',pair.isoName||'Cynthia');await this.save();return this.snapshot();
  }
  async createProject({title,description='',ownerId}){if(!String(title).trim())throw Error('Project title required.');const project={id:rid('project'),title:String(title).trim(),description:String(description).trim(),ownerId,status:'active',createdAt:now()};this.state.projects.unshift(project);await this.land('project-created',project,ownerId);return clone(project);}
  async createOpening({title,description='',projectId=null,creatorId,requirements}){
    if(!String(title).trim())throw Error('Opening title required.');
    const req={};for(const k of ['gate','line','color','tone','base'])if(requirements?.[k]!=null&&requirements[k]!==''){const n=Number(requirements[k]);if(!Number.isInteger(n))throw Error(`${k} must be an integer`);req[k]=n;}
    if(!Number.isInteger(req.gate)||req.gate<1||req.gate>64)throw Error('Opening needs a Gate from 1 to 64.');
    if(req.line!=null&&(req.line<1||req.line>6))throw Error('Line must be 1–6.');if(req.color!=null&&(req.color<1||req.color>6))throw Error('Color must be 1–6.');if(req.tone!=null&&(req.tone<1||req.tone>6))throw Error('Tone must be 1–6.');if(req.base!=null&&(req.base<1||req.base>5))throw Error('Base must be 1–5.');
    const opening={id:rid('opening'),title:String(title).trim(),description:String(description).trim(),projectId,creatorId,requirements:req,status:'open',participants:[],createdAt:now()};this.state.openings.unshift(opening);await this.land('opening-created',opening,creatorId);return clone(opening);
  }
  qualification(profile,opening){const acts=[...(profile?.humanDesign?.personality||[]),...(profile?.humanDesign?.design||[])];const matches=acts.filter(a=>activationMatches(a,opening.requirements));return {qualified:matches.length>0,matches:clone(matches)};}
  async joinHuman(openingId,humanId,profile){const o=this.state.openings.find(x=>x.id===openingId);if(!o)throw Error('Opening not found.');const q=this.qualification(profile,o);if(!q.qualified)throw Error('This configuration does not satisfy the opening.');if(!o.participants.includes(humanId))o.participants.push(humanId);await this.land('human-joined-opening',{openingId,humanId,matches:q.matches},humanId);return clone(o);}
  async inviteIsohuman(openingId,isoId,profile,humanId){const o=this.state.openings.find(x=>x.id===openingId);if(!o)throw Error('Opening not found.');const q=this.qualification(profile,o);if(!q.qualified)throw Error('The isohuman origin configuration does not satisfy this opening.');const prior=this.state.invitations.find(x=>x.openingId===openingId&&x.entityId===isoId&&x.status==='pending');if(prior)return clone(prior);const inv={id:rid('invite'),openingId,entityId:isoId,invitedBy:humanId,status:'pending',matches:q.matches,createdAt:now()};this.state.invitations.unshift(inv);await this.land('isohuman-invited',{invitationId:inv.id,openingId,entityId:isoId},humanId);return clone(inv);}
  async recordAgentDecision(invitationId,decision,reason=''){const inv=this.state.invitations.find(x=>x.id===invitationId);if(!inv)throw Error('Invitation not found.');if(!['accepted','declined'].includes(decision))throw Error('Decision must be accepted or declined.');inv.status=decision;inv.decidedAt=now();inv.reason=String(reason||'');if(decision==='accepted'){const o=this.state.openings.find(x=>x.id===inv.openingId);if(o&&!o.participants.includes(inv.entityId))o.participants.push(inv.entityId);}await this.land(`isohuman-${decision}`,{invitationId,openingId:inv.openingId,entityId:inv.entityId,reason:inv.reason},inv.entityId);return clone(inv);}
  exportPacket(){return {schema:'resonance.network.packet.v1',exportedAt:now(),data:this.snapshot()};}
  async importPacket(packet){if(packet?.schema!=='resonance.network.packet.v1'||!packet.data)throw Error('Not a Resonance network packet.');const merge=(key)=>{const map=new Map(this.state[key].map(x=>[x.id,x]));for(const x of packet.data[key]||[])if(x?.id&&!map.has(x.id))map.set(x.id,x);this.state[key]=[...map.values()];};for(const k of ['entities','projects','openings','invitations','feed'])merge(k);await this.save();await this.land('network-packet-imported',{exportedAt:packet.exportedAt||null});return this.snapshot();}
}
export default ResonanceSocialStore;
