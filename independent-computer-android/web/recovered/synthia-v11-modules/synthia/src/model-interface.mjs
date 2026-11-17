import { validateCanonicalAddress } from 'synthia/vendor/spine/src/canonical-address.mjs';

// A local connection contract for the user's model maker outputs. Four slots
// are separate model instances; Trident's three heads never count as slots.
export class ModelInterface {
 constructor(foundation){this.foundation=foundation;this.slots=new Map();}
 mount({slot,owner,address,primitives,source,generate}){
  if(!Number.isInteger(slot)||slot<1||slot>4)throw Error('Model slot must be 1 through 4');
  if(!owner||!source||!Array.isArray(primitives)||!primitives.length)throw Error('Model needs its owner, source, and resolved primitives');
  if(typeof generate!=='function')throw Error('Mount the model engine’s actual local generation function');
  validateCanonicalAddress(address);
  const manifest=structuredClone({slot,owner,address,primitives,source});
  this.slots.set(slot,{manifest,generate});return manifest;
 }
 async request({slot,prompt,level=2,context={}}){
  const model=this.slots.get(slot);if(!model)throw Error(`Local model slot ${slot} is awaiting its model-maker output`);
  const qualities=this.foundation.sources.qualities(model.manifest.address,level,context);
  const output=await model.generate({prompt,design:structuredClone(model.manifest),qualities,context:structuredClone(context)});
  // A model proposal is ingested and executed through the same foundation.
  const receipt=await this.foundation.ingest(output,{...context,canonicalAddress:model.manifest.address,level,modelSlot:slot,modelOwner:model.manifest.owner});
  return {slot,receipt};
 }
 snapshot(){return Array.from({length:4},(_,i)=>{const slot=i+1,model=this.slots.get(slot);return {slot,status:model?'mounted':'awaiting model-maker output',manifest:model?structuredClone(model.manifest):null};});}
}
