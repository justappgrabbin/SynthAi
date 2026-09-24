import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function decodeDataUrl(value='') {
  const match=String(value).match(/^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/s);
  if(!match) throw new Error('mirror image must be a base64 image data URL');
  return {mimeType:match[1],bytes:Buffer.from(match[2],'base64')};
}

export class Synthia57MirrorSurfaceStore {
  constructor({state,bus=null,root=path.join(os.homedir(),'.synthai','mirror')}={}) {
    if(!state?.get||!state?.set) throw new TypeError('Synthia57MirrorSurfaceStore requires StateStore');
    Object.assign(this,{state,bus,root});
  }

  async ingest({dataUrl,label='user-face',source='android-photo-picker'}={}) {
    const decoded=decodeDataUrl(dataUrl);
    const mimeType=decoded.mimeType;
    const bytes=decoded.bytes;
    if(bytes.length<128) throw new Error('mirror image is empty');
    if(bytes.length>8*1024*1024) throw new Error('mirror image exceeds 8 MB');
    await mkdir(this.root,{recursive:true});
    const hash=createHash('sha256').update(bytes).digest('hex');
    const ext=mimeType.includes('png')?'png':mimeType.includes('webp')?'webp':'jpg';
    const filePath=path.join(this.root,'synthia-mirror-'+hash.slice(0,16)+'.'+ext);
    await writeFile(filePath,bytes,{mode:0o600});
    const record={
      configured:true,
      label:String(label),
      source:String(source),
      mimeType,
      sha256:hash,
      byteLength:bytes.length,
      filePath,
      visibility:'private-device',
      surfaceRole:'mirror-identity-texture',
      at:Date.now(),
    };
    await this.state.set('synthia57.visualMirror',record,{source:'synthia57-mirror'});
    this.bus?.emit('synthia57:mirror-surface',record);
    const safe={...record};
    delete safe.filePath;
    return safe;
  }

  snapshot(){
    const record=this.state.get('synthia57.visualMirror',null);
    if(!record) return {configured:false,surfaceRole:'mirror-identity-texture'};
    const safe={...record};
    delete safe.filePath;
    safe.configured=true;
    return safe;
  }

  async bytes(){
    const record=this.state.get('synthia57.visualMirror',null);
    if(!record?.filePath) return null;
    return readFile(record.filePath);
  }
}

export default Synthia57MirrorSurfaceStore;
