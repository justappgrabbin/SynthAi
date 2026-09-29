#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."

command -v swift >/dev/null || {
  echo "Swift/Xcode Command Line Tools are required. Install Xcode from Apple, then run this again." >&2
  exit 1
}
command -v codesign >/dev/null || {
  echo "codesign was not found. Install Xcode Command Line Tools." >&2
  exit 1
}

swift build -c release

APP="$PWD/dist/StellarVM.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp .build/release/StellarVM "$APP/Contents/MacOS/StellarVM"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>StellarVM</string>
  <key>CFBundleIdentifier</key><string>io.stellarproximology.stellarvm</string>
  <key>CFBundleName</key><string>StellarVM</string>
  <key>CFBundleDisplayName</key><string>Stellar VM</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

codesign --force --deep --sign - --entitlements "$PWD/StellarVM.entitlements" "$APP"

echo
echo "Built: $APP"
echo "Launch it with: open '$APP'"
