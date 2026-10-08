import { requireIntroductionAddress } from '../integration/IntroductionAddress.mjs';
import { FiniteStateMachine, FSMState, FSMTransition } from '../../execution-spine/src/pure-synthia/experiments/scale/fsm.js';

const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
};
const key = value => JSON.stringify(stable(value));
// Runtime identity is retained in the lifting table. It is not an observable quality.
const qualities = value => Object.fromEntries(Object.entries(value).filter(([k])=>!['id','actions','to','addressBinding','inheritAddress'].includes(k)));

/** Minimal deterministic quotient under the full authored qualitative observation contract. */
export function reduceExperience(experience) {
  const states=experience.states, ids=new Set(states.map(s=>s.id));
  if (!ids.has(experience.initial)||ids.size!==states.length) throw new TypeError('Unique states and known initial required');
  const rows=states.map(state=>{
    const actions=state.actions??[], seen=new Set();
    for(const action of actions){
      if(seen.has(action.id)||!ids.has(action.to)) throw new TypeError('Deterministic actions and known targets required');
      seen.add(action.id);
    }
    // Effective address is observable; explicit inheritance syntax is not.
    return {state,actions,observation:key({qualities:qualities(state),address:state.addressBinding?.address??state.address,
      actions:actions.map(a=>({input:a.id,qualities:qualities(a),address:a.addressBinding?.address??a.address}))})};
  });
  let classes=new Map(), rounds=[];
  const partition=signature=>{
    const buckets=new Map(), mapping=new Map();
    for(const row of rows){const sig=signature(row);if(!buckets.has(sig))buckets.set(sig,buckets.size);mapping.set(row.state.id,buckets.get(sig));}
    return mapping;
  };
  classes=partition(row=>row.observation);
  while(true){
    rounds.push({partition:Object.fromEntries(classes),stateCount:new Set(classes.values()).size});
    const refined=partition(row=>key([row.observation,row.actions.map(a=>[a.id,classes.get(a.to)])]));
    if(rows.every(row=>refined.get(row.state.id)===classes.get(row.state.id)))break;
    classes=refined;
  }
  const groups=new Map();
  for(const row of rows){const c=classes.get(row.state.id);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(row);}
  const machine=new FiniteStateMachine({id:`reduced:${experience.id}`,name:experience.id});
  const lifting={};
  for(const [c,group] of groups){
    const id=`primitive:${c}`;lifting[id]=group.map(row=>row.state.id);
    machine.addState(new FSMState({id,name:id,initial:c===classes.get(experience.initial),accepting:true,metadata:{observation:group[0].observation}}));
    for(const action of group[0].actions) machine.addTransition(new FSMTransition({from:id,to:`primitive:${classes.get(action.to)}`,input:action.id,output:key(qualities(action))}));
  }
  // Exhaustive finite structural certificate, covering arbitrary-length action traces by induction.
  const obligations=rows.map(row=>{
    const primitive=`primitive:${classes.get(row.state.id)}`;
    const pass=machine.states.get(primitive).metadata.observation===row.observation &&
      row.actions.length===[...machine.transitions.values()].filter(t=>t.from===primitive).length &&
      row.actions.every(a=>machine.step(primitive,a.id).some(t=>t.to===`primitive:${classes.get(a.to)}`&&t.output===key(qualities(a))));
    return {stateId:row.state.id,primitive,pass};
  });
  return {schema:'synthia.qualitative-automata-reduction.v1',originalStateCount:states.length,primitiveStateCount:groups.size,
    reductionRatio:{numerator:groups.size,denominator:states.length},rounds,lifting,
    projection:Object.fromEntries([...classes].map(([id,c])=>[id,`primitive:${c}`])),machine:machine.toJSON(),
    verification:{pass:obligations.every(x=>x.pass),method:'qualitative deterministic bisimulation',obligations},
    reconstruction:{definition:structuredClone(experience),method:'retained authored identity and transition lifting'}};
}
export function createReducedSession(workup,identityId){
  if(!workup.verification?.pass)throw new TypeError('Verified reduction required');
  if(typeof identityId!=='string'||!identityId.trim())throw new TypeError('Identity required');
  const definition=structuredClone(workup.reconstruction.definition), machine=FiniteStateMachine.fromJSON(workup.machine);
  const binding=requireIntroductionAddress(definition,null,definition.id);
  for(const state of definition.states){
    const stateBinding=requireIntroductionAddress(state,binding,state.id);
    for(const action of state.actions??[])requireIntroductionAddress(action,stateBinding,action.id);
  }
  let stateId=definition.initial;const history=[];
  return {
    snapshot:()=>({identityId,stateId,primitive:workup.projection[stateId],history:structuredClone(history)}),
    act(input){
      const state=definition.states.find(s=>s.id===stateId),action=state.actions?.find(a=>a.id===input);
      if(!action)throw new Error('action unavailable in current state');
      const transitions=machine.step(workup.projection[stateId],input);
      if(transitions.length!==1||transitions[0].to!==workup.projection[action.to])throw new Error('reconstruction disagrees with reduced execution');
      history.push({from:stateId,input,to:action.to,primitiveFrom:workup.projection[stateId],primitiveTo:transitions[0].to});
      stateId=action.to;return this.snapshot();
    }
  };
}
