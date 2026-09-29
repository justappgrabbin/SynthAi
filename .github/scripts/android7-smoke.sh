#!/usr/bin/env bash
set -Eeuo pipefail

APK="android-app/app/build/outputs/apk/debug/app-debug.apk"
TAG="SynthAIComputer"

adb install -r "$APK"
adb logcat -c
adb shell am force-stop app.synthai.computer || true
adb shell am start -n app.synthai.computer/.MainActivity

SDK="$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
if [[ "$SDK" != "24" && "$SDK" != "25" ]]; then
  echo "Expected Android 7 API 24/25 emulator, got SDK=$SDK"
  exit 1
fi

for attempt in $(seq 1 180); do
  LOGS="$(adb logcat -d -s "$TAG:I" '*:S' 2>/dev/null || true)"

  if grep -q 'ASSET_MISSING' <<<"$LOGS"; then
    echo "Android 7 verification failed: packaged asset missing"
    echo "$LOGS"
    exit 1
  fi

  if grep -q 'JS ERROR' <<<"$LOGS"; then
    echo "Android 7 verification failed: JavaScript error"
    echo "$LOGS"
    exit 1
  fi

  if grep -q 'RUNTIME_READY=true' <<<"$LOGS"; then
    echo "Android 7 WebView verification: RUNTIME_READY=true SDK=$SDK"
    echo "$LOGS"
    exit 0
  fi

  sleep 1
done

echo "Android 7 verification failed: no RUNTIME_READY=true marker"
adb logcat -d -s "$TAG:I" '*:S' || true
exit 1
