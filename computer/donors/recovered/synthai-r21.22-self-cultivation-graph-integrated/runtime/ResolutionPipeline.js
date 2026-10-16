/**
 * ResolutionPipeline
 *
 * Canonical meaning of RESOLVED in Synthia:
 * INGEST -> ANALYZE -> ADDRESS/CLASSIFY -> POST(S) TO SUPABASE -> CONFIRMED.
 *
 * Version selection is NOT resolution. Version lineage uses register/verify/promote.
 */
export class ResolutionPipeline {
  constructor({analyzer,addressResolver,poster}={}){
    if(typeof analyzer!=='function') throw new TypeError('ResolutionPipeline requires analyzer(artifact)');
    if(typeof addressResolver!=='function') throw new TypeError('ResolutionPipeline requires addressResolver(artifact, analysis)');
    if(!poster || typeof poster.postResolution!=='function') throw new TypeError('ResolutionPipeline requires poster.postResolution');
    this.analyzer=analyzer; this.addressResolver=addressResolver; this.poster=poster;
    this.events=[];
  }

  async resolve(artifact,{extraPosts=[]}={}){
    if(!artifact) throw new TypeError('artifact required');
    const trace={id:artifact.id||artifact.contentHash||artifact.filename||`artifact-${Date.now()}`,status:'ingested',stages:[],startedAt:Date.now()};
    trace.stages.push({stage:'ingest',ok:true,at:Date.now()});

    let analysis;
    try{
      analysis=await this.analyzer(artifact);
      if(!analysis || analysis.ok===false) throw new Error(analysis?.error||'analysis failed');
      trace.status='analyzed'; trace.stages.push({stage:'analyze',ok:true,at:Date.now()});
    }catch(error){ return this.#fail(trace,'analyze',error); }

    let address;
    try{
      address=await this.addressResolver(artifact,analysis);
      if(!this.#validAddress(address)) throw new Error('address/classification incomplete');
      trace.status='addressed'; trace.stages.push({stage:'address',ok:true,address,at:Date.now()});
    }catch(error){ return this.#fail(trace,'address',error); }

    try{
      const post=await this.poster.postResolution({artifact,analysis,address,extraPosts:[...(analysis.extraPosts||[]),...extraPosts]});
      if(!post?.ok || !post.receipts?.length) throw new Error('Supabase did not confirm posts');
      trace.status='resolved';
      trace.resolvedAt=Date.now();
      trace.supabase=post;
      trace.stages.push({stage:'supabase-posts',ok:true,count:post.receipts.length,receipts:post.receipts,at:trace.resolvedAt});
      this.events.push({type:'RESOLVED',id:trace.id,address,receipts:post.receipts.length,at:trace.resolvedAt});
      return {ok:true,resolved:true,artifact,analysis,address,trace,post};
    }catch(error){ return this.#fail(trace,'supabase-posts',error,{artifact,analysis,address}); }
  }

  #validAddress(a){
    if(!a || !Number.isInteger(a.gate)||a.gate<1||a.gate>64 || !Number.isInteger(a.line)||a.line<1||a.line>6 || !Number.isInteger(a.color)||a.color<1||a.color>6 || !Number.isInteger(a.tone)||a.tone<1||a.tone>6 || !Number.isInteger(a.base)||a.base<1||a.base>5 || !['Movement','Evolution','Being','Design','Space'].includes(a.dimension)) return false;
    const ranges={degree:[0,360],minute:[0,59],second:[0,59],arc:[0,99],zodiac:[1,12],house:[1,12]};
    for(const [k,[min,max]] of Object.entries(ranges)){if(a[k]==null)continue;if(!Number.isFinite(a[k])||a[k]<min||a[k]>max||(k!=='degree'&&!Number.isInteger(a[k])))return false;}
    return true;
  }
  #fail(trace,stage,error,extra={}){
    trace.status=`failed:${stage}`; trace.error=String(error?.message||error); trace.stages.push({stage,ok:false,error:trace.error,at:Date.now()});
    this.events.push({type:'UNRESOLVED',id:trace.id,stage,error:trace.error,at:Date.now()});
    return {ok:false,resolved:false,trace,...extra};
  }
}
export default ResolutionPipeline;
