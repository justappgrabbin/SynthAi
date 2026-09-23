#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/SynthAi}"
REPO_URL="${REPO_URL:-https://github.com/justappgrabbin/SynthAi.git}"
REPO_BRANCH="${REPO_BRANCH:-integration/indiverse-phone-world-convergence-2026-09-23}"

echo "SynthAI Native Seed bootstrap"
echo "============================"

pkg update -y
pkg install -y git nodejs-lts python clang make curl

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin "$REPO_BRANCH"
  git checkout "$REPO_BRANCH"
  git pull --ff-only origin "$REPO_BRANCH"
fi

mkdir -p "$HOME/.termux"
PROP="$HOME/.termux/termux.properties"
touch "$PROP"
if grep -q '^allow-external-apps=' "$PROP"; then
  sed -i 's/^allow-external-apps=.*/allow-external-apps=true/' "$PROP"
else
  printf '\nallow-external-apps=true\n' >> "$PROP"
fi
command -v termux-reload-settings >/dev/null 2>&1 && termux-reload-settings || true

mkdir -p "$HOME/bin" "$HOME/.synthai"
cat > "$HOME/bin/synthai-native-start" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$HOME/SynthAi"
export SYNTHAI_NATIVE_HOST=127.0.0.1
export SYNTHAI_NATIVE_PORT=17757
export SYNTHAI_NATIVE_STATE="$HOME/.synthai/native-seed-state.json"
export SYNTHAI_IDLE_EXIT_MS="${SYNTHAI_IDLE_EXIT_MS:-600000}"
exec node computer/native/native-seed-server.mjs
EOF
chmod +x "$HOME/bin/synthai-native-start"

echo
echo "Runtime installed at: $APP_DIR"
echo "Start manually with:  ~/bin/synthai-native-start"
echo "The native APK can also wake it through Termux RUN_COMMAND."
echo "Grant the APK the Termux 'Run commands' additional permission in Android settings."
