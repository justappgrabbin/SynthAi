import {Computer,checkArtifact} from './foundation.mjs';
const fresh=()=>({schema:'independent-store/v1',artifacts:{},active:{},journal:[]});
export class BrowserStore {
  constructor(name='independent-executable-v1') {this.name=name;}
  async db() {
    if(this.connection)return this.connection;
    this.connection=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(this.name,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('state');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    return this.connection;
  }
  async export() {
    const db=await this.db();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('computer');
      r.onsuccess=()=>resolve(r.result||fresh());r.onerror=()=>reject(r.error);
    });
  }
  async get(name) {
    const state=await this.export(),artifact=state.artifacts[state.active[name]||name];
    if(!artifact)throw Error('Capability not found: '+name);
    return checkArtifact(artifact);
  }
  async list() {
    const state=await this.export();
    return Object.entries(state.active).map(([name,id])=>({name,digest:id,description:state.artifacts[id].description}));
  }
  async put(artifact) {
    await checkArtifact(artifact);
    const db=await this.db();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('computer');
      r.onsuccess=()=>{
        const state=r.result||fresh();
        state.artifacts[artifact.digest]=artifact;state.active[artifact.name]=artifact.digest;
        state.journal.push({type:'verified-install',name:artifact.name,digest:artifact.digest,parents:artifact.parents,sequence:state.journal.length});
        store.put(state,'computer');
      };
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Persistence failed'));tx.onerror=()=>reject(tx.error);
    });
  }
  async restore(state) {
    if(state?.schema!=='independent-store/v1'||!state.artifacts||!state.active||!Array.isArray(state.journal))throw Error('Invalid workspace backup');
    for(const artifact of Object.values(state.artifacts))await checkArtifact(artifact);
    const existing=await this.export();
    for(const id of Object.values(state.active))if(!state.artifacts[id])throw Error('Backup has a missing active artifact');
    // Import by digest; retain current versions and active choices on name conflicts.
    const merged={schema:existing.schema,artifacts:{...state.artifacts,...existing.artifacts},active:{...state.active,...existing.active},journal:[...existing.journal,{type:'restore',artifacts:Object.keys(state.artifacts),sequence:existing.journal.length}]};
    const db=await this.db();
    await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(merged,'computer');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});
  }
}
export function browserExecutor({url,entry,invocation},timeout=4000) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./foundation-browser-worker.mjs',import.meta.url),{type:'module'});
    const timer=setTimeout(()=>{worker.terminate();reject(Error('Execution timed out'));},timeout);
    worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();data.ok?resolve(data.result):reject(Error(data.error));};
    worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};
    worker.postMessage({url,entry,invocation});
  });
}
export function openBrowserComputer() {return new Computer({parser:globalThis.acorn,store:new BrowserStore(),executor:browserExecutor});}
