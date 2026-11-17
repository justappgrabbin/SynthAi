import { ComputerRuntime } from 'synthia/vendor/computer/ComputerRuntime.mjs';
import { Foundation } from 'synthia/src/foundation.mjs';
import { canonicalAddressKey, validateCanonicalAddress } from 'synthia/vendor/spine/src/canonical-address.mjs';
import { addressPresentation } from 'synthia/src/state-space-adapter.mjs';
import { SUPPLIED_PACKAGES } from 'synthia/src/supplied-packages.mjs';

export class FoundationComputer extends ComputerRuntime {
 constructor({foundation=new Foundation()}={}){
  const persistence={load:key=>foundation.store.get(`computer:${key}`),save:(key,value)=>foundation.store.put(`computer:${key}`,value)};
  super({persistence,namespace:'synthia-computer-v1',foundationServices:computer=>{
   const addressService={
    resolveAddress:async entity=>{
     const supplied=entity?.canonicalAddress??entity?.address;
     const address=supplied?(validateCanonicalAddress(supplied),supplied):foundation.system.addressResolver.resolve({artifact:{content:JSON.stringify(entity)}}).address;
     return {address,key:canonicalAddressKey(address),provider:'synthia-foundation',presentation:addressPresentation(address)};
    },
    compareAddresses:(a,b)=>({equal:canonicalAddressKey(a.address??a)===canonicalAddressKey(b.address??b)}),
    resolveRelationship:(a,b)=>({comparison:addressService.compareAddresses(a,b),basis:'canonical address equality only'})
   };
   const eventEmitter={emitEvent:event=>foundation.ingest(event,{name:'computer-event.json',source:'computer'}),readAll:async()=>foundation.history.filter(e=>e.context?.name==='computer-event.json')};
   const stateResolver={resolveState:async(entity,event,context)=>{const resolved=await addressService.resolveAddress(entity);return {...resolved,event,context,stateSpace:foundation.stateSpace.address(resolved.address.gate)};}};
   const capabilityRegistryService={queryCapability:name=>({capability:name,found:computer.capabilityRegistry.has(name),providers:computer.capabilityRegistry.get(name)?.providers??[]}),route:name=>({required_capability:name,selected_provider:computer.capabilityRegistry.get(name)?.providers?.[0]??null})};
   return {addressService,eventEmitter,stateResolver,capabilityRegistryService};
  }});
  this.foundation=foundation;
  this.backends.register('computer-local',{request:request=>{
   if(request.action==='chat')return this.foundation.chat(request.text,request.context??{});
   if(request.action==='execute')return this.foundation.ingest(request.artifact,request.context??{});
   if(request.action==='status')return this.foundation.audit();
   throw Error('Unknown local Computer request');
  }});
 }
 async boot(){
  await this.foundation.ready;await super.boot();
  this.foundation.runtime.registerRealizer('workspace-save',spec=>({saved:true,name:spec.fileName,length:spec.sourceText.length}));
  const write=this.vfs.write.bind(this.vfs);
  this.vfs.write=async(path,content,meta={})=>{
   const receipt=await this.foundation.ingest({realizer:'workspace-save',fileName:meta.originalName??path.split('/').at(-1),sourceText:String(content??'')},{name:'workspace-save.json',source:'computer-file'});
   return write(path,content,{...meta,foundationEntry:receipt.id,address:receipt.outcome.canonicalAddress,executionOk:receipt.ok});
  };
  this.execute=(input,context={})=>this.foundation.ingest(input,{...context,source:'computer-execution'});
  this.chat=(text,context={})=>this.foundation.chat(text,{...context,source:'computer-chat'});
  this.processes.register({id:'foundation-execution',run:({input,context})=>this.execute(input,context)});
  this.processes.register({id:'foundation-chat',run:({input,context})=>this.chat(input,context)});
  for(const id of ['foundation-execution','foundation-chat','source-synthesis','source-qualities'])this.capabilityRegistry.register(id,{providers:['synthia-foundation']},{replace:true});
  this.systems.register('source-morph',{name:'Canonical Morph and House',role:'Addressed agent state → source morph packet → articulated reskin',status:'Live bridge; WebGL rendering requires a browser'}, {replace:true});
  this.tools.register('source-morph',{execute:request=>this.execute({realizer:'source-system',system:'morph',...request})});
  this.tools.register('source-swarm',{execute:request=>this.execute({realizer:'source-system',system:'swarm',...request})});
  this.tools.register('source-synthesis',{execute:request=>this.execute({realizer:'source-system',system:'synthesis',...request})});
  this.tools.register('source-qualities',{execute:request=>this.execute({realizer:'source-system',system:'qualities',...request})});
  this.systems.register('source-swarm',{name:'Synthia Swarm Body',role:'Persistent capability routing across foundation organs',status:'Live local runtime; glyph scene references retained'}, {replace:true});
  this.systems.register('trident',{name:'Trident',role:'Owned Python model, MCP tools and RAG',status:'Server bridge mounted; health reports dependencies and checkpoint'}, {replace:true});
  for(const item of SUPPLIED_PACKAGES){
   this.systems.register(item.id,{name:item.name,role:item.role,source:item.source,status:item.status},{replace:true});
   const marker=`package:${item.id}`;
   if(!await this.foundation.store.get(marker)){
    const project=await this.projects.create({name:item.name,description:item.role});
    for(const file of item.files)await this.projects.writeFile(project.id,file.path,file.content,{type:'text/plain'});
    await this.foundation.store.put(marker,{projectId:project.id,source:item.source});
   }
  }
  return this;
 }
 connectSynthiaServer(baseUrl){
  const url=new URL(baseUrl);if(!['http:','https:'].includes(url.protocol))throw Error('Server needs an HTTP address');
  this.backends.register('synthia-server',{request:async request=>{
   const route={status:'health',chat:'chat',execute:'execute',glyph:'foundry/glyph',derive:'foundry/derive',swarm:'swarm',trident:'trident/call',models:'models/request'}[request.action];
   if(!route)throw Error('Unknown Synthia Server request');
   const response=await fetch(new URL(`/api/${route}`,url),request.action==='status'?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.action==='glyph'||request.action==='derive'?request.input:request)});
   const value=await response.json();if(!response.ok)throw Error(value.error??'Synthia Server request failed');return value;
  }},{replace:true});
  return {local:'computer-local',server:'synthia-server',origin:url.origin};
 }
}
