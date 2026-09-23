export class DormantCompiler {
  constructor({bus,state,backends}={}){Object.assign(this,{bus,state,backends});this.lifecycle='dormant'}
  async ensure(spec){
    if(!spec?.id||!spec?.sourceHash) throw new Error('compiler spec id/sourceHash required');
    const cached=this.state.get('compiler.artifacts.'+spec.id);
    if(cached?.sourceHash===spec.sourceHash){this.bus?.emit('compiler:cache-hit',{id:spec.id});return {...cached,reused:true}}
    return this.compile(spec);
  }
  async compile(spec){
    this.lifecycle='active'; this.bus?.emit('compiler:woke',{id:spec.id,target:spec.target});
    try{
      const backend=this.backends.get(spec.target);
      if(!backend) throw new Error('compiler backend unavailable: '+spec.target);
      const artifact=await backend.compile(spec);
      const record={id:spec.id,target:spec.target,sourceHash:spec.sourceHash,artifactHash:artifact.artifactHash,location:artifact.location,compiledAt:Date.now()};
      await this.state.set('compiler.artifacts.'+spec.id,record,{source:'dormant-compiler'});
      this.bus?.emit('compiler:complete',record); return {...record,reused:false};
    } finally {
      this.lifecycle='dormant'; this.bus?.emit('compiler:slept',{id:spec.id});
    }
  }
}
export class CompilerBackends {
  constructor(){this.items=new Map()}
  register(target,adapter){if(typeof adapter?.compile!=='function')throw new Error('compile adapter required');this.items.set(target,adapter);return adapter}
  get(target){return this.items.get(target)??null}
}
