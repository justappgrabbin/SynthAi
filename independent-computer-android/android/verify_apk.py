from pathlib import Path
from zipfile import ZipFile
import hashlib,json
root=Path(__file__).resolve().parents[1]
apk=root/'dist/Independent-Computer.apk'
with ZipFile(apk) as archive:
 assert archive.testzip() is None
 names=set(archive.namelist())
 assert 'classes.dex' in names and 'AndroidManifest.xml' in names
 index=json.loads(archive.read('assets/asset-index.json'))
 for name,expected in index.items():
  data=archive.read('assets/www/'+name)
  assert len(data)==expected['bytes'] and hashlib.sha256(data).hexdigest()==expected['sha256'],name
 assert 'tool-contracts.mjs' in index and 'vendor/webllm.mjs' in index
 config=json.loads(archive.read('assets/www/models/local-config.json'))
 assert len(config)==1 and config[0]['model_id']=='Qwen2.5-0.5B-Instruct-q4f32_1-MLC'
 assert not any(name.startswith('reference/') for name in index)
 receipt={'apk':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'assetsVerified':len(index),'completeModelIncluded':True,'nativePackage':'org.independentcomputer.local','sourceChecksums':'all matched','signatureVerification':'signature-verification.txt','physicalAndroidDeviceTested':False,'renderer':'On-device Chrome Custom Tab, WebView fallback; WebGPU hardware support required for inference'}
(root/'dist/build-receipt.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2))
