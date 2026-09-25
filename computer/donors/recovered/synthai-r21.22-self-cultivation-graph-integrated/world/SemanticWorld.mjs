const clone=x=>x==null?x:structuredClone(x);
const key=(s,r,o)=>JSON.stringify([String(s),String(r),String(o)]);

/** Deterministic MESSY/Klein-style semantic world: facts, rules, scheduled groups, change log. */
export class SemanticWorld{
  constructor({memory=null,clock=()=>Date.now()}={}){this.memory=memory;this.clock=clock;this.facts=new Map();this.rules=new Map();this.groups=new Map();this.changeLog=[];this.tickCount=0;}
  assert(subject,relation,object,meta={}){const id=key(subject,relation,object);const rec={id,subject:String(subject),relation:String(relation),object:String(object),createdAt:this.clock(),meta:clone(meta)};this.facts.set(id,rec);this.#log('assert',rec);return clone(rec);}
  retract(subject,relation,object){const id=key(subject,relation,object),rec=this.facts.get(id);if(!rec)return false;this.facts.delete(id);this.#log('retract',rec);return true;}
  query({subject=null,relation=null,object=null}={}){return [...this.facts.values()].filter(f=>(subject==null||f.subject===String(subject))&&(relation==null||f.relation===String(relation))&&(object==null||f.object===String(object))).map(clone);}
  addRule({id,when,then,group='default',enabled=true}={}){if(!id||typeof when!=='function'||typeof then!=='function')throw new TypeError('rule requires id, when(world), then(world)');const r={id:String(id),when,then,group:String(group),enabled:Boolean(enabled),fires:0};this.rules.set(r.id,r);if(!this.groups.has(r.group))this.groups.set(r.group,{id:r.group,enabled:true,every:1});return r;}
  configureGroup(id,{enabled=true,every=1}={}){const g={id:String(id),enabled:Boolean(enabled),every:Math.max(1,Number(every)||1)};this.groups.set(g.id,g);return clone(g);}
  async tick(context={}){this.tickCount++;const fired=[];for(const r of this.rules.values()){const g=this.groups.get(r.group)||{enabled:true,every:1};if(!r.enabled||!g.enabled||this.tickCount%g.every!==0)continue;const result=await r.when(this,context);if(result){const out=await r.then(this,context,result);r.fires++;fired.push({ruleId:r.id,result:clone(out??result)});}}return {tick:this.tickCount,fired};}
  #log(op,fact){const e={id:`world-change:${this.clock()}:${this.changeLog.length+1}`,at:this.clock(),op,fact:clone(fact)};this.changeLog.push(e);this.memory?.remember?.('semantic-world-events',e);}
  snapshot(){return {tick:this.tickCount,facts:[...this.facts.values()].map(clone),rules:[...this.rules.values()].map(r=>({id:r.id,group:r.group,enabled:r.enabled,fires:r.fires})),groups:[...this.groups.values()].map(clone),changeLog:this.changeLog.slice(-128).map(clone)};}
}
export default SemanticWorld;
