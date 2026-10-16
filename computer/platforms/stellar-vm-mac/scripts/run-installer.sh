#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
APP="$PWD/dist/StellarVM.app"
[ -d "$APP" ] || ./scripts/build-mac-app.sh

ISO="${1:-}"
if [ -z "$ISO" ]; then
  ISO="$(find "$PWD/downloads" -maxdepth 1 -name 'alpine-virt-*.iso' -print -quit 2>/dev/null || true)"
fi
if [ -z "$ISO" ] || [ ! -f "$ISO" ]; then
  echo "No installer ISO found. Run ./scripts/download-alpine.sh first or pass an ISO path." >&2
  exit 1
fi

BUNDLE="${STELLAR_VM_BUNDLE:-$HOME/StellarVM.bundle}"
"$APP/Contents/MacOS/StellarVM" --bundle "$BUNDLE" --iso "$ISO" --cpus 4 --memory 4 --disk 32
