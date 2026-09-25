#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 APK PRIME_ASSET_PATH PRIME_SHA256 ROOTFS_SHA256 PROOT_SHA256 [MANIFEST]" >&2
}

if [[ $# -lt 6 || $# -gt 7 ]]; then
  usage
  exit 64
fi

APK=$1
PRIME_ASSET_PATH=$2
PRIME_SHA256_EXPECTED=$3
ROOTFS_SHA256_EXPECTED=$4
PROOT_SHA256_EXPECTED=$5
MANIFEST=${6}
OUTPUT=${7:-}

for command in unzip sha256sum stat; do
  command -v "$command" >/dev/null || { echo "missing required command: $command" >&2; exit 69; }
done

[[ -s "$APK" ]] || { echo "APK missing or empty: $APK" >&2; exit 66; }

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

extract_and_hash() {
  local archive_path=$1
  local output_path=$2
  if ! unzip -p "$APK" "$archive_path" > "$output_path"; then
    echo "required APK member missing: $archive_path" >&2
    exit 65
  fi
  [[ -s "$output_path" ]] || { echo "required APK member empty: $archive_path" >&2; exit 65; }
  sha256sum "$output_path" | awk '{print $1}'
}

PRIME_SHA=$(extract_and_hash "$PRIME_ASSET_PATH" "$TMP_DIR/prime.synthimg")
ROOTFS_SHA=$(extract_and_hash "assets/runtime/rootfs-arm64.bin" "$TMP_DIR/rootfs-arm64.bin")
PROOT_SHA=$(extract_and_hash "assets/runtime/proot-android-aarch64.bin" "$TMP_DIR/proot-android-aarch64.bin")

check_hash() {
  local label=$1 actual=$2 expected=$3
  if [[ "$actual" != "$expected" ]]; then
    echo "$label hash mismatch: expected $expected, got $actual" >&2
    exit 1
  fi
}

check_hash "Prime resident" "$PRIME_SHA" "$PRIME_SHA256_EXPECTED"
check_hash "Linux rootfs" "$ROOTFS_SHA" "$ROOTFS_SHA256_EXPECTED"
check_hash "Android PRoot" "$PROOT_SHA" "$PROOT_SHA256_EXPECTED"

APK_SHA=$(sha256sum "$APK" | awk '{print $1}')
APK_BYTES=$(stat -c '%s' "$APK")
PRIME_BYTES=$(stat -c '%s' "$TMP_DIR/prime.synthimg")

cat > "$MANIFEST" <<EOF
artifact=$(basename "$APK")
artifact_bytes=$APK_BYTES
artifact_sha256=$APK_SHA
prime_asset_path=$PRIME_ASSET_PATH
prime_asset_bytes=$PRIME_BYTES
prime_asset_sha256=$PRIME_SHA
rootfs_sha256=$ROOTFS_SHA
proot_sha256=$PROOT_SHA
verification=embedded-byte-identities-match
acceptance=not-phone-verified
EOF

if [[ -n "$OUTPUT" ]]; then
  {
    echo "apk_sha256=$APK_SHA"
    echo "apk_bytes=$APK_BYTES"
    echo "manifest=$MANIFEST"
  } >> "$OUTPUT"
fi

echo "Prime all-in-one candidate verified: $APK_BYTES bytes, SHA-256 $APK_SHA"

