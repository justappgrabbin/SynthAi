#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
APP="$PWD/dist/StellarVM.app"
[ -d "$APP" ] || ./scripts/build-mac-app.sh
BUNDLE="${STELLAR_VM_BUNDLE:-$HOME/StellarVM.bundle}"
"$APP/Contents/MacOS/StellarVM" --bundle "$BUNDLE" --cpus 4 --memory 4
