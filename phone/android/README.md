# Synthia Resonance Android preview

Adapted from the existing Simlish Java WebView shell. Android 8+ (API 26), Java 17, Gradle 8.9, Android SDK 35. Build from `phone/` with `gradle -p android assembleDebug`.

The small APK contains offline server onboarding. Its active Human Design, resonance and research interface loads from a user-selected HTTPS server. No model weights or running backend are included. Use the Android action-bar menu to change the server. The app uses a distinct package ID, app.synthia.resonance, so it can coexist with the Simlish world app.

See docs/PHONE-PREVIEW.md for server setup, inference configuration, build and installation limits.
