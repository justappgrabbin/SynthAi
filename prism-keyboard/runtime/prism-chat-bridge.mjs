/** Host adapter: donor algorithms and canonical addressing remain unchanged. */
import {AsyncLocalStorage} from 'node:async_hooks';
import {pathToFileURL} from 'node:url';
const directory=process.env.PRISM_SYNTHIA_SOURCE||'/opt/synthia58';
const {FederatedSynthia}=await import(pathToFileURL(directory+'/src/federated-synthia.mjs'));
const {ChatPipeline}=await import(pathToFileURL(directory+'/src/pipeline/chat-pipeline.mjs'));
const meaningScope=new AsyncLocalStorage();
const run=ChatPipeline.prototype.run;
ChatPipeline.prototype.run=function(message,context={}){
 const shared=meaningScope.getStore();
 return run.call(this,message,shared?{...context,relationalContext:{...(context.relationalContext||{}),situationalMeaning:shared.meaningContext||shared}}:context);
};
const chat=FederatedSynthia.prototype.chat;
FederatedSynthia.prototype.chat=function(message,context={}){
 const shared=context.relationalContext||null;
 return meaningScope.run(shared,async()=>{
  const response=await chat.call(this,message,context);
  if(context.prismCompact!==true)return response;
  const stages=(response.pipelineTrace||[]).map(x=>({stage:x.stage,inputType:x.inputType,accepted:x.accepted,consumed:x.consumed,delivered:x.delivered}));
  const delivered=response.relationalContext?.receivedContext?.situationalMeaning;
  return {ok:response.ok,utterance:response.utterance,pipelineTrace:stages,
   meaningContext:delivered||null,meaningContextApplied:!!delivered,
   birthMirror:{configured:response.birthMirror?.configured,personId:context.personId,agentId:context.agentId},
   canonicalAddress:response.swarmExpression?.address||null,engine:'Synthia 0.5.8 canonical pipeline',compactTrace:true};
 });
};

const executeArtifact=FederatedSynthia.prototype.executeArtifact;
FederatedSynthia.prototype.executeArtifact=async function(artifact,context={}){
 const response=await executeArtifact.call(this,artifact,context);
 if(context.prismCompact!==true)return response;
 return {ok:response.ok,path:response.path,strategy:response.strategy,bridgeUsed:response.bridgeUsed,
  result:response.result,analysis:response.analysis,
  canonicalAddress:response.resolution?.address,
  scaleLadder:response.resolution?.scaleLadder,
  derivation:response.resolution?.derivation,
  experiment:response.experiment,engine:'Synthia 0.5.8 canonical execution pipeline',compactTrace:true};
};
