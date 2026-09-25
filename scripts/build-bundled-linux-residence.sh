#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET_DIR="$ROOT/native-android/app/src/main/assets/runtime"
WORK_DIR="${RUNNER_TEMP:-/tmp}/synthai-linux-residence"
CONTAINER="synthai-arm64-residence-builder"
PROOT_URL="https://github.com/proot-me/proot/releases/download/v5.3.0/proot-v5.3.0-android-arm64"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR" "$ASSET_DIR"
rm -f "$ASSET_DIR/rootfs-arm64.tar.gz" "$ASSET_DIR/proot-arm64" "$ASSET_DIR/residence-manifest.properties"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

echo "::group::Build ARM64 Alpine residence"
docker create --name "$CONTAINER" --platform linux/arm64 \
  -v "$ROOT:/repo:ro" \
  alpine:3.19 \
  /bin/sh -ec '
    apk add --no-cache \
      bash ca-certificates curl wget git openssh-client \
      nodejs npm python3 py3-pip \
      zip unzip tar gzip coreutils findutils \
      build-base clang cmake make \
      ffmpeg jq
    mkdir -p /opt/synthai /root/.synthai
    cp -a /repo/computer /opt/synthai/computer
    printf "%s\\n" \
      "SynthAI APK-local Linux residence" \
      "Alpine: $(cat /etc/alpine-release)" \
      "Node: $(node --version)" \
      "npm: $(npm --version)" \
      "Python: $(python3 --version)" \
      > /opt/synthai/RESIDENCE-BUILD.txt
  '
docker start -a "$CONTAINER"
docker export "$CONTAINER" | gzip -9 > "$ASSET_DIR/rootfs-arm64.tar.gz"
echo "::endgroup::"

echo "::group::Bundle PRoot"
curl --fail --location --retry 5 --retry-all-errors \
  "$PROOT_URL" \
  --output "$ASSET_DIR/proot-arm64"
chmod 0755 "$ASSET_DIR/proot-arm64"
echo "::endgroup::"

ROOTFS_SHA="$(sha256sum "$ASSET_DIR/rootfs-arm64.tar.gz" | awk '{print $1}')"
PROOT_SHA="$(sha256sum "$ASSET_DIR/proot-arm64" | awk '{print $1}')"
ROOTFS_BYTES="$(wc -c < "$ASSET_DIR/rootfs-arm64.tar.gz" | tr -d ' ')"
PROOT_BYTES="$(wc -c < "$ASSET_DIR/proot-arm64" | tr -d ' ')"

cat > "$ASSET_DIR/residence-manifest.properties" <<EOF
format=synthai-apk-local-linux-v1
architecture=arm64-v8a
alpine=3.19
source_commit=${GITHUB_SHA:-local}
rootfs_sha256=$ROOTFS_SHA
rootfs_bytes=$ROOTFS_BYTES
proot_url=$PROOT_URL
proot_sha256=$PROOT_SHA
proot_bytes=$PROOT_BYTES
native_seed=/opt/synthai/computer/native/native-seed-server.mjs
native_seed_port=17757
android_hands_port=18758
prime_port=17759
EOF

echo "Residence assets:"
cat "$ASSET_DIR/residence-manifest.properties"
du -h "$ASSET_DIR/rootfs-arm64.tar.gz" "$ASSET_DIR/proot-arm64"
