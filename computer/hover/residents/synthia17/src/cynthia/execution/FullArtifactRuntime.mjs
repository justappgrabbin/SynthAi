import { SynthiaSystem } from '../../../vendor/universal-execution-spine/src/synthia-system.mjs';
import { detectArtifactKind } from '../../../vendor/universal-execution-spine/src/runtime-adapters.mjs';
import { ArtifactWriter, encodeBMP, encodeGIF } from '../../../vendor/universal-execution-spine/src/pure-synthia/merged/artifacts.js';
import { MediaField, VideoTimeline } from '../../../vendor/universal-execution-spine/src/pure-synthia/merged/media-field.js';

const TEXT_KINDS = new Set(['data','json','jsonl','csv','xml','yaml','html','markdown','text']);
const ZIP_KINDS = new Set(['zip','apk','jar','docx','xlsx','pptx','epub']);
const TAR_KINDS = new Set(['tar','gz','tgz']);
const REMOTE_ARCHIVE_KINDS = new Set(['7z','rar']);
const IMAGE_KINDS = new Set(['png','jpg','jpeg','gif','bmp','webp','svg']);
const AUDIO_KINDS = new Set(['mp3','wav','ogg','flac','m4a','aac']);
const VIDEO_KINDS = new Set(['mp4','webm','mov','mkv','avi','m4v']);
const DOCUMENT_KINDS = new Set(['pdf','rtf','odt','ods','odp']);
const HOST_KINDS = [
  'python','typescript','ruby','lua','php','shell','wat','jvm','java','kotlin',
  'csharp','fsharp','go','rust','c','cpp','swift','node-project','python-project',
  'rust-project','go-project','jvm-project','jar','apk','7z','rar',
  'png','jpg','jpeg','gif','bmp','webp','svg','mp3','wav','ogg','flac','m4a','aac',
  'mp4','webm','mov','mkv','avi','m4v','pdf','rtf','odt','ods','odp'
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function extOf(name='') {
  const base = String(name).toLowerCase().split(/[\\/]/).pop() || '';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1) : '';
}

function normalizeKind(artifact) {
  const ext = extOf(artifact?.name || artifact?.filename || artifact?.path);
  // Preserve concrete container/media extensions when the generic detector
  // collapses several formats into one family (e.g. tar/gz/7z -> archive).
  if (ZIP_KINDS.has(ext) || TAR_KINDS.has(ext) || REMOTE_ARCHIVE_KINDS.has(ext) ||
      IMAGE_KINDS.has(ext) || AUDIO_KINDS.has(ext) || VIDEO_KINDS.has(ext) || DOCUMENT_KINDS.has(ext)) return ext;
  const detected = detectArtifactKind(artifact);
  if (detected !== 'unknown') return detected;
  return ext || 'binary';
}

async function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (typeof Blob !== 'undefined' && input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  if (input?.bytes instanceof Uint8Array) return input.bytes;
  if (input?.bytes instanceof ArrayBuffer) return new Uint8Array(input.bytes);
  if (typeof input?.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
  if (typeof input?.content === 'string') return encoder.encode(input.content);
  if (typeof input?.source === 'string') return encoder.encode(input.source);
  if (typeof input === 'string') return encoder.encode(input);
  return encoder.encode(JSON.stringify(input ?? null));
}

function fnv1a(bytes) {
  let h = 2166136261 >>> 0;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function u16le(b,o){ return b[o] | (b[o+1] << 8); }
function u32le(b,o){ return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }
function u16be(b,o){ return (b[o]<<8) | b[o+1]; }
function u32be(b,o){ return ((b[o]<<24) | (b[o+1]<<16) | (b[o+2]<<8) | b[o+3]) >>> 0; }

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {}
  }
  if (typeof process !== 'undefined' && process?.versions?.node) {
    const { inflateRawSync } = await import('node:zlib');
    return new Uint8Array(inflateRawSync(bytes));
  }
  throw new Error('deflate decompressor unavailable on this host');
}


async function gunzip(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {}
  }
  if (typeof process !== 'undefined' && process?.versions?.node) {
    const { gunzipSync } = await import('node:zlib');
    return new Uint8Array(gunzipSync(bytes));
  }
  throw new Error('gzip decompressor unavailable on this host');
}

function parseTar(bytes, {extract=true,maxEntries=2000,maxExpandedBytes=64*1024*1024}={}) {
  const entries=[]; let offset=0, expanded=0;
  const text=(a,b)=>decoder.decode(bytes.slice(a,b)).replace(/\0.*$/,'').trim();
  const oct=(a,b)=>parseInt(text(a,b)||'0',8)||0;
  while(offset+512<=bytes.length && entries.length<maxEntries){
    let zero=true; for(let i=offset;i<offset+512;i++){if(bytes[i]!==0){zero=false;break;}}
    if(zero) break;
    const name=text(offset,offset+100);
    const size=oct(offset+124,offset+136);
    const typeflag=String.fromCharCode(bytes[offset+156]||48);
    const directory=typeflag==='5'||name.endsWith('/');
    const dataStart=offset+512, dataEnd=dataStart+size;
    if(dataEnd>bytes.length) throw new Error(`truncated TAR entry: ${name}`);
    let data=null;
    if(extract&&!directory){data=bytes.slice(dataStart,dataEnd);expanded+=data.length;if(expanded>maxExpandedBytes)throw new Error(`TAR expanded bytes exceed ${maxExpandedBytes}`);}
    entries.push(Object.freeze({name,directory,typeflag,size,data}));
    offset=dataStart+Math.ceil(size/512)*512;
  }
  if(!entries.length) throw new Error('not a readable TAR archive');
  return Object.freeze({entries:Object.freeze(entries),expandedBytes:expanded,truncated:entries.length>=maxEntries,declaredEntries:null});
}

async function unzip(bytes, {extract=true, maxEntries=2000, maxExpandedBytes=64*1024*1024}={}) {
  const entries = [];
  let expanded = 0;

  // Prefer the central directory. Unlike local-header walking, this works for
  // ordinary ZIPs/APKs whose local headers use data descriptors (flag 0x08).
  let eocd = -1;
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (u32le(bytes, i) === 0x06054b50) { eocd = i; break; }
  }

  if (eocd >= 0) {
    const declaredEntries = u16le(bytes, eocd + 10);
    const centralSize = u32le(bytes, eocd + 12);
    const centralOffset = u32le(bytes, eocd + 16);
    if (declaredEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error('ZIP64 archive requires a host archive runtime');
    }
    let offset = centralOffset;
    const count = Math.min(declaredEntries, maxEntries);
    for (let index = 0; index < count; index++) {
      if (offset + 46 > bytes.length || u32le(bytes, offset) !== 0x02014b50) throw new Error('invalid ZIP central directory');
      const flags = u16le(bytes, offset + 8);
      const method = u16le(bytes, offset + 10);
      const compressedSize = u32le(bytes, offset + 20);
      const uncompressedSize = u32le(bytes, offset + 24);
      const nameLen = u16le(bytes, offset + 28);
      const extraLen = u16le(bytes, offset + 30);
      const commentLen = u16le(bytes, offset + 32);
      const localOffset = u32le(bytes, offset + 42);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLen));
      const directory = name.endsWith('/');
      let data = null;
      if (extract && !directory) {
        if (localOffset + 30 > bytes.length || u32le(bytes, localOffset) !== 0x04034b50) throw new Error(`invalid local ZIP header for ${name}`);
        const localNameLen = u16le(bytes, localOffset + 26);
        const localExtraLen = u16le(bytes, localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > bytes.length) throw new Error(`truncated ZIP entry: ${name}`);
        const packed = bytes.slice(dataStart, dataEnd);
        if (method === 0) data = packed;
        else if (method === 8) data = await inflateRaw(packed);
        else throw new Error(`ZIP compression method ${method} for ${name} requires a host archive runtime`);
        expanded += data.length;
        if (expanded > maxExpandedBytes) throw new Error(`ZIP expanded bytes exceed ${maxExpandedBytes}`);
      }
      entries.push(Object.freeze({name,directory,flags,method,compressedSize,uncompressedSize,data}));
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return Object.freeze({entries:Object.freeze(entries),expandedBytes:expanded,truncated:declaredEntries>maxEntries,declaredEntries});
  }

  // Small/streaming ZIP fallback for archives without a central directory.
  let offset = 0;
  while (offset + 30 <= bytes.length && entries.length < maxEntries) {
    const sig = u32le(bytes, offset);
    if (sig !== 0x04034b50) break;
    const flags = u16le(bytes, offset+6);
    const method = u16le(bytes, offset+8);
    if (flags & 0x08) throw new Error('stream ZIP with data descriptors requires a central directory or host archive runtime');
    const compressedSize = u32le(bytes, offset+18);
    const uncompressedSize = u32le(bytes, offset+22);
    const nameLen = u16le(bytes, offset+26);
    const extraLen = u16le(bytes, offset+28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error('truncated ZIP entry');
    const name = decoder.decode(bytes.slice(nameStart, nameStart+nameLen));
    const directory = name.endsWith('/');
    let data = null;
    if (extract && !directory) {
      const packed = bytes.slice(dataStart, dataEnd);
      if (method === 0) data = packed;
      else if (method === 8) data = await inflateRaw(packed);
      else throw new Error(`ZIP compression method ${method} requires a host archive runtime`);
      expanded += data.length;
      if (expanded > maxExpandedBytes) throw new Error(`ZIP expanded bytes exceed ${maxExpandedBytes}`);
    }
    entries.push(Object.freeze({name,directory,flags,method,compressedSize,uncompressedSize,data}));
    offset = dataEnd;
  }
  if (!entries.length) throw new Error('not a readable ZIP archive');
  return Object.freeze({entries:Object.freeze(entries),expandedBytes:expanded,truncated:false,declaredEntries:entries.length});
}

function imageInfo(bytes, kind) {
  if (kind === 'png' && bytes.length >= 24 && decoder.decode(bytes.slice(1,4)) === 'PNG') {
    return {format:'png',width:u32be(bytes,16),height:u32be(bytes,20)};
  }
  if (kind === 'gif' && bytes.length >= 10) {
    return {format:'gif',width:u16le(bytes,6),height:u16le(bytes,8)};
  }
  if (kind === 'bmp' && bytes.length >= 26 && bytes[0]===0x42 && bytes[1]===0x4d) {
    return {format:'bmp',width:u32le(bytes,18),height:Math.abs(u32le(bytes,22))};
  }
  if (['jpg','jpeg'].includes(kind) && bytes[0]===0xff && bytes[1]===0xd8) {
    let i=2;
    while (i+9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker=bytes[i+1];
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return {format:'jpeg',height:u16be(bytes,i+5),width:u16be(bytes,i+7)};
      }
      const len=u16be(bytes,i+2); if (len<2) break; i += 2+len;
    }
    return {format:'jpeg',width:null,height:null};
  }
  if (kind === 'webp' && bytes.length >= 30 && decoder.decode(bytes.slice(0,4))==='RIFF' && decoder.decode(bytes.slice(8,12))==='WEBP') {
    return {format:'webp',width:null,height:null};
  }
  if (kind === 'svg') return {format:'svg',width:null,height:null};
  return {format:kind,width:null,height:null};
}

function pdfInfo(bytes) {
  const head = decoder.decode(bytes.slice(0, Math.min(bytes.length, 2_000_000)));
  const version = head.match(/^%PDF-([0-9.]+)/)?.[1] ?? null;
  const pageMatches = head.match(/\/Type\s*\/Page\b/g);
  return {format:'pdf',version,pagesObserved:pageMatches?.length ?? null};
}

function mediaAdapter() {
  return {
    id:'synthia-media-document-runtime',
    kinds:[...IMAGE_KINDS,...AUDIO_KINDS,...VIDEO_KINDS,...DOCUMENT_KINDS],
    canRun:()=>true,
    execute:async ({artifact,kind})=>{
      const bytes=await toBytes(artifact);
      const category=IMAGE_KINDS.has(kind)?'image':AUDIO_KINDS.has(kind)?'audio':VIDEO_KINDS.has(kind)?'video':'document';
      const metadata=category==='image'?imageInfo(bytes,kind):kind==='pdf'?pdfInfo(bytes):{format:kind};
      return {ok:true,engine:'synthia-media-document-runtime',operation:'inspect',processed:true,executed:false,category,size:bytes.length,hash:fnv1a(bytes),metadata};
    }
  };
}

function archiveAdapter() {
  return {
    id:'synthia-archive-runtime',
    kinds:[...ZIP_KINDS,...TAR_KINDS],
    canRun:({kind,context})=>(ZIP_KINDS.has(kind)||TAR_KINDS.has(kind)) && context?.operation!=='execute',
    execute:async ({artifact,kind,context})=>{
      const bytes=await toBytes(artifact);
      let unpacked;
      if (ZIP_KINDS.has(kind)) unpacked=await unzip(bytes,{extract:context?.extractArchive!==false,maxEntries:context?.maxArchiveEntries,maxExpandedBytes:context?.maxExpandedBytes});
      else if (kind==='tar') unpacked=parseTar(bytes,{extract:context?.extractArchive!==false,maxEntries:context?.maxArchiveEntries,maxExpandedBytes:context?.maxExpandedBytes});
      else {
        const raw=await gunzip(bytes);
        if (kind==='tgz' || /\.tar\.gz$/i.test(artifact?.name||'')) unpacked=parseTar(raw,{extract:context?.extractArchive!==false,maxEntries:context?.maxArchiveEntries,maxExpandedBytes:context?.maxExpandedBytes});
        else unpacked={entries:[Object.freeze({name:(artifact?.name||'archive.gz').replace(/\.gz$/i,''),directory:false,size:raw.length,data:context?.extractArchive===false?null:raw})],expandedBytes:context?.extractArchive===false?0:raw.length,truncated:false,declaredEntries:1};
      }
      return {ok:true,engine:'synthia-archive-runtime',operation:'unpack',processed:true,executed:false,size:bytes.length,hash:fnv1a(bytes),entries:unpacked.entries.map(e=>({name:e.name,directory:e.directory,method:e.method??null,typeflag:e.typeflag??null,compressedSize:e.compressedSize??null,uncompressedSize:e.uncompressedSize??e.size??null,bytes:e.data})),expandedBytes:unpacked.expandedBytes,truncated:unpacked.truncated??false,declaredEntries:unpacked.declaredEntries??null};
    }
  };
}

function hostAdapter() {
  return {
    id:'synthia-computer-runtime',
    kinds:HOST_KINDS,
    canRun:({context})=>typeof context?.runtimeHost?.executeArtifact==='function' && (context?.operation==='execute' || context?.preferHost===true),
    execute:async ({artifact,kind,context})=>{
      const result=await context.runtimeHost.executeArtifact({artifact,kind,context});
      if (result && typeof result === 'object' && 'ok' in result) return {engine:'synthia-computer-runtime',...result};
      return {ok:true,engine:'synthia-computer-runtime',operation:'host-execute',executed:true,returnValue:result};
    }
  };
}

function htmlFallbackAdapter() {
  return {
    id:'synthia-html-document-runtime',
    kinds:['html'],
    canRun:()=>typeof document==='undefined',
    execute:async ({artifact})=>{
      const bytes=await toBytes(artifact); const text=decoder.decode(bytes);
      return {ok:true,engine:'synthia-html-document-runtime',operation:'parse/preserve',processed:true,executed:false,size:bytes.length,hash:fnv1a(bytes),metadata:{title:text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]??null,scripts:(text.match(/<script\b/gi)||[]).length}};
    }
  };
}

export class FullArtifactRuntime {
  constructor(options={}) {
    this.system = options.system ?? new SynthiaSystem({remember:options.remember??true,seed:options.seed});
    this.system.registerRuntimeAdapter(hostAdapter());
    this.system.registerRuntimeAdapter(archiveAdapter());
    this.system.registerRuntimeAdapter(mediaAdapter());
    this.system.registerRuntimeAdapter(htmlFallbackAdapter());
    this.writer = new ArtifactWriter();
    this.mediaField = new MediaField(options.mediaField);
    this.videoTimeline = new VideoTimeline(options.videoTimeline);
  }

  listRuntimes(){ return this.system.listRuntimeAdapters(); }
  registerRuntime(adapter){ this.system.registerRuntimeAdapter(adapter); return this; }

  async prepare(input, metadata={}) {
    if (input && typeof input === 'object' && (input.bytes || input.content || input.source) && (input.name || input.filename || metadata.name)) {
      const bytes=await toBytes(input);
      const name=input.name??input.filename??metadata.name??'artifact.bin';
      return Object.freeze({...input,...metadata,name,bytes,kind:input.kind??normalizeKind({...input,name})});
    }
    const bytes=await toBytes(input);
    const name=metadata.name??input?.name??'artifact.bin';
    return Object.freeze({...metadata,name,bytes,kind:metadata.kind??normalizeKind({name,bytes})});
  }

  async ingestArtifact(input, context={}) {
    const artifact=await this.prepare(input,context.metadata??{});
    const kind=artifact.kind;
    const base={name:artifact.name,kind,size:artifact.bytes.length,hash:fnv1a(artifact.bytes)};

    if (ZIP_KINDS.has(kind)||TAR_KINDS.has(kind)||REMOTE_ARCHIVE_KINDS.has(kind)||kind==='archive') {
      const result=await this.system.executeArtifact(artifact,{...context,operation:'ingest'});
      const entries=result.result?.returnValue?.entries ?? result.result?.entries ?? result.result?.result?.entries ?? result.result?.result?.returnValue?.entries ?? result.result?.returnValue ?? null;
      return Object.freeze({...base,status:result.ok?'processed':'failed',execution:result,entries});
    }
    if (IMAGE_KINDS.has(kind)||AUDIO_KINDS.has(kind)||VIDEO_KINDS.has(kind)||DOCUMENT_KINDS.has(kind)) {
      const result=await this.system.executeArtifact(artifact,{...context,operation:'ingest'});
      return Object.freeze({...base,status:result.ok?'processed':'failed',execution:result});
    }
    const result=await this.system.executeArtifact(artifact,context);
    return Object.freeze({...base,status:result.ok?'executed':'unresolved',execution:result});
  }

  async executeArtifact(input, context={}) {
    const artifact=await this.prepare(input,context.metadata??{});
    return this.system.executeArtifact(artifact,{...context,operation:'execute'});
  }

  async unpack(input, context={}) {
    const artifact=await this.prepare(input,context.metadata??{});
    if (!(ZIP_KINDS.has(artifact.kind)||TAR_KINDS.has(artifact.kind))) throw new Error(`not a locally supported archive: ${artifact.kind}`);
    const native=await this.system.execution.runtimeAdapters.execute({artifact,kind:artifact.kind,context});
    return native?.result;
  }

  createImage({width=64,height=64,rgba,format='bmp',fileName}={}) {
    if (!(rgba instanceof Uint8ClampedArray) && !(rgba instanceof Uint8Array)) throw new TypeError('rgba bytes required');
    if (format==='bmp') return this.writer.write('image',{fileName:fileName??'image.bmp',bytes:encodeBMP(width,height,rgba),mime:'image/bmp'}).artifact;
    if (format==='gif') return this.writer.write('image',{fileName:fileName??'image.gif',bytes:encodeGIF(width,height,[{rgba:new Uint8ClampedArray(rgba),delayCs:8}]),mime:'image/gif'}).artifact;
    throw new Error(`built-in pure-JS encoder unavailable for ${format}`);
  }

  diagnostics(){
    return Object.freeze({
      runtime:'full-artifact-runtime',
      adapters:this.listRuntimes(),
      builtInDirect:Object.freeze(['javascript','json','text/data','wasm','python-subset-synthesis','html-with-DOM']),
      archives:Object.freeze({local:[...ZIP_KINDS,...TAR_KINDS],computer:[...REMOTE_ARCHIVE_KINDS]}),
      media:Object.freeze({images:[...IMAGE_KINDS],audio:[...AUDIO_KINDS],video:[...VIDEO_KINDS],documents:[...DOCUMENT_KINDS]}),
      computerHostKinds:Object.freeze([...HOST_KINDS]),
      generatedMedia:Object.freeze(['bmp','gif','rgba-frames','video-timeline']),
    });
  }
}

export { MediaField, VideoTimeline, ArtifactWriter, encodeBMP, encodeGIF };
export default FullArtifactRuntime;
