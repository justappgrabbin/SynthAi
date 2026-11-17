import {pathName} from './foundation.mjs';
export class Workspace {
  constructor(storage){this.storage=storage;}
  async state(){return await this.storage.read()||{files:{},versions:[],runs:[]};}
  async files(){return (await this.state()).files;}
  async assets(){return (await this.state()).assets||{};}
  async writeAsset(path,bytes,type='application/octet-stream'){
    pathName(path);const data=Array.from(new Uint8Array(bytes));
    return this.storage.update(state=>{state ||= {files:{},versions:[],runs:[]};state.assets ||= {};if(Object.hasOwn(state.assets,path))state.versions.push({path,asset:state.assets[path],revision:state.versions.length});state.assets[path]={type,bytes:data};return state;});
  }
  async history(){return (await this.state()).runs;}
  async write(path,source){
    pathName(path);if(typeof source!=='string')throw Error('Source must be text');
    return this.storage.update(state=>{
      state ||= {files:{},versions:[],runs:[]};
      if(Object.hasOwn(state.files,path))state.versions.push({path,source:state.files[path],revision:state.versions.length});
      state.files[path]=source;return state;
    });
  }
  async saveRun(run){return this.storage.update(state=>{
    state ||= {files:{},versions:[],runs:[]};
    const index=state.runs.findIndex(r=>r.id===run.id);
    if(index<0)state.runs.push(structuredClone(run));else state.runs[index]=structuredClone(run);
    return state;
  });}
}
export class IndexedWorkspaceStorage {
  constructor(name='independent-project-v1'){this.name=name;}
  async db(){
    if(this.connection)return this.connection;
    this.connection=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return this.connection;
  }
  async read(){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('workspace','readonly').objectStore('workspace').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async update(fn){
    const db=await this.db();
    return new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite'),store=tx.objectStore('workspace'),r=store.get('current');r.onsuccess=()=>{try{store.put(fn(r.result),'current');}catch(e){tx.abort();reject(e);}};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Workspace transaction aborted'));tx.onerror=()=>reject(tx.error);});
  }
}
