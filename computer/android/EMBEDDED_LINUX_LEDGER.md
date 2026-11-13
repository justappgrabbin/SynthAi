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

## 2026-11-11 source hardening checkpoint
- Read canonical Foundry Google Doc and Drive master reassembly again before source changes.
- Derived branch only: staging script commit `893a42cde96d692bc1929aefd5e9d66d1fcd1e61` (blob `3d9823470cfc736710738b23bddda714da3da272`). Replaced suffix-matching tar entries with exact `bin/sh` / `usr/bin/sh` and `usr/bin/node` / `bin/node` checks; PRoot ELF check now reads only four bytes, not the entire executable. This prevents false-positive entries such as `fake/usr/bin/node`.
- Added isolated offline unittest suite `computer/android/tests/test_stage_linux_assets.py` at commit `febb70c108290a81edfee4814d058363245d2252`. Seven cases cover manifest, overwrite protection, wrong hash, missing Node, suffix spoofing, traversal, and invalid ELF. **Committed but not executed**: container DNS cannot resolve GitHub raw host; connector source readback succeeds but no container materialization path. Do not claim passing tests.
- No Linux image/PRoot binary supplied or built; no Gradle/Java/Android startup integration, physical device test, APK, update notifier, merge, deployment or registration. Original APK hashes remain historical checkpoint values, not freshly rehashed.
- Next unblocked action: test the committed Python files in a build-capable environment, then implement Android private rootfs extraction and native PRoot launch using verified ARM64 assets; preserve existing auth and signing identity.

## 2026-11-13 fixture correction and local test
- Canonical Foundry Google Doc (revision AHj4eMQTCNaJtGbr0Fzr3VIeA_85gdDQ2sEQEaVbHFmFruxdAH6AOeO4BmnYbYsOTSrwYk5OiMW8-Rsx6dBet5NZQREodDrYgYhAz4C-DwM) and Drive REASSEMBLY_MASTER_BUILD.md reread before work.
- Source readback found the committed test fixture used ASCII backslash-x bytes (`b"\\\\x7fELF"`) rather than ELF magic (`b"\\x7fELF"`), so the nominal success test would fail. Fixed the test fixture in commit `3daa5f69079dcfead3f9f03dba2d1873a927bc58`, updated blob `197c44370b7791a7d2f6ed89779cdc55cf53fdb8`.
- Reconstructed the inspected staging logic and seven tests into a separate local scratch directory and ran `python -m unittest discover`: 7/7 passed (0.014 s). **These are reconstructed equivalent files, not a byte-for-byte execution of the exact GitHub checkout.** They use synthetic rootfs/ELF fixtures, not Android/Linux integration.
- Blockers unchanged: real verified ARM64 PRoot/rootfs+Node assets, safe Android installer, Linux process launcher, terminal wiring, Android SDK/device, and stable original signing identity. No APK, registration, merge, deployment, or paid CI.
