# SynthAI Computer Android Linux Runtime - Third Party Notices

This APK keeps the canonical SynthAI Computer source as the application runtime.
The Android Linux bridge is a platform adapter only. It does not replace synthctl,
ComputerRuntime, Synthia, or the Computer architecture.

## PRoot Android bridge

The Android build cross-compiles and packages PRoot from the OpenMinis PRoot fork.
PRoot is licensed under GPL-2.0.

Source used by the build:
- OpenMinis integration repository: https://github.com/OpenMinis/OpenMinis
- PRoot fork: https://github.com/OpenMinis/proot

The build records the exact OpenMinis and PRoot commit IDs inside the APK at
assets/licenses/linux-runtime-provenance.txt and includes the PRoot license.

## talloc

The PRoot build statically links talloc 2.4.2 from Samba.
talloc is licensed under LGPL-3.0-or-later.
Source: https://www.samba.org/ftp/talloc/

## Alpine Linux

The embedded ARM64 userspace is built from Alpine Linux packages, including
Python 3 and py3-ephem.
Source: https://www.alpinelinux.org/

## Apache Commons Compress

The Android rootfs installer uses Apache Commons Compress under the Apache
License 2.0.
Source: https://commons.apache.org/proper/commons-compress/
