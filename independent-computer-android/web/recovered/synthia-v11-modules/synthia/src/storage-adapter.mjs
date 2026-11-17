import { BrowserAutomataStore } from 'synthia/vendor/ingestion/src/automata/browser-automata-store.mjs';
export class FoundationStore extends BrowserAutomataStore {
 async open(){
  if(this.localStorageFallback)return this;
  try{await super.open();if(this.mode==='indexeddb'||!globalThis.localStorage)return this;throw Error('IndexedDB unavailable');}catch(error){
   this.storageIssue=String(error.message);this.db=null;this.mode='memory';
   try {
    if(globalThis.localStorage){
     const raw=globalThis.localStorage.getItem(this.databaseName);
     this.memory=new Map(raw?JSON.parse(raw,(_,v)=>v?.__synthiaBytes?new Uint8Array(v.__synthiaBytes):v):[]);
     globalThis.localStorage.setItem(this.databaseName,raw??'[]');
     this.localStorageFallback=true;this.mode='localstorage';
    }
   }catch{}
   return this;
  }
 }
 async get(key){await this.open();return this.localStorageFallback?structuredClone(this.memory.get(String(key))??null):super.get(key);}
 async put(key,value){await this.open();if(!this.localStorageFallback)return super.put(key,value);const next=new Map(this.memory);next.set(String(key),structuredClone(value));globalThis.localStorage.setItem(this.databaseName,JSON.stringify([...next],(_,v)=>v instanceof Uint8Array?{__synthiaBytes:Array.from(v)}:v));this.memory=next;return true;}
 async audit(){await this.open();return {mode:this.mode,durable:this.mode==='indexeddb'||this.localStorageFallback===true,storageIssue:this.storageIssue??null,backendRequired:false,workerRequired:false};}
}
