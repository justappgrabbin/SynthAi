const clone=x=>structuredClone(x);
const unique=a=>[...new Set((a||[]).map(String).filter(Boolean))];
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')};

export const RULE_SOURCES=Object.freeze({
  Movement:{source:'Bradford Hatcher — Yijing, Word By Word',role:'morphology, syntax, legal transformation and self-rectification'},
  Evolution:{source:'Hua-Ching Ni — The Book of Changes and the Unchanging Truth',role:'cyclic development, phase, balance, renewal and resource-aware timing'},
  Being:{source:'Ra Uru Hu — The Human Design System (Black Book)',role:'integrated anatomy, capability, definition, receptivity and whole-body coherence'},
  Design:{source:'The Gnostic Book of Changes',role:'formative purpose, differentiation, integration and directed transformation'},
  Space:{source:'Lama Anagarika Govinda — The Inner Structure of the I Ching',role:'who, relation, perspective, encounter and the subjective field formed between distinct objectivities'}
});

export class FiveDimensionalRuleCouncil{
  constructor({unit}={}){if(!unit)throw new Error('unit required');this.unit=unit;this.events=[];}
  evaluateGrowth({need,capabilities,context}={}){
    const caps=unique(capabilities);
    const address=context?.inputValues?.canonicalAddress||null;
    const tools=this.unit.runtime.getRegisteredTools();
    const metabolism=this.unit.metabolism.snapshot();
    const existing=caps.filter(c=>tools.some(t=>t.provides?.includes(c)));
    const movement={dimension:'Movement',pass:Boolean(need?.actionable&&need?.kind==='capability-gap'&&caps.length),state:'differentiate',rules:['change must answer an actual discrepancy','transformation must be bounded and traceable'],evidence:{needId:need?.id,kind:need?.kind,pressure:need?.pressure,capabilities:caps}};
    const evolution={dimension:'Evolution',pass:Boolean(metabolism.adaptationBudget>=.25&&metabolism.totalReplenished>=.25&&metabolism.repairPressure>.15),state:metabolism.repairPressure>.15?'pressure-to-renewal':'hold',rules:['capacity must precede expenditure','growth follows accumulated pressure rather than clock time'],evidence:{adaptationBudget:metabolism.adaptationBudget,totalReplenished:metabolism.totalReplenished,repairPressure:metabolism.repairPressure,budgetSource:'verified external success evidence'}};
    const being={dimension:'Being',pass:Boolean(caps.length&&existing.length===0&&tools.length>0&&address&&Number.isFinite(Number(address.gate))&&Number.isFinite(Number(address.line))&&Number.isFinite(Number(address.color))&&Number.isFinite(Number(address.tone))&&Number.isFinite(Number(address.base))),state:'situated-capability-gap',rules:['new anatomy must add a missing function','the whole body remains the integration field','where/residence belongs to Being rather than Space'],evidence:{currentToolCount:tools.length,existingCapabilities:existing,requiredCapabilities:caps,canonicalAddress:clone(address)}};
    const design={dimension:'Design',pass:Boolean(caps.length&&need?.reason&&context?.expression?.constraints?.includes('bounded-growth')),state:'differentiate-to-integrate',rules:['form follows the unresolved function','differentiation must return to integration'],evidence:{purpose:need?.reason,capabilities:caps,constraints:context?.expression?.constraints||[]}};
    const participants=unique([this.unit.runtimeHandle||'@self',need?.subject,...caps]);const space={dimension:'Space',pass:Boolean(participants.length>=2),state:'subjective-relation-field',rules:['Space answers who, not where','a relation may emerge when distinct objectivities encounter one another','the relation does not erase either participant','elemental identity remains with each participant','rendering devices do not own relational meaning'],evidence:{participants,relationKind:'social-subjectivity',objectivities:participants.map(id=>({id,element:null}))}};
    const dimensions={Movement:movement,Evolution:evolution,Being:being,Design:design,Space:space};
    const permit=Object.values(dimensions).every(x=>x.pass===true);
    const resolution={type:'five-dimensional-rule-resolution',permit,needId:need?.id||null,capabilities:caps,dimensions,sources:RULE_SOURCES,at:Date.now()};
    resolution.ruleHash=hash(JSON.stringify({permit,caps,address,dimensions:Object.fromEntries(Object.entries(dimensions).map(([k,v])=>[k,{pass:v.pass,state:v.state,evidence:v.evidence}]))}));
    this.events.push(clone(resolution));return resolution;
  }

  evaluateMorph({intent,address,form,route,parentId}={}){
    const text=String(intent||'').trim();const canonical=address||null;const r=unique(route);const targetForm=String(form||'morph');
    const movement={dimension:'Movement',pass:Boolean(text),state:'intent-to-transition',rules:['expressed intent may initiate a bounded transformation','the transformation must remain traceable to its initiating intent'],evidence:{intent:text,route:r}};
    const evolution={dimension:'Evolution',pass:Boolean(text),state:'new-cycle',rules:['a new developmental cycle requires an initiating condition','continuance is regenerated from retained structure rather than copied transient state'],evidence:{trigger:'verified user intent',phase:'generation'}};
    const being={dimension:'Being',pass:Boolean(parentId&&targetForm&&canonical&&Number.isFinite(Number(canonical.gate))),state:'situated-differentiated-being',rules:['Being answers where / situated condition','a spawned form receives identity and its own lifecycle','offspring remains related to but distinct from its parent'],evidence:{parentId,targetForm,canonicalAddress:clone(canonical)}};
    const design={dimension:'Design',pass:Boolean(targetForm&&r.length),state:'form-from-purpose',rules:['form follows expressed purpose','differentiation must remain capable of integration'],evidence:{targetForm,route:r,purpose:text}};
    const space={dimension:'Space',pass:Boolean(parentId),state:'subjective-relation-field',rules:['Space answers who, not where','preserve the parent/offspring relation without collapsing either identity','the shared field is relational; each participant remains objective on its own terms'],evidence:{participants:[parentId,'offspring'],relationKind:'parent-offspring',objectivities:[{id:parentId,element:null},{id:'offspring',element:null}]}};
    const dimensions={Movement:movement,Evolution:evolution,Being:being,Design:design,Space:space};const permit=Object.values(dimensions).every(x=>x.pass===true);
    const resolution={type:'five-dimensional-morph-resolution',permit,intent:text,targetForm,route:r,dimensions,sources:RULE_SOURCES,at:Date.now()};
    resolution.ruleHash=hash(JSON.stringify({permit,intent:text,targetForm,route:r,address:canonical,dimensions:Object.fromEntries(Object.entries(dimensions).map(([k,v])=>[k,{pass:v.pass,state:v.state,evidence:v.evidence}]))}));this.events.push(clone(resolution));return resolution;
  }
  validateCandidate({candidate,capabilities,resolution}={}){
    const caps=unique(capabilities),provided=unique(candidate?.provides);
    const checks={Movement:Boolean(candidate&&typeof candidate.execute==='function'),Evolution:Boolean(resolution?.dimensions?.Evolution?.pass),Being:caps.every(c=>provided.includes(c)),Design:Boolean(candidate&&typeof candidate.materialize==='function'),Space:Boolean(resolution?.dimensions?.Space?.pass)};
    return {type:'five-dimensional-candidate-validation',pass:Object.values(checks).every(Boolean),checks,toolId:candidate?.toolId||null,ruleHash:resolution?.ruleHash||null,at:Date.now()};
  }
  snapshot(){return {sources:RULE_SOURCES,events:this.events.slice(-64).map(clone)};}
}
export default FiveDimensionalRuleCouncil;
