# Stellar VM v0.1.0

This is the first real Mac-hosted VM nucleus for Stellar CPU. It uses Apple's `Virtualization.framework`, not QEMU, Docker, or a simulated interface.

## What it does now

- creates a persistent VM bundle at `~/StellarVM.bundle`
- creates a sparse writable virtual disk (32 GiB by default)
- creates and preserves a generic VM machine identifier
- creates and preserves EFI NVRAM
- boots a Linux installer ISO through EFI
- exposes the persistent disk as VirtIO block storage
- provides VirtIO GPU output in a native macOS window
- provides USB keyboard and absolute pointing input
- gives the guest NAT internet access through a VirtIO network device
- exposes VirtIO entropy, memory balloon, and VirtIO socket devices
- boots from the installed disk on subsequent launches

Apple requires the `com.apple.security.virtualization` entitlement to create VMs. The build script signs the local app with that entitlement.

## Requirements

- macOS 14 or later
- Apple silicon or Intel Mac
- Xcode or Xcode Command Line Tools with Swift

The Linux ISO must match the Mac architecture. Apple silicon needs ARM64/aarch64; Intel Mac needs x86_64/amd64.

## Fast path

Open Terminal in this folder and run:

```bash
./scripts/download-alpine.sh
./scripts/build-mac-app.sh
./scripts/run-installer.sh
```

The download script currently selects Alpine Linux 3.24.1 `virt`, which is a small Linux image designed for virtual environments.

Inside Alpine's installer, install the operating system onto the virtual disk. When the guest shuts down, launch it again with:

```bash
./scripts/run-vm.sh
```

## Important: installation is intentionally separate from reset

`reset-vm.sh` never deletes the VM. It renames the existing bundle to a timestamped backup first:

```bash
./scripts/reset-vm.sh
```

This preserves the working VM and allows a fresh one to be created afterward.

## VM files

The persistent bundle is:

```text
~/StellarVM.bundle/
├── Disk.img
├── MachineIdentifier
└── NVRAM
```

`Disk.img` is the guest's real persistent disk. The machine identifier and NVRAM are preserved so the VM remains the same virtual machine between runs.

## Custom installer ISO

You can use Debian, Ubuntu, Fedora, Alpine, or another Linux installer that supports your Mac's CPU architecture:

```bash
./scripts/run-installer.sh /path/to/linux-installer.iso
```

## Direct executable options

After building:

```bash
dist/StellarVM.app/Contents/MacOS/StellarVM \
  --bundle "$HOME/StellarVM.bundle" \
  --iso /path/to/linux.iso \
  --cpus 4 \
  --memory 4 \
  --disk 32 \
  --width 1440 \
  --height 900
```

`--memory` and `--disk` are in GiB.

## Next layer

This VM already includes a VirtIO socket device. That is the intended control seam for the next build: `stellar-agent` inside Linux and the Mac/iPhone control bridge outside it. No fake remote responses are included in this version; that channel is not claimed as working until the guest-side agent is installed and connected.
