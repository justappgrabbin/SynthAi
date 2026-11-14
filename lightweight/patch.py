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
