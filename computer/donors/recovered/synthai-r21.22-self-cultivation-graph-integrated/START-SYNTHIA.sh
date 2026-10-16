#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
exec node bootstrap/phone.mjs
