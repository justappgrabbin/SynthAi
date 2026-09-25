#!/usr/bin/env python3
from pathlib import Path
import argparse, gzip, hashlib, io, json, struct, tarfile, zipfile
MAGIC=b'SYNTHIMG'

def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_path(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def file_map_from_source_zip(source_zip: Path):
    out={}
    with zipfile.ZipFile(source_zip) as zf:
        prefix='StellarCPU-Rough-v0.1.0/'
        for info in zf.infolist():
            if info.is_dir() or not info.filename.startswith(prefix): continue
            rel=info.filename[len(prefix):]
            if not rel: continue
            out[rel]=sha_bytes(zf.read(info))
    return out

def main(img, source_zip):
    b=img.read_bytes()
    if b[:8]!=MAGIC: raise SystemExit('bad magic')
    version=b[8]; flags=struct.unpack('<I',b[9:13])[0]; mlen=struct.unpack('<I',b[13:17])[0]; stored=b[17:49]
    mstart=49; pstart=mstart+mlen
    manifest=json.loads(b[mstart:pstart].decode())
    source_sha=sha_path(source_zip)
    if source_sha != manifest['source']['sha256']:
        raise SystemExit(f'source archive checksum mismatch: {source_sha}')
    payload=b[pstart:]
    if hashlib.sha256(payload).digest()!=stored: raise SystemExit('payload hash mismatch')
    if flags & 1: payload=gzip.decompress(payload)
    expected=file_map_from_source_zip(source_zip)
    actual={}
    with tarfile.open(fileobj=io.BytesIO(payload),mode='r:') as tf:
        for m in tf.getmembers():
            if m.isfile(): actual[m.name]=sha_bytes(tf.extractfile(m).read())
    missing=sorted(set(expected)-set(actual)); extra=sorted(set(actual)-set(expected)); changed=sorted(p for p in expected.keys() & actual.keys() if expected[p]!=actual[p])
    result={'image':str(img),'image_sha256':sha_path(img),'source_archive_sha256':source_sha,'version':version,'manifest':manifest,'expected_files':len(expected),'actual_files':len(actual),'missing':missing,'extra':extra,'changed':changed,'whole_tree_verified':not missing and not extra and not changed}
    print(json.dumps(result,indent=2))
    if not result['whole_tree_verified']: raise SystemExit(2)

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('image',type=Path)
    ap.add_argument('source_zip',type=Path)
    a=ap.parse_args()
    main(a.image,a.source_zip)
