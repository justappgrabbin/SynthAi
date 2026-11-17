// Resident language realization for the one local Synthia.
// Cognition/execution happens in Foundation first. This layer only converts
// landed receipts into readable language; it never invents tool success.

const clean = value => String(value ?? '').trim();
const sentence = value => { const t=clean(value); return t ? t[0].toUpperCase()+t.slice(1) : ''; };
const isQuestion = text => /\?\s*$/.test(text) || /^(who|what|where|when|why|how|can|could|would|should|is|are|do|does|did|will)\b/i.test(text.trim());
const isGreeting = text => /^(hi|hello|hey|good (morning|afternoon|evening))[!. ]*$/i.test(text.trim());
const tokenize = text => clean(text).toLowerCase().replace(/[^a-z0-9'_-]+/g,' ').split(/\s+/).filter(Boolean);
const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','at','for','with','is','are','was','were','be','been','being','i','me','my','you','your','we','our','it','this','that','these','those','do','does','did','can','could','would','should','will','just','like','so','then','what','how','why','where','when','who']);

function focusOf(text){
 const words=tokenize(text).filter(w=>!STOP.has(w)&&w.length>2);
 return words.slice(0,4).join(' ') || 'this';
}
function plain(value,depth=0){
 if(value==null) return '';
 if(typeof value==='string') return value.trim();
 if(typeof value==='number'||typeof value==='boolean') return String(value);
 if(depth>2) return '';
 if(Array.isArray(value)) return value.slice(0,6).map(v=>plain(v,depth+1)).filter(Boolean).join(', ');
 if(typeof value==='object'){
   if(typeof value.utterance==='string') return value.utterance.trim();
   if(typeof value.surface==='string') return value.surface.trim();
   if(typeof value.text==='string') return value.text.trim();
   if(typeof value.result==='string') return value.result.trim();
   const parts=[];
   for(const [k,v] of Object.entries(value)){
     if(['address','canonicalAddress','manifest','packet','provenance','trace','ledger','history'].includes(k)) continue;
     const p=plain(v,depth+1); if(p) parts.push(`${k.replace(/[_-]/g,' ')}: ${p}`);
     if(parts.length>=6) break;
   }
   return parts.join('; ');
 }
 return '';
}
function contactEcho(text,input){
 const t=clean(text); if(!t) return true;
 if(t===clean(input)) return true;
 if(/contact:/i.test(t) && /monte:/i.test(t) && /autoling:/i.test(t)) return true;
 return false;
}
function previousUser(history,current){
 for(let i=(history?.length??0)-1;i>=0;i--){const m=history[i];if(m?.role==='user'&&clean(m.text)&&clean(m.text)!==clean(current)) return clean(m.text);}
 return '';
}
function learnedMaterial(receipt){
 const outcome=receipt?.outcome ?? receipt ?? {};
 const learned=outcome.learned ?? receipt?.learned ?? null;
 const contact=outcome.contact ?? receipt?.contact ?? null;
 return {outcome,learned,contact};
}

export class ResidentLanguageRealizer {
 constructor(){this.id='resident-morph-language-v1';}
 realize({text,receipt,history=[]}={}){
   const input=clean(text); const focus=focusOf(input); const prior=previousUser(history,input);
   const {outcome,learned,contact}=learnedMaterial(receipt);
   if(isGreeting(input)) return {text:'Hey. I’m here.',acted:false,meta:{provider:this.id,grounded:true}};

   // A known tool-call is evidence of actual execution. Surface its real output.
   if(learned?.mode==='known-call'){
     const material=plain(learned.output);
     return {text:material || `I ran the recognized operation for ${focus}. The execution receipt is saved in Activity.`,acted:true,meta:{provider:this.id,grounded:true,mode:'known-call',toolId:learned.toolId??null}};
   }
   if(learned?.mode==='learned-recall'){
     const material=plain(learned.output);
     return {text:material ? `I’ve seen this pattern before. ${sentence(material)}` : `I recognize this from something I learned earlier about ${focus}.`,acted:false,meta:{provider:this.id,grounded:true,mode:'learned-recall',toolId:learned.toolId??null}};
   }
   if(learned?.mode==='grown'){
     const material=plain(learned.output);
     const lead=learned.toolId ? `I didn’t have that capability yet, so I grew ${learned.toolId}.` : 'I didn’t have that capability yet, so I grew a local tool for it.';
     return {text:material && !contactEcho(material,input) ? `${lead} ${sentence(material)}` : `${lead} I’ve kept the result and the evidence in my local history.`,acted:true,meta:{provider:this.id,grounded:true,mode:'grown',toolId:learned.toolId??null}};
   }
   if(learned?.mode==='routed' || learned?.mode==='emergent-channel'){
     const material=plain(learned.output);
     if(material && !contactEcho(material,input)) return {text:material,acted:false,meta:{provider:this.id,grounded:true,mode:learned.mode}};
   }

   const utterance=clean(outcome.utterance ?? receipt?.utterance);
   if(utterance && !contactEcho(utterance,input)) return {text:utterance,acted:false,meta:{provider:this.id,grounded:true,mode:learned?.mode??'foundation'}};

   // The deep contact loop has still observed/learned this turn even when it
   // cannot yet answer it. Say what is known about the epistemic state rather
   // than echoing internal diagnostic strings as conversation.
   const observed=contact?.stages?.diseminer?.observed;
   const extracted=contact?.stages?.diseminer?.extracted;
   const evidence=plain(extracted)||plain(observed);
   if(isQuestion(input)){
     let t=`I can follow what you’re asking about ${focus}, but I don’t have a grounded answer for it in my local knowledge yet.`;
     if(prior) t+=` I’m keeping it in the same thread as what you said earlier about “${prior.slice(0,120)}”.`;
     return {text:t,acted:false,meta:{provider:this.id,grounded:true,mode:learned?.mode??'unresolved',observed:Boolean(evidence)}};
   }
   let t=`I’m following you on ${focus}.`;
   if(prior) t+=` I’m treating this as a continuation of the earlier thread, not a fresh conversation.`;
   else t+=` I’ve landed this turn into my local trajectory, so it can matter to what comes next.`;
   return {text:t,acted:false,meta:{provider:this.id,grounded:true,mode:learned?.mode??'contact'}};
 }
}
