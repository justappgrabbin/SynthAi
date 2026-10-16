import SemanticWorld from '../world/SemanticWorld.mjs';
const clone=x=>x==null?x:structuredClone(x);

/** Shared identity, authored world expressions, and witnessed object interactions.
 * World appearance and action vocabularies belong to the world, not this bridge.
 */
export class WorldEmbodiment {
 constructor({unit}={}){
  if(!unit)throw new TypeError('organism required');this.unit=unit;
  const saved=unit.memory?.get?.('world-embodiment','session')?.value;
  this.state=saved?clone(saved):{identityId:unit.profile?.id||unit.lineageRef||'@self',activeWorld:null,selfState:'idle',worlds:[],history:[]};
  this.world=new SemanticWorld({memory:unit.memory});
  this.#syncWorld();
 }
 defineWorld({id,expression={},objects=[]}={}){
  if(!id)throw new TypeError('world id required');if(this.state.worlds.some(w=>w.id===id))throw new Error('world already defined');
  const seen=new Set();for(const o of objects){if(!o.id||seen.has(o.id)||typeof o.state!=='string')throw new TypeError('objects require unique id and state');seen.add(o.id);for(const a of o.actions||[]){if(!a.id||typeof a.from!=='string'||typeof a.to!=='string')throw new TypeError('actions require id, from and to states');}}
  const w={id,expression:clone(expression),objects:clone(objects)};this.state.worlds.push(w);this.#record('world-defined',{worldId:id});return clone(w);
 }
 enter(worldId){if(!this.state.worlds.some(w=>w.id===worldId))throw new Error('unknown world');this.state.activeWorld=worldId;this.#syncWorld();this.#record('world-entered',{worldId});return this.snapshot();}
 setSelfState(state){if(typeof state!=='string'||!state)throw new TypeError('self state required');this.state.selfState=state;this.#record('self-state',{state});return this.snapshot();}
 interact(objectId,actionId){
  const w=this.state.worlds.find(w=>w.id===this.state.activeWorld);if(!w)throw new Error('no active world');
  const o=w.objects.find(o=>o.id===objectId);if(!o)throw new Error('unknown object');
  const action=(o.actions||[]).find(a=>a.id===actionId&&a.from===o.state);if(!action)throw new Error('action unavailable in current object state');
  const before={objectState:o.state,interaction:clone(w.interaction)};
  this.world.retract(o.id,'state',o.state);o.state=action.to;
  this.world.assert(o.id,'state',o.state,{worldId:w.id,identityId:this.state.identityId,actionId});
  w.interaction=action.recover?null:{objectId,actionId,avatarState:action.avatarState||action.id};
  this.#record('object-interaction',{worldId:w.id,objectId,actionId,before,after:{objectState:o.state,interaction:clone(w.interaction)},source:'authored-world-transition',scope:'local-object-interaction',qualitative:clone(action.qualitative||null),address:clone(action.address||null)});
  return this.snapshot();
 }
 snapshot(){const w=this.state.worlds.find(w=>w.id===this.state.activeWorld);return {...clone(this.state),currentWorld:clone(w),avatar:{identityId:this.state.identityId,selfState:this.state.selfState,interaction:clone(w?.interaction),morph:clone(this.unit.morphicExpression?.last||null)},provision:this.unit.complement?.snapshot?.()||null};}
 #syncWorld(){
  this.world.facts.clear();const w=this.state.worlds.find(w=>w.id===this.state.activeWorld);
  for(const o of w?.objects||[]){const id=JSON.stringify([o.id,'state',o.state]);this.world.facts.set(id,{id,subject:o.id,relation:'state',object:o.state,meta:{worldId:w.id}});}
 }
 #record(type,details){this.state.history.push({sequence:this.state.history.length+1,type,...clone(details),at:Date.now()});this.unit.memory?.upsert?.('world-embodiment','session',clone(this.state));}
}
export default WorldEmbodiment;
