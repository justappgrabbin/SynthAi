#!/usr/bin/env python3
from pathlib import Path
import argparse, gzip, hashlib, json, struct, tarfile, tempfile

MAGIC=b'SYNTHIMG'
VERSION=1
FLAG_GZIP=1
HEADER_LEN=49

def sha256_path(path: Path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()

def add_file(tf, root, p):
    rel=p.relative_to(root).as_posix()
    info=tf.gettarinfo(str(p), arcname=rel)
    info.uid=0; info.gid=0; info.uname=''; info.gname=''; info.mtime=0
    with p.open('rb') as f:
        tf.addfile(info,f)

def build(source_zip: Path, manifest_path: Path, out_path: Path):
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    expected=manifest['source']['sha256']
    actual=sha256_path(source_zip)
    if actual != expected:
        raise SystemExit(f'REFUSING BUILD: Echo archive SHA mismatch\nexpected {expected}\nactual   {actual}')
    import zipfile
    with tempfile.TemporaryDirectory(prefix='echo-image-') as td:
        td=Path(td)
        with zipfile.ZipFile(source_zip) as zf: zf.extractall(td)
        root=td/'StellarCPU-Rough-v0.1.0'
        if not root.is_dir(): raise SystemExit('Echo root folder not found after extraction')
        tar_path=td/'payload.tar'
        with tarfile.open(tar_path,'w',format=tarfile.USTAR_FORMAT) as tf:
            for p in sorted(x for x in root.rglob('*') if x.is_file()): add_file(tf,root,p)
        gz_path=td/'payload.tar.gz'
        with tar_path.open('rb') as src, gz_path.open('wb') as raw:
            with gzip.GzipFile(fileobj=raw,mode='wb',compresslevel=9,mtime=0,filename='') as gz:
                for chunk in iter(lambda:src.read(1024*1024),b''): gz.write(chunk)
        payload=gz_path.read_bytes()
        payload_sha=hashlib.sha256(payload).digest()
        manifest_bytes=json.dumps(manifest,separators=(',',':'),sort_keys=True).encode('utf-8')
        header=MAGIC+bytes([VERSION])+struct.pack('<I',FLAG_GZIP)+struct.pack('<I',len(manifest_bytes))+payload_sha
        assert len(header)==HEADER_LEN
        out_path.parent.mkdir(parents=True,exist_ok=True)
        with out_path.open('wb') as out:
            out.write(header); out.write(manifest_bytes); out.write(payload)
    print(json.dumps({'output':str(out_path),'bytes':out_path.stat().st_size,'sha256':sha256_path(out_path),'source_sha256':actual},indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('source_zip',type=Path)
    ap.add_argument('--manifest',type=Path,default=Path('echo-image-manifest.json'))
    ap.add_argument('--out',type=Path,default=Path('dist/Echo-v0.1.0.synthimg'))
    a=ap.parse_args(); build(a.source_zip,a.manifest,a.out)
