import sys,zipfile,hashlib,json
from pathlib import Path
original,output=map(Path,sys.argv[1:])
removed='assets/models/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'
changed={'AndroidManifest.xml','classes.dex','assets/web/proactive/model.mjs','assets/web/index.html'}
with zipfile.ZipFile(original) as src,zipfile.ZipFile(output) as dst:
 assert removed not in dst.namelist()
 assert 'classes2.dex' in dst.namelist()
 assert b'com/synthia/autonomy/AppUpdates' in dst.read('classes.dex')
 assert 'assets/web/proactive/updater.mjs' in dst.namelist()
 assert dst.testzip() is None
 preserved=0
 for name in src.namelist():
  if name in changed or name==removed or name.startswith('META-INF/'):continue
  assert src.read(name)==dst.read(name),name
  preserved+=1
 assert b'com/synthia/autonomy/ModelDownload' in dst.read('classes.dex')
 assert b'f86cb2c1fa58255f8052cc32aeede1b7482d4361' in dst.read('classes2.dex')
 assert b'cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046' in dst.read('classes2.dex')
 assert b'resume' in dst.read('assets/web/index.html')
with output.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
report={'apk':output.name,'bytes':output.stat().st_size,'sha256':digest,'originalModelBytesRemoved':1117320768,'modelDownloadBytes':1117320768,'modelChecksum':'cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046','originalEntriesPreservedByteForByte':preserved,'changedEntries':sorted(changed),'addedEntries':['classes2.dex','assets/web/proactive/updater.mjs'],'apkZipIntegrity':'passed','physicalPhoneTested':False,'package':'com.synthia.adaptive.lite','version':json.loads((Path(__file__).parent/'version.json').read_text())['versionName'],'versionCode':json.loads((Path(__file__).parent/'version.json').read_text())['versionCode']}
(output.parent/'LITE-VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
(output.parent/'SHA256SUMS-lite').write_text(digest+'  '+output.name+'\n')
print(json.dumps(report),flush=True)
