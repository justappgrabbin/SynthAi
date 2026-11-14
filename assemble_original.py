from pathlib import Path
import hashlib, shutil, zipfile, json
root=Path(__file__).resolve().parent
(root/'dist').mkdir(exist_ok=True)
for line in (root/'ARCHIVE-SHA256SUMS.txt').read_text().splitlines():
    expected,name=line.split()
    p=root/'parts'/name
    with p.open('rb') as f: actual=hashlib.file_digest(f,'sha256').hexdigest()
    if actual!=expected: raise SystemExit('Hash mismatch: '+name)
    print('Verified '+name,flush=True)
combined=root/'original.zip'
with combined.open('wb') as dst:
    for p in sorted((root/'parts').glob('*.zip.*')):
        with p.open('rb') as src: shutil.copyfileobj(src,dst,1024*1024)
with zipfile.ZipFile(combined) as z:
    print('Archive entries:',z.namelist(),flush=True)
    entries=[n for n in z.namelist() if n.endswith('.apk')]
    if len(entries)!=1: raise SystemExit('Expected exactly one APK')
    apk=root/'dist'/'Synthia-Adaptive-v0.5.4.apk'
    with z.open(entries[0]) as src, apk.open('wb') as dst: shutil.copyfileobj(src,dst,1024*1024)
with apk.open('rb') as f: digest=hashlib.file_digest(f,'sha256').hexdigest()
assert digest=='068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5',digest
with zipfile.ZipFile(apk) as z:
    bad=z.testzip()
    assert bad is None,bad
    entries=z.namelist()
    assert 'AndroidManifest.xml' in entries and 'classes.dex' in entries
(root/'dist'/'SHA256SUMS').write_text(digest+'  '+apk.name+'\n')
report={'apk':apk.name,'bytes':apk.stat().st_size,'sha256':digest,'originalDrivePartsVerified':13,'matchesOriginalAPKHash':True,'apkZipIntegrity':'passed','modified':False,'rebuilt':False,'resigned':False,'physicalPhoneTested':False}
(root/'DELIVERY-VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report),flush=True)
