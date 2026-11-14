#!/usr/bin/env bash
set -euo pipefail
project="$(cd "$(dirname "$0")/.." && pwd)"
: "${APKTOOL_JAR:?Set APKTOOL_JAR}"
: "${ANDROID_JAR:?Set ANDROID_JAR}"
: "${BUILD_TOOLS:?Set BUILD_TOOLS}"
original="${1:?Pass original APK}"
output="${2:-$project/dist/Synthia-Adaptive-v0.5.4-lite.apk}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
python3 - "$original" "$work/input.apk" <<'PY'
import zipfile,sys,hashlib
src,out=sys.argv[1:]
with open(src,'rb') as f: assert hashlib.file_digest(f,'sha256').hexdigest()=='068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5'
with zipfile.ZipFile(src) as z,zipfile.ZipFile(out,'w') as dst:
 for info in z.infolist():
  if info.filename=='assets/models/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf' or info.filename.startswith('META-INF/'):continue
  dst.writestr(info,z.read(info))
PY
java -jar "$APKTOOL_JAR" d -f -r "$work/input.apk" -o "$work/app"
python3 "$project/lightweight/patch.py" "$work/app"
# Preserve the original native components; compile a separate application identity.
python3 - "$project" "$work/AndroidManifest.xml" <<'PYTHON'
import pathlib,sys,json
root=pathlib.Path(sys.argv[1]);version=json.loads((root/'lightweight/version.json').read_text())
text=(root/'lightweight/AndroidManifest.xml').read_text().replace('android:versionCode="10"','android:versionCode="'+str(version['versionCode'])+'"').replace('android:versionName="0.5.4-lite"','android:versionName="'+version['versionName']+'"')
pathlib.Path(sys.argv[2]).write_text(text)
PYTHON
"$BUILD_TOOLS/aapt2" link -I "$ANDROID_JAR" --manifest "$work/AndroidManifest.xml" -o "$work/manifest.apk"
python3 - "$work/manifest.apk" "$work/app/AndroidManifest.xml" <<'PY'
import zipfile,sys
with zipfile.ZipFile(sys.argv[1]) as z: open(sys.argv[2],'wb').write(z.read('AndroidManifest.xml'))
PY
mkdir "$work/classes" "$work/dex"
if [[ -n "${ECJ_JAR:-}" ]]; then
 java -jar "$ECJ_JAR" -1.8 -proc:none -warn:none -cp "$ANDROID_JAR" -d "$work/classes" "$project"/lightweight/src/com/synthia/autonomy/*.java
else
 javac -source 8 -target 8 -cp "$ANDROID_JAR" -d "$work/classes" "$project"/lightweight/src/com/synthia/autonomy/*.java
fi
mapfile -t classes < <(find "$work/classes" -name '*.class' | sort)
"$BUILD_TOOLS/d8" --min-api 24 --lib "$ANDROID_JAR" --output "$work/dex" "${classes[@]}"
java -jar "$APKTOOL_JAR" b "$work/app" -o "$work/patched.apk"
python3 - "$work/patched.apk" "$work/dex/classes.dex" "$work/unsigned.apk" <<'PY'
import zipfile,sys
with zipfile.ZipFile(sys.argv[1]) as src,zipfile.ZipFile(sys.argv[3],'w') as dst:
 for info in src.infolist():
  if info.filename.startswith('META-INF/'):continue
  # Android AssetManager transparently reads compressed web/engine assets.
  info.compress_type=zipfile.ZIP_DEFLATED if info.filename.startswith('assets/') else info.compress_type
  dst.writestr(info,src.read(info))
 dst.write(sys.argv[2],'classes2.dex',compress_type=zipfile.ZIP_DEFLATED)
PY
"$BUILD_TOOLS/zipalign" -P 16 -f 4 "$work/unsigned.apk" "$work/aligned.apk"
keystore="${LITE_KEYSTORE:-$project/.signing/adaptive-lite.keystore}"
mkdir -p "$(dirname "$keystore")" "$(dirname "$output")"
if [[ ! -f "$keystore" ]]; then
 keytool -genkeypair -noprompt -keystore "$keystore" -storepass android -keypass android -alias adaptive-lite -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Synthia Adaptive Lite'
fi
"$BUILD_TOOLS/apksigner" sign --ks "$keystore" --ks-pass pass:android --key-pass pass:android --ks-key-alias adaptive-lite --v4-signing-enabled false --out "$output" "$work/aligned.apk"
"$BUILD_TOOLS/apksigner" verify --verbose "$output"
"$BUILD_TOOLS/zipalign" -c -P 16 4 "$output"
"$BUILD_TOOLS/aapt" dump badging "$output" | head -1
python3 "$project/lightweight/verify.py" "$original" "$output"
