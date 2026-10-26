/**
 * Synthia's small LOCAL conditional sequence learner.
 * This is a real probability model (interpolated conditional token 3-gram);
 * it is NOT a pretrained LLM, transformer, semantic reasoner, or fact verifier.
 *
 * Training is limited to explicit human-provided reply corrections to real
 * prior turns; no arbitrary chat observations train reply targets.
 */
const KEY = 'computer.synthia.language.examples';
const MAX_EXAMPLES = 128;
const TOKENS = str => String(str ?? '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[,.!?;:]/gu) ?? [];
const TERMS = text => [...new Set(TOKENS(text).filter(w => /\p{L}|\p{N}/u.test(w) && w.length > 2).map(w=>w.toLowerCase()))];
const STOP = new Set(['tell','about','the','what','who','how','and','are','for','with','you','can','from','that','this','please','into','your','could','would','should','give','write','show','make','create']);
const topic = text => TERMS(text).filter(x => !STOP.has(x));
const contextId = (a,b) => a + '\u0000' + b;
const similarity = (a,b) => {
  const x=new Set(topic(a)),y=new Set(topic(b));
  if(!x.size||!y.size)return 0;
  let matches=0;for(const word of x)if(y.has(word))matches++;
  return matches/Math.max(x.size,y.size);
};
function hash(text) {
  let n = 2166136261;
  for (const ch of text) n=Math.imul(n^ch.charCodeAt(0),16777619);
  return n>>>0;
}
function random(seed) {
  let state = seed || 0x9e3779b9;
  return () => { state ^= state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296; };
}
const phrase = ts => ts.join(' ').replace(/\s+([,.!?;:])/g,'$1').replace(/([,.!?;:])(?=[\p{L}\p{N}])/gu,'$1 ');
function validText(text,min,max) { return typeof text==='string' && text.trim().length>=min && text.length<=max; }

export class LocalSequenceLearner {
  constructor(state) {
    if (!state || typeof state.get !== 'function' || typeof state.set !== 'function')
      throw new TypeError('Computer StateStore is required.');
    this.state=state;
  }
  examples() { return this.state.get(KEY,[]); }
  status() {
    return { model:'local-interpolated-trigram', trainedExamples:this.examples().length,
      llm:false, pretrained:false, trainingSource:'explicit-in-app-reply-corrections',
      factualVerification:false };
  }
  async teach({ turnId, answer }={}) {
    if (typeof turnId!=='string' || !/^[\w-]{8,100}$/.test(turnId))
      throw new TypeError('Existing Computer chat turn ID required.');
    if (!validText(answer,4,1600)) throw new TypeError('Correction must be 4–1600 characters.');
    const history=this.state.get('computer.chat.history',[]);
    const turn=history.find(x=>x.id===turnId);
    if (!turn || !validText(turn.input,1,12000))
      throw new TypeError('Cannot train without an existing chat turn.');
    const examples=this.examples().filter(x=>x.turnId!==turnId);
    const next=[...examples,{turnId,query:turn.input,answer:answer.trim(),source:'explicit-correction',at:new Date().toISOString()}].slice(-MAX_EXAMPLES);
    await this.state.set(KEY,next,{source:'synthia-explicit-language-correction'});
    return {accepted:true,model:this.status()};
  }

  infer(input) {
    if(!validText(input,1,12000))return null;
    const examples=this.examples();
    const hits=examples.map(ex=>({ex,score:similarity(input,ex.query)}))
      .filter(x=>x.score>=0.55).sort((a,b)=>b.score-a.score).slice(0,4);
    if(!hits.length)return null;

    // Induce sentence distributions from accepted corrections, not authored
    // response templates. Weighted starts and token transitions are learned
    // anew from actual sample strings each request (bounded to 4 samples).
    const table=new Map();
    function learn(context,next,weight) {
      if(!table.has(context))table.set(context,new Map());
      const counts=table.get(context);counts.set(next,(counts.get(next)??0)+weight);
    }
    for(const {ex,score} of hits) {
      const words=TOKENS(ex.answer).slice(0,180);
      const sequence=['<START>','<START>',...words,'<END>'];
      const weight=Math.max(0.001,score**3);
      for(let i=2;i<sequence.length;i++){
        learn(contextId(sequence[i-2],sequence[i-1]),sequence[i],weight);
        learn(contextId('*',sequence[i-1]),sequence[i],weight*0.04);
      }
    }

    const rand=random(hash(input+'|'+hits.map(x=>x.ex.turnId).join('|')));
    const output=[];
    let p='<START>', q='<START>';
    for(let i=0;i<100;i++){
      const options=table.get(contextId(p,q)) ?? table.get(contextId('*',q));
      if(!options)break;
      const candidates=[...options].filter(([token])=>token!=='<END>'||i>=3);
      if(!candidates.length)break;
      let total=0;for(const [,w] of candidates)total+=w;
      let cursor=rand()*total, chosen=candidates.at(-1)[0];
      for(const [token,w] of candidates){cursor-=w;if(cursor<=0){chosen=token;break;}}
      if(chosen==='<END>')break;
      output.push(chosen);p=q;q=chosen;
    }
    const text=phrase(output).trim();
    if(!validText(text,4,1600))return null;
    return {
      text, provider:'computer:local-sequence-learner',
      kind:'human-trained-sequence', llm:false, verified:false,
      evidence:hits.map(x=>({type:'human-correction',turnId:x.ex.turnId,score:x.score,verified:false})),
      confidence:hits[0].score, trainedExamples:examples.length,
    };
  }
}
export default LocalSequenceLearner;
