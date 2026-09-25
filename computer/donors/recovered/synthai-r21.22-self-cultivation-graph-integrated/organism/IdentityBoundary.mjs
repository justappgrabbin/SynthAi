const clone=x=>x==null?x:structuredClone(x);
const gatesFrom=(field)=>[...new Set([field?.activeGate,...(field?.organism?.activeLoci||[])].map(Number).filter(g=>Number.isInteger(g)&&g>=1&&g<=64))];

/**
 * Local/global identity membrane.
 * Local residence may know the human and full canonical coordinates.
 * Anything projected beyond residence is reduced to hexagram identities and
 * hexagram-to-hexagram relations only. No person/profile or sub-gate address
 * is emitted by this class.
 */
export class IdentityBoundary{
  constructor({unit}={}){if(!unit)throw new Error('IdentityBoundary requires SynthiaUnit');this.unit=unit;this.lastGlobal=null;}
  local(){
    return {scope:'local-residence',profile:clone(this.unit.profile||{}),residence:clone(this.unit.residence?.snapshot?.()||null),runtimeHandle:this.unit.runtimeHandle||'@self'};
  }
  global(field=this.unit.processField?.snapshot?.()){
    const hexagrams=gatesFrom(field);
    const allowed=new Set(hexagrams);
    const relations=(field?.relations||[]).map(r=>(r.participants||[]).map(Number).filter(g=>allowed.has(g))).filter(x=>x.length===2).map(([a,b])=>a<b?[a,b]:[b,a]);
    const uniqueRelations=[...new Map(relations.map(x=>[x.join(':'),x])).values()];
    const projection={version:1,scope:'global',kind:'hexagram-field',hexagrams,relations:uniqueRelations};
    this.lastGlobal=projection;return clone(projection);
  }
  assertGlobalSafe(payload){
    const keys=Object.keys(payload||{}).sort();
    const allowed=['hexagrams','kind','relations','scope','version'].sort();
    const extra=keys.filter(k=>!allowed.includes(k));
    const json=JSON.stringify(payload||{});
    const forbidden=/\b(name|profile|purpose|line|color|tone|base|degree|minute|second|zodiac|house|birth|user|address)\b/i.test(json);
    const validHex=(payload?.hexagrams||[]).every(g=>Number.isInteger(g)&&g>=1&&g<=64);
    return {ok:extra.length===0&&!forbidden&&validHex,extra,forbidden,validHex};
  }
  snapshot(){return {policy:'local human/full state; global hexagrams only',global:clone(this.lastGlobal)};}
}
export default IdentityBoundary;
