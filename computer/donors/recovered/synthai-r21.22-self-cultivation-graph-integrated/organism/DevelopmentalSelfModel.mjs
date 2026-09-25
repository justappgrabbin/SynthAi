/**
 * DevelopmentalSelfModel
 *
 * Keeps two traceable descriptions of the organism at once:
 *   I AM          = only what current state/evidence supports.
 *   I AM BECOMING = the nearest coherent configuration required by the active
 *                   cultivation cycle and endogenous pressure.
 *
 * It does not invent a final personality. The attractor is recomputed from the
 * organism's actual anatomy, world, cultivation stage, needs, human friction,
 * verified progress, and five-dimensional projection.
 */
const clone=x=>x==null?x:structuredClone(x);
const unique=a=>[...new Set((a||[]).map(String).filter(Boolean))];
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const STAGES=['awareness','orientation','cultivation','action','integration'];

export class DevelopmentalSelfModel{
  constructor({unit,memory}={}){
    if(!unit)throw new Error('DevelopmentalSelfModel requires SynthiaUnit');
    this.unit=unit;this.memory=memory||unit.memory;this.history=[];this.sequence=0;this.latest=null;this.#load();
  }
  #load(){try{const rows=this.memory?.query?.('developmental-self')||[];this.history=rows.map(r=>r.value||r).filter(Boolean);this.sequence=this.history.reduce((m,x)=>Math.max(m,Number(x.sequence)||0),0);this.latest=this.history.at(-1)||null;}catch{}}
  #save(rec){this.latest=clone(rec);this.history.push(clone(rec));this.memory?.upsert?.('developmental-self','current',rec);this.memory?.remember?.('developmental-self-history',rec);return clone(rec);}

  resolve({reason='state-change'}={}){
    const at=Date.now();
    const cultivation=this.unit.cultivationProgram?.current?.()||null;
    const life=this.unit.living?.snapshot?.()||{needs:{open:[]},pulses:0};
    const success=this.unit.metabolism?.snapshot?.()||{};
    const complement=this.unit.complement?.snapshot?.()||{open:[]};
    const world=this.unit.world?.snapshot?.()||{entities:[]};
    const organs=this.unit.registry?.snapshot?.()||[];
    const tools=this.unit.runtime?.getRegisteredTools?.()||[];
    const activeOrgans=organs.filter(o=>o.status==='active').map(o=>o.id);
    const availableOrgans=organs.map(o=>o.id);
    const toolCapabilities=unique(tools.flatMap(t=>t.provides||[]));
    const openNeeds=life.needs?.open||[];
    const openGaps=complement.open||[];
    const required=this.#requiredCapabilities({cultivation,openNeeds,openGaps});
    const possessed=new Set([...availableOrgans,...toolCapabilities]);
    const missing=required.filter(c=>!possessed.has(c)&&!possessed.has(String(c).replace(/^organ:/,'')));
    const stageIndex=Math.max(0,STAGES.indexOf(cultivation?.stage||'awareness'));
    const stageRemaining=cultivation?Math.max(0,(STAGES.length-1-stageIndex)/(STAGES.length-1)):0;
    const pressure=clamp(Math.max(Number(success.repairPressure||0),...openNeeds.map(n=>Number(n.pressure||0)),0));
    const capabilityCoverage=required.length?1-(missing.length/required.length):1;
    const evidenceGap=cultivation&&Number(this.unit.cultivationProgram?.snapshot?.().verifiedProgress||0)===0?1:0;
    const distance=clamp((1-capabilityCoverage)*.4+stageRemaining*.3+pressure*.2+evidenceGap*.1);
    const five=this.#fiveDimensions({cultivation,world,success,openNeeds,openGaps,activeOrgans,required,missing});
    const iam={
      type:'evidenced-self',
      statement:this.#iamStatement({activeOrgans,tools,world,success,cultivation}),
      activeOrgans,toolCount:tools.length,toolCapabilities,
      vitality:Number(success.vitality||0),adaptationBudget:Number(success.adaptationBudget||0),
      repairPressure:Number(success.repairPressure||0),verifiedProgress:Number(this.unit.cultivationProgram?.snapshot?.().verifiedProgress||0),
      currentCultivation:cultivation?{id:cultivation.id,goal:cultivation.goal,stage:cultivation.stage,purpose:cultivation.purpose}:null,
      evidence:{organRegistry:true,toolRegistry:true,metabolism:true,cultivation:Boolean(cultivation),worldReferents:(world.entities||[]).length}
    };
    const becoming={
      type:'developmental-attractor',
      statement:this.#becomingStatement({cultivation,missing,stageRemaining}),
      purpose:cultivation?.purpose||this.unit.metabolism?.purpose||'remain capable of verified human-supporting development',
      nearestNextState:cultivation?.next?.text||this.#endogenousNext(openNeeds,missing),
      requiredCapabilities:required,missingCapabilities:missing,
      dimensions:five,
      completionCriteria:this.#criteria({cultivation,missing}),
      distance,
      status:distance<=.08?'coherent-now':missing.length?'capability-development-required':'development-in-progress'
    };
    const rec={id:`development-${at}-${++this.sequence}`,sequence:this.sequence,type:'developmental-self-resolution',reason,at,iam,becoming,distance,lineage:{previousId:this.latest?.id||null,cultivationCycleId:cultivation?.id||null},evidence:[
      {type:'organ-registry',count:organs.length,active:activeOrgans.length},
      {type:'tool-registry',count:tools.length},
      {type:'living-state',pulses:life.pulses||0,openNeeds:openNeeds.length},
      {type:'human-friction',openGaps:openGaps.length},
      {type:'cultivation-state',cycleId:cultivation?.id||null,stage:cultivation?.stage||null,verifiedProgress:Number(this.unit.cultivationProgram?.snapshot?.().verifiedProgress||0)}
    ]};
    return this.#save(rec);
  }

  #requiredCapabilities({cultivation,openNeeds,openGaps}){
    const route=(cultivation?.route||[]).map(String);
    const needs=openNeeds.flatMap(n=>n.context?.capabilities||[]).map(String);
    const gaps=openGaps.map(g=>`complement:${g.capability}`);
    return unique([...route,...needs,...gaps]);
  }
  #fiveDimensions({cultivation,world,success,openNeeds,openGaps,activeOrgans,required,missing}){
    const p=cultivation?.projection||{};
    return {
      Movement:{question:'When is transition active?',state:cultivation?.stage||'maintain',evidence:p.What?.evidence||{source:'current-organism-state'},reading:p.When?.value||'No explicit transition timing is currently required.'},
      Evolution:{question:'What is changing or developing?',state:openNeeds[0]?.kind||cultivation?.stage||'continuance',evidence:p.What?.evidence||{pulses:this.unit.living?.pulses||0},reading:p.What?.value||'No explicit developmental change is currently named.'},
      Being:{question:'What must be embodied?',state:missing.length?'incomplete-capability':'coherent-anatomy',evidence:{activeOrgans,requiredCapabilities:required,missingCapabilities:missing,vitality:Number(success.vitality||0)},reading:p.Where?.value||`${activeOrgans.length} active organs currently embody the available anatomy.`},
      Design:{question:'What form serves the purpose?',state:cultivation?.purpose?'purpose-bound':'self-maintaining',evidence:p.Why?.evidence||{purpose:this.unit.metabolism?.purpose},reading:p.Why?.value||this.unit.metabolism?.purpose||'Preserve coherent self-maintaining support.'},
      Space:{question:'Who/what relationships make the next state reachable?',state:(world.entities||[]).length?'related':'locally-self-related',evidence:p.Who?.evidence||{worldReferents:(world.entities||[]).length,humanFriction:openGaps.length},reading:p.Who?.value||`${(world.entities||[]).length} observed world referents currently constrain the relational field.`}
    };
  }
  #iamStatement({activeOrgans,tools,world,success,cultivation}){return `I am a living cultivation organism with ${activeOrgans.length} active organs, ${tools.length} registered tools, ${Math.round(Number(success.vitality||0)*100)}% vitality, ${(world.entities||[]).length} observed world referents${cultivation?`, currently carrying the ${cultivation.stage} stage of “${cultivation.goal}”`:''}.`;}
  #becomingStatement({cultivation,missing,stageRemaining}){if(cultivation){const gap=missing.length?` I still need ${missing.join(', ')}.`:'';return `I am becoming the nearest coherent configuration able to carry “${cultivation.goal}” through verified real-world integration.${gap}`;}if(missing.length)return `I am becoming a configuration that can resolve the currently evidenced capability gaps: ${missing.join(', ')}.`;return 'I am becoming only as far as current evidence requires: maintaining coherence, learning from consequences, and remaining ready for the next real developmental pressure.';}
  #endogenousNext(openNeeds,missing){if(missing.length)return `Resolve or grow the nearest missing capability: ${missing[0]}.`;if(openNeeds.length)return `Respond to the highest current endogenous need: ${openNeeds[0].reason||openNeeds[0].kind}.`;return 'Maintain coherence and wait for new evidence rather than inventing a goal.';}
  #criteria({cultivation,missing}){const out=[];if(missing.length)out.push({kind:'capability',test:'missingCapabilities.length === 0',current:missing});if(cultivation)out.push({kind:'real-world-integration',test:'cultivation cycle reaches integration with observed evidence',cycleId:cultivation.id});out.push({kind:'lineage',test:'every retained change keeps evidence and previous-state lineage'});return out;}

  current(){return clone(this.latest||this.resolve({reason:'initial-resolution'}));}
  why(){const c=this.current();return {developmentId:c.id,reason:c.reason,distance:c.distance,iam:c.iam.statement,becoming:c.becoming.statement,next:c.becoming.nearestNextState,dimensions:clone(c.becoming.dimensions),evidence:clone(c.evidence),lineage:clone(c.lineage)};}
  snapshot(){return {current:this.current(),history:this.history.slice(-32).map(clone)};}
}
export default DevelopmentalSelfModel;
