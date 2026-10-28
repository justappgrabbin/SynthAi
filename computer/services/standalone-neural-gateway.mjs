/**
 * Native bridge to the ORIGINAL owner Synthia-Neural-Standalone runtime.
 * Requires SYNTHIA_NEURAL_HOME to name the extracted owner ZIP. No model,
 * auto-trained weights, donor code or new Computer architecture is substituted.
 */
import { stat, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

function message(value) {
 if(typeof value !== 'string' || !value.trim() || value.length > 8000)
   throw new TypeError('A nonempty text message <=8000 characters is required');
 return value.trim();
}
function annotations(value) {
 if(!value || typeof value !== 'object' || Array.isArray(value))
   throw new TypeError('Annotations must be an object');
 return value;
}
export class StandaloneNeuralGateway {
 constructor({home=process.env.SYNTHIA_NEURAL_HOME??null,
              workspace=process.env.SYNTHIA_NEURAL_WORKSPACE??null,
              python=process.env.SYNTHIA_PYTHON??'python3',
              computerRoot=null,bus=null}={}) {
   this.home=home?resolve(home):null;
   this.workspace=workspace?resolve(workspace):null;
   this.computerRoot=computerRoot?resolve(computerRoot):null;
   this.python=python;this.bus=bus;this.adapter=null;
   this.error=null;this.sourceSha256=null;this.loading=null;
 }
 async boot(){
   if(!this.home || this.adapter)return this;
   if(this.loading)return this.loading;
   this.loading=this._load();
   try{await this.loading;}finally{this.loading=null;}
   return this;
 }
 async _load(){
   try {
     const entry=join(this.home,'host','computer-adapter.mjs');
     const mapping=join(this.home,'IMPLEMENTATION_MAP.md');
     if(!(await stat(entry)).isFile()||!(await stat(mapping)).isFile())
       throw Error('Original neural adapter and implementation map required');
     const source=await readFile(entry);
     this.sourceSha256=createHash('sha256').update(source).digest('hex');
     const module=await import(pathToFileURL(entry).href);
     if(typeof module.createComputerModelAdapter!=='function')
       throw Error('Original Computer adapter export missing');
     const adapter=await module.createComputerModelAdapter({
       workspace:this.workspace??join(this.home,'workspace'),
       python:this.python,computerRoot:this.computerRoot
     });
     if(adapter?.id!=='synthia-trident-neural')throw Error('Unknown original adapter identity');
     this.adapter=adapter;this.error=null;
     this.bus?.emit('neural-standalone:mounted',{sourceSha256:this.sourceSha256});
   }catch(error){
     this.adapter=null;this.error=String(error?.message??error);
     this.bus?.emit('neural-standalone:unavailable',{message:this.error});
   }
 }
 summary(){
   return {configured:Boolean(this.home),mounted:Boolean(this.adapter),
     provider:'original-synthia-neural-standalone',
     modelTrainingOnlyWithOwnerApproval:true,noAutomaticGitPush:true,
     noDeletionTools:true,alignmentDimensions:6,
     originalAdapterSha256:this.sourceSha256,error:this.error};
 }
 requireReady(){
   if(!this.adapter)throw Error('Synthia-Neural-Standalone unavailable: '+
     (this.error??'configure SYNTHIA_NEURAL_HOME with extracted original source'));
   return this.adapter;
 }
 async status({checkWeights=true}={}){
   if(!this.adapter)return this.summary();
   if(!checkWeights)return {...this.summary(),semantic:this.adapter.runtime.status()};
   const actual=await this.adapter.status();
   return {...this.summary(),actual};
 }
 async inspect({text,annotations:inputs={}}={}){
   const prompt=message(text),reading=await this.requireReady().semantic.read(prompt,annotations(inputs));
   this.bus?.emit('neural-standalone:inspected',{promptChars:prompt.length});
   return {provider:'synthia-neural',originalAdapterSha256:this.sourceSha256,reading};
 }
 async generate({text,annotations:inputs={}}={}){
   const prompt=message(text);
   const original=await this.requireReady().language.generate(prompt,annotations(inputs));
   if(!original?.ready||typeof original.text!=='string')
     return {ready:false,provider:'synthia-neural',
       reason:original?.reason??'original-model-not-trained',revision:original?.revision??null};
   const report={ready:true,output:original.text,text:original.text,
     backend:'synthia-neural',provider:'original-pytorch-trident-with-spacetime',
     revision:original.revision,generatedBy:original.generatedBy,
     weightsLoaded:true,inferenceVerified:true,
     semanticPlan:original.semanticPlan??null,
     originalAdapterSha256:this.sourceSha256,
     neuralExecution:original.execution??null};
   this.bus?.emit('neural-standalone:generated',{revision:report.revision,outputChars:report.text.length});
   return report;
 }
}
