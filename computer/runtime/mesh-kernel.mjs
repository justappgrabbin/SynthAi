const clone = value => value === undefined ? undefined : structuredClone(value);
const safeKey = value => String(value ?? 'item').replace(/[^A-Za-z0-9_-]/g, c => `_${c.charCodeAt(0).toString(16)}`);

export const MESH_RESIDENCY = Object.freeze({ ACTIVE: 'active', WARM: 'warm', DORMANT: 'dormant', OFFLINE: 'offline' });

export class RelationalMeshKernel {
  constructor({ state, bus = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('RelationalMeshKernel requires a StateStore-like state service');
    Object.assign(this, { state, bus, clock });
  }

  async boot() {
    const meta = this.state.get('mesh.meta', null) ?? { revision: 0, sequence: 0, bootCount: 0 };
    meta.bootCount += 1;
    meta.lastBootAt = this.clock();
    await this.state.set('mesh.meta', meta, { source: 'relational-mesh-kernel' });
    this.bus?.emit('mesh:ready', this.snapshot());
    return this;
  }

  _participantPath(id) { return `mesh.participants.${safeKey(id)}`; }
  _queuePath(id) { return `mesh.queues.${safeKey(id)}`; }
  _edgePath(id) { return `mesh.relationships.${safeKey(id)}`; }

  participant(id) { return this.state.get(this._participantPath(id), null); }
  get(id) { return this.participant(id); }
  listParticipants() { return Object.values(this.state.get('mesh.participants', {}) ?? {}).filter(Boolean); }

  async registerParticipant(id, {
    kind = 'participant', address = null, publicState = {}, privateStateRef = null,
    capabilities = [], residency = MESH_RESIDENCY.WARM, visibility = 'mesh', metadata = {},
  } = {}) {
    if (!id) throw new Error('mesh participant id required');
    const existing = this.participant(id);
    const now = this.clock();
    const record = {
      id: String(id), kind, address: clone(address), publicState: clone(publicState), privateStateRef,
      capabilities: [...new Set(capabilities.map(String))], residency, visibility, metadata: clone(metadata),
      createdAt: existing?.createdAt ?? now, updatedAt: now,
      checkpoint: existing?.checkpoint ?? null, sleptAt: existing?.sleptAt ?? null,
    };
    await this.state.set(this._participantPath(id), record, { source: 'relational-mesh-kernel' });
    await this._bump('participant-register');
    this.bus?.emit('mesh:participant', { operation: existing ? 'updated' : 'registered', participant: clone(record) });
    return clone(record);
  }

  async join(id, options = {}) { return this.registerParticipant(id, options); }

  async setResidency(id, residency, { checkpoint = undefined } = {}) {
    const current = this.participant(id);
    if (!current) throw new Error(`unknown mesh participant: ${id}`);
    const now = this.clock();
    const next = { ...current, residency, updatedAt: now };
    if (checkpoint !== undefined) next.checkpoint = clone(checkpoint);
    if (residency === MESH_RESIDENCY.DORMANT) next.sleptAt = now;
    if (residency === MESH_RESIDENCY.ACTIVE) next.lastWakeAt = now;
    await this.state.set(this._participantPath(id), next, { source: 'relational-mesh-kernel' });
    await this._bump('residency-change');
    this.bus?.emit('mesh:residency', { id: String(id), residency, at: now });
    return clone(next);
  }

  async publishPresence(id, patch = {}) {
    const current = this.participant(id);
    if (!current) throw new Error(`unknown mesh participant: ${id}`);
    const next = { ...current, publicState: { ...(current.publicState ?? {}), ...clone(patch) }, updatedAt: this.clock() };
    await this.state.set(this._participantPath(id), next, { source: 'relational-mesh-kernel' });
    await this._bump('presence-publish');
    this.bus?.emit('mesh:presence', { id: String(id), publicState: clone(next.publicState), residency: next.residency });
    return clone(next.publicState);
  }

  resolvePresence(id, { includePrivate = false } = {}) {
    const p = this.participant(id);
    if (!p || p.visibility === 'private') return null;
    const result = {
      id: p.id, kind: p.kind, address: clone(p.address), residency: p.residency,
      capabilities: [...(p.capabilities ?? [])], publicState: clone(p.publicState), metadata: clone(p.metadata),
      updatedAt: p.updatedAt,
    };
    if (includePrivate) result.privateStateRef = p.privateStateRef;
    return result;
  }

  async connect(from, to, { type = 'relates-to', weight = 1, evidence = null, metadata = {}, context = null } = {}) {
    if (!this.participant(from) || !this.participant(to)) throw new Error('both mesh participants must be registered before connecting');
    const id = `${from}::${type}::${to}`;
    const edge = { id, from: String(from), to: String(to), type, weight: Number(weight), evidence: clone(evidence), metadata: clone(metadata), context: clone(context), updatedAt: this.clock() };
    await this.state.set(this._edgePath(id), edge, { source: 'relational-mesh-kernel' });
    await this._bump('relationship-connect');
    this.bus?.emit('mesh:relationship', clone(edge));
    return clone(edge);
  }

  async relate(from, to, options = {}) { return this.connect(from, to, options); }

  relationshipsFor(id) {
    return Object.values(this.state.get('mesh.relationships', {}) ?? {}).filter(edge => edge && (edge.from === id || edge.to === id));
  }

  async queueEvent(targetId, event = {}) {
    if (!this.participant(targetId)) throw new Error(`unknown mesh participant: ${targetId}`);
    const meta = this.state.get('mesh.meta', { revision: 0, sequence: 0, bootCount: 0 });
    meta.sequence = Number(meta.sequence || 0) + 1;
    meta.revision = Number(meta.revision || 0) + 1;
    await this.state.set('mesh.meta', meta, { source: 'relational-mesh-kernel' });
    const queue = this.state.get(this._queuePath(targetId), []);
    const envelope = {
      id: event.id ?? `mesh-event-${meta.sequence}`, sequence: meta.sequence,
      targetId: String(targetId), sourceId: event.sourceId ?? null,
      type: String(event.type ?? 'mesh-event'), payload: clone(event.payload ?? null),
      address: clone(event.address ?? null), evidence: clone(event.evidence ?? null),
      createdAt: event.createdAt ?? event.at ?? this.clock(), status: 'pending',
    };
    queue.push(envelope);
    await this.state.set(this._queuePath(targetId), queue, { source: 'relational-mesh-kernel' });
    this.bus?.emit('mesh:event-queued', clone(envelope));
    return clone(envelope);
  }

  pendingEvents(id) { return (this.state.get(this._queuePath(id), []) ?? []).filter(event => event.status === 'pending'); }

  async acknowledgeEvent(targetId, eventId, receipt = null) {
    const queue = this.state.get(this._queuePath(targetId), []);
    const index = queue.findIndex(event => event.id === eventId);
    if (index < 0) return false;
    queue[index] = { ...queue[index], status: 'consumed', consumedAt: this.clock(), receipt: clone(receipt) };
    await this.state.set(this._queuePath(targetId), queue, { source: 'relational-mesh-kernel' });
    this.bus?.emit('mesh:event-consumed', { targetId: String(targetId), eventId, receipt: clone(receipt) });
    return true;
  }

  async sleepParticipant(id, checkpoint = null) {
    return this.setResidency(id, MESH_RESIDENCY.DORMANT, { checkpoint });
  }

  async wakeParticipant(id, { replay = null } = {}) {
    const before = this.participant(id);
    if (!before) throw new Error(`unknown mesh participant: ${id}`);
    const now = this.clock();
    const elapsedMs = before.sleptAt ? Math.max(0, now - before.sleptAt) : 0;
    const pending = this.pendingEvents(id);
    const receipts = [];
    if (typeof replay === 'function') {
      for (const event of pending) {
        const receipt = await replay(clone(event), { elapsedMs, checkpoint: clone(before.checkpoint), participant: clone(before) });
        await this.acknowledgeEvent(id, event.id, receipt);
        receipts.push({ eventId: event.id, receipt: clone(receipt) });
      }
    }
    const participant = await this.setResidency(id, MESH_RESIDENCY.ACTIVE);
    this.bus?.emit('mesh:wake', { id: String(id), elapsedMs, replayed: receipts.length });
    return { participant, elapsedMs, pendingBeforeWake: pending.length, receipts, checkpoint: clone(before.checkpoint) };
  }

  async _bump(reason) {
    const meta = this.state.get('mesh.meta', { revision: 0, sequence: 0, bootCount: 0 });
    meta.revision = Number(meta.revision || 0) + 1;
    meta.lastMutation = reason;
    meta.lastMutationAt = this.clock();
    await this.state.set('mesh.meta', meta, { source: 'relational-mesh-kernel' });
    return meta.revision;
  }

  snapshot() {
    return {
      meta: this.state.get('mesh.meta', {}),
      participants: this.listParticipants(),
      relationships: Object.values(this.state.get('mesh.relationships', {}) ?? {}).filter(Boolean),
      pendingEvents: Object.values(this.state.get('mesh.queues', {}) ?? {}).reduce((n, q) => n + (q ?? []).filter(e => e.status === 'pending').length, 0),
    };
  }
}

// Compatibility surface retained for the first resident-spine cut and its tests.
const cloneCompat=v=>v===undefined?undefined:structuredClone(v);

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
    const node={id,kind,residency,publicState:cloneCompat(publicState),privateRef,capabilities:[...capabilities],joinedAt:Date.now(),updatedAt:Date.now()};
    this.nodes.set(id,node); await this.#persist();
    this.bus?.emit('mesh:joined',{id,kind,residency}); return cloneCompat(node);
  }
  async setResidency(id,residency){
    const n=this.nodes.get(id); if(!n) throw new Error('unknown mesh node: '+id);
    n.residency=residency; n.updatedAt=Date.now(); await this.#persist();
    this.bus?.emit('mesh:residency',{id,residency}); return cloneCompat(n);
  }
  async relate(from,to,{type='related',weight=1,context={}}={}){
    if(!this.nodes.has(from)||!this.nodes.has(to)) throw new Error('mesh relation endpoints must exist');
    const id=from+'→'+type+'→'+to;
    const edge={id,from,to,type,weight,context:cloneCompat(context),updatedAt:Date.now()};
    this.edges.set(id,edge); await this.#persist(); this.bus?.emit('mesh:related',edge); return cloneCompat(edge);
  }
  on(id,handler){ this.handlers.set(id,handler); return ()=>this.handlers.delete(id); }
  async route(packet){
    if(!packet?.to) throw new Error('mesh packet.to required');
    const target=this.nodes.get(packet.to); if(!target) throw new Error('mesh target unavailable: '+packet.to);
    const envelope=Object.freeze({id:packet.id??'packet-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from:packet.from??'computer',to:packet.to,type:packet.type??'message',payload:cloneCompat(packet.payload),at:Date.now()});
    await this.state?.set('mesh.lastPacket',envelope,{source:'mesh-kernel'});
    this.bus?.emit('mesh:packet',envelope);
    const handler=this.handlers.get(packet.to);
    return handler ? handler(envelope) : {queued:true,envelope};
  }
  get(id){return cloneCompat(this.nodes.get(id)??null)}
  snapshot(){return {nodes:[...this.nodes.values()].map(cloneCompat),edges:[...this.edges.values()].map(cloneCompat)}}
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
    q.push({id:event.id??'event-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at:event.at??this.clock(),...cloneCompat(event)});
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

