# Cynthia Android Hands host

This is the native Android permission/overlay host added around the existing Synthia Solo Hover v0.5.8 runtime.

## What it adds

- Android `AccessibilityService` with `canPerformGestures` and window-content access.
- Local-only hand bridge bound to `127.0.0.1:8787`.
- Tap, swipe/scroll, click-by-visible-text, type-into-focused-field, Back/Home/Recents, screen accessibility-tree inspection, and app launch by package name.
- `SYSTEM_ALERT_WINDOW` floating planet plus expandable Cynthia WebView panel.
- Foreground service so the localhost bridge remains available while the Linux runtime is in the background.
- Normal Android settings flows. No root, ADB privilege, hidden API, or accessibility-permission bypass is used.
- Microphone permission and WebView audio capture path for the existing/future talk surface.

## Build

Open `android-host` in Android Studio with JDK 17 and an Android 35 SDK installed, let Gradle sync, then build `app`.

The project deliberately has no prebuilt APK or bundled Android SDK. The current environment used to prepare this ZIP does not include the Android SDK/Gradle toolchain, so the APK was not compiled here.

## First device setup

1. Install the APK.
2. Open Cynthia.
3. Tap **Enable hands** and enable **Cynthia Hands** in Android Accessibility settings.
4. Tap **Allow hover** and allow display over other apps.
5. Approve notification and microphone permissions if you want the foreground indicator / voice capture.
6. Start the Linux runtime on the same device at `127.0.0.1:4173`.
7. Tap **Start hover**.

The native bridge listens only on loopback. Other devices on the network cannot call the accessibility service.

## Local bridge

- `GET /status`
- `GET /screen`
- `POST /tap` `{ "x": 120, "y": 340 }`
- `POST /swipe` `{ "x1": 400, "y1": 900, "x2": 400, "y2": 300, "durationMs": 350 }`
- `POST /scroll` `{ "direction": "down" }`
- `POST /click-text` `{ "text": "Continue" }`
- `POST /set-text` `{ "text": "hello" }`
- `POST /global` `{ "action": "BACK" }`
- `POST /open-app` `{ "packageName": "com.example.app" }`

The patched Synthia runtime exposes the same capability through `/api/solo/android/*` and through `AndroidHandBridge`.
