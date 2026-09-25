#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
VERIFY="$ROOT/scripts/verify-prime-apk-candidate.sh"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/good/assets/residents" "$TMP_DIR/good/assets/runtime"
printf 'prime-fixture\n' > "$TMP_DIR/good/assets/residents/prime.synthimg"
printf 'rootfs-fixture\n' > "$TMP_DIR/good/assets/runtime/rootfs-arm64.bin"
printf 'proot-fixture\n' > "$TMP_DIR/good/assets/runtime/proot-android-aarch64.bin"

PRIME_SHA=$(sha256sum "$TMP_DIR/good/assets/residents/prime.synthimg" | awk '{print $1}')
ROOTFS_SHA=$(sha256sum "$TMP_DIR/good/assets/runtime/rootfs-arm64.bin" | awk '{print $1}')
PROOT_SHA=$(sha256sum "$TMP_DIR/good/assets/runtime/proot-android-aarch64.bin" | awk '{print $1}')

(cd "$TMP_DIR/good" && zip -qr "$TMP_DIR/good.apk" assets)

"$VERIFY" "$TMP_DIR/good.apk" assets/residents/prime.synthimg \
  "$PRIME_SHA" "$ROOTFS_SHA" "$PROOT_SHA" "$TMP_DIR/candidate.properties"
grep -q '^verification=embedded-byte-identities-match$' "$TMP_DIR/candidate.properties"
grep -q '^acceptance=not-phone-verified$' "$TMP_DIR/candidate.properties"

mkdir -p "$TMP_DIR/host/assets/runtime"
cp "$TMP_DIR/good/assets/runtime/"*.bin "$TMP_DIR/host/assets/runtime/"
(cd "$TMP_DIR/host" && zip -qr "$TMP_DIR/host.apk" assets)

if "$VERIFY" "$TMP_DIR/host.apk" assets/residents/prime.synthimg \
  "$PRIME_SHA" "$ROOTFS_SHA" "$PROOT_SHA" "$TMP_DIR/host.properties"; then
  echo "host-only APK was incorrectly accepted" >&2
  exit 1
fi

if "$VERIFY" "$TMP_DIR/good.apk" assets/residents/prime.synthimg \
  "$(printf '0%.0s' {1..64})" "$ROOTFS_SHA" "$PROOT_SHA" "$TMP_DIR/bad.properties"; then
  echo "wrong Prime hash was incorrectly accepted" >&2
  exit 1
fi

echo "Prime APK delivery gate tests passed"

