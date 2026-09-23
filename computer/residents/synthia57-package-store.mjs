import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

async function exists(filePath){
  try { await access(filePath); return true; } catch { return false; }
}

async function run(argv,{cwd}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(argv[0],argv.slice(1),{cwd,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',c=>stdout+=c);
    child.stderr.on('data',c=>stderr+=c);
    child.on('error',reject);
    child.on('close',code=>{
      if(code===0) resolve({code,stdout,stderr});
      else reject(new Error(argv[0]+' failed ('+code+'): '+(stderr||stdout)));
    });
  });
}

async function findRuntimeRoot(root,depth=0){
  if(depth>5) return null;
  const fed=path.join(root,'src','federated-synthia.mjs');
  const base=path.join(root,'vendor','pure-synthia-v0.4.0','src','synthia','synthiaRuntime.mjs');
  if(await exists(fed) && await exists(base)) return root;
  let entries=[];
  try { entries=await readdir(root,{withFileTypes:true}); } catch { return null; }
  for(const entry of entries){
    if(!entry.isDirectory()) continue;
    const found=await findRuntimeRoot(path.join(root,entry.name),depth+1);
    if(found) return found;
  }
  return null;
}

export class Synthia57PackageStore {
  constructor({state,bus=null,root=path.join(os.homedir(),'.synthai','packages','synthia57'),maxBytes=256*1024*1024}={}){
    if(!state?.get||!state?.set) throw new TypeError('Synthia57PackageStore requires StateStore');
    Object.assign(this,{state,bus,root,maxBytes});
  }

  current(){ return this.state.get('synthia57.package',null); }

  async installZipStream(readable,{contentLength=null,source='android-document-picker'}={}){
    if(contentLength!=null && Number(contentLength)>this.maxBytes) throw new Error('Synthia 5.7 package exceeds '+this.maxBytes+' bytes');
    await mkdir(path.join(this.root,'archives'),{recursive:true});
    await mkdir(path.join(this.root,'installed'),{recursive:true});

    const provisional=path.join(this.root,'archives','incoming-'+Date.now()+'.zip');
    const hash=createHash('sha256');
    let bytes=0;
    const meter=new Transform({
      transform(chunk,enc,cb){
        bytes+=chunk.length;
        if(bytes>256*1024*1024) return cb(new Error('Synthia 5.7 package exceeds 256 MB'));
        hash.update(chunk); cb(null,chunk);
      }
    });
    await pipeline(readable,meter,createWriteStream(provisional,{mode:0o600}));
    const sha256=hash.digest('hex');
    const archive=path.join(this.root,'archives',sha256+'.zip');

    if(!(await exists(archive))){
      const { rename } = await import('node:fs/promises');
      await rename(provisional,archive);
    }
    // Never delete an incoming duplicate. Preserve it as a receipt when rename is skipped.
    const installDir=path.join(this.root,'installed',sha256);
    if(!(await exists(installDir))){
      await mkdir(installDir,{recursive:true});
      await run(['unzip','-q',archive,'-d',installDir]);
    }

    const base=await findRuntimeRoot(installDir);
    if(!base) throw new Error('ZIP is not a Synthia 5.7 package: runtime root not found');
    const record={
      installed:true,
      version:'0.5.7',
      sha256,
      byteLength:bytes,
      archive,
      base,
      source:String(source),
      installedAt:Date.now(),
      preservation:'archive-and-extracted-copy-retained',
    };
    await this.state.set('synthia57.package',record,{source:'synthia57-package-store'});
    this.bus?.emit('synthia57:package-installed',{...record,archive:undefined,base:undefined});
    return record;
  }

  async verify(record=this.current()){
    if(!record?.base) return {installed:false,reason:'NO_PACKAGE'};
    const base=record.base;
    const ok=await exists(path.join(base,'src','federated-synthia.mjs'))
      && await exists(path.join(base,'vendor','pure-synthia-v0.4.0','src','synthia','synthiaRuntime.mjs'));
    return {installed:ok,version:record.version??'0.5.7',sha256:record.sha256??null,base:ok?base:null};
  }

  snapshot(){
    const record=this.current();
    if(!record) return {installed:false,version:'0.5.7'};
    return {
      installed:true,
      version:record.version,
      sha256:record.sha256,
      byteLength:record.byteLength,
      source:record.source,
      installedAt:record.installedAt,
      preservation:record.preservation,
    };
  }
}

export default Synthia57PackageStore;
