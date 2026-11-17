#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 android/download_dependencies.py
python3 android/prepare_assets.py
TOOLS="$PWD/build/tools/build-tools/android-15"
PLATFORM="$PWD/build/tools/platform/android-35/android.jar"
mkdir -p build/gen build/classes build/dex dist
"$TOOLS/aapt" package -f -a -M android/AndroidManifest.xml -I "$PLATFORM" -S android/res -A build/assets -F build/resources.apk -J build/gen -0 bin -0 wasm
java -jar build/tools/ecj.jar -source 1.8 -target 1.8 -bootclasspath "$PLATFORM:$TOOLS/core-lambda-stubs.jar" -d build/classes $(find android/src build/gen -name '*.java')
"$TOOLS/d8" --lib "$PLATFORM" --min-api 29 --output build/dex $(find build/classes -name '*.class')
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile,ZIP_STORED
import shutil
shutil.copyfile('build/resources.apk','build/unsigned.apk')
with ZipFile('build/unsigned.apk','a',ZIP_STORED) as archive:
 for p in Path('build/dex').glob('*.dex'):archive.write(p,p.name)
PY
"$TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
SIGNING_KEY="${INDEPENDENT_SIGNING_KEY:-$PWD/build/independent-development.jks}"
if [ ! -f "$SIGNING_KEY" ]; then
 keytool -genkeypair -keystore "$SIGNING_KEY" -storepass android -keypass android -alias independent -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Independent Computer Development' -noprompt
fi
"$TOOLS/apksigner" sign --ks "$SIGNING_KEY" --ks-key-alias independent --ks-pass pass:android --key-pass pass:android --out dist/Independent-Computer.apk build/aligned.apk
"$TOOLS/apksigner" verify --verbose --print-certs dist/Independent-Computer.apk > dist/signature-verification.txt
"$TOOLS/zipalign" -c -p 4 dist/Independent-Computer.apk
python3 android/verify_apk.py
