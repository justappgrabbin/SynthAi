from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'smali/com/synthia/autonomy/LocalModelService.smali'
s=p.read_text()
needle='.method private materialize(Lorg/json/JSONObject;Ljava/lang/String;)Ljava/io/File;\n    .locals 20'
assert s.count(needle)==1
# Only the exact existing model filename uses the downloader; engines remain bundled.
start=s.index('    .line 33',s.index(needle))
patch='''    move-object/from16 v0, p2
    const-string v1, "qwen2.5-coder-1.5b-q4_k_m.gguf"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v0
    if-eqz v0, :lite_bundled_engine
    invoke-static/range {p0 .. p0}, Lcom/synthia/autonomy/ModelDownload;->ensure(Landroid/content/Context;)Ljava/io/File;
    move-result-object v0
    return-object v0
    :lite_bundled_engine

'''
s=s[:start]+patch+s[start:]
s=s.replace('verifying packaged engine and model','Preparing engine; downloading model if needed')
p.write_text(s)
p=root/'assets/web/proactive/model.mjs';s=p.read_text();s=s.replace('timeoutMs=240000','timeoutMs=7200000').replace('bundled model','local model').replace('Bundled model','Local model');p.write_text(s)
p=root/'assets/web/index.html';s=p.read_text().replace('Bundled local model','Downloadable local model').replace('Qwen2.5-Coder 1.5B and its CPU engine are packaged with this app. No remote inference service or Termux is required.','The CPU engine is included. The first Start model downloads 1.12 GB of Qwen2.5-Coder 1.5B weights over the internet and verifies their checksum. Use Wi-Fi and keep the app open. Interrupted downloads resume when you tap Start again. After setup, inference runs offline on this phone.').replace('Start bundled model','Download / start model').replace('Stop bundled model','Stop / pause model').replace('Ready: bundled Qwen inference on this phone.','Ready: offline Qwen inference on this phone.');p.write_text(s)

# Add a narrow native bridge; the web UI never supplies an update URL.
p=root/'smali/com/synthia/autonomy/MainActivity$AndroidBridge.smali'
s=p.read_text()
for name,signature,target,args,ret in [
 ('appUpdateStatus','()Ljava/lang/String;','status','Landroid/content/Context;','string'),
 ('checkAppUpdates','()V','check','Landroid/content/Context;','void'),
 ('maybeAppUpdates','()V','maybe','Landroid/content/Context;','void'),
 ('openAppUpdate','()V','open','Landroid/app/Activity;','void'),
 ('autoAppUpdates','(Z)V','auto','Landroid/content/Context;Z','bool')]:
 s+='\n.method public '+name+signature+'\n    .locals 1\n    .annotation runtime Landroid/webkit/JavascriptInterface;\n    .end annotation\n    iget-object v0, p0, Lcom/synthia/autonomy/MainActivity$AndroidBridge;->this$0:Lcom/synthia/autonomy/MainActivity;\n'
 registers='{v0, p1}' if ret=='bool' else '{v0}'
 result='Ljava/lang/String;' if ret=='string' else 'V'
 s+='    invoke-static '+registers+', Lcom/synthia/autonomy/AppUpdates;->'+target+'('+args+')'+result+'\n'
 s+=('    move-result-object v0\n    return-object v0\n' if ret=='string' else '    return-void\n')+'.end method\n'
p.write_text(s)
p=root/'assets/web/index.html';s=p.read_text();needle='<section class="wb-card" id="embedded-model-settings">';assert needle in s
s=s.replace(needle,'<section class="wb-card" id="github-update-settings"></section>'+needle)
needle="import {ensureEmbeddedModel} from './proactive/model.mjs';";assert needle in s
s=s.replace(needle,needle+"\nimport {mountGitHubUpdater} from './proactive/updater.mjs';\nmountGitHubUpdater({root:document.getElementById('github-update-settings')});")
p.write_text(s)
import shutil
shutil.copyfile(Path(__file__).parent/'web/updater.mjs',root/'assets/web/proactive/updater.mjs')
