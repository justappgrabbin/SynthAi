/**
 * VersionLineageRegistry
 *
 * Versions coexist. Newer does not mean canonical. Nothing auto-promotes.
 * Promotion requires explicit verification evidence.
 */
export class VersionLineageRegistry {
  constructor(){ this.modules=new Map(); this.events=[]; }

  register({name,version='unversioned',hash,path=null,source=null,status='candidate',metadata={}}={}){
    if(!name||!hash) throw new TypeError('version record requires name and hash');
    const m=this.modules.get(name)||{name,activeHash:null,versions:new Map()};
    const existing=m.versions.get(hash);
    const record=existing||{name,version,hash,path,source,status,metadata:structuredClone(metadata),verification:[],registeredAt:Date.now()};
    m.versions.set(hash,record); this.modules.set(name,m);
    this.events.push({type:'REGISTER',name,hash,version,status,at:Date.now()});
    return structuredClone(record);
  }

  verify(name,hash,evidence={}){
    const r=this.#record(name,hash);
    const ev={ok:evidence.ok===true,tests:[...(evidence.tests||[])],evidence:structuredClone(evidence.evidence||[]),verifiedAt:Date.now()};
    r.verification.push(ev);
    r.status=ev.ok?'verified':'rejected';
    this.events.push({type:'VERIFY',name,hash,ok:ev.ok,at:ev.verifiedAt});
    return structuredClone(r);
  }

  promote(name,hash,{reason='',actor='synthia'}={}){
    const m=this.modules.get(name); const r=this.#record(name,hash);
    if(!r.verification.some(v=>v.ok)) throw new Error(`Cannot promote unverified version ${name}@${hash}`);
    if(m.activeHash && m.activeHash!==hash){ const old=m.versions.get(m.activeHash); if(old&&old.status==='active') old.status='verified'; }
    m.activeHash=hash; r.status='active';
    this.events.push({type:'PROMOTE',name,hash,reason,actor,at:Date.now()});
    return structuredClone(r);
  }

  active(name){ const m=this.modules.get(name); return m?.activeHash?structuredClone(m.versions.get(m.activeHash)):null; }
  versions(name){ const m=this.modules.get(name); return m?[...m.versions.values()].map(x=>structuredClone(x)):[]; }
  snapshot(){ return {modules:[...this.modules.values()].map(m=>({name:m.name,activeHash:m.activeHash,versions:[...m.versions.values()].map(x=>structuredClone(x))})),events:structuredClone(this.events)}; }
  #record(name,hash){ const r=this.modules.get(name)?.versions.get(hash); if(!r) throw new Error(`Unknown version ${name}@${hash}`); return r; }
}
export default VersionLineageRegistry;
