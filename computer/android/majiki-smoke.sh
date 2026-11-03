#!/usr/bin/env bash
set -euo pipefail
APK="computer/android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell am start -n org.synthai.computer/.MainActivity
adb forward tcp:8765 tcp:8765
echo "Checking embedded Android Node service and Majiki task API"
READY=0
for i in $(seq 1 80); do
  if curl --silent --show-error --max-time 2 -f http://127.0.0.1:8765/api/majiki/status > /tmp/majiki-device.json 2>/dev/null; then
    python - <<'PY'
import json
with open('/tmp/majiki-device.json') as f:
  status=json.load(f)
assert status['ready'] is True, status
assert status['automatic'] is True, status
assert isinstance(status['jobs'],list), status
print('Android Majiki local server: READY and periodic loop enabled')
PY
    READY=1
    break
  fi
  sleep 2
done
if [ "$READY" -ne 1 ]; then
  echo "Android app did not serve real Majiki endpoint"
  adb logcat -d -t 2000 | grep -E "SynthiaComputer|AndroidRuntime|FATAL EXCEPTION|node" | tail -80 || true
  exit 1
fi
curl -fsS http://127.0.0.1:8765/majiki.html > /tmp/majiki-device.html
grep -q 'Majiki Success Engine' /tmp/majiki-device.html
echo 'Android Majiki visible front-end served by embedded Node'
RESULT=$(curl -fsS -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"Inspect local source and produce a non-destructive repair report"}' \
  http://127.0.0.1:8765/api/majiki/task)
echo "$RESULT" | python -c 'import sys,json; data=json.load(sys.stdin); assert data["id"]; print("Android task accepted",data["id"])'
echo 'Android on-emulator API and front-end smoke test passed'
