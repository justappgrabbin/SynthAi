#!/usr/bin/env bash
# Independent trial: Bitterbot itself hosts Synthia, not another SynthAi module.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="synthia-candidate"
STATE="${HOME}/.bitterbot-${PROFILE}"
WORKSPACE="${STATE}/workspace"
MODEL="${SYNTHIA_TRIAL_MODEL:-qwen3:4b}"
PORT="${SYNTHIA_TRIAL_PORT:-19021}"
case "${1:-run}" in
  --check|run) MODE="${1:-run}" ;;
  *) echo "Usage: ./launch.sh [--check|run]" >&2; exit 2 ;;
esac
if [[ ! "$MODEL" =~ ^[a-zA-Z0-9_.:/-]+$ || ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1024 || PORT > 65535 )); then
  echo "Invalid SYNTHIA_TRIAL_MODEL or SYNTHIA_TRIAL_PORT" >&2
  exit 2
fi
for cmd in bitterbot ollama; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing ${cmd}. Install it separately; this script never downloads executables." >&2
    exit 3
  fi
done
if ! ollama list | awk 'NR>1 {print $1}' | grep -Fxq "$MODEL"; then
  echo "Local model '${MODEL}' not installed. Run: ollama pull ${MODEL}" >&2
  exit 4
fi
if [[ "$MODE" == "--check" ]]; then
  printf 'Host candidate: Bitterbot (standalone)\nProfile: %s\nWorkspace: %s\nModel: %s\nPort: %s\nStatus: prerequisites detected, gateway not started\n' \
    "$PROFILE" "$WORKSPACE" "$MODEL" "$PORT"
  exit 0
fi
mkdir -p "$WORKSPACE"
chmod 700 "$STATE" "$WORKSPACE"
for f in GENOME.md PROTOCOLS.md TOOLS.md HEARTBEAT.md; do
  if [[ ! -e "$WORKSPACE/$f" ]]; then
    cp "$HERE/workspace/$f" "$WORKSPACE/$f"
  fi
done
export OLLAMA_API_KEY=ollama-local
bitterbot --profile "$PROFILE" setup --workspace "$WORKSPACE"
bitterbot --profile "$PROFILE" config set agents.defaults.workspace "$WORKSPACE"
bitterbot --profile "$PROFILE" config set agents.defaults.model.primary "ollama/$MODEL"
bitterbot --profile "$PROFILE" config set gateway.mode local
bitterbot --profile "$PROFILE" config set gateway.bind loopback
bitterbot --profile "$PROFILE" config set gateway.port "$PORT"
bitterbot --profile "$PROFILE" config set p2p.enabled false
bitterbot --profile "$PROFILE" config set tools.deny '["exec","process","apply_patch","browser","message","cron","nodes"]'
printf '\nSynthia trial uses a separate profile. Open http://127.0.0.1:%s/ when the gateway starts.\n' "$PORT"
printf 'Selected local model: %s. Its weights are NOT original Synthia weights.\n' "$MODEL"
exec bitterbot --profile "$PROFILE" gateway run --bind loopback --port "$PORT"
