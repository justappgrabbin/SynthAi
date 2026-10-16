import LawfulGrammarConstructor from './LawfulGrammarConstructor.mjs';
const clone=x=>x==null?x:structuredClone(x);
/**
 * Turns an evidenced gap into a reversible declarative automaton, proves the
 * candidate can observe/transition, then registers it as a non-boss process.
 */
export class SelfConstructionEngine{
  constructor({unit,memory,grammar=new LawfulGrammarConstructor()}={}){if(!unit)throw new Error('SelfConstructionEngine requires SynthiaUnit');this.unit=unit;this.memory=memory||unit.memory;this.grammar=grammar;this.candidates=new Map();this.adopted=new Map();this.#load();}
  #load(){try{for(const x of this.memory?.query?.('self-construction')||[]){const v=x.value||x;if(v?.status==='adopted')this.adopted.set(v.id,v);else if(v?.id)this.candidates.set(v.id,v)}}catch{}}
  propose({need,dimension='Design',question='Why',evidence=[]}={}){const spec=this.grammar.construct({need,dimension,question,evidence});const valid=this.grammar.validate(spec);const rec={...spec,status:valid.ok?'proposed':'rejected',validation:valid,createdAt:Date.now(),tests:[]};this.candidates.set(rec.id,rec);this.#persist(rec);return clone(rec);}
  test(id,{observations=['signal','repeat','changed']}={}){const rec=this.candidates.get(id)||this.adopted.get(id);if(!rec)throw new Error('unknown construction');let state={...rec.state};const trace=[];for(const obs of observations){state.observations++;const prior=state.phase;state.phase=state.observations===1?'observing':state.observations===2?'comparing':'ready';if(state.phase!==prior)state.transitions++;trace.push({obs,prior,next:state.phase});}const pass=state.observations>=3&&state.transitions>=2&&rec.validation.ok;rec.state=state;rec.tests.push({at:Date.now(),pass,trace});rec.status=pass?'tested':'rejected';this.candidates.set(id,rec);this.#persist(rec);return clone(rec.tests.at(-1));}
  adopt(id){const rec=this.candidates.get(id);if(!rec||rec.status!=='tested')throw new Error('candidate must pass its local test before adoption');rec.status='adopted';rec.adoptedAt=Date.now();const process=this.unit.fabric.registerExternalProcess({id:rec.id,kind:'constructed-automaton',role:`${rec.dimension}/${rec.question}`,members:[],origin:{type:'synthia-self-construction',need:rec.need},parents:rec.evidence?.map(x=>x.id||x.source).filter(Boolean)||[]});rec.processId=process.id;this.adopted.set(id,rec);this.candidates.delete(id);this.#persist(rec);return clone(rec);}
  ensureForEpisode(episode){if(!episode)return null;const unresolved=episode.unresolved||[];const gap=episode.coupled?.supportGap?.[0];if(!unresolved.length&&!gap)return null;const question=unresolved[0]||'Why';const dimension=episode.claims?.[question]?.dimension||'Design';const need=gap||`resolve ${question} for ${episode.input}`;const existing=[...this.candidates.values(),...this.adopted.values()].find(x=>x.need===need&&x.dimension===dimension);if(existing)return clone(existing);return this.propose({need,dimension,question,evidence:[{source:'co-development',id:episode.id}]});}
  snapshot(){return {candidates:[...this.candidates.values()].map(clone),adopted:[...this.adopted.values()].map(clone),grammar:this.grammar.snapshot()};}
  #persist(rec){this.memory?.upsert?.('self-construction',rec.id,rec);}
}
export default SelfConstructionEngine;
