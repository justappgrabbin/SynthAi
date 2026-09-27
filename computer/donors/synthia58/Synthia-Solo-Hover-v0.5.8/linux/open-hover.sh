#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4173}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}"
cd "$ROOT"
node src/ui/server.mjs >"${TMPDIR:-/tmp}/synthia-hover.log" 2>&1 &
SERVER_PID=$!
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for _ in $(seq 1 80); do curl -fsS "$URL/api/solo/status" >/dev/null 2>&1 && break; sleep .1; done
BROWSER="${SYNTHIA_CHROMIUM_PATH:-$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)}"
if [[ -z "$BROWSER" ]]; then echo "Synthia is running at $URL"; wait "$SERVER_PID"; exit 0; fi
"$BROWSER" --app="$URL" --window-size=460,840 --no-first-run --no-default-browser-check "$@"
