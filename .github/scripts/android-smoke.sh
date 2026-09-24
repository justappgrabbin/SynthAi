#!/usr/bin/env bash
set -Eeuo pipefail

APK="android-app/app/build/outputs/apk/debug/app-debug.apk"
TAG="SynthAIComputer"

adb install -r "$APK"
adb logcat -c
adb shell am force-stop app.synthai.computer || true
adb shell am start -n app.synthai.computer/.MainActivity || true

for attempt in $(seq 1 120); do
  LOGS="$(adb logcat -d -s "$TAG:I" '*:S' 2>/dev/null || true)"

  if grep -q 'RUNTIME_READY=true' <<<"$LOGS"; then
    echo "Android runtime verification: RUNTIME_READY=true"
    echo "$LOGS"
    exit 0
  fi

  if grep -q 'ASSET_MISSING' <<<"$LOGS"; then
    echo "Android runtime verification failed: packaged asset missing"
    echo "$LOGS"
    exit 1
  fi

  if grep -q 'RUNTIME_READY=false' <<<"$LOGS"; then
    echo "Android runtime marker is false; allowing the WebView a little more boot time"
  fi

  sleep 1
done

echo "Android runtime verification failed: no RUNTIME_READY=true marker"
adb logcat -d -s "$TAG:I" '*:S' || true
adb shell dumpsys activity activities | grep -A 8 -B 3 'app.synthai.computer' || true
exit 1
