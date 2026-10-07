# Merged Hover tablet preview

This is the first usable integration of SynthAIPRODeploy into SynthAi's existing Hover computer, based on fix/venom-hover-runtime-20261005. Keep the original screens and focus on launch, connected controls, and local execution before redesigning anything.

## What is connected

The Android Hover app contains a Linux/PRoot runtime and local Node server. The Hover Build surface opens the integrated SynthAIPro console. Both chat screens use the same local AutoLing/DISEMINER/Klein/conversation pipeline. This is a local rule/tool pipeline; it is not an external language model or a completed arbitrary-app repair system.

The App Studio imports, edits, saves, runs, and exports standalone HTML/JavaScript. Morph and Stellar Nexus are available with their existing layouts. Birth setup accepts native date/minute-time inputs and an offline city search that fills timezone and coordinates. Overlay collapse disables touch interception, and the native launcher offers Open app and Hide planet without requiring overlay permission to open the full app.

The image computer, gaming computer, and Venom computer remain distinct. This integration targets the Hover runtime derived from Venom. Echo resident-loader fixes are preserved separately in patches/echo-resident-startup-fix.patch; they are not applied to this runtime.

## Source and build

Active runtime: computer/hover. Integrated original frontend: integrations/synthaipro. Source attribution is recorded there; offline cities have their own NOTICE.

See computer/hover/OPEN-MERGED-APP.md for local Node 22 launch and frontend rebuild. The github-only-app workflow builds the integrated frontend before packaging the Linux rootfs and runs the actual merged-runtime smoke test. Existing Android rootfs/native packaging requirements still apply.

The preview build uses SYNTHAI_PREVIEW_INSTALL=1 and :app:assembleHoverDebug. It installs alongside the existing app as app.synthai.hover.preview, version 0.5.8-merge-preview1. It requires Android 8 or newer and an ARM64 device. Preview auto-updates are disabled so an unrelated release cannot overwrite it.

## Verification and next step

The APK was built and its v2 signature verified. Its packaged Linux rootfs matches the ARM64 image exercised by the runtime smoke test. Birth setup, local chat trace, integrated screens, app-studio execution, and the existing native game checks passed in the build environment. No physical Android tablet was attached; on-device PRoot launch and overlay behavior still need acceptance testing.

See docs/merged-hover/APK-VERIFICATION.json for the exact APK hash and docs/merged-hover/TABLET-TEST.md for the first device test. The verified APK was built as Synthia-Preview.apk. Upload to GitHub Releases was rejected with HTTP 401 by uploads.github.com; no release is published yet. The APK is available from the build workspace and should be distributed as a release asset rather than committed into source history. It is approximately 175 MiB because it includes the Linux runtime and existing native game components. Size optimization is a later step.

Next: install the preview on the tablet, wait for Runtime Ready, open the app, and check the connected surfaces. Report any launch error verbatim. Preserve this coherent working baseline before adding the remaining project variants or broader app-ingestion/repair capabilities.
