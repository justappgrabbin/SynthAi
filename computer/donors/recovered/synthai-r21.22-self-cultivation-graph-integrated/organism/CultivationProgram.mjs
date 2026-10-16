/**
 * CultivationProgram
 * User-facing assembly of the existing organism into a real cultivation cycle.
 *
 * Canonical interrogative projection (from the supplied phase_space_engine.js):
 *   Who   -> Space
 *   What  -> Evolution
 *   Where -> Being
 *   When  -> Movement
 *   Why   -> Design
 *
 * How is not introduced as a sixth dimension. It is the executable integration
 * path produced by composing the five dimensions through the organism's
 * existing organs, process fabric, outcome ledger, and LivingLoop.
 */
import InterrogativeField,{INTERROGATIVE_PROJECTION} from './InterrogativeField.mjs';
export {INTERROGATIVE_PROJECTION};

const clone=x=>x==null?x:structuredClone(x);
const safe=s=>String(s??'').trim();
const words=s=>safe(s).toLowerCase();



const STAGES=Object.freeze([
  'awareness',
  'orientation',
  'cultivation',
  'action',
  'integration'
]);

export class CultivationProgram{
  constructor({unit,memory}={}){
    if(!unit)throw new Error('CultivationProgram requires SynthiaUnit');
    this.unit=unit;
    this.memory=memory||unit.memory;this.interrogatives=new InterrogativeField();
    this.cycles=[];
    this.seq=0;
    this.progress=0;
    this.#load();
    if(!this.unit.metabolism.progress('cultivation-progress')){
      this.unit.defineSuccessIndicator({id:'cultivation-progress',name:'Verified real-world cultivation progress',direction:'increase',weight:1});
    }
  }

  #load(){
    try{
      const rows=this.memory?.query?.('cultivation-cycles')||[];
      this.cycles=rows.map(r=>r.value||r).filter(Boolean);
      this.seq=this.cycles.reduce((m,r)=>Math.max(m,Number(r.sequence)||0),0);
      this.progress=Number(this.memory?.get?.('cultivation-state','progress')?.value?.value||0);
    }catch{}
  }

  #save(cycle){this.memory?.upsert?.('cultivation-cycles',cycle.id,cycle);return clone(cycle);}
  #saveProgress(){this.memory?.upsert?.('cultivation-state','progress',{value:this.progress,updatedAt:Date.now()});}

  create({goal,context='',purpose=null,human='user'}={}){
    const text=safe(goal);if(!text)throw new TypeError('goal required');
    const now=Date.now();
    const state=this.#state();
    const route=this.#route(text,context);
    const inquiry=this.interrogatives.resolve({goal:text,context,purpose,human});
    const cycle={
      id:`cultivation-${now}-${++this.seq}`,
      sequence:this.seq,
      type:'cultivation-cycle',
      human,
      goal:text,
      context:safe(context),
      purpose:safe(purpose)||this.unit.metabolism.purpose||text,
      projection:this.#project({goal:text,context,purpose,state,inquiry}),
      inquiry,
      how:this.#how({goal:text,context,route,state}),
      stage:'awareness',
      stageIndex:0,
      status:'active',
      route,
      humanDesign:this.#humanDesignPath(text),
      attempts:[],
      evidence:[],
      createdAt:now,
      updatedAt:now
    };
    cycle.next=this.#next(cycle);
    this.cycles.push(cycle);this.#save(cycle);this.unit.development?.resolve({reason:'cultivation-cycle-created'});
    this.unit.outcomes.record({kind:'cultivation-cycle-opened',human,purpose:cycle.purpose,action:{goal:text,route},evidence:{source:'explicit-user-intent'},status:'open',context:{cycleId:cycle.id,projection:cycle.projection}});
    return clone(cycle);
  }

  current(){return clone([...this.cycles].reverse().find(c=>c.status==='active')||null);}
  recent(n=20){return this.cycles.slice(-n).reverse().map(clone);}
  get(id){return clone(this.cycles.find(c=>c.id===id)||null);}

  async act(id,{knowledgeContext=[]}={}){
    const cycle=this.#find(id);if(cycle.status!=='active')throw new Error('cycle is not active');
    const instruction=this.#actionIntent(cycle);
    const started=Date.now();
    const result=await this.unit.ask(instruction,{knowledgeContext});
    const attempt={id:`attempt-${cycle.id}-${cycle.attempts.length+1}`,stage:cycle.stage,instruction,result:clone(this.#compactResult(result)),startedAt:started,completedAt:Date.now(),status:'executed'};
    cycle.attempts.push(attempt);cycle.updatedAt=Date.now();
    cycle.lastResult=attempt;
    cycle.next={kind:'observe',text:'What happened in the real world after this move?'};
    this.#save(cycle);
    return {cycle:clone(cycle),result};
  }

  observe(id,{worked,actualOutcome='',evidence=null,friction=null}={}){
    const cycle=this.#find(id);if(cycle.status!=='active')throw new Error('cycle is not active');
    const ok=Boolean(worked);const ev=evidence&&typeof evidence==='object'?evidence:{source:'user-observation',statement:safe(actualOutcome)||String(ok)};
    cycle.evidence.push({at:Date.now(),stage:cycle.stage,worked:ok,actualOutcome:safe(actualOutcome),evidence:clone(ev)});
    if(ok){
      this.progress+=1;this.#saveProgress();
      this.unit.recordUserSuccess('cultivation-progress',this.progress,{evidence:ev,source:'user',human:cycle.human,purpose:cycle.purpose,context:{cycleId:cycle.id,stage:cycle.stage,goal:cycle.goal}});
      if(cycle.stageIndex<STAGES.length-1){cycle.stageIndex++;cycle.stage=STAGES[cycle.stageIndex];}
      else{cycle.status='integrated';cycle.integratedAt=Date.now();}
    }else{
      const capability=this.#capabilityFor(cycle);
      this.unit.observeHumanFriction({human:cycle.human,capability,friction:safe(friction)||safe(actualOutcome)||`The ${cycle.stage} move did not produce the intended outcome`,evidence:ev,persistence:this.#failurePersistence(cycle,capability),purpose:cycle.purpose,context:{cycleId:cycle.id,stage:cycle.stage,goal:cycle.goal},dimension:this.#dimensionNumber(cycle.stage)});
    }
    cycle.updatedAt=Date.now();cycle.next=this.#next(cycle);this.#save(cycle);this.unit.development?.resolve({reason:ok?'verified-cultivation-progress':'observed-cultivation-friction'});
    this.unit.outcomes.record({kind:ok?'cultivation-progress':'cultivation-friction',human:cycle.human,purpose:cycle.purpose,action:{stage:cycle.stage,goal:cycle.goal},actualOutcome:safe(actualOutcome)||null,evidence:ev,status:ok?'supported':'observed',context:{cycleId:cycle.id}});
    return clone(cycle);
  }

  integrate(id,{summary='',evidence=null}={}){
    const cycle=this.#find(id);cycle.status='integrated';cycle.stage='integration';cycle.stageIndex=STAGES.length-1;cycle.integration={summary:safe(summary),evidence:clone(evidence),at:Date.now()};cycle.updatedAt=Date.now();cycle.next=null;this.#save(cycle);
    this.unit.development?.resolve({reason:'cultivation-cycle-integrated'});
    this.unit.outcomes.record({kind:'cultivation-integrated',human:cycle.human,purpose:cycle.purpose,actualOutcome:{summary:safe(summary),goal:cycle.goal},evidence:evidence||{source:'user-integration'},status:'integrated',context:{cycleId:cycle.id,projection:cycle.projection}});
    return clone(cycle);
  }

  snapshot(){return {projection:INTERROGATIVE_PROJECTION,stages:[...STAGES],current:this.current(),recent:this.recent(12),verifiedProgress:this.progress};}

  #find(id){const c=this.cycles.find(x=>x.id===id);if(!c)throw new Error(`unknown cultivation cycle ${id}`);return c;}
  #state(){const life=this.unit.lifeSnapshot(),success=this.unit.successSnapshot();return {life,success,world:this.unit.world.snapshot(),economy:this.unit.economy.snapshot(),cycles:this.unit.cycles,mode:this.unit.mode};}
  #humanDesignPath(goal){try{return this.unit.humanDesign?.profile?.()?this.unit.humanDesign.path(undefined,goal):null}catch{return null}}

  #project({goal,context,purpose,state,inquiry}){
    const worldEntities=state.world.entities||[];
    const openGaps=state.success.complement?.open||[];
    const need=state.life.needs?.open?.[0]||null;
    return {
      Who:{dimension:'Space',value:inquiry?.fields?.Who?.known?inquiry.fields.Who.value:(worldEntities.length?`${worldEntities.length} known world referent${worldEntities.length===1?'':'s'} are in the current relational field`:'the current person and the relationships/referents involved in this goal'),evidence:{worldReferents:worldEntities.slice(0,12).map(x=>({kind:x.kind,id:x.id,worldAddress:x.worldAddress}))}},
      What:{dimension:'Evolution',value:inquiry?.fields?.What?.value||safe(goal),evidence:{source:'explicit-user-intent'}},
      Where:{dimension:'Being',value:inquiry?.fields?.Where?.known?inquiry.fields.Where.value:(safe(context)||'unresolved — the situation has not been located yet'),evidence:{vitality:state.success.vitality,openGaps:openGaps.slice(0,8)}},
      When:{dimension:'Movement',value:inquiry?.fields?.When?.known?inquiry.fields.When.value:(need?`now, during ${need.kind} pressure (${Number(need.pressure||0).toFixed(2)})`:'now, in the current active developmental cycle'),evidence:{pulses:state.life.pulses,currentNeed:need}},
      Why:{dimension:'Design',value:inquiry?.fields?.Why?.known?inquiry.fields.Why.value:'unresolved — purpose has not been assigned yet',evidence:{purposeSource:inquiry?.fields?.Why?.known?'explicit':'unresolved-or-organism'}}
    };
  }

  #beingSummary(state,gaps){const v=Math.round(Number(state.success.vitality||0)*100);return gaps.length?`current condition: vitality ${v}%, with ${gaps.length} unresolved human-support gap${gaps.length===1?'':'s'}`:`current condition: vitality ${v}%, no recorded unresolved human-support gap`}

  #route(goal,context){
    const text=`${goal} ${context}`.toLowerCase();const route=[];
    // Awareness/orientation always starts with cultivation + advice; these are existing organs.
    route.push('autoling','disseminer','cultivation','advice');
    if(/money|income|paid|pay|rent|food|job|work|customer|client|sell|revenue|business/.test(text))route.push('economy','research','browser-planner','builder');
    if(/relationship|joe|partner|friend|family|fight|argument|communication|boundary/.test(text))route.push('resonance','world');
    if(/build|make|create|app|site|website|tool|code|fix|deploy/.test(text))route.push('research','builder');
    if(/form|apply|application|benefit|ebt|signup|register/.test(text))route.push('forms','browser-planner');
    if(/research|learn|understand|investigate|evidence/.test(text))route.push('research');
    return [...new Set(route)].filter(id=>this.unit.registry.get(id)).slice(0,8);
  }

  #how({goal,context,route,state}){
    return {
      role:'integration',
      statement:`Use the existing ${route.join(' → ')} process path to turn the five-dimensional reading into a tested real-world move, then feed the observed consequence back into the organism.`,
      route,
      loop:[
        {stage:'awareness',purpose:'observe the actual state without inventing missing facts'},
        {stage:'orientation',purpose:'read who/what/where/when/why through the five dimensions'},
        {stage:'cultivation',purpose:'identify the quality/capability that improves the person rather than merely completing a task'},
        {stage:'action',purpose:'use existing tools/organs to make a real-world move'},
        {stage:'integration',purpose:'record the consequence, preserve evidence, and change the next cycle accordingly'}
      ],
      constraints:['preserve-human-agency','real-world-outcome-required','traceable-lineage','no-random-factual-substitution'],
      currentPressure:state.life.needs?.open?.[0]||null,
      goal,
      context:safe(context)
    };
  }

  #next(cycle){
    if(cycle.status!=='active')return null;
    const map={
      awareness:'Name what is actually happening and what outcome would count as better.',
      orientation:'Read the situation through Who / What / Where / When / Why without collapsing the dimensions.',
      cultivation:'Choose the quality or capability to practice so the person improves with the outcome.',
      action:'Make the smallest real-world move that can test the current hypothesis.',
      integration:'Compare prediction to consequence, keep what worked, and update the next cycle.'
    };
    return {kind:'act',stage:cycle.stage,text:map[cycle.stage],route:cycle.route};
  }

  #actionIntent(cycle){
    const p=cycle.projection;return [
      `Cultivation cycle stage: ${cycle.stage}.`,
      `Goal: ${cycle.goal}`,
      `WHO / Space: ${p.Who.value}`,
      `WHAT / Evolution: ${p.What.value}`,
      `WHERE / Being: ${p.Where.value}`,
      `WHEN / Movement: ${p.When.value}`,
      `WHY / Design: ${p.Why.value}`,
      `HOW / Integration: ${cycle.how.statement}`,
      `Current next move: ${cycle.next?.text||'integrate the result'}`,
      `Use existing capabilities; do not invent missing facts. Produce something the person can actually do or use now.`
    ].join('\n');
  }

  #capabilityFor(cycle){
    const map={awareness:'accurate-self-observation',orientation:'five-dimensional-orientation',cultivation:'quality-development',action:'real-world-execution',integration:'outcome-integration'};return map[cycle.stage]||'cultivation-support';
  }
  #failurePersistence(cycle,capability){return cycle.evidence.filter(e=>e.worked===false).length+1;}
  #dimensionNumber(stage){return {awareness:5,orientation:5,cultivation:4,action:1,integration:2}[stage]||5;}
  #compactResult(r){return {ok:r?.ok!==false,route:r?.route||[],collective:r?.collective||null,outputs:(r?.outputs||[]).map(x=>({organ:x.organ,ok:x.out?.ok!==false,text:x.out?.text||null,reflection:x.out?.reflection||null,plan:x.out?.plan||null,artifact:x.out?.artifact?{type:x.out.artifact.type,name:x.out.artifact.name}:null}))};}
}

export default CultivationProgram;
