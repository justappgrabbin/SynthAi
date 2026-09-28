import { BookSourceSpan } from './BookSourceSpan.mjs';

const romanValue = value => { const map={I:1,V:5,X:10,L:50,C:100};let total=0,prior=0;for(const char of String(value).toUpperCase().split('').reverse()){const n=map[char]??0;if(n<prior)total-=n;else{total+=n;prior=n;}}return total||null; };
const clean = value => String(value??'').replace(/\s+/g,' ').trim();
const ACTIONS = Object.freeze(['describe','draw','produce','cut off','join','apply','coincide','construct','intersect','bisect','extend','compare','equal']);

export class BookIngestionEngine {
  discover({bookId,title,pages,provenance={}}={}){
    const propositions=[];
    for(const page of pages??[]){
      const text=clean(page.text),header=text.match(/(?:PROPOSITION|PROP\.)\s+([IVXLCDM]+)\.?\s*(?:PROB(?:LEM)?|THEOR(?:EM)?)?/i);if(!header)continue;
      const number=romanValue(header[1]),kind=/THEOR/i.test(text.slice(header.index,header.index+80))?'theorem':'problem';
      const dependencies=[...text.matchAll(/\b(?:pr(?:op)?\.?|post(?:ulate)?\.?|def(?:inition)?\.?|ax(?:iom)?\.?)\s*([0-9ivxlcdm]+)/gi)].map(match=>Object.freeze({kind:/^pr/i.test(match[0])?'proposition':/^post/i.test(match[0])?'postulate':/^def/i.test(match[0])?'definition':'axiom',number:/^\d+$/.test(match[1])?Number(match[1]):romanValue(match[1]),evidence:match[0]})).filter(item=>!(item.kind==='proposition'&&item.number===number));
      const actions=ACTIONS.filter(action=>new RegExp(`\\b${action.replace(' ','\\s+')}\\b`,'i').test(text));
      const visualSymbolLoss=(text.match(/\(\s*\)|—{2,}|\^|©/g)??[]).length;
      const span=new BookSourceSpan({bookId,title,page:page.page,text,visualEvidence:page.visualEvidence??[],provenance:{...provenance,proposition:`Book I.${number}`}});
      propositions.push(Object.freeze({id:`${bookId}:I.${number}`,book:bookId,bookNumber:1,number,kind,goal:this.#goal(text,header.index),actions:Object.freeze(actions),dependencies:Object.freeze(dependencies),gaps:Object.freeze(visualSymbolLoss?['visual-symbol-resolution']:[]),span}));
    }
    return Object.freeze(propositions.sort((a,b)=>a.number-b.number));
  }
  #goal(text,start){const body=text.slice(start).replace(/^(?:PROPOSITION|PROP\.)\s+[IVXLCDM]+\.?\s*(?:PROB(?:LEM)?|THEOR(?:EM)?)?\.?/i,'').trim();return body.split(/(?<=[.!?])\s+/)[0].trim();}
}
