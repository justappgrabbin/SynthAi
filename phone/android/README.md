# Synthia Resonance Android preview

Adapted from the existing Simlish Java WebView shell. Android 8+ (API 26), Java 17, Gradle 8.9, Android SDK 35. Build from `phone/` with `gradle -p android assembleDebug`.

The small APK contains offline server onboarding. Its active Human Design, resonance and research interface loads from a user-selected HTTPS server. No model weights or running backend are included. Use the Android action-bar menu to change the server. The app uses a distinct package ID, app.synthia.resonance.preview, so it can coexist with the Simlish world app.

See docs/PHONE-PREVIEW.md for server setup, inference configuration, build and installation limits.

Preview 2 installs alongside the first preview because its original CI key was not retained. Never uninstall the first app to bypass a signature error. The explicit signing key lives at android/.preview-signing/debug.keystore in the CI cache, outside Git; its public certificate is pinned in android/preview-signing.sha256. A missing key or mismatched pin blocks builds instead of rotating the key. Before production, move the key to owner-controlled encrypted signing storage with a secure backup.
