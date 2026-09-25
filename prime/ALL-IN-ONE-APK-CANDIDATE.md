# SynthAI + Synthia Prime all-in-one APK candidate

Status: **BUILT + STATICALLY VERIFIED. NOT PHYSICAL-DEVICE VERIFIED.**

## Candidate APK

- File: `SynthAI-Prime-Linux-Resident3-debug.apk`
- Size: 367,532,021 bytes
- SHA-256: `4b5012ae88b2f89309d04596f19b5c380dcf9658a17f861e2d9c7a7c1f45cf23`
- Signature verification: Android `apksig 8.7.3` VERIFIED
- Signature scheme: v3
- Signing certificate SHA-256: `23:1F:D3:FB:15:F1:5C:07:35:E7:1D:31:4F:8F:E1:63:B9:BF:D7:DA:76:98:25:44:B8:2F:3E:1B:ED:44:A0:DF`
- Signing role: local/debug candidate key, not production release identity

## Android/Linux host

The host APK comes from successful workflow run `36116773303`, source commit:

`95848622407956eef2c25f05ede7f0cf11f3b811`

The successful workflow passed:
- ARM64 Alpine residence build
- residence asset verification
- Android debug APK compilation
- byte-level APK residence verification
- APK artifact upload

Verified inside the final signed candidate:

- `assets/runtime/rootfs-arm64.bin`
  - bytes: 283,288,389
  - SHA-256: `2db2bf52de55956a186fb79494ae4932dcd07d8d9dfba408927258e6deab1ea9`
- `assets/runtime/proot-android-aarch64.bin`
  - bytes: 179,448
  - SHA-256: `9629eb30cdf86e95c6ba681f8ab89c6fdaa9eca093d5577163513c99af5ca281`
- Alpine: 3.19.9
- Node: 20.15.1
- npm: 10.2.5
- Python: 3.11.14
- native seed: `/opt/synthai/computer/native/native-seed-server.mjs`

The embedded native seed was inspected from the final APK and contains:
- resident image install route
- resident image mount/request/unmount routes
- local process host
- `resident_type: echo`
- `resident_type: synthia58`
- persistent resident image store

## Bundled Synthia Prime

Asset slot:

`assets/residents/Synthia-Prime-v0.5.8-Android-Resident-3.synthimg`

Fresh additive reconstruction from the protected v0.5.8 source:
- protected source SHA-256: `c73d2bf2c688fc954cb3ac2e273662308a23577c6d29b08509eff85b6983a143`
- protected source remains unchanged
- image bytes: 81,151,678
- image SHA-256: `8d5874a11f0a73027be14119bc13f6a0efd1adeb2aa9ac877c2284fcd5ab2f72`
- image files: 1,564
- asset is stored uncompressed in the APK
- extracted asset SHA matches the pre-insertion image SHA exactly

Additive features in this candidate:
- existing 5.8 Solo Hover interface
- session-scoped Admin Mode over the real birth/design execution gate
- identity state remains preserved under Admin Mode
- Android Talk hooks
- authenticated Android Hands loopback token
- local Linux runtime adapter
  - Python via `python3`
  - shell via `/bin/sh`
  - Node for JavaScript only when explicitly requested

Critical Prime regression set passed:
- front screen
- birth mirror mandatory/configuration behavior
- birth-coordinate differentiation
- birth mirror persistence
- timezone discontinuity surfacing
- Admin Mode
- Android Hands token
- real local Python/shell execution

Result: **8 passed / 0 failed** in the final reconstruction test set.

## Boot path represented by this candidate

```text
Launch APK
  -> foreground LinuxResidenceService
  -> unpack verified PRoot + Alpine into app-private storage
  -> start native seed on 127.0.0.1:17757
  -> find bundled Prime resident image
  -> install/verify/extract whole SynthIMG
  -> mount resident_type=synthia58
  -> start Prime src/ui/server.mjs on 127.0.0.1:17759
  -> Synthia hover service displays Prime
  -> Talk stays attached to hover chat
  -> Accessibility Hands bridge stays Android-owned
  -> Python/shell execution runs inside local Linux residence
```

## Evidence boundary

This candidate is **BUILT + STATICALLY VERIFIED**.

It is not labeled PHONE VERIFIED until a physical Android device passes:
1. install
2. launch
3. residence startup
4. Prime automatic summon
5. hover permission + visible hover
6. microphone/TTS
7. Accessibility Hands enablement + real cross-app action
8. Python/shell artifact execution
9. persistence across force-stop/reopen
10. Echo resident install/summon smoke test

No source deletions were used to produce Prime.
