# Android Computer acceptance preflight — 2026-11-01

This is a **read-only audit** of the existing Synthia Computer, not a new runtime or Android acceptance certificate. It derives from `repair/android-computer-zip-header-consistency-20261031` at `ea2aed07dd95239f4904044d0382391150c0381e`. No original branch, APK, installation, or user data was changed.

## Source lineage

- Original September 29 full Android-hosted Computer: 112,010,294 bytes, SHA-256 `9fc1983e3afeb1f10663231d349c74ba57fe525d9ec032baaa7683085ae77581` (historical checkpoint; original APK not locally available for fresh hashing in this run).
- October 27 full isolated-test APK: 112,016,076 bytes, SHA-256 `110edb64d5ac3d0c0fa1dc8ab9a491da291f3f11218a69a07776f4cd577607b6` (freshly rehashed). Its outer ZIP CRC, embedded 1,464-entry source ZIP CRC, Android manifest presence, and arm64-v8a/x86_64 libnode.so entries passed read-only checks. **This APK predates October 28–31 repairs.**
- Exact October 31 GitHub blobs matched the locally reconstructed source: `host/server.mjs` `95ce8b5b29fe82e8deaf25b1789fe75372df86f7`, `mobile-entry.mjs` `3628ec67f32aed057f2d48fcea941e6fb2f0b008`, `host/zip-members.mjs` `ef80be7bd7d2819a9b001a5b7f5c01f316bb5c2b`, `package.json` `9ca8f30fcef6668f5dd91810a56a7ee85f756af4`. Recovered local session and ZIP header regression files also matched GitHub blobs.

## Actual execution

A reconstructed source tree was extracted from the October 27 APK, with October 28 authenticated host/mobile entry and October 31 ZIP parser/package/test evidence overlaid in a **new local audit directory**. Node v22.16.0 ran seven recovered/supplementary test files with `SYNTHIA_ALLOW_INSECURE_DEV=1` only for legacy isolated test hosts: **49 tests passed, 0 failed**. The dedicated session regression still explicitly exercises fail-closed authentication. These were not the byte-for-byte eight-file GitHub suite; some recovered tests differ from current committed tests.

A separate read-only APK/environment preflight found no Android SDK, Gradle, adb, emulator, apksigner, or aapt2 in the execution environment. JDK is available. Therefore no Android Java compile, native libnode startup, WebView CookieManager, physical device installation, restart acceptance, or PRoot/Alpine integration was performed.

## Hard gates

1. Obtain an authorized isolated Android emulator/device and an owner-controlled **stable signing key**. Do not uninstall or replace an existing Synthia installation; experimental APK signing certificates are incompatible.
2. Run the **exact committed eight-file GitHub suite** in a fully fetched checkout (the recovered seven-file run is additional evidence, not a substitute).
3. Run the actual Android Gradle build and verify signing identity, package identity, and clean-install acceptance.
4. Observe UI → native Node → authenticated same-origin API → import → addressed execution → restart, with logcat and SHA/registration ledger.
5. Reconcile the preserved `com.synthia.phone` PRoot/Alpine residence with `org.synthai.computer` resident-Node architecture **additively**, not by silent substitution.
6. Registration remains **PENDING**. No deployment, merge, paid CI, deletion, or device registration was authorized or performed.

The separate local preflight script and JSON receipt are retained as conversation artifacts, not committed to the runtime.
