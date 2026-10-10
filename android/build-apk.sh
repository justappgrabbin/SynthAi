#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_SDK_ROOT:?Set ANDROID_SDK_ROOT to an installed Android SDK with platform 35 and build-tools 35.0.0}"
relay_tools="$ANDROID_SDK_ROOT/build-tools/35.0.0"
relay_platform="$ANDROID_SDK_ROOT/platforms/android-35/android.jar"
npm run build:computer
rm -rf android/build/classes android/build/dex android/build/assets
mkdir -p android/build/classes android/build/dex android/build/assets/www
cp public/index.html public/computer-app.mjs public/computer.css android/build/assets/www/
cp -R public/computer-runtime android/build/assets/www/
javac -source 8 -target 8 -classpath "$relay_platform" -d android/build/classes android/src/app/synthai/relay/MainActivity.java
find android/build/classes -name '*.class' -print0 | xargs -0 "$relay_tools/d8" --lib "$relay_platform" --min-api 26 --output android/build/dex
"$relay_tools/aapt" package -f -M android/AndroidManifest.xml -I "$relay_platform" -A android/build/assets -F android/build/unsigned.apk
(cd android/build/dex && zip -q ../unsigned.apk classes.dex)
"$relay_tools/zipalign" -f 4 android/build/unsigned.apk android/build/aligned.apk
if [ ! -f android/build/debug.keystore ]; then
  keytool -genkeypair -keystore android/build/debug.keystore -storepass android -keypass android -alias androiddebugkey -dname 'CN=SynthAI Relay Development' -keyalg RSA -keysize 2048 -validity 10000
fi
"$relay_tools/apksigner" sign --ks android/build/debug.keystore --ks-pass pass:android --key-pass pass:android --out android/build/SynthAI-Relay-debug.apk android/build/aligned.apk
"$relay_tools/apksigner" verify android/build/SynthAI-Relay-debug.apk
echo 'Built android/build/SynthAI-Relay-debug.apk'
