import { MORPH_CAPABILITIES, MORPH_CHARTER } from './MorphCharter.mjs';
import { MorphCorrectionMemory } from './MorphCorrectionMemory.mjs';

const clone=value=>structuredClone(value);
const TYPES=new Set(MORPH_CHARTER.modes.media);
const repoParts=Object.freeze({code:/\.(?:js|mjs|ts|tsx|jsx|py|cs|cpp|c|rs|go|java)$/i,assets:/\.(?:png|jpe?g|gif|svg|webp|wav|mp3|ogg|glb|gltf|fbx|obj)$/i,documentation:/(?:^|\/)(?:readme|docs?)(?:\.|\/|$)/i,dependencies:/(?:package(?:-lock)?\.json|requirements\.txt|pom\.xml|build\.gradle|cargo\.toml)$/i,tests:/(?:test|spec)\.[^.]+$/i,commitHistory:/(?:^|\/)\.git(?:\/|$)|commit/i});

const inventory=files=>Object.freeze(Object.fromEntries(Object.entries(repoParts).map(([key,pattern])=>[key,(files??[]).filter(file=>pattern.test(String(file.path??file))).length])));
const capabilityState=(required,available)=>Object.freeze({required:Object.freeze([...required]),available:Object.freeze(required.filter(item=>available.has(item))),gaps:Object.freeze(required.filter(item=>!available.has(item)))});

export class MorphEvolutionEngine {
  constructor({organism,availableCapabilities=[],corrections=new MorphCorrectionMemory()}={}){if(!organism)throw new TypeError('MORPH_ORGANISM_REQUIRED');this.organism=organism;this.available=new Set(availableCapabilities);this.corrections=corrections;}
  registerCapability(id){this.available.add(String(id));return this;}

  async ingest(source,{mode,request='',testEvidence=null,identityId='cynthia',bindingAction=false}={}){
    const selected=mode??(source?.repository||Array.isArray(source?.files)?'repository':TYPES.has(source?.kind)?'media':'expression');
    const original=this.organism.mind.sources.preserve(clone(source),{kind:'morph-original',mode:selected,provenance:clone(source?.provenance??{})});
    const interrogation=this.#interrogate(selected,source,request,testEvidence);
    const intake=await this.organism.mind.ingestText(JSON.stringify(interrogation),{kind:'morph-interrogation',originalSourceId:original.id});
    const required=MORPH_CAPABILITIES[selected]??MORPH_CAPABILITIES.expression,capabilities=capabilityState(required,this.available);
    const blocked=selected==='repository'&&!testEvidence;
    const descendantId=`${original.id}:descendant:${this.corrections.records.length+1}`;
    return Object.freeze({schema:'cynthia-morph-plan/1',status:blocked?'original-test-required':capabilities.gaps.length?'capability-gaps':'ready',mode:selected,identity:Object.freeze({id:identityId,continuous:true,form:source?.form??selected}),original:Object.freeze({sourceId:original.id,preserved:true,provenance:clone(source?.provenance??{})}),interrogation,address:intake.analysis.addressed.address,addressDerivedAfterAnalysis:true,descendant:Object.freeze({id:descendantId,parent:original.id,versioned:true,mutatesOriginal:false}),capabilities,execution:Object.freeze({preference:'local-device',heavyFallback:'person-sovereign-backend',bindingAction,reviewRequired:Boolean(bindingAction)}),corrections:this.corrections.forSubject(identityId),charter:MORPH_CHARTER});
  }

  correct(correction){return this.corrections.remember(correction);}
  snapshot(){return Object.freeze({available:[...this.available],corrections:this.corrections.snapshot()});}
  restore(snapshot){this.available=new Set(snapshot?.available??[]);this.corrections.restore(snapshot?.corrections);return this;}

  #interrogate(mode,source,request,testEvidence){
    if(mode==='repository'){const files=source?.files??[];return Object.freeze({who:source?.owner??'unknown',what:'repository',where:source?.origin??'local-ingest',when:source?.revision??'unknown',why:request||'evolve a working descendant',inventory:inventory(files),interfaces:clone(source?.interfaces??[]),state:clone(source?.state??[]),dependencies:clone(source?.dependencies??[]),claims:clone(source?.description??null),runtimeEvidence:testEvidence?clone(testEvidence):null,descriptionTrustedAsEvidence:false});}
    if(mode==='media')return Object.freeze({who:source?.subjectId??'unresolved-subject',what:source?.kind??'perceptible-media',where:source?.origin??'local-ingest',when:source?.capturedAt??'unknown',why:request||'understand and transform',identityReferences:clone(source?.identityReferences??[]),requestedChanges:clone(source?.transformations??[]),outputs:clone(source?.outputs??[])});
    return Object.freeze({who:'continuous-cynthia',what:source?.form??'adaptive-expression',where:source?.surface??'conversation',when:'task-context',why:request||'embody the required interface',permissions:clone(source?.permissions??[]),actions:clone(source?.actions??[])});
  }
}
