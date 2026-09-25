#!/usr/bin/env bash
set -euo pipefail
out="${1:-StellarCPU-Rough-v0.1.0.zip}"
cat StellarCPU-Rough-v0.1.0.zip.part-* > "$out"
sha256sum -c ECHO-ORIGINAL.sha256
