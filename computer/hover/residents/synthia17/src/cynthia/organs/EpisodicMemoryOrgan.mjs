const words = s => new Set(String(s??'').toLowerCase().match(/[a-z0-9']{3,}/g)??[]);
const score = (a,b) => { let n=0; for(const x of a) if(b.has(x)) n++; return n/Math.max(1,new Set([...a,...b]).size); };
export class EpisodicMemoryOrgan {
  constructor({ store }={}) { this.store=store; this.episodes=[]; }
  remember(episode) { const record=Object.freeze({ id:episode.id, input:String(episode.input??''), fields:structuredClone(episode.fields??{}), outcome:structuredClone(episode.outcome??null) }); this.episodes.push(record); this.store?.append?.('episodes',record); return record; }
  recall(input,{limit=8}={}) { const target=words(input); return this.episodes.map(e=>({episode:e,similarity:score(target,words(e.input))})).filter(x=>x.similarity>0).sort((a,b)=>b.similarity-a.similarity).slice(0,limit); }
  snapshot() { return Object.freeze({ episodes:structuredClone(this.episodes) }); }
  restore(snapshot) { this.episodes=(snapshot.episodes??[]).map(record=>Object.freeze(structuredClone(record)));return this; }
}
