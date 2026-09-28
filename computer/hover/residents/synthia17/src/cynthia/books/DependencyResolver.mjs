export class DependencyResolver {
  constructor({knownPrimitives=[],propositionTools={}}={}){this.knownPrimitives=new Set(knownPrimitives);this.propositionTools=new Map(Object.entries(propositionTools));}
  resolve(proposition){
    const dependencies=proposition.dependencies.map(dependency=>{const key=dependency.kind==='proposition'?`${proposition.book}:I.${dependency.number}`:`${dependency.kind}:${dependency.number}`;const toolId=this.propositionTools.get(key)??null;return Object.freeze({...dependency,key,status:toolId||this.knownPrimitives.has(key)?'resolved':'missing',toolId});});
    const actionGaps=proposition.actions.filter(action=>!this.knownPrimitives.has(`action:${action}`)).map(action=>Object.freeze({kind:'primitive',key:`action:${action}`,status:'missing'}));
    const explicit=proposition.gaps.map(key=>Object.freeze({kind:'evidence',key,status:'missing'}));
    const missing=[...dependencies.filter(item=>item.status==='missing'),...actionGaps,...explicit];
    return Object.freeze({propositionId:proposition.id,dependencies:Object.freeze(dependencies),missing:Object.freeze(missing),ready:missing.length===0});
  }
  registerProposition(id,toolId){this.propositionTools.set(id,toolId);return this;}
  registerPrimitive(key){this.knownPrimitives.add(key);return this;}
  snapshot(){return Object.freeze({knownPrimitives:[...this.knownPrimitives].sort(),propositionTools:[...this.propositionTools.entries()].sort(([a],[b])=>a.localeCompare(b))});}
  restore(snapshot){this.knownPrimitives=new Set(snapshot?.knownPrimitives??[]);this.propositionTools=new Map(snapshot?.propositionTools??[]);return this;}
}
