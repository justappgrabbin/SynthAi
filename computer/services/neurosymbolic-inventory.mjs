/**
 * Synthia Computer self-inventory.
 * Additive, read-only observations and append-only snapshots.
 * Does not invent 13-field addresses, change native identities, or relocate assets.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, lstat, readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, posix } from 'node:path';

export const CANONICAL_ADDRESS_FIELDS = Object.freeze([
  'planetary','dimension','gate','line','color','tone','base',
  'degree','minute','second','arc','zodiac','house'
]);
const CODE_EXT = new Set(['.mjs','.js','.cjs','.ts','.tsx','.jsx','.py','.sh']);
const TEXT_EXT = new Set([...CODE_EXT,'.json','.yaml','.yml','.md','.html','.css']);
const EXCLUDE_DIRS = new Set(['.git','node_modules','__pycache__']);
const hash = text => createHash('sha256').update(text).digest('hex');
const identity = (scope, path) => scope+':'+hash(scope+'\0'+path);
const sort = (a,b) => a.id.localeCompare(b.id);
const kind = path => CODE_EXT.has(extname(path).toLowerCase())?'code':
  TEXT_EXT.has(extname(path).toLowerCase())?'text-or-configuration':'asset-or-binary';

function addressMetadata(meta={}) {
  const address=meta.address??null;
  const shape=address && typeof address==='object' && !Array.isArray(address) &&
    CANONICAL_ADDRESS_FIELDS.every(x=>Object.hasOwn(address,x)) &&
    Object.keys(address).length===13;
  return {
    existingAddress: address, existingAddressKey: meta.addressKey??null,
    addressStatus: address ? (shape?'THIRTEEN_FIELD_SHAPE_PRESENT':'NONCANONICAL_SHAPE_PRESERVED'):'UNRESOLVED_PRESERVED',
    addressProvenance:meta.addressBasis??null, canonicalSemanticsVerified:false
  };
}
function suggestions(path) {
  const list=[];
  const p=path.toLowerCase();
  for (const [re,role] of [
    [/address|ontology|coordinate/,'addressing'],
    [/cultivation|learning|knowledge/,'cultivation'],
    [/agent|automata|model/,'agency'],
    [/morph|world|game/,'morph-world'],
    [/semantic|resonance|relation|mesh/,'semantics-relations'],
    [/registry|manifest|capabilit/,'registry'],
    [/server|host|api|gateway/,'service'],
    [/shell|desktop|ui|client/,'presentation']
  ]) if(re.test(p))list.push({role,evidence:'filename-or-path-heuristic',status:'SUGGESTED_NOT_VERIFIED'});
  return list;
}
function hashFile(path) {
  return new Promise((ok,fail)=>{
    const h=createHash('sha256');
    createReadStream(path).on('data',v=>h.update(v)).on('error',fail).on('end',()=>ok(h.digest('hex')));
  });
}
export async function scanPackageTree(root) {
  const base=resolve(root),entries=[],relationships=[],issues=[],lookup=new Map();
  async function visit(dir,prefix='') {
    let children;
    try{children=await readdir(dir,{withFileTypes:true});}
    catch(e){issues.push({path:prefix,reason:'LIST_FAILED:'+String(e.code??e.message)});return;}
    children.sort((a,b)=>a.name.localeCompare(b.name));
    for(const child of children) {
      const path=prefix?prefix+'/'+child.name:child.name;
      const absolute=join(dir,child.name);
      if(child.isSymbolicLink()){issues.push({path,reason:'SYMLINK_NOT_FOLLOWED'});continue;}
      if(child.isDirectory()){
        if(EXCLUDE_DIRS.has(child.name)||path==='runtime/data'){
          issues.push({path,reason:'EXCLUDED_PRIVATE_OR_DEPENDENCY_DIRECTORY'});continue;
        }
        await visit(absolute,path);continue;
      }
      if(!child.isFile()){issues.push({path,reason:'NONREGULAR_FILE'});continue;}
      try {
        const st=await lstat(absolute);
        const entry={
          id:identity('source',path),scope:'installed-source',
          path,originalName:child.name,kind:kind(path),bytes:st.size,sha256:await hashFile(absolute),
          roles:suggestions(path),addressing:addressMetadata(),
          provenance:{basis:'filesystem-observation',root:'computer-payload'}
        };
        entries.push(entry);lookup.set(path,entry.id);
        if(prefix)relationships.push({from:entry.id,type:'contained-in-directory',to:'directory:'+prefix,evidence:'filesystem-path'});
      }catch(e){issues.push({path,reason:'READ_FAILED:'+String(e.code??e.message)});}
    }
  }
  await visit(base);
  const re=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"\s)]+)['"]/g;
  for(const entry of entries) {
    if(!CODE_EXT.has(extname(entry.path).toLowerCase())||entry.bytes>256000)continue;
    try {
      const src=await readFile(join(base,entry.path),'utf8');
      for(const match of src.matchAll(re)) {
        const target=posix.normalize(posix.join(posix.dirname(entry.path),match[1]));
        if(target==='..'||target.startsWith('../'))continue;
        const paths=[target,target+'.mjs',target+'.js',target+'.json',target+'/index.mjs',target+'/index.js'];
        const resolved=paths.find(x=>lookup.has(x));
        relationships.push({
          from:entry.id,type:'static-import-reference',
          to:resolved?lookup.get(resolved):'unresolved-import:'+target,
          evidence:'source-text-static-import-hint',resolved:Boolean(resolved)
        });
      }
    }catch(e){issues.push({path:entry.path,reason:'IMPORT_READ_FAILED:'+String(e.code??e.message)});}
  }
  return {entries:entries.sort(sort),relationships,issues};
}
export function scanRuntime(computer) {
  const entries=[],relationships=[],issues=[];
  for(const record of computer.vfs?.list('/')??[]){
    if(typeof record?.path!=='string'){issues.push({reason:'MALFORMED_VFS_RECORD_PRESERVED'});continue;}
    const meta=record.meta??{},id=identity('vfs',record.path);
    entries.push({
      id,scope:'resident-vfs',path:record.path,originalName:basename(record.path),
      kind:kind(record.path),bytes:Number.isSafeInteger(meta.size)?meta.size:null,
      sha256:meta.digest??null,digestVerification:'STORED_DIGEST_NOT_REHASHED',
      roles:suggestions(record.path),addressing:addressMetadata(meta),
      provenance:{basis:'vfs-registry',source:meta.source??null},dataRead:false
    });
    relationships.push({from:id,type:'contained-in-directory',to:'directory:'+dirname(record.path),evidence:'vfs-path'});
  }
  const names=['apps','agents','worlds','tools','artifacts','projects','services','systems','micros','shells','automataRegistry','processRegistry','backendsRegistry'];
  for(const name of names)for(const item of computer[name]?.list?.()??[]){
    if(!item?.id){issues.push({reason:'MISSING_REGISTRY_ID:'+name});continue;}
    entries.push({
      id:identity('registry:'+name,item.id),scope:'runtime-registry',registry:name,
      originalId:item.id,originalName:item.name??item.id,roles:[],
      addressing:addressMetadata(item.meta??item),
      provenance:{basis:'live-registry-read',status:item.status??null},
      recordFields:Object.keys(item).sort()
    });
  }
  for(const item of computer.capabilityRegistryService?.listCapabilities?.()??[])entries.push({
    id:identity('capability',item.capability),scope:'declared-capability',
    originalName:item.capability,providers:item.providers,roles:[],addressing:addressMetadata(),
    provenance:{basis:'capability-registry-declaration',notExecutionProof:true}
  });
  return {entries:entries.sort(sort),relationships,issues};
}
export class NeurosymbolicInventory {
  constructor({sourceRoot,dataDir,computer,neuralAnnotator=null}={}){
    if(!sourceRoot||!dataDir||!computer)throw new TypeError('sourceRoot, dataDir and computer required');
    Object.assign(this,{sourceRoot:resolve(sourceRoot),dataDir:resolve(dataDir),computer,neuralAnnotator});
    this.sourceScan=null;this.snapshot=null;this.refreshChain=Promise.resolve();this.off=[];
  }
  async start(){
    this.sourceScan=await scanPackageTree(this.sourceRoot);
    await this.refresh('boot');
    for(const topic of ['vfs:write','artifact:ingested','app:contract-issued','app:registered','tool:registered','agent:registered','world:registered','service:registered','capability-registry:status','morph:expressed','cultivation:started','cultivation:integrated']){
      this.off.push(this.computer.bus?.on(topic,()=>{
        this.refresh(topic).catch(e=>{this.lastError=String(e.message??e);});
      }));
    }
    return this;
  }
  async refresh(reason='manual'){
    const task=async()=>{
      const runtime=scanRuntime(this.computer);
      const entries=[...this.sourceScan.entries,...runtime.entries].sort(sort);
      const relationships=[...this.sourceScan.relationships,...runtime.relationships];
      const issues=[...this.sourceScan.issues,...runtime.issues];
      const content={
        schema:'synthia-neurosymbolic-inventory-v1',
        scope:['installed-source','resident-vfs','runtime-registries','declared-capabilities'],
        policy:{noDeletes:true,noRelocations:true,originalNamesPreserved:true,
          canonicalAddressFields:CANONICAL_ADDRESS_FIELDS,inferredAddressAssignments:false,
          semanticSuggestionsAreNotFacts:true,sourceDataExcluded:'runtime/data (private)'},
        entries,relationships,issues,
        counts:{entries:entries.length,sources:this.sourceScan.entries.length,
          runtime:runtime.entries.length,relations:relationships.length,issues:issues.length}
      };
      const fingerprint=hash(JSON.stringify(content));
      const changed=this.snapshot?.fingerprint!==fingerprint;
      this.snapshot={...content,fingerprint,recordedAt:new Date().toISOString()};
      if(changed){
        const folder=join(this.dataDir,'inventory','snapshots');
        await mkdir(folder,{recursive:true});
        try{
          await writeFile(join(folder,fingerprint+'.json'),JSON.stringify(this.snapshot),{flag:'wx',mode:0o600});
        }catch(e){if(e.code!=='EEXIST')throw e;}
        await appendFile(join(this.dataDir,'inventory','ledger.jsonl'),
          JSON.stringify({at:this.snapshot.recordedAt,reason,fingerprint,counts:content.counts})+'\n',{mode:0o600});
      }
      return {fingerprint,changed,counts:content.counts};
    };
    this.refreshChain=this.refreshChain.catch(()=>{}).then(task);
    return this.refreshChain;
  }
  getSummary(){
    if(!this.snapshot)return {ready:false,error:this.lastError??null};
    const {fingerprint,recordedAt,counts,issues,scope,policy}=this.snapshot;
    return {ready:true,fingerprint,recordedAt,counts,scope,policy,issues:issues.slice(0,100),
      remainingIssueCount:Math.max(0,issues.length-100),
      neuralModel:this.neuralAnnotator?'optional-adapter-configured':'NOT_CONNECTED',
      neuralAnalysisPerformed:false};
  }
  getFull(){return this.snapshot;}
  async proposeInterpretation(entryId){
    const entry=this.snapshot?.entries.find(e=>e.id===entryId);
    if(!entry)throw new TypeError('Unknown inventory entry');
    if(typeof this.neuralAnnotator!=='function')
      return {entryId,status:'NEURAL_PROVIDER_NOT_CONNECTED',suggestions:[]};
    const result=await this.neuralAnnotator({
      id:entry.id,name:entry.originalName,path:entry.path??null,kind:entry.kind??null,
      evidence:entry.roles??[],relationships:this.snapshot.relationships.filter(e=>e.from===entry.id)
    });
    return {entryId,status:'PROPOSED_UNVERIFIED',suggestions:result,originalUnchanged:true};
  }
  stop(){for(const unsubscribe of this.off)unsubscribe?.();this.off=[];}
}
