// Mandatory identity and routing for every imported artifact.
//
// Content identity is SHA-256, not an invented Gate/Line/Color/Tone/Base.
// Canonical Synthia address fields may be linked later ONLY with their
// original source/method; the existing state-space code remains authoritative.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';

const MAX_SIZE = 200 * 1024 * 1024;
const CHUNK_SIZE = 1024 * 1024;
function requireText(x, max = 500) {
  if (typeof x !== 'string' || x.length > max) throw new Error('Invalid intake metadata');
  return x.trim();
}
function fileKind(name) {
  const ext = name.toLowerCase().split('.').pop();
  return ({zip:'archive',apk:'android-package',aab:'android-bundle',mjs:'source',js:'source',jsx:'source',ts:'source',tsx:'source',py:'source',json:'data',md:'document',txt:'document',pdf:'document',html:'web',wasm:'executable',png:'image',jpg:'image',jpeg:'image',webp:'image'})[ext] || 'unknown';
}
function validRepo(value) {
  if (!value) return null;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error('Project must be GitHub owner/name or blank');
  return value;
}
async function hashFile(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest('hex');
}
export async function createArtifactLibrary({ ledger }) {
  const root = resolve(ledger.root, 'artifact-library');
  const stage = join(root, 'incoming');
  const objects = join(root, 'objects');
  await Promise.all([mkdir(stage,{recursive:true,mode:0o700}),mkdir(objects,{recursive:true,mode:0o700})]);
  const sessions = new Map();
  const pending = new Map();
  const saved = new Map();
  // The historical log is the authority. Project and classification changes
  // append a new record rather than rewriting the original metadata.
  for (const event of ledger.read({after:0,limit:2000})) {
    if (event.type === 'artifact_intake' || event.type === 'artifact_update') {
      try {
        const next = JSON.parse(event.content);
        if (next?.address?.startsWith('artifact:sha256:')) saved.set(next.address, next);
      } catch {}
    }
  }
  function list({ project, starred, limit = 200 } = {}) {
    const items = [...saved.values()].filter(item =>
      (!project || item.project === project) && (starred === undefined || item.starred === starred));
    return items.slice(-Math.min(Math.max(Number(limit)||100,1),500)).reverse();
  }
  function requireRecord(address) {
    const result = saved.get(address);
    if (!result) throw new Error('Unknown artifact address');
    return result;
  }
  async function begin(input) {
    const name = requireText(input.name,240);
    const size = Number(input.size);
    if (!name || !Number.isSafeInteger(size) || size < 0 || size > MAX_SIZE) throw new Error('File size is not supported (maximum 200 MiB)');
    const id = randomUUID();
    const path = join(stage,id+'.part');
    const handle = await open(path,'wx',0o600);
    await handle.close();
    sessions.set(id,{ id,path,name,size,offset:0,project:validRepo(input.project),originalSource:requireText(input.originalSource || 'android-document-picker',300),mime:requireText(input.mime || 'application/octet-stream',120),createdAt:Date.now() });
    return {uploadId:id,chunkSize:CHUNK_SIZE,size};
  }
  async function chunk(id,request) {
    const session = sessions.get(id);
    if (!session) throw new Error('Unknown upload session');
    let n = 0;
    const handle = await open(session.path,'a');
    try {
      for await (const data of request) {
        n += data.length;
        if (n > CHUNK_SIZE || session.offset + n > session.size) throw new Error('Chunk size exceeds upload boundary');
        await handle.write(data);
      }
    } finally { await handle.close(); }
    session.offset += n;
    return { received:n, offset:session.offset, expected:session.size };
  }
  async function finish(id) {
    const session = sessions.get(id);
    if (!session) throw new Error('Unknown upload session');
    if (session.offset !== session.size) throw new Error('Incomplete upload: ' + session.offset + ' of ' + session.size);
    const digest = await hashFile(session.path);
    const address = 'artifact:sha256:' + digest;
    const path = join(objects,digest);
    const previous = saved.get(address);
    if (previous) {
      await rm(session.path,{force:true});
      sessions.delete(id);
      return { ...previous, duplicate:true, address };
    }
    // Address is assigned before the object is admitted to the library.
    // Routing is unresolved until project/purpose is assigned; never guess.
    const record = {
      schema:'synthai-addressed-artifact/v1',address,contentSha256:digest,
      name:session.name,size:session.size,mime:session.mime,kind:fileKind(session.name),
      source:session.originalSource,project:session.project,
      route:session.project?'project-inbox':'unassigned-inbox',
      purpose:'',starred:false,includeInBuild:false,
      verification:'not-tested',createdAt:new Date().toISOString(),
      canonicalStateAddress:null,canonicalAddressProvenance:null,
      // runtime resolution is separate from identity, per existing adapter registry.
      execution:{adapter:'unresolved',verified:false},
    };
    // Do not overwrite originals, even if hashes coincide.
    const exists = await stat(path).then(()=>true,e=>e.code==='ENOENT'?false:Promise.reject(e));
    if (exists) { await rm(session.path,{force:true}); }
    else await rename(session.path,path);
    try { await ledger.append({actor:'human',type:'artifact_intake',ref:address,content:JSON.stringify(record)}); }
    catch (error) { throw new Error('Artifact stored at addressed object '+digest+' but ledger write failed; do not erase original: '+error.message); }
    saved.set(address,record);
    sessions.delete(id);
    return record;
  }
  async function update(input) {
    const previous = requireRecord(input.address);
    const project = input.project === undefined ? previous.project : validRepo(input.project);
    const purpose = input.purpose === undefined ? previous.purpose : requireText(input.purpose,1500);
    const starred = input.starred === undefined ? previous.starred : input.starred === true;
    const includeInBuild = input.includeInBuild === undefined ? previous.includeInBuild : input.includeInBuild === true;
    const verification = input.verification === undefined ? previous.verification : requireText(input.verification,100);
    if (!['not-tested','present','verified','failed'].includes(verification)) throw new Error('Invalid verification status');
    if (includeInBuild && !project) throw new Error('Assign a project before including a file in a build');
    if (includeInBuild && !purpose) throw new Error('Record the purpose before including a file in a build');
    const next = { ...previous, project,purpose,starred,includeInBuild,verification,
      route:project?(includeInBuild?'build-candidate':'project-inbox'):'unassigned-inbox',
      updatedAt:new Date().toISOString() };
    await ledger.append({actor:'human',type:'artifact_update',ref:previous.address,content:JSON.stringify(next)});
    saved.set(next.address,next);
    return next;
  }
  function buildManifest(project) {
    project=validRepo(project);
    if (!project) throw new Error('Choose a project');
    const artifacts=list({project,limit:500}).filter(a=>a.includeInBuild);
    return {schema:'synthai-addressed-build-manifest/v1',project,createdAt:new Date().toISOString(),
      artifacts:artifacts.map(({address,name,kind,purpose,verification,contentSha256,size})=>({address,name,kind,purpose,verification,contentSha256,size})),
      note:'This is an assembly selection, not proof these files execute or were packaged into an APK.'};
  }
  async function read(address) {
    const record=requireRecord(address);
    const path=join(objects,record.contentSha256);
    const actual=await hashFile(path);
    if (actual!==record.contentSha256) throw new Error('Stored artifact failed SHA-256 verification');
    return {record,path};
  }
  return Object.freeze({begin,chunk,finish,update,list,read,buildManifest,maxBytes:MAX_SIZE});
}