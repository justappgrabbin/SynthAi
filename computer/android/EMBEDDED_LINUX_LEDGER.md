# Embedded Linux Computer — integration ledger (2026-11-10)

## User-required architecture
One APK contains an embedded Linux userspace (root filesystem and PRoot), Node.js and Synthia Computer services, an outer terminal that can launch the Computer, and an inner terminal connected to the same Linux environment. Preserve the existing desktop and authenticated local APIs. Updates must be announced from verified signed APK releases rather than requiring repeated manual reinstalls.

## Verified source checkpoint
- Parent: `repair/android-computer-session-auth-20261028` at `78e9c15d5f15df6caa455bde3816722251a41fbe`.
- Android application ID: `org.synthai.computer`; current native launcher invokes `startNode` and loads WebView. This **does not launch Linux**.
- Existing `prepare-assets.py` packages JavaScript and desktop assets but excludes .zip files. Existing APKs inspected earlier have libnode but no rootfs/PRoot.
- The new `stage-linux-assets.py` is an **isolated staging utility**, not wired into Gradle or MainActivity. It requires user/owner-supplied verified rootfs and ARM64 PRoot binary; no binaries have been supplied, staged, downloaded, or installed.
- The staging utility validates SHA-256, rejects suspicious tar entries and non-ELF PRoot input, and refuses output overwrite. Its embedded ELF-magic/newline escaping was corrected in commit `cd8b27aa10687925b8c6793f0e09ddb1a85a3801`.
- Current staging has **not** passed a real Python execution test; container network access prevented fetching the committed source. Do not count syntax or packaging as tested.

## Remaining engineering gates (all open)
1. Obtain verified, license-compatible ARM64 Alpine rootfs with Linux Node.js and compatible PRoot ELF; record SHA256 and source provenance.
2. Integrate a non-destructive private rootfs extractor, confinement, executable permissions and persistent user home; account for symlink/hardlink semantics and Android app-data execution restrictions on target Android versions.
3. Connect native Android startup to Linux environment; preserve session token and authenticated WebView-to-Node route. Never fall back silently to Android libnode when Linux startup fails.
4. Implement outer and inner terminal interfaces to the same Linux session; control process lifetime, stdout/stderr and restart.
5. Test full build, Android device boot, terminal commands, authenticated API, import, execution, restart/persistence and signing continuity.
6. Implement signed-release update notifications and optional installer handoff; no unattended APK installation.

## Change / evidence policy
No original APK bytes modified, no deletion/overwrite, no deployment/merge/registration or paid CI. Branch work is incomplete. Do not claim an installable Linux APK exists. Do not recommend uninstalling the existing app. Historical original APK: 112010294 bytes, SHA256 `9fc1983e3afeb1f10663231d349c74ba57fe525d9ec032baaa7683085ae77581`.
