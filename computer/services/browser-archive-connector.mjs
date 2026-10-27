/**
 * Browser archive connector — real state/VFS/project + Synthia/Klein tool integration.
 *
 * Imported source remains in IndexedDB (provided by caller), not copied into
 * localStorage. Computer owns an addressable manifest and execution receipts.
 * This intentionally does not claim that arbitrary ZIP/Python/React/Tauri is executable.
 */
import {EventBus,MemoryPersistence,StateStore,Registry} from '../core/kernel.mjs';
import {VirtualFileSystem,ArtifactIntake} from '../runtime/storage.mjs';
import {ProjectWorkspace} from '../runtime/projects.mjs';
import {ShellManager,MutationDispatcher} from '../runtime/shells.mjs';
import {SynthiaResident} from './synthia-resident.mjs';
import {ToolFactory} from '../engines/unified-execution-spine/src/pure-synthia/merged/tool-factory.js';

const validPath = path => typeof path==='string' && path.length<=400 &&
 !path.includes('\0') && !path.startsWith('/') && !/^[A-Za-z]:/.test(path) &&
 !path.includes('\\') && path.split('/').every(p=>p && p!=='.' && p!=='..');
const roles = [
  ['model','neural|transformer|pytorch|safetensors|onnx|gguf|model|training'],
  ['web','html|vite|react|next|webpack|svelte'],
  ['desktop','tauri|electron'],
  ['mobile','android|gradle|expo|capacitor|termux'],
  ['python','pyproject|requirements|\\.py$'],
  ['tools','tool.factory|automata|ato|primitive|weaver'],
];
const utf8Length = s => new TextEncoder().encode(s).length;
const signature = async text => {
  const bytes = new TextEncoder().encode(text);
  if(!globalThis.crypto?.subtle) throw new Error('Secure WebCrypto is required to verify source');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
};
const detect = files => {
 const joined = files.map(f=>f.path).join('\n').toLowerCase();
 return roles.filter(([_, pattern])=>new RegExp(pattern,'i').test(joined)).map(([name])=>name);
};
function safeFile(file) {
 if(!validPath(file?.path)||typeof file.text!=='string'||file.text.length>1500000) throw new TypeError('Invalid project source path/size');
 return {path:file.path,bytes:utf8Length(file.text),text:file.text};
}

export class BrowserArchiveConnector {
 constructor({persistence=new MemoryPersistence(),namespace='synthai-computer-web'}={}){
  this.bus=new EventBus();
  this.state=new StateStore({bus:this.bus,persistence,namespace});
  const reg=k=>new Registry({kind:k,bus:this.bus});
  this.artifacts=reg('artifact');this.apps=reg('app');this.shells=reg('shell');
  this.tools=reg('tool');this.agents=reg('agent');
  this.automataRegistry=reg('automaton');
  this.vfs=new VirtualFileSystem({bus:this.bus,state:this.state});
  this.projects=new ProjectWorkspace({bus:this.bus,state:this.state,vfs:this.vfs});
  this.shellManager=new ShellManager({bus:this.bus,shells:this.shells,apps:this.apps,state:this.state});
  this.mutations=new MutationDispatcher({bus:this.bus,state:this.state,shellManager:this.shellManager,
    automata:null,tools:this.tools,agents:this.agents,morph:null});
  this.intake=new ArtifactIntake({bus:this.bus,vfs:this.vfs,artifacts:this.artifacts,mutations:this.mutations});
  this.synthia=new SynthiaResident({state:this.state,bus:this.bus});
  this.toolFactory=new ToolFactory();
  this.started=false;
 }
 async boot(){
  if(this.started)return this;
  await this.state.restore();
  this.shells.register('workspace',{name:'Computer project workspace',kind:'source-shell'});
  await this.synthia.boot();
  for(const receipt of this.list()){
   if(!this.artifacts.has(receipt.artifactId)){
    this.artifacts.register(receipt.artifactId,{name:receipt.name,path:receipt.artifactPath,
      type:'application/json',source:'archive-connector',status:'ingested'});
   }
   if(!this.apps.has(receipt.appId))this.apps.register(receipt.appId,{kind:'artifact-app',artifactId:receipt.artifactId});
   if(receipt.mount?.mountId)this.shellManager.mounted.set(receipt.mount.mountId,receipt.mount);
   if(!this.tools.has(receipt.toolId))this.tools.register(receipt.toolId,
      {kind:'source-adapter',projectId:receipt.projectId,source:'indexeddb',status:'registered',
       executable:false});
  }
  this.started=true;return this;
 }
 list(){return Object.values(this.state.get('archiveIntegrations.items',{}));}
 async install({name,files,indexedDbId}={}){
  if(!this.started)throw new Error('Computer bridge must boot before source installation');
  if(typeof name!=='string'||!name.trim()||name.length>200||
    !Array.isArray(files)||!files.length||files.length>350)throw new TypeError('Invalid archive import');
  const selected=files.map(safeFile);
  if(selected.reduce((n,f)=>n+f.bytes,0)>30*1024*1024)throw new RangeError('Imported source exceeds 30 MB limit');
  const paths=new Set();
  for(const f of selected){if(paths.has(f.path))throw new Error('Duplicate source path: '+f.path);paths.add(f.path)}
  const records=[];
  for(const file of selected)records.push({path:file.path,bytes:file.bytes,sha256:await signature(file.text)});
  const archiveSha=await signature(JSON.stringify({name,files:records}));
  const id=archiveSha.slice(0,24),existing=this.state.get('archiveIntegrations.items.'+id,null);
  if(existing)return {...existing,reused:true};
  const manifest={
   format:'synthai-computer-source-install-v1',id,name,indexedDbId:String(indexedDbId||''),
   sha256:archiveSha,files:records,roles:detect(selected),
   provenance:'owner-imported-source',execution:'not-verified',
   installedAt:new Date().toISOString(),
  };
  // The actual contents stay in the IndexedDB source store; only their SHA
  // fingerprint + reference are committed to the existing Computer state.
  const project=await this.projects.create({name,description:'Imported original, source backed by local IndexedDB'});
  await this.projects.writeFile(project.id,'SOURCE_MANIFEST.json',JSON.stringify(manifest,null,2),{type:'application/json'});
  const artifact=await this.intake.ingest({name:'source-manifest-'+id+'.json',
    text:JSON.stringify(manifest),type:'application/json',source:'owner-archive-import',tags:['immutable-source-reference']});
  const proposal=this.intake.proposeMount(artifact.id,{appId:'archive-'+id,shell:'workspace'});
  const applied=await this.mutations.apply(proposal.id);
  const mount=applied.results[0].result,toolId='source-adapter-'+id;
  this.tools.register(toolId,{kind:'source-adapter',status:'registered',projectId:project.id,
    executable:false,source:'indexeddb',description:'Analyze original imported source with resident engines'});
  const receipt={id,name,projectId:project.id,indexedDbId:manifest.indexedDbId,
    sha256:archiveSha,artifactId:artifact.id,artifactPath:artifact.path,
    appId:'archive-'+id,mount,toolId,roles:manifest.roles,fileCount:records.length,
    files:records,execution:'not-verified',status:'source-mounted',at:manifest.installedAt};
  await this.state.set('archiveIntegrations.items.'+id,receipt,{source:'source-integration'});
  this.bus.emit('archive:installed',{id,projectId:project.id,mountId:mount.mountId});
  return receipt;
 }
 async analyzeFile(archiveId,{path,text,engine='autoling'}={}){
  const archive=this.state.get('archiveIntegrations.items.'+archiveId,null);
  if(!archive)throw new Error('Archive not installed in Computer');
  const entry=archive.files.find(f=>f.path===path);
  if(!entry)throw new Error('Path not found in imported source');
  if(typeof text!=='string'||await signature(text)!==entry.sha256)
    throw new Error('Source checksum mismatch — original file preserved');
  if(!['autoling','diseminer'].includes(engine))throw new Error('Unsupported analysis tool');
  // Only fingerprint/path metadata enters the resident persistence.
  // Original source bytes remain exclusively in the IndexedDB source store.
  const reading=await this.synthia.observe(
    'Source inspection for '+path+' with checksum '+entry.sha256.slice(0,16),
    {actor:'source:'+archiveId,context:{scope:'owner-local-source',path}});
  const result=await this.synthia.runTool(engine,{text:text.slice(0,12000)});
  const receipt={id:'analysis-'+crypto.randomUUID(),archiveId,path,engine,sourceSha256:entry.sha256,
    readingId:reading.id,toolEvidence:reading.toolEvidence,executed:true,
    output:JSON.parse(JSON.stringify(result)),at:new Date().toISOString()};
  // Avoid copying potentially large output into localStorage or the public tool registry.
  await this.state.set('archiveIntegrations.lastAnalysis',{
   id:receipt.id,archiveId,path,engine,sourceSha256:entry.sha256,readingId:reading.id,
   executed:true,at:receipt.at},{source:'source-integration'});
  this.bus.emit('archive:source-analyzed',{archiveId,path,engine,receiptId:receipt.id});
  return receipt;
 }
 async runGeneratedTool({purpose,dimension='Design',level=3,gate=14,input='' }={}){
  const generated=this.toolFactory.generate({purpose,dimension,level,gate});
  if(!generated.tool) return generated;
  const output=await generated.tool.execute(input);
  const receipt={toolId:generated.tool.id,engine:'existing-pure-synthia-tool-factory',
    addressKey:generated.tool.addressKey,output,at:new Date().toISOString()};
  if(!this.tools.has(receipt.toolId))this.tools.register(receipt.toolId,{
   kind:'canonical-tool-factory',status:'executed',addressKey:receipt.addressKey});
  await this.state.set('archiveIntegrations.lastToolRun',receipt,{source:'source-integration'});
  return receipt;
 }
}