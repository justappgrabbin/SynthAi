import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

function hashText(text){ return createHash('sha256').update(String(text)).digest('hex'); }

export class LocalTerminalHost {
  constructor({defaultCwd=process.env.HOME??process.cwd()}={}){
    this.id='termux-local-terminal';
    this.defaultCwd=defaultCwd;
  }

  async run({argv,cwd=this.defaultCwd,env={},timeoutMs=120000}={}){
    if(!Array.isArray(argv)||!argv.length) throw new Error('executor argv required');
    return new Promise((resolve,reject)=>{
      const child=spawn(String(argv[0]),argv.slice(1).map(String),{
        cwd,shell:false,env:{...process.env,...env},stdio:['ignore','pipe','pipe']
      });
      let stdout='',stderr='',settled=false;
      const timer=timeoutMs>0?setTimeout(()=>{ if(!settled) child.kill('SIGTERM'); },timeoutMs):null;
      child.stdout?.on('data',chunk=>stdout+=chunk);
      child.stderr?.on('data',chunk=>stderr+=chunk);
      child.on('error',error=>{if(timer)clearTimeout(timer);if(!settled){settled=true;reject(error);}});
      child.on('close',(code,signal)=>{
        if(timer)clearTimeout(timer);
        if(settled)return;settled=true;
        resolve({
          ok:Number(code??1)===0,exitCode:Number(code??1),signal:signal??null,stdout,stderr,
          stdoutHash:hashText(stdout),stderrHash:hashText(stderr)
        });
      });
    });
  }

  async start({argv,cwd=this.defaultCwd,env={},label=null}={}){
    if(!Array.isArray(argv)||!argv.length) throw new Error('executor argv required');
    const child=spawn(String(argv[0]),argv.slice(1).map(String),{
      cwd,shell:false,env:{...process.env,...env},detached:true,stdio:'ignore'
    });
    child.unref();
    return {pid:child.pid,label:label??argv[0],argv:[...argv],cwd};
  }

  async stop(pid){
    try{process.kill(Number(pid),'SIGTERM');return {stopped:true,pid:Number(pid)};}
    catch(error){if(error?.code==='ESRCH')return {stopped:true,pid:Number(pid),alreadyStopped:true};throw error;}
  }

  async isRunning(pid){
    try{process.kill(Number(pid),0);return true;}catch{return false;}
  }

  async write(filePath,content){
    await mkdir(path.dirname(filePath),{recursive:true});
    await writeFile(filePath,content);
    return filePath;
  }

  async read(filePath){ return readFile(filePath); }

  async setReadOnly(filePath,value=true){
    await chmod(filePath,value?0o444:0o644);
    return true;
  }
}

export default LocalTerminalHost;
