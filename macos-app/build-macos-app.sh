#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/Synthia.app"
CONTENTS="$APP/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
WORK="${TMPDIR:-/tmp}/synthia-macos-build"

rm -rf "$APP" "$WORK"
mkdir -p "$MACOS" "$RESOURCES/runtime" "$RESOURCES/hover" "$WORK"

echo "Building universal Synthia macOS launcher"
for arch in x86_64 arm64; do
  swiftc -O \
    -target "${arch}-apple-macosx13.0" \
    -framework Cocoa \
    -framework WebKit \
    "$ROOT/macos-app/SynthiaMacApp.swift" \
    -o "$WORK/Synthia-$arch"
done
lipo -create "$WORK/Synthia-x86_64" "$WORK/Synthia-arm64" -output "$MACOS/Synthia"
chmod +x "$MACOS/Synthia"

echo "Resolving current Node 22 runtime"
NODE_VERSION="${NODE_VERSION:-$(curl -fsSL https://nodejs.org/dist/index.json | python3 -c 'import json,sys; rows=json.load(sys.stdin); print(next(r["version"] for r in rows if r["version"].startswith("v22.")))')}"
echo "Embedding Node $NODE_VERSION for Intel + Apple Silicon"

for arch in x64 arm64; do
  archive="$WORK/node-$NODE_VERSION-darwin-$arch.tar.gz"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-darwin-$arch.tar.gz" -o "$archive"
  tar -xzf "$archive" -C "$WORK"
done

lipo -create \
  "$WORK/node-$NODE_VERSION-darwin-x64/bin/node" \
  "$WORK/node-$NODE_VERSION-darwin-arm64/bin/node" \
  -output "$RESOURCES/runtime/node"
chmod +x "$RESOURCES/runtime/node"

cp "$ROOT/macos-app/talk-shim.mjs" "$RESOURCES/runtime/talk-shim.mjs"
cat > "$RESOURCES/runtime/talk-python-shim" <<'SHIM'
#!/bin/sh
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
# Hover invokes this as: python-like-runner <talk-runner.py> <json>.
# The first argument is the preserved Python runner path; the Node shim consumes the JSON contract.
exec "$HERE/node" "$HERE/talk-shim.mjs" "$2"
SHIM
chmod +x "$RESOURCES/runtime/talk-python-shim"

echo "Copying executable Synthia Hover runtime"
rsync -a \
  --exclude '/authorities/originals/' \
  --exclude '/docs/' \
  --exclude '/test/' \
  --exclude '/tests/' \
  --exclude '/RELEASE-*.md' \
  --exclude '/CHANGELOG.md' \
  "$ROOT/computer/hover/" "$RESOURCES/hover/"

cat > "$CONTENTS/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleDisplayName</key><string>Synthia</string>
  <key>CFBundleExecutable</key><string>Synthia</string>
  <key>CFBundleIdentifier</key><string>app.synthai.hover.macos</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Synthia</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.5.8-mac1</string>
  <key>CFBundleVersion</key><string>60</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
</dict>
</plist>
PLIST

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
    sips -z "$size" "$size" "$ICON_SOURCE" --out "$ICONSET/$name" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$RESOURCES/Synthia.icns"
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string Synthia.icns" "$CONTENTS/Info.plist"
fi

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

mkdir -p "$DIST"
rm -f "$DIST/Synthia-macOS-universal.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST/Synthia-macOS-universal.zip"

echo "Built:"
du -sh "$APP" "$DIST/Synthia-macOS-universal.zip"
file "$MACOS/Synthia" "$RESOURCES/runtime/node"
