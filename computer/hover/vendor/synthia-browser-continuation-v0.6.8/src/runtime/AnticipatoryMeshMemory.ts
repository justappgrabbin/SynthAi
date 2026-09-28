import {
  AnticipatoryPreloadReport, CachedPrecedent, ForwardHorizonRequest,
  LocalSituationTrigger, PublicMemoryAddress, RuntimeState, SharedPrecedent
} from './foundations';
import type { ToolScheduleReport } from './ToolScheduler';
import type { ChannelRegistry } from './ChannelRegistry';

/** Mesh transport boundary. Only Gate/Line/Color/Tone/Base may cross it. */
export interface PrecedentMeshProvider {
  isReachable(): boolean | Promise<boolean>;
  queryPrecedents(addresses: PublicMemoryAddress[], limit: number): Promise<SharedPrecedent[]>;
  publishPrecedent(precedent: SharedPrecedent): Promise<void>;
}

export interface AnticipatoryMemorySnapshot {
  cached: CachedPrecedent[];
  pendingPublications: SharedPrecedent[];
  lastPreload: AnticipatoryPreloadReport | null;
}

const FORBIDDEN_PRIVATE_KEYS = new Set([
  'degree','minute','second','arc','zodiac','house','privateCoordinates',
  'conversation','document','rawText','userId','sessionId'
]);

export class AnticipatoryMeshMemory {
  private provider: PrecedentMeshProvider | null = null;
  private cache = new Map<string, CachedPrecedent>();
  private pendingPublications = new Map<string, SharedPrecedent>();
  private lastPreload: AnticipatoryPreloadReport | null = null;

  constructor(provider?: PrecedentMeshProvider | null) { this.provider = provider || null; }
  setProvider(provider: PrecedentMeshProvider | null): this { this.provider = provider; return this; }

  async preload(request: ForwardHorizonRequest): Promise<AnticipatoryPreloadReport> {
    const now = request.preparedAt ?? Date.now();
    const expiredRemoved = this.purgeExpired(now);
    const reachable = await this.reachable();
    const flushed = reachable ? await this.flushPendingPublications() : 0;
    const publicAddresses = this.uniqueAddresses(
      request.candidates.flatMap(c => c.activeAddresses.map(a => this.sanitizeAddress(a)))
    );
    let received: SharedPrecedent[] = [];
    if (reachable && this.provider && publicAddresses.length) {
      const raw = await this.provider.queryPrecedents(publicAddresses, Math.max(1, request.maxPrecedents || 128));
      received = raw.map(p => this.sanitizePrecedent(p)).filter((p): p is SharedPrecedent => Boolean(p));
    }
    for (const precedent of received) {
      const matches = request.candidates.filter(c => this.patternMatches(precedent.triggerAddresses, c.activeAddresses));
      if (!matches.length) continue;
      const expiresAt = Math.max(...matches.map(c => c.expiresAt));
      const existing = this.cache.get(precedent.precedentId);
      this.cache.set(precedent.precedentId, {
        precedent,
        preloadedAt: existing?.preloadedAt || now,
        expiresAt: Math.max(existing?.expiresAt || 0, expiresAt),
        candidateIds: [...new Set([...(existing?.candidateIds || []), ...matches.map(c => c.candidateId)])]
      });
    }
    this.lastPreload = {
      meshReachable: reachable, queriedAddresses: publicAddresses.length,
      receivedPrecedents: received.length, cachedPrecedents: this.cache.size,
      expiredRemoved, pendingPublicationsFlushed: flushed,
      horizonStart: request.startAt, horizonEnd: request.endAt
    };
    return { ...this.lastPreload };
  }

  /** Local-only recall; no mesh call occurs when the event actually fires. */
  recall(trigger: LocalSituationTrigger, now = trigger.occurredAt): SharedPrecedent[] {
    this.purgeExpired(now);
    return [...this.cache.values()]
      .filter(e => this.patternMatches(e.precedent.triggerAddresses, trigger.activeAddresses))
      .map(e => e.precedent)
      .sort((a,b) => b.confidence*Math.log2(b.evidenceCount+1)-a.confidence*Math.log2(a.evidenceCount+1));
  }

  /** Publish only structural precedent; never raw intent/output/session/fine coordinates. */
  async observeSchedule(state: RuntimeState, report: ToolScheduleReport, channels: ChannelRegistry): Promise<number> {
    let published = 0;
    const seen = new Set<string>();
    for (const record of report.records) {
      const source = state.activeNodes.get(record.sourceStateId);
      const target = state.activeNodes.get(record.targetStateId);
      if (!source || !target) continue;
      const triggerAddresses = this.uniqueAddresses([this.publicAddressOf(source.address), this.publicAddressOf(target.address)]);
      const channel = channels.getChannel(record.definitionId);
      const responseClass: SharedPrecedent['responseClass'] = record.correctionAttempt ? 'CORRECTION_PATH' : record.generated ? 'GENERATED_PATH' : 'EXISTING_PATH';
      const outcome: SharedPrecedent['outcome'] = record.success ? 'SUCCESS' : 'FAILURE';
      const signature = this.precedentSignature(triggerAddresses, record.definitionId, record.capabilities, outcome, responseClass);
      if (seen.has(signature)) continue;
      seen.add(signature);
      const precedent: SharedPrecedent = {
        precedentId: `precedent_${this.hash(signature)}`,
        triggerAddresses,
        channelId: this.safeIdentifier(record.definitionId,40),
        circuit: channel?.circuit ? this.safeIdentifier(channel.circuit,40) : undefined,
        capabilityPath: [...new Set(record.capabilities.map(v => this.safeIdentifier(v,80)))].sort(),
        outcome, responseClass,
        confidence: this.clamp(record.success ? 0.65 + (record.correctionAttempt ? 0.15 : 0.05) : 0.35),
        evidenceCount: 1
      };
      this.assertPublicOnly(precedent);
      if (await this.reachable() && this.provider) { await this.provider.publishPrecedent(precedent); published++; }
      else this.queuePending(precedent);
    }
    return published;
  }

  snapshot(): AnticipatoryMemorySnapshot {
    return {
      cached: [...this.cache.values()].map(e => ({...e, precedent:this.sanitizePrecedent(e.precedent)!})),
      pendingPublications: [...this.pendingPublications.values()].map(p => this.sanitizePrecedent(p)!),
      lastPreload: this.lastPreload ? {...this.lastPreload} : null
    };
  }

  private queuePending(precedent: SharedPrecedent): void {
    const existing = this.pendingPublications.get(precedent.precedentId);
    if (!existing) {
      this.pendingPublications.set(precedent.precedentId, precedent);
      return;
    }
    const total = existing.evidenceCount + precedent.evidenceCount;
    existing.confidence = ((existing.confidence * existing.evidenceCount) + (precedent.confidence * precedent.evidenceCount)) / total;
    existing.evidenceCount = total;
    this.pendingPublications.set(existing.precedentId, existing);
  }

  private async flushPendingPublications(): Promise<number> {
    if (!this.provider || !(await this.reachable())) return 0;
    let count=0;
    for (const [id,p] of [...this.pendingPublications]) { await this.provider.publishPrecedent(p); this.pendingPublications.delete(id); count++; }
    return count;
  }
  private purgeExpired(now:number):number { let n=0; for(const [id,e] of this.cache) if(e.expiresAt<now){this.cache.delete(id);n++;} return n; }
  private async reachable():Promise<boolean> { if(!this.provider)return false; try{return Boolean(await this.provider.isReachable());}catch{return false;} }
  private publicAddressOf(a:any):PublicMemoryAddress { return this.sanitizeAddress({gate:a.gateLine.gate,line:a.gateLine.line,color:a.color,tone:a.tone,base:a.base}); }
  private sanitizeAddress(a:PublicMemoryAddress):PublicMemoryAddress { return {gate:this.integer(a.gate,1,64),line:this.integer(a.line,1,6),color:this.integer(a.color,1,6),tone:this.integer(a.tone,1,6),base:this.integer(a.base,1,5)}; }
  private sanitizePrecedent(raw:SharedPrecedent):SharedPrecedent|null {
    if(!raw || typeof raw!=='object' || !Array.isArray(raw.triggerAddresses) || !raw.triggerAddresses.length) return null;
    const clean:SharedPrecedent={
      precedentId:this.safeIdentifier(String(raw.precedentId||`precedent_${this.hash(JSON.stringify(raw.triggerAddresses))}`),96),
      triggerAddresses:this.uniqueAddresses(raw.triggerAddresses.map(a=>this.sanitizeAddress(a))),
      channelId:raw.channelId?this.safeIdentifier(String(raw.channelId),40):undefined,
      circuit:raw.circuit?this.safeIdentifier(String(raw.circuit),40):undefined,
      capabilityPath:Array.isArray(raw.capabilityPath)?[...new Set(raw.capabilityPath.map(v=>this.safeIdentifier(String(v),80)))].sort():[],
      outcome:raw.outcome==='FAILURE'?'FAILURE':'SUCCESS',
      responseClass:raw.responseClass==='CORRECTION_PATH'?'CORRECTION_PATH':raw.responseClass==='GENERATED_PATH'?'GENERATED_PATH':'EXISTING_PATH',
      confidence:this.clamp(Number(raw.confidence)||0), evidenceCount:Math.max(1,Math.floor(Number(raw.evidenceCount)||1))
    };
    this.assertPublicOnly(clean); return clean;
  }
  private patternMatches(pattern:PublicMemoryAddress[],active:PublicMemoryAddress[]):boolean { const keys=new Set(active.map(a=>this.addressKey(this.sanitizeAddress(a)))); return pattern.every(a=>keys.has(this.addressKey(this.sanitizeAddress(a)))); }
  private uniqueAddresses(addresses:PublicMemoryAddress[]):PublicMemoryAddress[]{ const m=new Map<string,PublicMemoryAddress>(); for(const a of addresses){const c=this.sanitizeAddress(a);m.set(this.addressKey(c),c);} return [...m.values()]; }
  private addressKey(a:PublicMemoryAddress):string{return `${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`;}
  private precedentSignature(a:PublicMemoryAddress[],c:string,caps:string[],o:string,r:string):string{return `${a.map(x=>this.addressKey(x)).sort().join('|')}::${c}::${[...caps].sort().join(',')}::${o}::${r}`;}
  private assertPublicOnly(value:unknown):void{const walk=(n:any)=>{if(!n||typeof n!=='object')return;for(const[k,v]of Object.entries(n)){if(FORBIDDEN_PRIVATE_KEYS.has(k))throw new Error(`Private field '${k}' crossed the Base privacy boundary`);walk(v);}};walk(value);}
  private safeIdentifier(text:string,max:number):string{return text.replace(/[^A-Za-z0-9._:-]/g,'_').slice(0,max);}
  private hash(text:string):string{let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
  private integer(v:number,min:number,max:number):number{const n=Math.floor(Number(v));return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
  private clamp(v:number):number{return Math.max(0,Math.min(1,v));}
}

/** Local deterministic provider for tests/mesh-host integration. */
export class InMemoryPrecedentMesh implements PrecedentMeshProvider {
  private reachable=true; private store=new Map<string,SharedPrecedent>();
  setReachable(v:boolean):this{this.reachable=v;return this;} isReachable():boolean{return this.reachable;}
  async queryPrecedents(addresses:PublicMemoryAddress[],limit:number):Promise<SharedPrecedent[]>{
    if(!this.reachable)return[]; const keys=new Set(addresses.map(a=>`${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`));
    return [...this.store.values()].filter(p=>p.triggerAddresses.every(a=>keys.has(`${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`))).sort((a,b)=>b.evidenceCount-a.evidenceCount||b.confidence-a.confidence).slice(0,Math.max(1,limit)).map(p=>({...p,triggerAddresses:p.triggerAddresses.map(a=>({...a})),capabilityPath:[...p.capabilityPath]}));
  }
  async publishPrecedent(p:SharedPrecedent):Promise<void>{
    if(!this.reachable)throw new Error('mesh unreachable'); const e=this.store.get(p.precedentId);
    if(!e){this.store.set(p.precedentId,{...p,triggerAddresses:p.triggerAddresses.map(a=>({...a})),capabilityPath:[...p.capabilityPath]});return;}
    const total=e.evidenceCount+p.evidenceCount; e.confidence=((e.confidence*e.evidenceCount)+(p.confidence*p.evidenceCount))/total; e.evidenceCount=total;
  }
  seed(p:SharedPrecedent):this{this.store.set(p.precedentId,{...p,triggerAddresses:p.triggerAddresses.map(a=>({...a})),capabilityPath:[...p.capabilityPath]});return this;}
  all():SharedPrecedent[]{return [...this.store.values()].map(p=>({...p,triggerAddresses:p.triggerAddresses.map(a=>({...a})),capabilityPath:[...p.capabilityPath]}));}
}
export default AnticipatoryMeshMemory;
