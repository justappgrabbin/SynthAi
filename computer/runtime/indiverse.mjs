const clone=v=>v===undefined?undefined:structuredClone(v);
export class IndiVerseRegistry {
  constructor({bus,state,mesh}={}){Object.assign(this,{bus,state,mesh});this.worlds=new Map()}
  async restore(){for(const w of this.state.get('indiverse.worlds',[]))this.worlds.set(w.owner,w);return this.list()}
  async define(owner,{name=owner+"'s IndiVerse",grammar={},invariants={}}={}){
    const world={owner,name,grammar:clone(grammar),invariants:clone(invariants),updatedAt:Date.now()};
    this.worlds.set(owner,world); await this.state.set('indiverse.worlds',this.list(),{source:'indiverse'});
    if(this.mesh&&!this.mesh.get('indiverse:'+owner)) await this.mesh.join('indiverse:'+owner,{kind:'indiverse',residency:'warm',publicState:{name}});
    this.bus?.emit('indiverse:defined',{owner,name}); return clone(world);
  }
  render(owner,canonicalObject,visitor={}){
    const world=this.worlds.get(owner); if(!world)throw new Error('unknown IndiVerse: '+owner);
    const expression={canonicalId:canonicalObject.id,canonicalType:canonicalObject.type,canonical:clone(canonicalObject),host:owner,grammar:clone(world.grammar),visitor:clone(visitor),rendered:{...clone(canonicalObject),qualiaGrammar:clone(world.grammar)}};
    this.bus?.emit('indiverse:rendered',{owner,canonicalId:canonicalObject.id,visitor:visitor.id??null});
    return expression;
  }
  difference(owner,canonicalObject){const r=this.render(owner,canonicalObject);return {canonical:r.canonical,hostGrammar:r.grammar,rendered:r.rendered}}
  list(){return [...this.worlds.values()].map(clone)}
}
