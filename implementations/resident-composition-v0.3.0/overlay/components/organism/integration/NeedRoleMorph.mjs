import { requireIntroductionAddress } from './IntroductionAddress.mjs';
import { reduceExperience } from '../processes/AutomataReduction.mjs';
const copy=value=>structuredClone(value);
const workUnit=(dimension,data,parent)=>({...data,dimension,addressBinding:requireIntroductionAddress({address:{...parent.address,dimension}},null,`${parent.identity}/work:${dimension}`),projection:{parentIdentity:parent.identity,originAddress:copy(parent.address),status:'work-context-projection; origin-unchanged'}});
const named=value=>typeof value==='string'&&value.trim();
export const ROLE_WORKUP_SOURCE=Object.freeze({
 id:'synthia-v0.5.3/dimension-perspective-registry',revision:'0.5.3',
 operations:{Movement:'scale traversal / execution',Evolution:'reconstructive memory',Being:'occupied state / relation',Design:'dependency / construction',Space:'emergent result of four contributing fields'}
});

/** Authored roles are functions, not fixed appearance classes or guessed intent labels. */
export class NeedRoleMorph {
 constructor({memory=null,identity,executeArtifact,onWitness=null}={}){
  this.onWitness=onWitness;this.memory=memory;this.identity=identity;this.executeArtifact=executeArtifact;this.roles=new Map();
  this.history=copy(memory?.get?.('need-role-morph','history')?.value??[]);
 }
 register(role){
  if(!named(role?.id)||this.roles.has(role.id)||!Array.isArray(role.provides)||!role.provides.length||role.provides.some(x=>!named(x)))throw new TypeError('Unique role id and explicit provided needs required');
  if(typeof role.perform!=='function'||typeof role.verify!=='function')throw new TypeError('Role needs an executable function and behavioral verifier');
  const binding=requireIntroductionAddress(role,null,`role:${role.id}`);
  this.roles.set(role.id,{...role,provides:[...role.provides],address:copy(binding.address),addressBinding:binding});
  return {id:role.id,provides:[...role.provides],addressBinding:copy(binding)};
 }
 async morph({need,roleId=null,address,experience=null,input=null,context={}}={}){
  if(!named(need))throw new TypeError('Explicit need required');
  const binding=requireIntroductionAddress({address},null,`need:${need}`);
  const candidates=[...this.roles.values()].filter(r=>r.provides.includes(need)&&(!roleId||r.id===roleId));
  const record={id:crypto.randomUUID(),identityId:this.identity(),need,addressBinding:binding,input:copy(input),context:copy(context),
   source:copy(ROLE_WORKUP_SOURCE),status:'working',workup:{},at:Date.now()};
  this.history.push(record);this.save();
  try{
   // Evolution is an actual history query. It never promotes prior failure to success.
   record.workup.Evolution=workUnit('Evolution',{operation:'recall',prior:this.history.filter(r=>r.id!==record.id&&r.identityId===record.identityId&&r.need===need).map(r=>({id:r.id,roleId:r.roleId,status:r.status}))},binding);
   // Being establishes the situated identity and explicit addressed need.
   record.workup.Being=workUnit('Being',{operation:'bind-situated-identity',identityId:record.identityId,addressBinding:copy(binding),worldId:context.worldId??null,objectId:context.objectId??null},binding);
   // Design resolves the capability owner and optionally reduces authored behavior.
   record.workup.Design=workUnit('Design',{operation:'resolve-capability-and-structure',candidates:candidates.map(r=>r.id)},binding);
   if(candidates.length!==1){record.status='held';record.reason=candidates.length?'ambiguous-role':'unmapped-need';return copy(record);}
   const role=candidates[0];record.roleId=role.id;record.roleAddressBinding=copy(role.addressBinding);
   if(experience)record.workup.Design.reduction=reduceExperience(experience);
   this.save();
   // Movement executes the selected role, which may embody an actor or realize a runtime.
   const output=await role.perform({input:copy(input),context:copy(context),need,identityId:record.identityId,address:copy(binding.address),
    workup:copy(record.workup),executeArtifact:(artifact,options={})=>this.executeArtifact(artifact,{...options,organismAddress:binding.address})});
   record.workup.Movement=workUnit('Movement',{operation:'execute-selected-role',roleId:role.id,output:copy(output)},binding);
   const verification=await role.verify(copy(output),{need,identityId:record.identityId,input:copy(input),context:copy(context)});
   record.status=verification?.pass===true&&verification.evidence!=null?'verified':'unverified';
   // Space is the witnessed result, not another role worker or parallel inference.
   record.workup.Space=workUnit('Space',{operation:'express-witnessed-relation',contributors:['Movement','Evolution','Being','Design'],roleId:role.id,
    output:copy(output),verification:copy(verification),verified:record.status==='verified'},binding);
   if(record.status==='verified')await this.onWitness?.(copy(record));
   return copy(record);
  }catch(error){record.status='failed';record.error=String(error?.message??error);return copy(record);}
  finally{record.finishedAt=Date.now();this.save();}
 }
 save(){this.memory?.upsert?.('need-role-morph','history',copy(this.history));}
 snapshot(){return {roles:[...this.roles.values()].map(r=>({id:r.id,provides:[...r.provides],addressBinding:copy(r.addressBinding)})),history:copy(this.history)};}
}
export default NeedRoleMorph;
