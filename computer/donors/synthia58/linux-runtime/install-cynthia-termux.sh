#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash install-cynthia-termux.sh /path/to/Synthia-Solo-Hover-v0.5.8"
  echo "If the project is in Downloads, first run: termux-setup-storage"
  exit 2
fi

SRC="$(cd "$1" && pwd)"
DEST="$HOME/cynthia/Synthia-Solo-Hover-v0.5.8"

pkg update -y
pkg install -y nodejs-lts curl || pkg install -y nodejs curl

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -a "$SRC" "$DEST"

chmod +x "$DEST/linux/"*.sh 2>/dev/null || true
echo
echo "Installed Cynthia runtime at $DEST"
echo "Node: $(node --version)"
echo
echo "Start it with:"
echo "  bash $(cd "$(dirname "$0")" && pwd)/start-cynthia-termux.sh"
