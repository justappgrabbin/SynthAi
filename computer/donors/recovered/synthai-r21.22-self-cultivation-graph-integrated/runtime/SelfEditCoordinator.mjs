const clone=x=>x==null?x:structuredClone(x);
const protectedPath=p=>/^(?:ORGANISM_INVARIANTS\.md|RECOVERY_LOCK\.md|core\/ResidenceContext\.mjs|organism\/IdentityBoundary\.mjs)$/i.test(String(p||'').replace(/^\.\//,''));
/**
 * Conway-inspired audited self-edit contract. This class never silently writes
 * source. It creates versioned proposals; a sovereign SourceMutationProcess
 * stages changes, verification decides adoption/rollback, and MCP may transport
 * requests across boundaries without becoming the author or writer.
 */
export class SelfEditCoordinator{
  constructor({unit,memory,mutationProcess=null}={}){if(!unit)throw new Error('SelfEditCoordinator requires SynthiaUnit');this.unit=unit;this.memory=memory||unit.memory;this.mutationProcess=mutationProcess||unit.sourceMutation||null;this.log=[];this.sequence=0;this.#load();}
  #load(){try{const s=this.memory?.get?.('self-edit','state')?.value;if(s){this.log=s.log||[];this.sequence=Number(s.sequence||0)}}catch{}}
  propose({target,content,reason,evidence=[]}={}){
    const t=String(target||'').replace(/^\.\//,'');if(!t)throw new TypeError('target required');if(protectedPath(t))return this.#record({status:'rejected',target:t,reason:String(reason||''),evidence,why:'protected organism invariant'});
    const rec=this.#record({status:'proposed',target:t,reason:String(reason||'organism-proposed adaptation'),contentHash:this.#hash(String(content??'')),evidence:clone(evidence),proposal:{tool:'propose_file_change',arguments:{target:t,content:String(content??''),reason:String(reason||'organism-proposed adaptation')}}});
    return rec;
  }

  async stage({id}={}){const rec=this.log.find(x=>x.id===id);if(!rec)return null;if(rec.status!=='proposed')throw new Error('only proposed edits may be staged');if(!this.mutationProcess?.stage)throw new Error('no sovereign mutation process mounted');const target=rec.target;const proposal=rec.proposal?.arguments||{};const staged=await this.mutationProcess.stage({target,operation:'replace',payload:String(proposal.content??''),reason:rec.reason});rec.status='staged';rec.stagedAt=Date.now();rec.stage=clone(staged);this.#persist();return clone(rec);}
  noteVerification({id,ok,details=null}={}){const rec=this.log.find(x=>x.id===id);if(!rec)return null;rec.status=ok?'verified':'rolled-back';rec.verifiedAt=Date.now();rec.details=clone(details);this.#persist();return clone(rec);}
  snapshot(){return {policy:'self-edit by audited proposal; protected invariants immutable; stage through sovereign mutation process; adopt only after verification with rollback',log:this.log.slice(-32).map(({proposal,...x})=>clone(x))};}
  #record(x){const rec={id:`self-edit:${++this.sequence}`,at:Date.now(),...x};this.log.push(rec);if(this.log.length>128)this.log.shift();this.#persist();return clone(rec);}
  #persist(){this.memory?.upsert?.('self-edit','state',{sequence:this.sequence,log:this.log});}
  #hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0');}
}
export default SelfEditCoordinator;
