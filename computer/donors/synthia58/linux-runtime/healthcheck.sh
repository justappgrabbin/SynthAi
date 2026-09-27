#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
echo "Android native bridge:"
curl -fsS http://127.0.0.1:8787/status || true
echo
echo "Cynthia Linux runtime:"
curl -fsS http://127.0.0.1:4173/api/solo/status || true
echo
