#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin" "$TMP/home"
cat > "$TMP/bin/bitterbot" <<'MOCK'
#!/usr/bin/env bash
printf 'bitterbot %s\n' "$*" >> "$MOCK_LOG"
MOCK
cat > "$TMP/bin/ollama" <<'MOCK'
#!/usr/bin/env bash
if [[ "$1" == list ]]; then
  printf 'NAME ID SIZE MODIFIED\nqwen3:4b abc123 2.5GB now\n'
else
  exit 2
fi
MOCK
chmod +x "$TMP/bin/"*
export PATH="$TMP/bin:$PATH"
export HOME="$TMP/home" MOCK_LOG="$TMP/commands.log"

bash "$HERE/launch.sh" --check > "$TMP/check.log"
test ! -e "$HOME/.bitterbot-synthia-candidate"
grep -q 'gateway not started' "$TMP/check.log"

bash "$HERE/launch.sh" run > "$TMP/run.log"
WORKSPACE="$HOME/.bitterbot-synthia-candidate/workspace"
test -s "$WORKSPACE/GENOME.md"
test -s "$WORKSPACE/PROTOCOLS.md"
grep -q 'config set agents.defaults.model.primary ollama/qwen3:4b' "$MOCK_LOG"
grep -q 'config set p2p.enabled false' "$MOCK_LOG"
grep -q 'config set tools.deny' "$MOCK_LOG"
grep -q 'gateway run --bind loopback --port 19021' "$MOCK_LOG"

# Relaunch must not overwrite existing user-owned trial identity.
printf '\nOWNER_PRESERVED\n' >> "$WORKSPACE/GENOME.md"
bash "$HERE/launch.sh" run > "$TMP/rerun.log"
grep -q OWNER_PRESERVED "$WORKSPACE/GENOME.md"

# Sanity: no vendor/UI files or original Computer directories modified.
test ! -e "$HOME/.bitterbot/workspace"
printf 'PASS isolated Synthia host launcher check, setup, launch, preservation\n'
