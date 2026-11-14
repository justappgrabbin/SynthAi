# Synthia Adaptive 0.5.4 — verification

APK: `Synthia-Adaptive-v0.5.4.apk`; package `com.synthia.adaptive`; version code 9. Size: 1,225,329,912 bytes. SHA-256: `068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5` (also recorded in `dist/SHA256SUMS`).

## Passed

- Native Hands policy checks: observed results versus keypad labels, visibility, deletion, stale references and schema scope.
- Embedded model startup and typed Hands browser workflow, approval separated from execution, persisted completion trace.
- Native Android Java compilation against API 35 and D8 generation for minimum API 24.
- APK ZIP integrity, 4-byte alignment and APK v2/v3 signature verification.
- All 2,499 packaged source assets match the current build inputs byte for byte.
- 47 repository automated tests; zero failures.
- Existing WebView boot graph: 168 statically reachable modules, zero Node-only imports.
- Phone-sized browser workflow: source upload, model preparation, revision approval into library without execution, real JavaScript Worker execution, recorded output and library persistence after reload.
- Explicit correction retention and inclusion in subsequent model context; persisted chat.
- Foreground watcher autonomously staged a new proposal without executing it.
- Model error handling, stale approvals, concurrent approval claims, deletion confirmation, idempotent outcome learning, publication replacement rules and Termux callback polling tested.
- Real v86 guest executed `echo SYNTHIA_ADAPTIVE_GUEST_OK; uname -s`; output contained the marker and Linux, with observed exit code 0.
- Generated-APK fixture compiled, aligned and passed v2/v3 signature verification. Its packaged JavaScript runner returned the expected source count in Chromium over local HTTP.
- Settings / Computer / Emulator navigation leaves exactly one function screen visible; Tools closes the previous function screen.
- Function relocation checks pass for GitHub source import, GitHub publication, Supabase configuration/upload, APK package/build, Trident configuration and home customization. Legacy setting keys and unrelated values are preserved.
- Publishing credentials are in Settings and can be cleared; publishing actions remain with approved library work. The Gallery is preserved with its existing container, search, nine items and Suite Center link; the six relocated functions are not duplicated there.
- Phone and desktop browser inspections: consistent paper/ink/red styling and fonts, readable controls, no horizontal document overflow, zero page script errors.

## Verification boundaries

The bundled Qwen weights were exercised with the same pinned llama.cpp source on the build host: arithmetic, typed Hands preparation into the review tray without execution, and two native-schema action selections passed. Browser integration tests use controlled native/model fixtures. The ARM64 engine was cross-compiled with Android NDK r28c and its dependencies inspected; this does not establish phone inference speed or Android runtime behavior.

Physical Android installation, native file/share/permission flows, actual Termux result delivery, Android background lifecycle and the phone's real model inference were not exercised on a physical device. Native callback code is compiled and the polling protocol is tested, but that is not equivalent to a device test.

GitHub/Supabase clients were tested with controlled responses; no user's repository files or storage objects were changed during functional testing. No GitHub release asset was published: authentication rejected the asset upload. Delivery uses Google Drive.

Persistent adaptation means conversation/correction retrieval, measured tool feedback and verified code examples. This build does not claim on-phone neural weight training. The watcher operates while the app is visible.
