#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p downloads

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64)
    FILE="alpine-virt-3.24.1-aarch64.iso"
    SHA_FILE="$FILE.sha256"
    BASE="https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64"
    ;;
  x86_64|amd64)
    FILE="alpine-virt-3.24.1-x86_64.iso"
    SHA_FILE="$FILE.sha256"
    BASE="https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/x86_64"
    ;;
  *)
    echo "Unsupported Mac architecture: $ARCH" >&2
    exit 1
    ;;
esac

curl -fL --progress-bar "$BASE/$FILE" -o "downloads/$FILE"
curl -fsSL "$BASE/$SHA_FILE" -o "downloads/$SHA_FILE"

(
  cd downloads
  EXPECTED="$(awk '{print $1}' "$SHA_FILE")"
  ACTUAL="$(shasum -a 256 "$FILE" | awk '{print $1}')"
  [ "$EXPECTED" = "$ACTUAL" ] || {
    echo "SHA-256 verification failed." >&2
    exit 1
  }
)

echo "Downloaded and verified: $PWD/downloads/$FILE"
