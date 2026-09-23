const clone=v=>v===undefined?undefined:structuredClone(v);

export class MeshKernel {
  constructor({bus,state}={}) {
    Object.assign(this,{bus,state});
    this.nodes=new Map(); this.edges=new Map(); this.handlers=new Map();
  }
  async boot(){
    const saved=this.state?.get('mesh',{})??{};
    for(const n of saved.nodes??[]) this.nodes.set(n.id,n);
    for(const e of saved.edges??[]) this.edges.set(e.id,e);
    this.bus?.emit('mesh:booted',{nodes:this.nodes.size,edges:this.edges.size});
    return this.snapshot();
  }
  async join(id,{kind='participant',residency='warm',publicState={},privateRef=null,capabilities=[]}={}){
    const node={id,kind,residency,publicState:clone(publicState),privateRef,capabilities:[...capabilities],joinedAt:Date.now(),updatedAt:Date.now()};
    this.nodes.set(id,node); await this.#persist();
    this.bus?.emit('mesh:joined',{id,kind,residency}); return clone(node);
  }
  async setResidency(id,residency){
    const n=this.nodes.get(id); if(!n) throw new Error('unknown mesh node: '+id);
    n.residency=residency; n.updatedAt=Date.now(); await this.#persist();
    this.bus?.emit('mesh:residency',{id,residency}); return clone(n);
  }
  async relate(from,to,{type='related',weight=1,context={}}={}){
    if(!this.nodes.has(from)||!this.nodes.has(to)) throw new Error('mesh relation endpoints must exist');
    const id=from+'→'+type+'→'+to;
    const edge={id,from,to,type,weight,context:clone(context),updatedAt:Date.now()};
    this.edges.set(id,edge); await this.#persist(); this.bus?.emit('mesh:related',edge); return clone(edge);
  }
  on(id,handler){ this.handlers.set(id,handler); return ()=>this.handlers.delete(id); }
  async route(packet){
    if(!packet?.to) throw new Error('mesh packet.to required');
    const target=this.nodes.get(packet.to); if(!target) throw new Error('mesh target unavailable: '+packet.to);
    const envelope=Object.freeze({id:packet.id??'packet-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from:packet.from??'computer',to:packet.to,type:packet.type??'message',payload:clone(packet.payload),at:Date.now()});
    await this.state?.set('mesh.lastPacket',envelope,{source:'mesh-kernel'});
    this.bus?.emit('mesh:packet',envelope);
    const handler=this.handlers.get(packet.to);
    return handler ? handler(envelope) : {queued:true,envelope};
  }
  get(id){return clone(this.nodes.get(id)??null)}
  snapshot(){return {nodes:[...this.nodes.values()].map(clone),edges:[...this.edges.values()].map(clone)}}
  async #persist(){await this.state?.set('mesh',this.snapshot(),{source:'mesh-kernel'})}
}

export class MeshContinuity {
  constructor({bus,state,mesh,clock=()=>Date.now()}={}){Object.assign(this,{bus,state,mesh,clock})}
  async checkpoint({reason='manual'}={}){
    const cp={at:this.clock(),reason,mesh:this.mesh.snapshot(),pending:this.state.get('continuity.pending',[]),worldTime:this.state.get('continuity.worldTime',null)};
    await this.state.set('continuity.checkpoint',cp,{source:'mesh-continuity'});
    this.bus?.emit('continuity:checkpoint',cp); return cp;
  }
  async sleep(){
    const cp=await this.checkpoint({reason:'dormant'});
    for(const n of this.mesh.nodes.values()) if(n.residency==='hot') await this.mesh.setResidency(n.id,'warm');
    await this.state.set('continuity.lifecycle',{state:'dormant',since:this.clock()},{source:'mesh-continuity'});
    return cp;
  }
  async queue(event){
    const q=this.state.get('continuity.pending',[]);
    q.push({id:event.id??'event-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at:event.at??this.clock(),...clone(event)});
    q.sort((a,b)=>a.at-b.at); await this.state.set('continuity.pending',q,{source:'mesh-continuity'}); return q.at(-1);
  }
  async wake({resolveEvent}={}){
    const life=this.state.get('continuity.lifecycle',{state:'new',since:this.clock()});
    const now=this.clock(), elapsed=Math.max(0,now-(life.since??now));
    const pending=this.state.get('continuity.pending',[]), receipts=[];
    for(const event of pending) receipts.push(resolveEvent?await resolveEvent(event,{elapsed,now}):{event,status:'held'});
    await this.state.set('continuity.pending',[],{source:'mesh-continuity'});
    await this.state.set('continuity.lifecycle',{state:'active',since:now,lastElapsedMs:elapsed},{source:'mesh-continuity'});
    this.bus?.emit('continuity:woke',{elapsed,pending:pending.length,receipts});
    return {elapsed,pending:pending.length,receipts};
  }
}
