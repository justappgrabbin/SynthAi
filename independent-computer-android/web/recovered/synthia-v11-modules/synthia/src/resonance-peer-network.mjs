const now=()=>new Date().toISOString();
const clone=v=>structuredClone(v);
const DEFAULT_SIGNAL='wss://synthia-server.onrender.com/signal';

export class ResonancePeerNetwork {
  constructor({runtime,socialStore,onChange=null}={}){
    if(!runtime||!socialStore)throw new TypeError('runtime + socialStore required');
    this.runtime=runtime;this.socialStore=socialStore;this.onChange=typeof onChange==='function'?onChange:()=>{};
    this.signal=null;this.signalUrl=null;this.deviceId=null;this.peers=new Set();this.connections=new Map();this.channels=new Map();this.remotePresence=new Map();this.directMessages=[];
    this.state={status:'offline',lastError:null,lastConnectedAt:null,lastPacketAt:null,lastDirectMessageAt:null};
  }
  async init(signalUrl=DEFAULT_SIGNAL){
    let id=await this.runtime.store.get('resonance:device-id');
    if(!id){id='resonance:'+crypto.randomUUID();await this.runtime.store.put('resonance:device-id',id);}
    this.deviceId=id;
    this.directMessages=await this.runtime.store.get('resonance:direct-messages:v1')??[];
    const saved=await this.runtime.store.get('resonance:peer-network');
    this.signalUrl=String(signalUrl||saved?.signalUrl||DEFAULT_SIGNAL).trim();
    await this.runtime.store.put('resonance:peer-network',{signalUrl:this.signalUrl});
    return this.connect();
  }
  snapshot(){
    return {deviceId:this.deviceId,signalUrl:this.signalUrl,status:this.state.status,lastError:this.state.lastError,lastConnectedAt:this.state.lastConnectedAt,lastPacketAt:this.state.lastPacketAt,lastDirectMessageAt:this.state.lastDirectMessageAt,peers:[...this.peers],connected:[...this.channels].filter(([,c])=>c.readyState==='open').map(([id])=>id),remotePresence:[...this.remotePresence].map(([id,p])=>({id,...clone(p)})),directMessageCount:this.directMessages.length};
  }
  changed(){try{this.onChange(this.snapshot());}catch{}}
  async connect(){
    this.disconnect(false);
    if(!/^wss?:\/\//i.test(this.signalUrl))throw new Error('Signal URL must begin ws:// or wss://');
    this.state.status='connecting';this.state.lastError=null;this.changed();
    const ws=new WebSocket(this.signalUrl);this.signal=ws;
    ws.onopen=()=>{this.state.status='signal-online';this.state.lastConnectedAt=now();ws.send(JSON.stringify({type:'register',deviceId:this.deviceId}));this.changed();};
    ws.onmessage=e=>this.handleSignal(e.data).catch(err=>{this.state.lastError=err.message;this.changed();});
    ws.onerror=()=>{this.state.lastError='Signal connection error';this.changed();};
    ws.onclose=()=>{if(this.signal===ws){this.state.status='offline';this.changed();}};
    return this.snapshot();
  }
  disconnect(notify=true){
    for(const c of this.channels.values())try{c.close();}catch{}
    for(const pc of this.connections.values())try{pc.close();}catch{}
    this.channels.clear();this.connections.clear();this.peers.clear();this.remotePresence.clear();
    const ws=this.signal;this.signal=null;if(ws)try{ws.close();}catch{}
    this.state.status='offline';if(notify)this.changed();
  }
  async handleSignal(raw){
    let msg;try{msg=JSON.parse(String(raw));}catch{return;}
    if(msg.type==='peers'){
      const next=new Set((msg.list||[]).filter(x=>x&&x!==this.deviceId));
      this.peers=next;
      for(const peer of next){
        if(!this.connections.has(peer) && this.deviceId.localeCompare(peer)<0)await this.ensurePeer(peer,true);
      }
      for(const peer of [...this.connections.keys()])if(!next.has(peer))this.dropPeer(peer);
      this.changed();return;
    }
    if(msg.type==='offer'&&msg.from){
      const pc=await this.ensurePeer(msg.from,false);await pc.setRemoteDescription(msg.sdp);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);this.signalSend({type:'answer',to:msg.from,sdp:pc.localDescription});return;
    }
    if(msg.type==='answer'&&msg.from){
      const pc=this.connections.get(msg.from);if(pc)await pc.setRemoteDescription(msg.sdp);return;
    }
    if(msg.type==='ice'&&msg.from){
      const pc=this.connections.get(msg.from);if(pc&&msg.candidate)try{await pc.addIceCandidate(msg.candidate);}catch{}return;
    }
  }
  signalSend(msg){if(this.signal?.readyState===WebSocket.OPEN)this.signal.send(JSON.stringify(msg));}
  async ensurePeer(peerId,initiator){
    if(this.connections.has(peerId))return this.connections.get(peerId);
    if(typeof RTCPeerConnection==='undefined')throw new Error('WebRTC is unavailable in this browser/WebView.');
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    this.connections.set(peerId,pc);
    pc.onicecandidate=e=>{if(e.candidate)this.signalSend({type:'ice',to:peerId,candidate:e.candidate});};
    pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))this.dropPeer(peerId);this.changed();};
    pc.ondatachannel=e=>this.attachChannel(peerId,e.channel);
    if(initiator){
      const dc=pc.createDataChannel('resonance-social',{ordered:true});this.attachChannel(peerId,dc);
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);this.signalSend({type:'offer',to:peerId,sdp:pc.localDescription});
    }
    return pc;
  }
  attachChannel(peerId,channel){
    this.channels.set(peerId,channel);
    channel.onopen=()=>{this.state.status='peer-online';this.sendPresence(peerId);this.sendPacket(peerId);this.changed();};
    channel.onclose=()=>{if(this.channels.get(peerId)===channel)this.channels.delete(peerId);this.changed();};
    channel.onerror=()=>{this.state.lastError=`Peer channel error: ${peerId}`;this.changed();};
    channel.onmessage=e=>this.handlePeerMessage(peerId,e.data).catch(err=>{this.state.lastError=err.message;this.changed();});
  }
  dropPeer(peerId){
    try{this.channels.get(peerId)?.close();}catch{}try{this.connections.get(peerId)?.close();}catch{}
    this.channels.delete(peerId);this.connections.delete(peerId);this.remotePresence.delete(peerId);this.changed();
  }
  send(peerId,payload){
    const c=this.channels.get(peerId);if(c?.readyState!=='open')return false;
    c.send(JSON.stringify(payload));return true;
  }
  sendPresence(peerId){
    return this.send(peerId,{type:'resonance.presence.v1',sentAt:now(),deviceId:this.deviceId,presence:{state:'online'}});
  }
  sendPacket(peerId){return this.send(peerId,{type:'resonance.packet.v1',sentAt:now(),packet:this.socialStore.exportPacket()});}
  broadcastPacket(){let sent=0;for(const id of this.channels.keys())if(this.sendPacket(id))sent++;return sent;}
  async recordDirect(message){
    this.directMessages.push(clone(message));this.directMessages=this.directMessages.slice(-300);
    await this.runtime.store.put('resonance:direct-messages:v1',this.directMessages);
    this.state.lastDirectMessageAt=message.at||now();this.changed();return clone(message);
  }
  directMessagesFor(peerId){return clone(this.directMessages.filter(m=>m.peerId===peerId).slice(-100));}
  async sendDirect(peerId,text,fromEntityId=null){
    const clean=String(text??'').trim().slice(0,4000);if(!clean)throw new Error('Write a message first.');
    const id='dm:'+crypto.randomUUID(),at=now();
    if(!this.send(peerId,{type:'resonance.direct-message.v1',sentAt:at,message:{id,fromEntityId,text:clean,at}}))throw new Error('That peer does not have an open direct channel.');
    const local={id,peerId,direction:'out',fromEntityId,text:clean,at};await this.recordDirect(local);
    try{await this.runtime.computer.foundation.ingest({kind:'resonance-direct-message-sent',peerId,messageId:id,fromEntityId,text:clean,at},{name:'resonance-direct-message.json',source:'resonance-p2p-private',matterOwner:fromEntityId||'human'});}catch{}
    return clone(local);
  }
  async handlePeerMessage(peerId,raw){
    let msg;try{msg=JSON.parse(String(raw));}catch{return;}
    if(msg.type==='resonance.presence.v1'){this.remotePresence.set(peerId,{...(msg.presence||{}),lastSeenAt:now()});this.changed();return;}
    if(msg.type==='resonance.packet.v1'&&msg.packet){
      await this.socialStore.importPacket(msg.packet);this.state.lastPacketAt=now();try{globalThis.dispatchEvent?.(new CustomEvent('resonance:peer-packet',{detail:{peerId,receivedAt:this.state.lastPacketAt}}));}catch{}
      try{await this.runtime.computer.foundation.ingest({kind:'resonance-peer-packet',peerId,packetSchema:msg.packet.schema,receivedAt:this.state.lastPacketAt},{name:'resonance-peer-packet.json',source:'resonance-p2p',matterOwner:'network'});}catch{}
      this.changed();return;
    }
    if(msg.type==='resonance.direct-message.v1'&&msg.message){
      const source=msg.message,text=String(source.text??'').trim().slice(0,4000);if(!text)return;
      const local={id:source.id||('dm:'+crypto.randomUUID()),peerId,direction:'in',fromEntityId:source.fromEntityId||null,text,at:source.at||now()};
      await this.recordDirect(local);
      try{globalThis.dispatchEvent?.(new CustomEvent('resonance:direct-message',{detail:{peerId,message:clone(local)}}));}catch{}
      try{await this.runtime.computer.foundation.ingest({kind:'resonance-direct-message-received',peerId,messageId:local.id,fromEntityId:local.fromEntityId,text:local.text,at:local.at},{name:'resonance-direct-message.json',source:'resonance-p2p-private',matterOwner:'network'});}catch{}
      return;
    }
  }
}
export { DEFAULT_SIGNAL };
export default ResonancePeerNetwork;
