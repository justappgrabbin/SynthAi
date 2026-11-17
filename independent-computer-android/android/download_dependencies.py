from pathlib import Path
import hashlib,json,os,urllib.request,zipfile
root=Path(__file__).resolve().parents[1]
def obtain(url,target,expected):
 target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==expected:return
 print('Downloading',target.name,flush=True)
 temporary=target.with_suffix(target.suffix+'.partial')
 with urllib.request.urlopen(url,timeout=180) as response,temporary.open('wb') as out:
  while True:
   part=response.read(1024*1024)
   if not part:break
   out.write(part)
 if hashlib.sha256(temporary.read_bytes()).hexdigest()!=expected:raise SystemExit('Download hash mismatch: '+str(target))
 temporary.replace(target)
for entry in json.loads((root/'android/toolchain.json').read_text()):
 target=root/'build/tools'/entry['name'];obtain(entry['url'],target,entry['sha256'])
 if entry.get('extract'):
  destination=root/'build/tools'/entry['extract']
  if not destination.exists():
   destination.mkdir(parents=True)
   with zipfile.ZipFile(target) as archive:
    for name in archive.namelist():
     if not (destination/name).resolve().is_relative_to(destination.resolve()):raise SystemExit('Unsafe SDK archive')
    archive.extractall(destination)
for entry in json.loads((root/'android/model-files.json').read_text()):obtain(entry['url'],root/'model-cache'/entry['path'],entry['sha256'])
for name in ['aapt','zipalign','d8','apksigner']:
 p=root/'build/tools/build-tools/android-15'/name
 if p.exists():p.chmod(0o755)
