# IndiVerse Universal World Shell — implementation record

Date: 2026-09-23
Branch: `feature/indiverse-universal-world-shell`
Preserved baseline: `integration/synthia-reality-resident`
Baseline commit observed before work: `ec29a5bfc1b494453876712da325c2ebf0a794c6`
Final verified build commit: `8b16caa602958177dba108cc7d0fed8362d2d0a0`
GitHub Actions run: `35887953753`
APK artifact: `SynthAI-Computer-Mobile-debug` (artifact id `10764076351`, 3,883,528 bytes)

## Preservation

No files were changed on `integration/synthia-reality-resident`.

Existing architecture preserved:
- MobileComputerRuntime
- IndiVerseRuntime
- ResidentHost
- RelationalMeshKernel
- WorldFederation
- SynthIMG runtime and install/mount path
- state-space and canonical addressing
- existing mobile Computer page
- existing APK workflow

The new work was added on a separate feature branch.

## Baseline issue found and repaired

`computer/mobile/MobileComputerRuntime.mjs` imported modules from `computer/worlds/`, but
`computer/build-web.mjs` did not copy `computer/worlds/` into the staged browser/APK runtime.

That is now corrected. CI explicitly verifies these files are present in `mobile-web/`:
- `computer-runtime/worlds/indiverse.mjs`
- `computer-runtime/worlds/experience-compiler.mjs`

## Added

### Semantic experience compiler

Files:
- `computer/worlds/experience-compiler.mjs`
- `computer/mobile/AppExperienceRuntime.mjs`
- `computer/mobile/AppExperienceAdapters.mjs`

Behavior:
- app observations compile into persistent world experiences
- evidence records package, activity, source, and observed UI-node count
- unknown apps use a generic application-place adapter rather than invented state
- ChatGPT maps to a conversation house
- Picsart maps to an art studio
- observations persist to current experience + bounded history
- experience events enter the existing MobileEventLog

### IndiVerse Android HOME shell

Files:
- `public/indiverse-shell.html`
- `computer/mobile/native/MainActivity.java`
- `computer/mobile/native/WorldShellPlugin.java`
- `computer/mobile/patch-android-world-shell.mjs`

Behavior:
- APK boots to the IndiVerse shell
- generated Android project receives a HOME + DEFAULT intent filter
- WorldShell native plugin is registered with Capacitor
- native bridge enumerates real launchable apps
- no fake app list is substituted in browser mode
- native bridge can launch a selected Android package/activity
- native bridge reports whether SynthAI is currently selected as Android HOME
- app destinations are compiled through the same experience compiler

### Android semantic app observation

Files:
- `computer/mobile/native/WorldObservationService.java`
- `computer/mobile/native/world_observation_service.xml`

Behavior:
- user-enabled Accessibility Service observes foreground app/package/activity
- retrieves a bounded semantic UI tree
- captures enabled/clickable/editable state and non-sensitive visible labels
- password-field text/content/hints are not persisted
- latest observation is written to private app SharedPreferences
- WorldShell plugin exposes accessibility status, settings entry, and latest observation
- IndiVerse shell ingests a new observation into MobileComputerRuntime when the shell becomes visible/focused again

## Runtime status

| Component | State | Evidence |
|---|---|---|
| Existing SynthAI Computer / IndiVerse / resident architecture | VERIFIED | Existing acceptance suite continued to pass in final run |
| `worlds/` staging into APK web runtime | VERIFIED | final CI bundle verification passed |
| Experience compiler registration in MobileComputerRuntime | WIRED | imported, instantiated, registered as service/capability, snapshot + event path connected; acceptance test passed |
| ChatGPT conversation-house adapter | WIRED | acceptance test verifies new-chat door transition and conversation-room state |
| Picsart art-studio adapter | WIRED | acceptance test verifies editor -> active studio/canvas mapping |
| Generic unknown-app adapter | WIRED | acceptance test verifies unknown app remains renderable without invented UI nodes |
| Persistent experience history/event path | WIRED | acceptance tests verify state sequence and MobileEventLog path |
| Android HOME capability | WIRED | generated manifest is patched and Gradle build passes; physical-device HOME selection has not yet been executed |
| Installed-app enumeration + launch bridge | WIRED | native plugin compiled into successful APK; physical-device execution remains to be observed |
| Accessibility semantic observation service | WIRED | service + manifest resource + plugin bridge compile in successful APK; user enablement and real-device observation remain to be executed |
| Debug APK build pipeline | VERIFIED | GitHub Actions run 35887953753 passed every step and uploaded artifact 10764076351 |

## Intermediate failure that was surfaced

Run associated with commit `e3c60669ff5097dd2237ca15d0306d1dd032065c` failed at
`:app:compileDebugJavaWithJavac`.

Exact failure: `WorldShellPlugin.java` referenced `WorldObservationService`, but the generated Android project did not yet copy that class.

Fix: `computer/mobile/patch-android-world-shell.mjs` was updated to copy:
- `WorldObservationService.java`
- `world_observation_service.xml`
and register the service in generated `AndroidManifest.xml`.

The corrected commit built successfully, and the final stricter CI run also passed.

## Not complete yet

These are intentionally not described as implemented:

1. Full-screen live world rerender while a third-party app remains foreground.
   The current shell can enter/launch an app and the accessibility service can observe its semantic state, but a live overlay/world renderer that replaces the visible app UI is not implemented yet.

2. Accessibility action bridge.
   Synthia can observe semantic controls, but the world objects do not yet dispatch click/type/scroll actions back to the corresponding AccessibilityNodeInfo.

3. Persistent live character across third-party apps.
   The launcher contains a movement-capable shell character representation. A system overlay / scene service that keeps the canonical Synthia character visible and animated over arbitrary apps is not implemented yet.

4. Canonical Synthia visual asset.
   The shell currently uses a small CSS-rendered figure to prove the movement path. It is not claimed to be the final Synthia body/skin/model.

5. YOU-N-I-VERSE shared-world transition.
   The existing WorldFederation and network architecture were preserved, but the new IndiVerse launcher does not yet expose a completed public/shared-world portal flow.

6. Physical-tablet verification.
   No physical tablet has yet executed this APK in this work session. HOME selection, installed-app enumeration, package launch, Accessibility enablement, semantic observation, return-to-IndiVerse ingestion, sleep/wake behavior, and OEM-specific behavior still require device testing.

7. Production signing / provisioning.
   The current artifact is a debug APK. It is installable for testing, but it is not yet a production-signed release or OEM/system-image preinstall.

## Next acceptance path on the tablets

The next device test should execute this exact observable chain:

`Install APK -> select SynthAI as HOME -> IndiVerse appears -> list real installed apps -> select ChatGPT -> Android launches ChatGPT -> enable semantic perception -> create/open conversation -> Accessibility service records real UI -> return HOME -> IndiVerse ingests observation -> experience history shows ChatGPT conversation-house state -> restart app/tablet -> persisted state survives`.

Only after that physical path passes should the launcher/device integration be promoted to VERIFIED.
