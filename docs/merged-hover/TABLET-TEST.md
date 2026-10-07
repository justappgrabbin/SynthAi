# Synthia Preview tablet test

This preview installs as app.synthai.hover.preview, alongside the existing Synthia.
It is debug-signed and does not use automatic updates. Existing app data is untouched.
The runtime build targets ARM64 devices, Android 8.0/API 26 or later.

1. Install Synthia-Preview.apk. Open **Synthia Preview**.
2. Wait for the local runtime status to say ready. First launch installs the bundled
   Linux filesystem into private app storage; keep the app open during this step.
3. Tap **Open app**. Overlay/Accessibility are not required for full-screen use.
4. Open birth setup, choose date and minute-time, search/select birthplace, continue.
5. Send a chat message. Confirm a reply and tool trace (AutoLing, DISEMINER, Klein).
6. Open **Build → SynthAIPro**. Check its chat, **App studio**, **Morph interface**,
   and **Stellar Nexus**. In App studio, Build starter → Run → press Count.
7. Save an app change, close/reopen the app, and verify it remains.
8. Optionally allow hover, then start the planet. Expand/collapse it and confirm
   underlying Android buttons respond after collapse. Use **Hide planet** in the
   launcher to remove it. Enabling Hands is only needed for Android action features.

The APK contains Linux, Node, PRoot and its loaders, the repaired Hover runtime,
merged SynthAIPro screens, offline place directory, original Talk dependencies,
and the existing native Synthworld pack. It does not require an external server.
Browser automation still requires a compatible browser binary; optional native
capabilities still depend on the Android permissions/bridge.

Verified here: Java/APK compilation; actual packaged ARM64 runtime API smoke test;
web UI interaction; APK signature and payload inspection. No physical tablet was
attached, so on-device PRoot/overlay behavior still requires this test.
