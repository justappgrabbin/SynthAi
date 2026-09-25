export const INTERROGATIVE_PROJECTION=Object.freeze({Who:'Space',What:'Evolution',Where:'Being',When:'Movement',Why:'Design'});
const clean=s=>String(s??'').trim();
const toks=s=>clean(s).match(/[A-Za-z][A-Za-z'’-]*/g)||[];
const capWords=s=>toks(s).filter(w=>/^[A-Z]/.test(w)&&!/^(I|The|This|That|Please|Stop)$/i.test(w));

/** Lightweight gap detector. It does not invent missing facts. It turns missing
 * 5W structure into a question generated from the facts actually present. */
export class InterrogativeField{
  resolve({goal='',context='',purpose='',human='user'}={}){
    const text=clean([goal,context].filter(Boolean).join(' '));
    const lower=text.toLowerCase();
    const names=[...new Set(capWords(text))];
    const firstPerson=/\b(i|me|my|mine|we|our|ours)\b/i.test(text);
    const participants=[...names,...(firstPerson?[human]:[])];
    const who=participants.length?[...new Set(participants)].join(' + '):human;
    const what=clean(goal)||null;
    const whereMatch=text.match(/\b(?:in|on|at|inside|outside|near|around)\s+(?:my|the|our|his|her|their)?\s*([a-z][a-z -]{1,35})/i);
    const whenMatch=text.match(/\b(now|today|tonight|tomorrow|yesterday|again|always|often|sometimes|every\s+\w+|when\s+[^,.!?]+)/i);
    const whyMatch=text.match(/\b(?:because|so that|in order to|since)\s+([^,.!?]+)/i);
    const where=whereMatch?.[1]?.trim()||null;
    const when=whenMatch?.[0]?.trim()||null;
    const why=clean(purpose)||whyMatch?.[1]?.trim()||null;
    const fields={
      Who:{dimension:'Space',value:who,known:Boolean(participants.length)},
      What:{dimension:'Evolution',value:what,known:Boolean(what)},
      Where:{dimension:'Being',value:where,known:Boolean(where)},
      When:{dimension:'Movement',value:when,known:Boolean(when)},
      Why:{dimension:'Design',value:why,known:Boolean(why)}
    };
    const missing=Object.entries(fields).filter(([,v])=>!v.known).map(([k])=>k);
    const focus=this.#focus(text);
    return {text,fields,missing,question:this.#question({missing,fields,focus,lower}),focus};
  }

  #focus(text){
    const words=toks(text).filter(w=>w.length>3&&!/^(this|that|with|from|have|need|want|stop|please|because|would|could|should|your|their|about)$/i.test(w));
    return words.slice(-3).join(' ')||'this';
  }

  #question({missing,fields,focus}){
    const first=['Why','Who','What','Where','When'].find(k=>missing.includes(k));
    if(!first)return `What changed after ${focus}?`;
    if(first==='Why')return `Why did you bring up ${focus}—what about it matters, or what do you want to be different?`;
    if(first==='When')return `When does ${focus} happen, and what tends to happen immediately before or after it?`;
    if(first==='Where')return `Where is ${focus} happening—in the body, environment, relationship, or another specific place?`;
    if(first==='Who')return `Who is involved with ${focus}, including whoever is acting and whoever is affected?`;
    return `What exactly is happening with ${focus}?`;
  }
}
export default InterrogativeField;
