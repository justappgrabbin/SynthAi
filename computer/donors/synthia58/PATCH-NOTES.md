# Cynthia Sovereign v0.5.8 — Android Hands patch

This package intentionally keeps **Synthia-Solo-Hover v0.5.8** as the prime build instead of replacing it with a new app.

## Surgical changes

The existing Solo Hover organism, planet art, radial Browser / Chat / World / To Do / Build shell, morph runtime, browser hand, persistence, tests, and vendor tree are preserved.

Added:

1. `src/solo/android-hand-adapter.mjs`
   - Connects the Linux/Node organism to a native Android hand bridge at `127.0.0.1:8787`.
   - Supports status, screen inspection, tap, swipe/scroll, visible-text click, focused-field typing, global navigation, and package launch.
   - Includes a small direct-command parser so hand calls can be smoke-tested without rewriting Cynthia's chat/morph systems.

2. Native Android host in `android-host/`
   - `SynthiaAccessibilityService` provides the actual non-root Android hand authority.
   - `LocalBridgeServer` is loopback-only; it never listens on Wi-Fi/LAN.
   - `BridgeForegroundService` keeps the bridge alive.
   - `OverlayService` provides the floating Cynthia planet and expandable panel.
   - The accessibility service tries to inspect the underlying non-Cynthia window, allowing the floating UI to coexist with the target app.

3. Linux/Android wiring
   - `SoloHoverRuntime` now owns `solo.android` in addition to the existing browser hand.
   - `src/ui/server.mjs` exposes `/api/solo/android/...` endpoints.
   - `linux-runtime/` contains Termux/non-root Linux-userland install, start, and health-check scripts.

4. `Cynthia-Talk-v1` is included unchanged under `extras/` so it is preserved without destabilizing the prime v0.5.8 runtime.

## Important boundary

Android will not silently grant Accessibility or overlay authority. On a non-root phone the owner must explicitly enable **Cynthia Hands** and **Display over other apps** in Android Settings. This patch supplies the service declarations and code those settings authorize; it does not attempt to bypass Android's permission model.

The Linux runtime remains Node 20+ and runs in a non-root Termux Linux userland on-device. The Android host and the Linux process communicate over localhost. A completely self-contained Linux runtime embedded inside one APK would require bundling a native Node/JS runtime and Android ABI binaries; those binaries are not present in the supplied build and were not invented or downloaded here.

## Quick smoke test

With the Android host installed and both permissions enabled, and after starting the Linux runtime:

```sh
curl http://127.0.0.1:8787/status
curl http://127.0.0.1:4173/api/solo/android/status

curl -X POST http://127.0.0.1:4173/api/solo/android/scroll \
  -H 'content-type: application/json' \
  -d '{"direction":"down"}'

curl -X POST http://127.0.0.1:4173/api/solo/android/click-text \
  -H 'content-type: application/json' \
  -d '{"text":"Continue"}'
```


## Verification performed while packaging

- `node --check` passed for the new Android hand adapter, patched Solo Hover runtime, and patched HTTP server.
- New Android bridge tests: **2/2 passed**.
- Full Node suite: **51/52 passed**. The only failure is the existing Chromium CDP websocket test (`Received network error or non-101 status code`) in this container.
- The same Chromium test was run against the **unmodified supplied v0.5.8** and failed identically here, so that environment-specific CDP failure was not introduced by this Android patch.
- Android source was structurally prepared but not compiled in this environment because no Android SDK/Gradle toolchain is installed here.
