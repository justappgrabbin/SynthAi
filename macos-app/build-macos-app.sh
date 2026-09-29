#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/Synthia.app"
CONTENTS="$APP/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
WORK="${TMPDIR:-/tmp}/synthia-macos-build"
NODE_VERSION="${NODE_VERSION:-v22.23.2}"

rm -rf "$APP" "$WORK"
mkdir -p "$MACOS" "$RESOURCES/runtime" "$RESOURCES/mac" "$RESOURCES/synthia" "$WORK"

echo "Building universal Synthia macOS host"
for arch in x86_64 arm64; do
  swiftc -O \
    -target "${arch}-apple-macosx13.0" \
    -framework Cocoa \
    -framework WebKit \
    "$ROOT/desktop/mac/SynthiaHost.swift" \
    -o "$WORK/Synthia-$arch"
done
lipo -create "$WORK/Synthia-x86_64" "$WORK/Synthia-arm64" -output "$MACOS/Synthia"
chmod +x "$MACOS/Synthia"

echo "Embedding pinned Node $NODE_VERSION for Intel + Apple Silicon"
curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" -o "$WORK/SHASUMS256.txt"
for arch in x64 arm64; do
  archive="node-$NODE_VERSION-darwin-$arch.tar.gz"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$archive" -o "$WORK/$archive"
  (
    cd "$WORK"
    grep "  $archive$" SHASUMS256.txt | shasum -a 256 -c -
  )
  tar -xzf "$WORK/$archive" -C "$WORK"
  cp "$WORK/node-$NODE_VERSION-darwin-$arch/bin/node" "$RESOURCES/runtime/node-$arch"
  chmod +x "$RESOURCES/runtime/node-$arch"
done

cp "$ROOT/desktop/mac/mac-bridge.mjs" "$RESOURCES/mac/mac-bridge.mjs"
cp "$ROOT/macos-app/talk-shim.mjs" "$RESOURCES/runtime/talk-shim.mjs"
cat > "$RESOURCES/runtime/talk-python-shim" <<'SHIM'
#!/bin/sh
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
# Hover calls a Python-shaped contract: <runner.py> <json>.
# macOS uses the packaged Node implementation so no system Python is required.
ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then NODE="$HERE/node-arm64"; else NODE="$HERE/node-x64"; fi
exec "$NODE" "$HERE/talk-shim.mjs" "$2"
SHIM
chmod +x "$RESOURCES/runtime/talk-python-shim"

echo "Copying executable Synthia Hover organism"
rsync -a \
  --exclude '/authorities/originals/' \
  --exclude '/docs/' \
  --exclude '/test/' \
  --exclude '/tests/' \
  --exclude '/RELEASE-*.md' \
  --exclude '/CHANGELOG.md' \
  "$ROOT/computer/hover/" "$RESOURCES/synthia/"

cp "$ROOT/desktop/mac/Info.plist" "$CONTENTS/Info.plist"

ICON_SOURCE="$ROOT/computer/hover/ui/assets/synthia-planet.png"
if [[ -f "$ICON_SOURCE" ]]; then
  ICONSET="$WORK/Synthia.iconset"
  mkdir -p "$ICONSET"
  for spec in \
    "16 icon_16x16.png" \
    "32 icon_16x16@2x.png" \
    "32 icon_32x32.png" \
    "64 icon_32x32@2x.png" \
    "128 icon_128x128.png" \
    "256 icon_128x128@2x.png" \
    "256 icon_256x256.png" \
    "512 icon_256x256@2x.png" \
    "512 icon_512x512.png" \
    "1024 icon_512x512@2x.png"; do
    size="${spec%% *}"
    name="${spec#* }"
    sips -s format png -z "$size" "$size" "$ICON_SOURCE" --out "$ICONSET/$name" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$RESOURCES/Synthia.icns"
  /usr/libexec/PlistBuddy -c "Delete :CFBundleIconFile" "$CONTENTS/Info.plist" >/dev/null 2>&1 || true
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string Synthia.icns" "$CONTENTS/Info.plist"
fi

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"
"$MACOS/Synthia" --self-test

mkdir -p "$DIST"
rm -f "$DIST/Synthia-macOS-universal.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST/Synthia-macOS-universal.zip"

echo "Built:"
du -sh "$APP" "$DIST/Synthia-macOS-universal.zip"
file "$MACOS/Synthia" "$RESOURCES/runtime/node-x64" "$RESOURCES/runtime/node-arm64"
