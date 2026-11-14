# Synthia Adaptive Lite 0.5.4

A separate installer derived from the exact original Adaptive 0.5.4 APK. It retains the original web app, local model engine and model configuration, while moving only the 1,117,320,768-byte GGUF out of the installer. It installs as `com.synthia.adaptive.lite`, labelled **Synthia Adaptive Lite**, with a separate signing identity, so it does not replace the original app or share its saved data.

In **Computer → Downloadable local model**, tap **Download / start model**. First use downloads the same official Qwen2.5-Coder 1.5B Q4_K_M weights; allow 1.2 GB free and use Wi-Fi. Keep the app open during setup. Progress is visible in model status; Stop pauses, and Start resumes. A timed-out or interrupted connection keeps partial bytes. A checksum failure discards invalid downloaded bytes. Verified model files are reused without internet access; inference stays on the phone. Source revision and expected size/hash are pinned in `ModelDownload.java`.

This is a distribution patch of the original APK, not a reconstruction of its missing original native source. `patch.py` inserts one model-only downloader call in the existing native materialization method. Engine assets still use the original code. The added downloader is compiled from Java into `classes2.dex`. Only the manifest, original DEX and two model-related web files change; `verify.py` verifies every other original entry byte for byte. Web assets are compressed in ZIP without changing their contents.

Build requirements: JDK 17, Android SDK 35/build-tools 35.0.0, Apktool 2.12.1, Python 3.11+.

```
APKTOOL_JAR=/path/to/apktool.jar \
ANDROID_JAR=/path/to/platforms/android-35/android.jar \
BUILD_TOOLS=/path/to/build-tools/35.0.0 \
bash lightweight/build.sh dist/Synthia-Adaptive-v0.5.4.apk
```

The input APK must match the original hash. The build signs a distinct Lite application with a new local key under `.signing/` (never committed). Keep that key for future compatible local updates. GitHub's one-off release build creates its own key. No claim is made that another build will update an installed Lite APK unless it uses that same key.

Downloader regressions cover a complete download, offline reuse, Range resume, servers ignoring Range, truncation, wrong size, wrong checksum, bad resume headers, HTTP failure, cached partial recovery, corrupt final cache and cancellation. Structural verification, signature checks and browser tests are recorded separately. Physical Android installation, real phone inference, first-use network interruptions and background lifecycle remain device acceptance checks.

## Optional GitHub updates (0.5.5)

**Settings → App updates** shows the installed version and a manual GitHub check. Daily checks run only when the app is opened and can be turned off. An update is offered only if a published Lite release has a higher Android version code, the same package and signing certificate, and matching GitHub asset size/hash. Other SynthAi apps, draft releases and older builds are ignored. Download opens the exact GitHub APK asset in the browser; Android retains control of installation and signature verification. There is no silent install, background APK download or forced update.

The earlier 0.5.4 GitHub build used a disposable signing key. It cannot necessarily be updated in place to this build. Do not delete an existing installation's data merely to resolve a signing mismatch; first preserve any work. Once on this signing identity, compatible signed updates retain app data and downloaded model weights.

The private key stays outside Git. Its public certificate is pinned in `signing.json`. This connection cannot manage repository secrets (GitHub returned 403), so CI never publishes its randomly signed test APK. Instead, `lite-delivery/current.json` names an already signed APK split into Git-sized pieces. CI independently rebuilds every APK payload entry and compares it byte for byte, then verifies the stored APK signature, version, checksum and pinned certificate before publishing it and `update.json`. To publish a future update, increase `version.json`, build with the same private keystore, refresh the signed delivery pieces, and push. Never generate a replacement signing key for an in-place update.

The local key is `.signing/adaptive-lite.keystore`, alias `adaptive-lite`, with the local build password used by `build.sh`. It is not committed, uploaded with release assets, or backed up to Drive. A private backup requires the owner's approval. Losing this key prevents compatible future updates; keep it private and preserve it before this workspace is discarded.
