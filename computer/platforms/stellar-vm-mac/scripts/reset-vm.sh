#!/bin/bash
set -Eeuo pipefail
BUNDLE="${STELLAR_VM_BUNDLE:-$HOME/StellarVM.bundle}"
if [ ! -d "$BUNDLE" ]; then
  echo "No VM bundle exists at $BUNDLE"
  exit 0
fi
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${BUNDLE%.bundle}-backup-$STAMP.bundle"
mv "$BUNDLE" "$BACKUP"
echo "Original preserved at: $BACKUP"
echo "Nothing was deleted. A new VM can now be created at: $BUNDLE"
