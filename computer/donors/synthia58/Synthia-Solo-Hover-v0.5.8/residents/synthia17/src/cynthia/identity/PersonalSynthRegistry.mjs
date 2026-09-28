const clone=value=>structuredClone(value);
const MODES=new Set(['mirror','complement','dynamic']);
export class PersonalSynthRegistry {
  constructor({sharedIdentity={id:'cynthia-public',continuity:'stable',ethics:'shared',architecture:'sovereign-core'}}={}){this.sharedIdentity=Object.freeze(clone(sharedIdentity));this.instances=new Map();}
  configure({userId,label,mode='dynamic',skills=[],needs=[],assets=[],constraints=[],focusAreas=[],intervention='collaborative'}={}){if(!userId||!MODES.has(mode))throw new TypeError('PERSONAL_SYNTH_USER_AND_MODE_REQUIRED');const configuration=Object.freeze({id:`personal-synth:${userId}`,userId:String(userId),label:String(label??`${userId} Synth`),mode,private:true,sharedIdentityId:this.sharedIdentity.id,sharedIdentityUnchanged:true,observations:Object.freeze({skills:clone(skills),needs:clone(needs),assets:clone(assets),constraints:clone(constraints)}),tooling:Object.freeze({focusAreas:clone(focusAreas),intervention}),development:Object.freeze(['observe','identify-points-of-reference','separate-user-synthia-task-and-relationship','address-capabilities','generate-or-acquire-tools','test-in-use','measure-outcomes','retain-successful-tools','communicate-optimization'])});this.instances.set(String(userId),configuration);return configuration;}
  get(userId){return this.instances.get(String(userId))??null;}
  snapshot(){return Object.freeze({sharedIdentity:clone(this.sharedIdentity),instances:[...this.instances.entries()].map(clone)});}
  restore(snapshot){if(snapshot?.sharedIdentity?.id!==this.sharedIdentity.id)throw new Error('SHARED_CYNTHIA_IDENTITY_MISMATCH');this.instances=new Map(snapshot?.instances??[]);return this;}
}
