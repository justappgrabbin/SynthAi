/**
 * WorldOrgan — real-world referent/address organ.
 *
 * Internal 5D/canonical coordinates describe Synthia's state-space address.
 * A real-world address describes the actual referent: person/place/thing/resource,
 * URL, geo coordinate, file, contact point, or other externally checkable locator.
 * The two are linked but never conflated.
 */
export class WorldOrgan{
 constructor(){this.id='world';this.capabilities=['world','people','places','things','crossing','real-world-address','observation'];this.entities=new Map();this.crossings=[];this.observations=[];}
 key(entity){return `${entity.kind}:${entity.id}`;}
 normalize(entity={}){
  if(!entity?.id||!['person','place','thing','resource','service','event'].includes(entity.kind))throw new TypeError('entity requires kind person|place|thing|resource|service|event and id');
  const loc=entity.locator||{};
  return {...structuredClone(entity),worldAddress:{
   scheme:loc.scheme||this.#inferScheme(entity),
   locator:loc.value||entity.url||entity.path||entity.email||entity.phone||null,
   geo:entity.geo?{lat:Number(entity.geo.lat),lon:Number(entity.geo.lon),accuracy:entity.geo.accuracy??null}:null,
   observedAt:entity.observedAt||null,
   source:entity.source||null,
   evidence:structuredClone(entity.evidence||[])
  }};
 }
 add(entity){const e=this.normalize(entity);this.entities.set(this.key(e),e);return structuredClone(e);}
 observe(entity,{source,evidence=[],observedAt=Date.now()}={}){
  if(!source&&!evidence?.length)throw new Error('real-world observation requires source or evidence');
  const e=this.add({...entity,source:source||entity.source,evidence:[...(entity.evidence||[]),...evidence],observedAt});
  const obs={id:`obs-${Date.now()}-${this.observations.length}`,ref:this.key(e),source:e.worldAddress.source,evidence:e.worldAddress.evidence,observedAt,status:'observed'};
  this.observations.push(obs);return {entity:e,observation:structuredClone(obs)};
 }
 get(ref){return this.entities.get(typeof ref==='string'?ref:`${ref.kind}:${ref.id}`)||null;}
 address(ref){const e=this.get(ref);return e?structuredClone(e.worldAddress):null;}
 crossing(a,b,context={}){const left=this.get(a)||a,right=this.get(b)||b;const c={id:`cross-${Date.now()}-${this.crossings.length}`,left,right,context,createdAt:Date.now(),status:'open'};this.crossings.push(c);return c;}
 receive(message){const from=this.get(message.from),to=this.get(message.to);return {ok:Boolean(to),from,to,message};}
 execute({action='snapshot',...payload}={}){if(action==='add')return {ok:true,entity:this.add(payload.entity)};if(action==='observe')return {ok:true,...this.observe(payload.entity,payload)};if(action==='address')return {ok:true,address:this.address(payload.ref)};if(action==='crossing')return {ok:true,crossing:this.crossing(payload.a,payload.b,payload.context||{})};if(action==='receive')return this.receive(payload.message);return {ok:true,...this.snapshot()};}
 snapshot(){return {entities:[...this.entities.values()].map(x=>structuredClone(x)),observations:structuredClone(this.observations),crossings:structuredClone(this.crossings)};}
 #inferScheme(e){if(e.url)return 'https';if(e.geo)return 'geo';if(e.path)return 'file';if(e.email)return 'mailto';if(e.phone)return 'tel';return 'world';}
}
export default WorldOrgan;
