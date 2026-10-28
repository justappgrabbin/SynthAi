/**
 * Synthia proactive execution adapter. Uses original Computer projects, VFS,
 * resident neural/Klein tools, and optional ORIGINAL TRIDENT model gateway.
 *
 * ProactiveAgent (THUNLP, Apache-2.0) informed the observe -> propose ->
 * feedback -> execute behavior. It is NOT imported as a second computer, its
 * Android stubs do NOT execute, and its 8B model weights are NOT bundled.
 *
 * Never deletes, rewrites existing files, shells out, or silently git-pushes.
 */
const STATE_KEY='computer.proactive.v1';
const ORIGINAL='https://github.com/thunlp/ProactiveAgent';
const clone=value=>structuredClone(value);
const timestamp=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const initial=()=>({version:1,events:[],reports:[],proposals:[],builds:[],feedback:[]});
const bounded=(array,limit)=>array.slice(-limit);
const validText=(v,name,max=4096)=>{
 if(typeof v!=='string'||!v.trim()||v.length>max)throw new TypeError(name+' must be nonempty and <= '+max+' characters');
 return v.trim();
};
function validPath(value){
 if(typeof value!=='string'||value.length>180)throw new TypeError('Invalid file path');
 const path=value.replaceAll('\\','/');
 const parts=path.split('/');
 if(path.startsWith('/')||parts.some(x=>!x||x==='.'||x==='..'||x.startsWith('.git'))||/[\u0000-\u001f]/.test(path)||/^[A-Za-z]:/.test(path))
  throw new TypeError('Paths must be new, relative files inside a project');
 if(!/^[\w.\- /]+$/.test(path))throw new TypeError('Unsupported path characters');
 return path;
}
function validateFiles(files){
 if(!Array.isArray(files)||files.length<1||files.length>8)throw new TypeError('Provide 1-8 new source files');
 const names=new Set(),out=[];let total=0;
 for(const file of files){
  const path=validPath(file?.path);
  if(names.has(path))throw new TypeError('Duplicate file in build: '+path);
  names.add(path);
  const content=validText(file?.content,'Source code',24000);
  total+=content.length;
  out.push({path,content,type:typeof file.type==='string'&&/^(text\/|application\/json)/.test(file.type)?file.type:'text/plain'});
 }
 if(total>52000)throw new RangeError('Build source exceeds 52 KB');
 return out;
}
function parseModelBuild(output){
 const raw=validText(output,'Model output',20000);
 // Require an actual structured file payload. Never claim a valid program
 // merely because a language model emitted ordinary tokens or a description.
 const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
 const obj=JSON.parse(fenced?fenced[1]:raw);
 return validateFiles(obj.files);
}
function publicProposal(p){
 const {files,...rest}=p;
 return {...rest,fileCount:files?.length??0,paths:files?.map(f=>f.path)??[]};
}
function publicEvent(x){
 return {id:x.id,kind:x.kind,source:x.source,at:x.at,summary:x.summary,
  readingId:x.readingId??null};
}
export class ProactiveSynthia {
 constructor({computer,modelGateway=null,enableAutomaticNewFiles=true}={}){
  if(!computer?.state||!computer?.projects||!computer?.synthia||!computer?.vfs)
   throw new TypeError('Boot an actual SynthAI Computer before starting Synthia');
  this.computer=computer;
  this.modelGateway=modelGateway;
  this.enableAutomaticNewFiles=enableAutomaticNewFiles;
  this.pending=Promise.resolve();
  this.subscriptions=[];
  this.started=false;
 }
 async boot(){
  if(this.started)return this;
  this.started=true;
  // Source intelligence is reactive to EXISTING Computer events, not an
  // invented filesystem or desktop surveillance implementation.
  this.subscriptions.push(this.computer.bus.on('vfs:write',({payload})=>{
   const path=payload?.path??'';
   if(!path.startsWith('/home/user/Imports/')||payload?.meta?.encoding==='base64')return;
   this.pending=this.pending.catch(()=>{}).then(()=>this.inspectImportedSource(path))
    .catch(error=>this.computer.bus.emit('proactive:error',{operation:'inspect-import',message:error.message}));
  }));
  this.computer.bus.emit('proactive:ready',this.status());
  return this;
 }
 stop(){for(const un of this.subscriptions)un();this.subscriptions=[];this.started=false}
 _get(){return this.computer.state.get(STATE_KEY,null)??initial()}
 async _save(state){await this.computer.state.set(STATE_KEY,state,{source:'proactive-synthia'})}
 status(){
  const state=this._get();
  return {active:this.started,source:ORIGINAL,mode:'event-sensing-and-owner-original-model',
   watches:['computer-vfs-imports','explicit-local-events'],
   noDelete:true,gitPushRequiresOwnerApproval:true,largeBuildRequiresApproval:true,
   automaticNewFiles:this.enableAutomaticNewFiles,
   modelConnected:Boolean(this.modelGateway),
   events:state.events.length,reports:state.reports.length,
   proposals:state.proposals.filter(x=>x.status==='pending').length,
   built:state.builds.length,feedback:state.feedback.length};
 }
 snapshot(){
  const state=this._get();
  return {status:this.status(),events:state.events.map(publicEvent),
   reports:clone(state.reports),proposals:state.proposals.map(publicProposal),
   builds:state.builds.map(x=>({...x})),feedback:clone(state.feedback)};
 }
 async observe({kind='activity',summary,source='user:local'}={}){
  if(!this.started)throw new Error('Synthia proactive adapter is not booted');
  const text=validText(summary,'Observation',2048);
  if(!['activity','build-request','test-failure','source-change','research','model-feedback'].includes(kind))
   throw new TypeError('Unknown observation kind');
  const reading=await this.computer.synthia.observe(text,{actor:source,context:{scope:'proactive',kind}});
  const record={id:id(),kind,summary:text,source,at:timestamp(),readingId:reading.id,
   intent:reading.intent?.chosen?.label??null};
  const data=this._get();
  data.events=bounded([...data.events,record],120);
  if(kind==='test-failure'){
   const proposal={id:id(),status:'pending',action:'investigate-test-failure',
    reason:'A failing test was reported; inspect actual failure evidence before changing code',
    eventId:record.id,createdAt:timestamp(),requiresApproval:false};
   data.proposals=bounded([...data.proposals,proposal],80);
  }else if(kind==='build-request'){
   const proposal={id:id(),status:'pending',action:'generate-code',
    reason:'Use verified original TRIDENT model generation to draft additive source, never silently substitute a canned application',
    eventId:record.id,createdAt:timestamp(),requiresApproval:false};
   data.proposals=bounded([...data.proposals,proposal],80);
  }
  await this._save(data);
  this.computer.bus.emit('proactive:observed',{id:record.id,kind});
  return {id:record.id,kind,readingId:reading.id,
   toolEvidence:reading.toolEvidence,proposal:data.proposals.at(-1)?.eventId===record.id?publicProposal(data.proposals.at(-1)):null};
 }
 async inspectImportedSource(path){
  if(!this.started)throw new Error('Synthia proactive adapter is not booted');
  if(!path.startsWith('/home/user/Imports/'))throw new TypeError('Only previously admitted source paths are inspected');
  const record=this.computer.vfs.read(path);
  if(!record||record.meta?.encoding==='base64')return null;
  const text=String(record.content??'');
  if(!text.trim()||text.length>250000)return null;
  const state=this._get();
  const signature=record.meta?.digest??path+':'+record.updatedAt;
  if(state.reports.some(x=>x.path===path&&x.signature===signature))return null;
  const language=await this.computer.synthia.runTool('autoling',{text:text.slice(0,3800)});
  const issues=[];
  for(const [index,line] of text.split('\n').entries()){
   if(issues.length>=24)break;
   if(/\b(?:TODO|FIXME|HACK)\b/i.test(line))
    issues.push({line:index+1,summary:line.trim().slice(0,160)});
  }
  const report={id:id(),path,signature,at:timestamp(),engine:'owner-original-autoling',
   lines:text.split('\n').length,grammarConfidence:Number.isFinite(language?.confidence)?language.confidence:null,
   issues,requiresReview:issues.length>0};
  state.reports=bounded([...state.reports,report],80);
  if(issues.length){
   state.proposals=bounded([...state.proposals,{
    id:id(),status:'pending',action:'review-source-issues',
    reason:issues.length+' TODO/FIXME markers found in '+path,
    path,reportId:report.id,createdAt:timestamp(),requiresApproval:false
   }],80);
  }
  await this._save(state);
  this.computer.bus.emit('proactive:source-analyzed',{id:report.id,path,issues:issues.length});
  return report;
 }
 async draftWithTrident({goal,name='synthia-build',backend='trident'}={}){
  const purpose=validText(goal,'Build goal',1600);
  if(!['trident','modelmaker'].includes(backend))throw new TypeError('Unknown existing model backend');
  await this.observe({kind:'build-request',summary:purpose});
  if(!this.modelGateway)return {status:'model-not-connected',built:false,reason:'Original model gateway not attached'};
  let result;
  try{
   result=await this.modelGateway.generate({
    text:'Return JSON only: {"files":[{"path":"src/main.js","content":"actual source code"}]}. Produce working new source files; no deletion or overwriting. Goal: '+purpose,
    backend,head:backend==='trident'?'code':null,maxNewTokens:64,temperature:0.3
   });
  }catch(error){
   return {status:'model-not-ready',built:false,backend,error:error.message};
  }
  if(!result?.weightsLoaded||!result?.inferenceVerified)
   return {status:'unverified-generation',built:false,backend};
  let files;
  try{files=parseModelBuild(result.output)}
  catch(error){return {status:'invalid-model-source',built:false,backend,
    reason:error.message,modelOutput:result.output.slice(0,800)}}
  return this.buildNewFiles({goal:purpose,name,files,origin:'verified-model-output'});
 }
 async buildNewFiles({goal,name,files,projectId=null,origin='owner-provided-source',approved=false}={}){
  const purpose=validText(goal,'Build goal',1600);
  const safeName=validText(name,'Project name',100);
  const normalized=validateFiles(files);
  if(projectId!==null&&!this.computer.projects.get(projectId))throw new TypeError('Unknown destination project');
  if(projectId){
   for(const file of normalized)if(this.computer.projects.readFile(projectId,file.path))
    throw new Error('Cannot overwrite an existing file: '+file.path);
  }
  const large=normalized.length>3||normalized.reduce((a,f)=>a+f.content.length,0)>8000;
  if(large&&!approved){
   const state=this._get(),proposal={id:id(),action:'build-add-only',
    reason:purpose,projectName:safeName,projectId,files:normalized,
    origin,requiresApproval:true,status:'pending',createdAt:timestamp()};
   state.proposals=bounded([...state.proposals,proposal],80);
   await this._save(state);
   return {status:'owner-approval-required',proposal:publicProposal(proposal),built:false};
  }
  if(!this.enableAutomaticNewFiles&&!approved)throw new Error('Automatic building is disabled');
  // Source content can only be added to new paths. No deletes, replacements,
  // writes outside the original ProjectWorkspace, or unreviewed git pushes.
  let project;
  if(projectId)project=this.computer.projects.get(projectId);
  else project=await this.computer.projects.create({name:safeName,description:purpose});
  const written=[];
  for(const file of normalized){
   if(this.computer.projects.readFile(project.id,file.path))
    throw new Error('Cannot overwrite an existing file: '+file.path);
   const record=await this.computer.projects.writeFile(project.id,file.path,file.content,{type:file.type});
   written.push({path:record.path,bytes:file.content.length});
  }
  const receipt={id:id(),projectId:project.id,projectName:project.name,goal:purpose,
   origin,at:timestamp(),files:written,verifiedBuild:false,
   verification:'source files persisted; executable behavior not automatically verified'};
  const state=this._get();
  state.builds=bounded([...state.builds,receipt],80);
  await this._save(state);
  this.computer.bus.emit('proactive:build-created',{projectId:project.id,files:written.length});
  return {status:'files-created',built:true,receipt};
 }
 async decide({proposalId,decision,confirmation=null}={}){
  if(!['accept','reject','ignore'].includes(decision))throw new TypeError('Decision must be accept, reject, or ignore');
  const state=this._get(),p=state.proposals.find(x=>x.id===proposalId);
  if(!p||p.status!=='pending')throw new Error('Pending proposal not found');
  if(p.action==='publish-project'&&decision==='accept'&&confirmation!=='PUBLISH '+p.projectId)
   throw new Error('Publishing requires the explicit confirmation PUBLISH '+p.projectId);
  if(p.action==='build-add-only'&&decision==='accept'&&confirmation!=='BUILD '+p.id)
   throw new Error('Large build requires explicit confirmation BUILD '+p.id);
  let result=null;
  if(decision==='accept'&&p.action==='build-add-only'){
   result=await this.buildNewFiles({goal:p.reason,name:p.projectName,projectId:p.projectId,
    files:p.files,origin:p.origin,approved:true});
  }
  if(decision==='accept'&&p.action==='publish-project'){
   // Even if GitHub is configured, this can only happen after explicit
   // owner confirmation of the exact project ID.
   result=await this.computer.projects.publish(p.projectId,{backend:'github'});
  }
  p.status=decision==='accept'?'accepted':decision==='reject'?'rejected':'ignored';
  p.decidedAt=timestamp();
  const latest=this._get();
  const matching=latest.proposals.find(x=>x.id===p.id);
  if(!matching||matching.status!=='pending')throw new Error('Proposal changed during decision');
  matching.status=p.status;matching.decidedAt=p.decidedAt;
  latest.feedback=bounded([...latest.feedback,{proposalId:p.id,decision,at:p.decidedAt}],160);
  await this._save(latest);
  if(p.eventId){
   const source=latest.events.find(x=>x.id===p.eventId);
   if(source)await this.computer.synthia.teach({
    text:source.summary,capability:'proactive/'+p.action,
    accepted:decision==='accept',source:'explicit-owner-feedback'
   });
  }
  this.computer.bus.emit('proactive:decision',{proposalId:p.id,decision});
  return {proposal:publicProposal(matching),result};
 }
 async requestPublish({projectId}={}){
  if(typeof projectId!=='string'||!this.computer.projects.get(projectId))
   throw new TypeError('Select an existing Computer project');
  const state=this._get(),proposal={id:id(),status:'pending',action:'publish-project',
   reason:'GitHub publication is NEVER automatic; requires an explicit owner decision',
   projectId,createdAt:timestamp(),requiresApproval:true};
  state.proposals=bounded([...state.proposals,proposal],80);
  await this._save(state);
  return {status:'owner-approval-required',proposal:publicProposal(proposal)};
 }
}
