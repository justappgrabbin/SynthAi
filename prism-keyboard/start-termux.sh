#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd "$(dirname "$0")"
command -v termux-wake-lock >/dev/null && termux-wake-lock || true
exec python server.py
