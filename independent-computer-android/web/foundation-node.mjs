import {createRequire} from 'node:module';
import {Worker} from 'node:worker_threads';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Computer,checkArtifact} from './foundation.mjs';
const require=createRequire(import.meta.url);
export const parser=require('./acorn.js');
export class DiskStore {
  constructor(directory='.independent-state') {this.directory=resolve(directory);this.pending=Promise.resolve();}
  async export() {
    try{return JSON.parse(await readFile(join(this.directory,'state.json'),'utf8'));}
    catch(error){if(error.code==='ENOENT')return {schema:'independent-store/v1',artifacts:{},active:{},journal:[]};throw error;}
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
  put(artifact) {
    const operation=this.pending.catch(()=>{}).then(async()=>{
      await checkArtifact(artifact);
      const state=await this.export();
      state.artifacts[artifact.digest]=artifact;
      state.active[artifact.name]=artifact.digest;
      state.journal.push({type:'verified-install',name:artifact.name,digest:artifact.digest,parents:artifact.parents,sequence:state.journal.length});
      await mkdir(this.directory,{recursive:true});
      const temporary=join(this.directory,randomUUID()+'.tmp');
      await writeFile(temporary,JSON.stringify(state));
      await rename(temporary,join(this.directory,'state.json'));
    });
    this.pending=operation;return operation;
  }
}
export function executor({url,entry,invocation},timeout=3000) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./foundation-node-worker.mjs',import.meta.url),{
      workerData:{url,entry,invocation},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:32}});
    const timer=setTimeout(()=>{worker.terminate();reject(Error('Execution timed out'));},timeout);
    function finish(error,result) {clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
    worker.once('message',m=>finish(m.ok?null:Error(m.error),m.result));
    worker.once('error',e=>finish(e));
    worker.once('exit',code=>{if(code!==0)finish(Error('Execution worker exited: '+code));});
  });
}
export function openComputer(directory) {return new Computer({parser,store:new DiskStore(directory),executor});}
