const clone=x=>x==null?x:structuredClone(x);
const TOK=s=>new Set(String(s??'').toLowerCase().match(/[a-z0-9']{3,}/g)||[]);
const jaccard=(a,b)=>{if(!a.size&&!b.size)return 0;let i=0;for(const x of a)if(b.has(x))i++;return i/(a.size+b.size-i||1)};
const FIELDS=['Who','What','Where','When','Why'];

/**
 * Generative episodic memory. Stores sparse traces, then proposes semantic
 * completion from similar prior traces without rewriting inference as fact.
 * Inspired by the generative-memory principle in Fayyaz et al. (2022), not a
 * copy of their neural architecture.
 */
export class GenerativeEpisodicMemory{
  constructor({memory,maxEpisodes=256}={}){this.memory=memory;this.maxEpisodes=maxEpisodes;this.episodes=[];this.#load();}
  #load(){try{this.episodes=(this.memory?.query?.('generative-episodes')||[]).map(x=>x.value||x).filter(Boolean).slice(-this.maxEpisodes)}catch{}}
  remember(episode={}){
    const fields=Object.fromEntries(FIELDS.map(k=>[k,episode.claims?.[k]?.value??episode.fields?.[k]??null]));
    const rec={id:episode.id||`episode:${Date.now()}:${Math.random().toString(36).slice(2,7)}`,at:episode.at||Date.now(),input:String(episode.input||''),fields,outcome:clone(episode.outcome||null),status:episode.outcome?.status||'observed'};
    this.episodes.push(rec);if(this.episodes.length>this.maxEpisodes)this.episodes.shift();this.memory?.remember?.('generative-episodes',rec);return clone(rec);
  }
  complete({input='',claims={}}={}){
    const target=TOK(input);const ranked=this.episodes.map(e=>({e,score:jaccard(target,TOK(e.input))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
    const completion={};
    for(const k of FIELDS){
      const current=claims?.[k];if(current?.status==='known'||current?.value!=null){completion[k]={status:'known',value:current.value,confidence:1,evidence:[{source:'current-input'}]};continue;}
      const votes=new Map();for(const {e,score} of ranked){const v=e.fields?.[k];if(v==null)continue;const key=JSON.stringify(v),prior=votes.get(key)||{value:v,weight:0,evidence:[]};prior.weight+=score;prior.evidence.push({episodeId:e.id,similarity:score});votes.set(key,prior);}
      const best=[...votes.values()].sort((a,b)=>b.weight-a.weight)[0];
      completion[k]=best?{status:'inferred',value:best.value,confidence:Math.min(.89,best.weight/Math.max(1,ranked.length)),evidence:best.evidence.slice(0,4)}:{status:'unresolved',value:null,confidence:0,evidence:[]};
    }
    return {type:'semantic-completion',input:String(input),completion,neighbors:ranked.map(x=>({episodeId:x.e.id,similarity:x.score})),rule:'inference may propose context; only current evidence can promote it to known'};
  }
  snapshot(){return {episodes:this.episodes.slice(-32).map(clone),count:this.episodes.length};}
}
export default GenerativeEpisodicMemory;
