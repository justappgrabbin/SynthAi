"""Publish a pre-signed APK only after matching the independently rebuilt payload."""
from pathlib import Path
import hashlib,json,os,re,subprocess,sys,zipfile
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'lightweight/version.json').read_text())
record=json.loads((root/'lite-delivery/current.json').read_text())
assert record['versionCode']==version['versionCode']
out=root/'dist/Synthia-Adaptive-Lite.apk'
with out.open('wb') as dst:
 for name in record['parts']:
  p=root/name
  assert p.resolve().is_relative_to((root/'lite-delivery').resolve())
  with p.open('rb') as src:
   while block:=src.read(1024*1024):dst.write(block)
with out.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
assert digest==record['sha256'] and out.stat().st_size==record['bytes']
tools=Path(os.environ['BUILD_TOOLS'])
certs=subprocess.check_output([str(tools/'apksigner'),'verify','--print-certs',str(out)],text=True)
cert=re.search(r'Signer #1 certificate SHA-256 digest: ([a-f0-9]{64})',certs).group(1)
assert cert==json.loads((root/'lightweight/signing.json').read_text())['certificateSha256']
assert 'Number of signers: 1' not in certs or certs.count('certificate SHA-256 digest:')==1
badging=subprocess.check_output([str(tools/'aapt'),'dump','badging',str(out)],text=True)
assert "name='com.synthia.adaptive.lite'" in badging
assert f"versionCode='{version['versionCode']}'" in badging
assert f"versionName='{version['versionName']}'" in badging
if len(sys.argv)>1:
 with zipfile.ZipFile(sys.argv[1]) as built,zipfile.ZipFile(out) as signed:
  names=lambda z:{n for n in z.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
  assert names(built)==names(signed)
  for name in sorted(names(built)):
   assert built.read(name)==signed.read(name),f'Rebuilt payload differs: {name}'
subprocess.run([sys.executable,str(root/'lightweight/verify.py'),str(root/'dist/Synthia-Adaptive-v0.5.4.apk'),str(out)],check=True)
sha=os.environ.get('GITHUB_SHA') or subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
tag='synthia-adaptive-lite-v'+version['versionName'].removesuffix('-lite')+'-'+sha[:12]
manifest={'package':'com.synthia.adaptive.lite','channel':'lite','releaseTag':tag,'versionName':version['versionName'],'versionCode':version['versionCode'],'bytes':out.stat().st_size,'sha256':digest,'certificateSha256':cert,'assetName':out.name}
(root/'dist/update.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest),flush=True)
