#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."

required=(
  Package.swift
  StellarVM.entitlements
  Sources/StellarVM/main.swift
  Sources/StellarVM/StellarAppDelegate.swift
  Sources/StellarVM/StellarOptions.swift
  Sources/StellarVM/StellarVMController.swift
)
for f in "${required[@]}"; do
  [ -s "$f" ] || { echo "Missing required file: $f" >&2; exit 1; }
done

grep -q 'com.apple.security.virtualization' StellarVM.entitlements
grep -q 'VZVirtualMachineConfiguration' Sources/StellarVM/StellarVMController.swift
grep -q 'VZVirtioBlockDeviceConfiguration' Sources/StellarVM/StellarVMController.swift
grep -q 'VZNATNetworkDeviceAttachment' Sources/StellarVM/StellarVMController.swift
grep -q 'VZVirtioSocketDeviceConfiguration' Sources/StellarVM/StellarVMController.swift
grep -q 'VZVirtualMachineView' Sources/StellarVM/StellarAppDelegate.swift

echo "Stellar VM source structure: OK"
if [ "$(uname -s)" = "Darwin" ] && command -v swift >/dev/null; then
  echo "macOS detected: running Swift build check..."
  swift build
else
  echo "Compile check skipped: Apple Virtualization.framework is only available on macOS."
fi
