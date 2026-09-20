#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
name="Synthia-v0.5.1-PRE-DNA-WIRING-CHECKPOINT.zip"
output="${1:-$root/$name}"
cat "$root"/parts/part-*.bin > "$output"
actual="$(sha256sum "$output" | awk '{print $1}')"
expected="1cd97f41a70006b98fb7a95db927a7e026d42331822c67f07bd99c7b2f67df82"
if [[ "$actual" != "$expected" ]]; then
  echo "Checksum mismatch: expected $expected, got $actual" >&2
  exit 1
fi
echo "Verified: $output"
