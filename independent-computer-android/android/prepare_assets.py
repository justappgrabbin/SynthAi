from pathlib import Path
import gzip,hashlib,json,shutil
root=Path(__file__).resolve().parents[1]
target=root/'build/assets/www'
if target.exists():shutil.rmtree(target)
target.mkdir(parents=True)
for source in (root/'web').rglob('*'):
 if not source.is_file():continue
 relative=source.relative_to(root/'web')
 if relative.name.endswith('.gz'):
  relative=relative.with_suffix('');data=gzip.decompress(source.read_bytes())
 else:data=source.read_bytes()
 dest=target/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
for model in json.loads((root/'android/model-files.json').read_text()):
 source=root/'model-cache'/model['path']
 if not source.exists():raise SystemExit('Missing model file: '+str(source))
 if hashlib.sha256(source.read_bytes()).hexdigest()!=model['sha256']:raise SystemExit('Model integrity failed: '+str(source))
 dest=target/model['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
index={str(p.relative_to(target)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in target.rglob('*') if p.is_file()}
(root/'build/assets/asset-index.json').write_text(json.dumps(index,separators=(',',':')))
print('Prepared',len(index),'verified assets;',sum(v['bytes'] for v in index.values()),'bytes')
