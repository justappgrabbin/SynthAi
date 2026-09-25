/** OrganismCoordinator — specialists remain individual; collective context makes the whole more than one call. */
export class OrganismCoordinator {
  constructor({registry,metabolism=null}={}){if(!registry)throw new Error('registry required');this.registry=registry;this.metabolism=metabolism;this.events=[];this.sequence=0;}
  async execute(route,input,options={}){const ids=[...new Set((route||[]).map(String))],outputs=[];let collectiveContext=[];const started=this.#now();for(const id of ids){const t=this.#now();let out;try{out=await this.registry.run(id,{...input,collectiveContext:[...collectiveContext]});}catch(error){out={ok:false,error:String(error)};}const contribution={organ:id,ok:out?.ok!==false,out,durationMs:this.#now()-t};outputs.push(contribution);collectiveContext.push({organ:id,summary:this.#summary(out),durationMs:contribution.durationMs});}
    const contributors=outputs.filter(x=>x.ok).map(x=>x.organ);const event={id:`collective-${++this.sequence}`,type:contributors.length>1?'organism-collective':'specialist-operation',contributors,route:ids,ok:outputs.every(x=>x.ok),outputs,durationMs:this.#now()-started,internalReplay:Boolean(options.internalReplay),at:Date.now()};this.events.push(event);return event;}
  #now(){return globalThis.performance?.now?.()??Date.now();}
  #summary(out){if(!out||typeof out!=='object')return out;const x={ok:out.ok!==false};for(const k of ['kind','status','summary','artifact','result','plan'])if(k in out)x[k]=out[k];return x;}
  snapshot(){return {collectiveEvents:this.events.length,multiOrganEvents:this.events.filter(x=>x.type==='organism-collective').length,events:this.events.slice(-32).map(x=>({id:x.id,type:x.type,contributors:x.contributors,ok:x.ok,durationMs:x.durationMs,internalReplay:x.internalReplay}))};}
}
export default OrganismCoordinator;
