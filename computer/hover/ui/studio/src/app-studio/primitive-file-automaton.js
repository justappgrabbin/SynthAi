import { addressForArcSec, addrKey } from '../state-space/addressing.js';
import { WHEEL_ARCSECONDS } from '../state-space/constants.js';

const TEXT_EXTENSIONS = new Set([
  'txt','md','json','js','mjs','cjs','ts','tsx','jsx','html','htm','css','scss','less','xml','svg','yaml','yml','py','rb','go','rs','java','c','h','cpp','hpp','cs','php','sql','sh','bash','zsh','env','toml','ini','csv','svelte','vue'
]);

const MIME_BY_EXT = Object.freeze({
  html:'text/html', htm:'text/html', css:'text/css', js:'text/javascript', mjs:'text/javascript', cjs:'text/javascript',
  json:'application/json', svg:'image/svg+xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp',
  pdf:'application/pdf', wasm:'application/wasm', mp3:'audio/mpeg', wav:'audio/wav', mp4:'video/mp4', webm:'video/webm',
  txt:'text/plain', md:'text/markdown', xml:'application/xml', csv:'text/csv', zip:'application/zip'
});

export function extensionOf(name='') {
  const clean = String(name).split(/[?#]/)[0];
  const base = clean.split('/').pop() || '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i + 1).toLowerCase() : '';
}

export function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function isProbablyText(bytes, name='') {
  const ext = extensionOf(name);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  if (!sample.length) return true;
  let controls = 0, zeros = 0;
  for (const b of sample) {
    if (b === 0) zeros++;
    if (b < 9 || (b > 13 && b < 32)) controls++;
  }
  return zeros === 0 && controls / sample.length < 0.02;
}

export function inferMime(name='', supplied='') {
  if (supplied) return supplied;
  return MIME_BY_EXT[extensionOf(name)] || 'application/octet-stream';
}

export function dimensionForPrimitive(primitive) {
  const kind = String(primitive?.kind || '').toLowerCase();
  const text = String(primitive?.text || primitive?.name || '').toLowerCase();
  if (/event|handler|animation|timer|loop|transition|motion|click|change|submit/.test(kind + ' ' + text)) return 1; // Movement
  if (/literal|value|state|data|asset|byte|record|object|array/.test(kind + ' ' + text)) return 2; // Being
  if (/function|class|component|style|schema|structure|element|module/.test(kind + ' ' + text)) return 3; // Design
  if (/import|export|call|dependency|history|mutation|network|storage|effect/.test(kind + ' ' + text)) return 4; // Evolution
  return 5; // Space / whole-context
}

export function structuralAddress({ start = 0, end = 0, totalBytes = 1, kind = 'byte', dimension = null } = {}) {
  const safeTotal = Math.max(1, totalBytes);
  const midpoint = Math.max(0, Math.min(safeTotal - 1, Math.floor((start + Math.max(start, end - 1)) / 2)));
  const arcSec = Math.floor((midpoint / safeTotal) * WHEEL_ARCSECONDS) % WHEEL_ARCSECONDS;
  const address = addressForArcSec(arcSec);
  const dim = dimension || dimensionForPrimitive({ kind });
  return {
    dimension: dim,
    ...address,
    key: `D${dim}.${addrKey(address)}`,
    basis: 'structural-byte-position',
    start,
    end,
  };
}

function textDecoder(bytes) {
  try { return new TextDecoder('utf-8', { fatal:false }).decode(bytes); }
  catch { return ''; }
}

function bytePrimitives(bytes) {
  return Array.from(bytes, (value, index) => ({
    id:`byte:${index}`,
    kind:'byte',
    index,
    start:index,
    end:index+1,
    value,
    bits:value.toString(2).padStart(8,'0'),
  }));
}

function linePrimitives(text, bytes) {
  const encoder = new TextEncoder();
  const lines = text.split(/(?<=\n)/);
  const out=[];
  let cursor=0;
  for (let i=0;i<lines.length;i++) {
    const part=lines[i];
    const length=encoder.encode(part).length;
    out.push({id:`line:${i+1}`,kind:'line',index:i,start:cursor,end:Math.min(bytes.length,cursor+length),text:part.replace(/\n$/,'')});
    cursor+=length;
  }
  return out;
}

function lexicalPrimitives(text) {
  const out=[];
  const rx=/([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|=>|==|!=|<=|>=|&&|\|\||\+\+|--|[^\s])/g;
  let m, i=0;
  while ((m=rx.exec(text))) out.push({id:`token:${++i}`,kind:'token',index:i-1,charStart:m.index,charEnd:m.index+m[0].length,text:m[0]});
  return out;
}

function detectSignatures(bytes) {
  const sig = bytes.subarray(0, 16);
  const hex = [...sig].map(x=>x.toString(16).padStart(2,'0')).join(' ');
  let format = null;
  const starts=(arr)=>arr.every((v,i)=>bytes[i]===v);
  if (starts([0x50,0x4b,0x03,0x04])) format='zip';
  else if (starts([0x00,0x61,0x73,0x6d])) format='wasm';
  else if (starts([0x89,0x50,0x4e,0x47])) format='png';
  else if (starts([0xff,0xd8,0xff])) format='jpeg';
  else if (starts([0x25,0x50,0x44,0x46])) format='pdf';
  else if (starts([0x1f,0x8b])) format='gzip';
  return {format,hex};
}


export function byteMetrics(bytes) {
  if (!bytes.length) return { uniqueBytes:0, entropy:0, zeroRatio:0, printableRatio:1 };
  const counts=new Uint32Array(256); let zeros=0, printable=0;
  for(const b of bytes){counts[b]++; if(b===0)zeros++; if((b>=32&&b<=126)||b===9||b===10||b===13)printable++;}
  let entropy=0, unique=0;
  for(const count of counts){if(!count)continue;unique++;const p=count/bytes.length;entropy-=p*Math.log2(p);}
  return {uniqueBytes:unique,entropy:Number(entropy.toFixed(4)),zeroRatio:zeros/bytes.length,printableRatio:printable/bytes.length};
}

export class PrimitiveFileAutomaton {
  constructor({ maxBytePrimitives = 200000 } = {}) {
    this.maxBytePrimitives=maxBytePrimitives;
  }

  async ingest(input, meta={}) {
    let bytes, name=meta.name || input?.name || 'artifact.bin', mime=meta.type || input?.type || '';
    if (input instanceof Uint8Array) bytes=new Uint8Array(input);
    else if (input instanceof ArrayBuffer) bytes=new Uint8Array(input.slice(0));
    else if (typeof input === 'string') bytes=new TextEncoder().encode(input);
    else if (input && typeof input.arrayBuffer === 'function') bytes=new Uint8Array(await input.arrayBuffer());
    else throw new TypeError('PrimitiveFileAutomaton.ingest expects File, Blob, ArrayBuffer, Uint8Array, or string');

    const textLike=isProbablyText(bytes,name);
    const text=textLike?textDecoder(bytes):'';
    const signature=detectSignatures(bytes);
    const artifact={
      id:`artifact:${fnv1a(bytes)}:${bytes.length}`,
      name,
      size:bytes.length,
      mime:inferMime(name,mime),
      extension:extensionOf(name),
      hash:fnv1a(bytes),
      bytes,
      textLike,
      text,
      signature,
      analysis:{...byteMetrics(bytes),bitCount:bytes.length*8},
      layers:{
        bytes: bytes.length <= this.maxBytePrimitives ? bytePrimitives(bytes) : [],
        lines: textLike ? linePrimitives(text,bytes) : [],
        tokens: textLike ? lexicalPrimitives(text) : [],
      },
      roundTrip:{lossless:true,bytePrimitiveMaterialized:bytes.length <= this.maxBytePrimitives}
    };
    artifact.address=structuralAddress({start:0,end:bytes.length,totalBytes:bytes.length,kind:textLike?'document':'binary'});
    return artifact;
  }

  bitAt(artifact, bitIndex) {
    if (!artifact?.bytes) throw new TypeError('artifact missing bytes');
    if (!Number.isInteger(bitIndex) || bitIndex < 0 || bitIndex >= artifact.bytes.length * 8) throw new RangeError('bit index out of range');
    const byteIndex=Math.floor(bitIndex/8), bitInByte=7-(bitIndex%8);
    return (artifact.bytes[byteIndex] >> bitInByte) & 1;
  }

  *bits(artifact) {
    if (!artifact?.bytes) throw new TypeError('artifact missing bytes');
    for(let i=0;i<artifact.bytes.length*8;i++) yield {id:`bit:${i}`,kind:'bit',index:i,value:this.bitAt(artifact,i),byteIndex:Math.floor(i/8)};
  }

  reduce(artifact, level='byte') {
    if (!artifact?.bytes) throw new TypeError('artifact missing bytes');
    if (level==='bit') return [...this.bits(artifact)];
    if (level==='byte') {
      if (artifact.layers?.bytes?.length) return artifact.layers.bytes;
      return bytePrimitives(artifact.bytes);
    }
    if (level==='line') return artifact.layers?.lines || [];
    if (level==='token') return artifact.layers?.tokens || [];
    throw new RangeError(`Unknown primitive level: ${level}`);
  }

  recompose(artifact, primitives=null) {
    if (!artifact?.bytes) throw new TypeError('artifact missing bytes');
    const source=primitives || artifact.layers?.bytes;
    if (!source?.length) return new Uint8Array(artifact.bytes);
    const ordered=[...source].sort((a,b)=>a.index-b.index);
    const out=new Uint8Array(ordered.length);
    for(let i=0;i<ordered.length;i++) out[i]=ordered[i].value;
    return out;
  }

  verifyRoundTrip(artifact) {
    const rebuilt=this.recompose(artifact);
    const same=rebuilt.length===artifact.bytes.length && rebuilt.every((b,i)=>b===artifact.bytes[i]);
    return {ok:same,originalHash:artifact.hash,rebuiltHash:fnv1a(rebuilt),bytes:rebuilt.length};
  }
}

// Pure-JS ZIP reader. Supports stored entries and deflate entries through the
// browser-native DecompressionStream, so no CDN/backend is needed.
export async function unpackZip(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const td=new TextDecoder();
  const u32=o=>view.getUint32(o,true), u16=o=>view.getUint16(o,true);
  // Locate the End Of Central Directory. ZIP comments are capped at 65535 B.
  let eocd=-1;
  for(let i=Math.max(0,bytes.length-65557); i<=bytes.length-22; i++) {
    if(u32(i)===0x06054b50) eocd=i;
  }
  if(eocd<0) throw new Error('ZIP_EOCD_NOT_FOUND');
  const entryCount=u16(eocd+10);
  const centralOffset=u32(eocd+16);
  const entries=[];
  let off=centralOffset;
  for(let index=0; index<entryCount && off+46<=bytes.length; index++) {
    if(u32(off)!==0x02014b50) throw new Error(`ZIP_CENTRAL_HEADER_INVALID:${index}`);
    const flags=u16(off+8), method=u16(off+10);
    const compressed=u32(off+20), uncompressed=u32(off+24);
    const nameLen=u16(off+28), extraLen=u16(off+30), commentLen=u16(off+32);
    const localOffset=u32(off+42);
    const name=td.decode(bytes.subarray(off+46,off+46+nameLen));
    if(u32(localOffset)!==0x04034b50) throw new Error(`ZIP_LOCAL_HEADER_INVALID:${name}`);
    const localNameLen=u16(localOffset+26), localExtraLen=u16(localOffset+28);
    const dataStart=localOffset+30+localNameLen+localExtraLen;
    const compressedBytes=bytes.subarray(dataStart,dataStart+compressed);
    let data;
    if(method===0) data=new Uint8Array(compressedBytes);
    else if(method===8) {
      if(typeof DecompressionStream==='undefined') throw new Error('ZIP_DEFLATE_UNAVAILABLE');
      const ds=new DecompressionStream('deflate-raw');
      const ab=await new Response(new Blob([compressedBytes]).stream().pipeThrough(ds)).arrayBuffer();
      data=new Uint8Array(ab);
    } else throw new Error(`ZIP_METHOD_UNSUPPORTED:${method}:${name}`);
    if(uncompressed && data.length!==uncompressed) throw new Error(`ZIP_SIZE_MISMATCH:${name}:${data.length}:${uncompressed}`);
    entries.push({name,bytes:data,size:data.length,compressedSize:compressed,method,flags,expectedSize:uncompressed});
    off += 46+nameLen+extraLen+commentLen;
  }
  return entries.filter(e=>!e.name.endsWith('/'));
}

export async function unpackContainer(artifact) {
  if (!artifact?.bytes) return [];
  const ext=artifact.extension;
  const format=artifact.signature?.format;
  if (ext==='zip' || format==='zip') return unpackZip(artifact.bytes);
  if ((ext==='gz'||format==='gzip') && typeof DecompressionStream!=='undefined') {
    const ds=new DecompressionStream('gzip');
    const ab=await new Response(new Blob([artifact.bytes]).stream().pipeThrough(ds)).arrayBuffer();
    const name=artifact.name.replace(/\.gz$/i,'') || 'inflated';
    return [{name,bytes:new Uint8Array(ab),size:ab.byteLength,method:'gzip'}];
  }
  return [];
}

export default PrimitiveFileAutomaton;
