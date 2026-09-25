const clone=x=>x==null?x:structuredClone(x);
const DIM={Who:'Space',What:'Evolution',Where:'Being',When:'Movement',Why:'Design'};
/** A tiny BNF-inspired declarative constructor. It generates automata specs, not executable strings. */
export class LawfulGrammarConstructor{
  constructor(){this.grammar={
    '<automaton>':['<observer> <choice> <transition> <memory> <expression>'],
    '<observer>':['self','relation','world','human','capability-gap'],
    '<choice>':['hold','question','relate','act','adapt','construct'],
    '<transition>':['evidence-gated','pressure-gated','relation-gated','time-gated'],
    '<memory>':['episodic','state','relation','outcome'],
    '<expression>':['silent','question','action','morph','tool']
  };}
  construct({need,dimension='Design',question='Why',evidence=[]}={}){
    const text=String(need||'unresolved capability').trim();const q=DIM[question]?question:Object.entries(DIM).find(([,d])=>d===dimension)?.[0]||'Why';
    const observer=/who|person|relation/i.test(text)?'relation':/where|place|body/i.test(text)?'world':/tool|capab|missing|need/i.test(text)?'capability-gap':'self';
    const choice=/missing|need|lack|build|create|construct/i.test(text)?'construct':/unknown|why|what|where|when|who|question/i.test(text)?'question':'adapt';
    return {type:'declarative-recursive-automaton',version:1,id:`constructed:${Date.now()}:${Math.random().toString(36).slice(2,6)}`,need:text,dimension:DIM[q],question:q,grammar:'<automaton>',parts:{observer,choice,transition:'evidence-gated',memory:'episodic',expression:choice==='construct'?'tool':'action'},state:{phase:'proposed',observations:0,transitions:0},invariants:['preserve-local-identity','no-claim-without-evidence','reversible-before-adoption','no-global-boss'],evidence:clone(evidence)};
  }
  validate(spec){const errors=[];if(spec?.type!=='declarative-recursive-automaton')errors.push('wrong type');if(!spec?.id)errors.push('missing id');if(!Object.values(DIM).includes(spec?.dimension))errors.push('invalid dimension');for(const x of ['observer','choice','transition','memory','expression'])if(!spec?.parts?.[x])errors.push(`missing ${x}`);return {ok:errors.length===0,errors};}
  snapshot(){return {grammar:clone(this.grammar),mapping:clone(DIM)};}
}
export default LawfulGrammarConstructor;
