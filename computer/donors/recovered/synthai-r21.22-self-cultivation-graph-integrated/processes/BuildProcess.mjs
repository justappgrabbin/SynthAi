const hash=s=>{let h1=2166136261,h2=0x9e3779b9;for(const c of String(s)){const n=c.charCodeAt(0);h1^=n;h1=Math.imul(h1,16777619);h2^=n+((h2<<6)>>>0)+(h2>>>2);h2>>>=0;}return (((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')).repeat(4));};
/** Sovereign build pipeline. Command execution is injected by the residence host. */
export class BuildProcess{
 constructor({runner=null,clock=()=>Date.now()}={}){this.runner=runner;this.clock=clock;this.history=[];}
 setRunner(runner){if(typeof runner!=='function')throw new TypeError('build runner must be a function');this.runner=runner;return this;}
 async run({workspace,steps=[]}={}){if(!workspace)throw new Error('workspace required');if(typeof this.runner!=='function'){const rec={buildId:`build-${this.clock()}-${this.history.length+1}`,status:'unverified',workspace,results:[],parent:this.history.at(-1)?.fingerprint||'genesis',reason:'no residence build runner attached'};this.history.push(rec);return rec;}const buildId=`build-${this.clock()}-${this.history.length+1}`;const results=[];for(const step of steps){const r=await this.runner(step,{workspace,buildId});results.push({step:typeof step==='string'?step:step.name||'step',...r});if(r?.ok===false){const rec={buildId,status:'failed',workspace,results,parent:this.history.at(-1)?.fingerprint||'genesis'};this.history.push(rec);return rec;}}const fingerprint=hash(JSON.stringify({workspace,results,parent:this.history.at(-1)?.fingerprint||'genesis'}));const rec={buildId,status:'verified',workspace,results,parent:this.history.at(-1)?.fingerprint||'genesis',fingerprint};this.history.push(rec);return rec;}
 snapshot(){return {history:[...this.history]};}
}
export default BuildProcess;
