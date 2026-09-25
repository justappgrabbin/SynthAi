import CONSTITUTION from './ConstitutionalSeed.mjs';
import DEFAULT_COMPOSITION from './defaultComposition.mjs';
const clone=x=>x==null?x:structuredClone(x);
const uniq=a=>[...new Set(a)];
const safeGoal=x=>String(x??'').trim().slice(0,4000);
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')};
const capabilityHints=text=>{
 const t=String(text).toLowerCase(), out=[];
 if(/code|build|fix|repair|compile|module|tool|engine|process/.test(t))out.push('inspect-code','plan-code','synthesize-code','emit-tests','stage-source-change','run-build-pipeline');
 if(/memory|remember|recall|trace/.test(t))out.push('persistent-memory');
 if(/phone|ui|interface|screen|widget/.test(t))out.push('phone-shell');
 if(/universe/.test(t))out.push('universe-widget');
 if(/acode|linux|editor|terminal/.test(t))out.push('editor','linux','local-build');
 if(/knowledge|book|corpus|learn/.test(t))out.push('knowledge-corpus');
 return uniq(out);
};
export class AutopoieticComposer{
 constructor({unit=null,composition=DEFAULT_COMPOSITION,clock=()=>Date.now(),exists=null}={}){
  this.unit=unit;this.composition=composition;this.clock=clock;this.exists=exists;this.host=null;this.history=[];this.lastInspection=null;
 }
 setHost(host){if(host!==null&&typeof host!=='object')throw new TypeError('host adapter must be an object');this.host=host;return this;}
 async #exists(path){
  if(this.exists)return Boolean(await this.exists(path));
  if(typeof process==='undefined'||!process?.versions?.node)return null;
  try{const fs=await import('node:fs/promises');await fs.access(new URL('../'+String(path).replace(/^\/+/,''),import.meta.url));return true}catch{return false}
 }
 #byId(){return new Map(this.composition.parts.map(p=>[p.id,p]));}
 #expand(ids){const by=this.#byId(), seen=new Set(), visit=id=>{if(seen.has(id))return;const p=by.get(id);if(!p)return;seen.add(id);for(const d of p.dependencies||[])visit(d)};for(const id of ids)visit(id);return [...seen];}
 async inspect(){
  const parts=[];for(const p of this.composition.parts){const present=await this.#exists(p.path);parts.push({...clone(p),present,status:present===true?'mounted':present===false?'missing':'unknown'});}const requiredMissing=parts.filter(p=>p.required&&p.present===false).map(p=>p.id);const report={type:'autopoietic-inspection',at:this.clock(),constitutionVersion:'1.0.0',parts,requiredMissing,viable:requiredMissing.length===0||requiredMissing.every(id=>id!=='seed.constitution')};this.lastInspection=report;return clone(report);
 }
 plan(goal,{capabilities=[]}={}){
  const wanted=uniq([...capabilityHints(goal),...capabilities.map(String)]);const direct=this.composition.parts.filter(p=>p.required||p.capabilities?.some(c=>wanted.includes(c))).map(p=>p.id);const selected=this.#expand(direct);const by=this.#byId();const parts=selected.map(id=>by.get(id)).filter(Boolean);const plan={id:`autopoiesis-plan:${hash(JSON.stringify({goal,wanted,selected}))}`,at:this.clock(),goal:safeGoal(goal),wantedCapabilities:wanted,parts:parts.map(clone),steps:CONSTITUTION.lifecycle,requiresVerification:true};this.history.push({type:'plan',id:plan.id,at:plan.at,goal:plan.goal,parts:selected});return clone(plan);
 }
 chooseTools(plan){
  const toolCaps=new Set(plan.wantedCapabilities);const choices=[];
  const push=(id,reason,available)=>choices.push({id,reason,available:Boolean(available)});
  if([...toolCaps].some(c=>['inspect-code','plan-code','synthesize-code','emit-tests'].includes(c)))push('autocoder','construct bounded source candidates',this.unit?.autoCoder);
  if(toolCaps.has('stage-source-change'))push('source-mutation','stage changes outside active source',this.unit?.sourceMutation);
  if(toolCaps.has('run-build-pipeline'))push('build-process','run injected residence build/verification steps',this.unit?.buildProcess);
  push('code-immune','diagnose source integrity before/after mutation',this.unit?.codeImmune);
  if([...toolCaps].some(c=>['editor','linux','local-build'].includes(c)))push('acode-linux-residence','resident execution/build environment',true);
  return choices;
 }
 async reconcile(goal,{capabilities=[],execute=false,projectFiles=[],changes=[],tests=[],workspace='.'}={}){
  const inspection=await this.inspect(), plan=this.plan(goal,{capabilities}), tools=this.chooseTools(plan), by=new Map(inspection.parts.map(p=>[p.id,p]));
  const missing=plan.parts.filter(p=>by.get(p.id)?.present===false).map(p=>p.id);const event={type:'autopoietic-cycle',id:`autopoiesis:${this.clock()}:${this.history.length+1}`,at:this.clock(),goal:plan.goal,planId:plan.id,missing,tools,status:'planned',adopted:[],staged:[],verification:null,build:null};
  if(!execute){this.history.push(clone(event));return clone(event)}
  const nodeResidence=typeof process!=='undefined'&&Boolean(process?.versions?.node);const host=this.host;
  if(!nodeResidence&&!host)throw new Error('autopoietic construction requires a filesystem/build residence adapter');
  if(!this.unit?.autoCoder||!this.unit?.buildProcess||!this.unit?.codeImmune)throw new Error('construction organs unavailable');
  if(!host&&!this.unit?.sourceMutation)throw new Error('source mutation organ unavailable');
  const inspectionBefore=this.unit.codeImmune.inspect(projectFiles);event.verification={before:inspectionBefore.status};
  if(changes.length||tests.length){const changeSet=this.unit.autoCoder.synthesizeChangeSet({goal:plan.goal,project:projectFiles,changes,tests});for(const f of changeSet.files){const request={target:f.path,operation:'replace',payload:f.source,reason:`autopoietic cycle ${event.id}`};const staged=host?.stageFile?await host.stageFile(request):await this.unit.sourceMutation.stage(request);event.staged.push(staged);}event.changeSetId=changeSet.id;}
  event.build=host?.runBuild?await host.runBuild({workspace,steps:['syntax','tests','integrity'],staged:event.staged}):await this.unit.buildProcess.run({workspace,steps:['syntax','tests','integrity']});
  event.status=event.build.status==='verified'?'verified-staged':'failed';
  if(event.status==='verified-staged')event.note='Verified candidates remain staged until an explicit adoption step copies them into active source.';
  this.unit.memory?.remember?.('autopoiesis-events',event);this.history.push(clone(event));return clone(event);
 }
 snapshot(){return {host:this.host?{kind:this.host.kind||'residence-adapter'}:null,constitution:CONSTITUTION,composition:{version:this.composition.version,organism:this.composition.organism,parts:this.composition.parts.map(p=>({id:p.id,kind:p.kind,address:p.address,required:p.required,capabilities:[...(p.capabilities||[])]}))},lastInspection:this.lastInspection,history:this.history.slice(-64)};}
}
export default AutopoieticComposer;
