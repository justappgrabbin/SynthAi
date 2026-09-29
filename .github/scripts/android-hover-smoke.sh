#!/usr/bin/env bash
# Hover face (Synthia 5.8) install/launch smoke on the x86_64 emulator.
# The embedded Linux runtime is ARM64-only, so on x86_64 we verify that the APK installs,
# the launcher starts, the foreground bridge comes up on 127.0.0.1:8797, the planet overlay
# starts once "display over other apps" is granted, and the runtime reports the ABI honestly.
set -Eeuo pipefail

APK="${APK:-android-app/app/build/outputs/apk/hover/debug/app-hover-debug.apk}"
PKG="app.synthai.hover"
TAG="SynthiaHover"

adb install -r "$APK"
adb shell appops set "$PKG" SYSTEM_ALERT_WINDOW allow || true
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true
adb forward tcp:18797 tcp:8797
adb logcat -c
adb shell am force-stop "$PKG" || true
adb shell am start -n "$PKG/.MainActivity" || true

for attempt in $(seq 1 90); do
  LOGS="$(adb logcat -d -s "$TAG:*" 'AndroidRuntime:E' '*:S' 2>/dev/null || true)"

  if grep -q "FATAL EXCEPTION" <<<"$LOGS" && grep -q "$PKG" <<<"$LOGS"; then
    echo "Hover smoke failed: app crashed"
    echo "$LOGS"
    exit 1
  fi

  if grep -q 'HOVER_LAUNCHER_CREATED' <<<"$LOGS" \
     && grep -q 'HOVER_BRIDGE_STARTED port=8797' <<<"$LOGS" \
     && grep -q 'HOVER_PLANET_VISIBLE=true' <<<"$LOGS" \
     && grep -Eq 'HOVER_RUNTIME_UNSUPPORTED_ABI|HOVER_RUNTIME_READY=true' <<<"$LOGS"; then
    BRIDGE="$(curl -s --max-time 5 http://127.0.0.1:18797/status || true)"
    if ! grep -q '"bridge":"cynthia-android-hands"' <<<"$BRIDGE"; then
      sleep 1
      continue
    fi
    ANDROID_STATUS="$(curl -s --max-time 5 http://127.0.0.1:18797/android/status || true)"
    ANDROID_APPS="$(curl -s --max-time 5 http://127.0.0.1:18797/android/apps || true)"
    if ! grep -q '"hostRuntime":"android"' <<<"$ANDROID_STATUS"; then
      sleep 1
      continue
    fi
    if ! grep -q '"apps":' <<<"$ANDROID_APPS"; then
      sleep 1
      continue
    fi
    echo "bridge /status: $BRIDGE"
    echo "bridge /android/status: $ANDROID_STATUS"
    echo "bridge /android/apps: $ANDROID_APPS"
    echo "Hover x86_64 verification: launcher, Android app bridge, foreground bridge (8797) and planet overlay start; runtime ABI reported"
    echo "$LOGS"
    exit 0
  fi
  sleep 1
done

echo "Hover smoke failed: missing launcher/bridge/planet/runtime markers"
adb logcat -d -s "$TAG:*" 'AndroidRuntime:E' '*:S' || true
adb shell dumpsys activity services "$PKG" | head -60 || true
exit 1
