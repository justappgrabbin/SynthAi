const FIVE = ['Movement','Evolution','Being','Design','Space'];
const now = () => new Date().toISOString();
let peerSeq=0;
const id = () => globalThis.crypto?.randomUUID?.() || `peer-${Date.now()}-${(++peerSeq).toString(36)}`;

export class P2PMesh {
  constructor({ mesh, peerId=id(), channel='synthia-5d-mesh' }={}) {
    if (!mesh) throw new Error('P2PMesh requires the local 5D mesh');
    this.mesh=mesh; this.peerId=peerId; this.channelName=channel; this.peers=new Map(); this.transports=new Set();
    if (typeof BroadcastChannel !== 'undefined') this.attachBroadcastChannel(channel);
  }
  capabilities(){ return ['five-d-mesh','ato','reato','toolfactory','local-js']; }
  advertise(extra=[]){ return {type:'peer-advertisement',peerId:this.peerId,capabilities:[...new Set([...this.capabilities(),...extra])],at:now()}; }
  attachBroadcastChannel(name=this.channelName){
    const bc=new BroadcastChannel(name); bc.onmessage=(e)=>this.receive(e.data,{transport:'broadcast'}); this.transports.add(bc); bc.postMessage(this.advertise()); return bc;
  }
  attachTransport(transport){
    if (!transport || typeof transport.send!=='function') throw new Error('transport.send required');
    this.transports.add(transport); transport.onmessage=(message)=>this.receive(message?.data ?? message,{transport:'custom'}); transport.send(this.advertise()); return transport;
  }
  send(message){ for(const t of this.transports){ try { t.postMessage ? t.postMessage(message) : t.send(message); } catch {} } }
  receive(message,meta={}){
    if (!message || message.peerId===this.peerId) return null;
    if (message.type==='peer-advertisement') { this.peers.set(message.peerId,{...message,lastSeen:now(),transport:meta.transport}); return message; }
    if (message.type==='mesh-state' && message.state) return this.importState(message.state,message.peerId);
    return null;
  }
  importState(state,peerId='remote'){
    const fields=Object.fromEntries(FIVE.map(k=>[k,Number(state.fields?.[k] ?? 0)]));
    const localId=`peer:${peerId}:${state.id}`;
    if (this.mesh.node(localId)) return this.mesh.node(localId);
    return this.mesh.addState({...state,id:localId,fields,source:{...(state.source||{}),peerId,transport:'p2p'},provenance:[...(state.provenance||[]),`p2p:${peerId}`]});
  }
  publishState(state){ this.send({type:'mesh-state',peerId:this.peerId,state,at:now()}); return state; }
  close(){ for(const t of this.transports){ try{t.close?.()}catch{} } this.transports.clear(); }
}
