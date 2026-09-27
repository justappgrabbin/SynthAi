#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="${1:-$HOME/cynthia/Synthia-Solo-Hover-v0.5.8}"
if [[ ! -f "$ROOT/package.json" ]]; then
  echo "Cynthia runtime not found at: $ROOT"
  echo "Run install-cynthia-termux.sh first or pass the runtime directory."
  exit 1
fi

export HOST=127.0.0.1
export PORT=4173
export SYNTHIA_ANDROID_BRIDGE_URL=http://127.0.0.1:8787
export SYNTHIA_DATA_DIR="${SYNTHIA_DATA_DIR:-$HOME/.cynthia-state}"

cd "$ROOT"
exec node src/ui/server.mjs
