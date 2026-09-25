# First-drop accounting — 2026-09-25

Target: **SynthAI Computer + Synthia Prime 5.8 all-in-one Android first-drop candidate**

Primary implementation lane: PR #10, `integration/echo-prime-resident-loaders` at `bbe36cc99e5b9a454b0eb7e0accd67a5bdbc884a`.

## Governing acceptance rule

The first drop does **not** pass on compilation, CI, static verification, hashes, screenshots, provenance, or reproducibility alone.

It passes only when the actual usable artifact is durably stored, visibly surfaced to the creator, the access path works, the creator can retrieve/install/run it, and the required device/runtime behavior is accepted.

If the creator cannot physically get the valuable artifact, that artifact is **FAILED DELIVERY** regardless of earlier technical success.

Candidate:
- `SynthAI-Prime-Linux-Resident3-debug.apk`
- 367,532,021 bytes
- SHA-256 `4b5012ae88b2f89309d04596f19b5c380dcf9658a17f861e2d9c7a7c1f45cf23`
- technical state: **BUILT + STATICALLY VERIFIED**
- delivery state: **FAILED DELIVERY — exact final APK bytes were not promoted to a durable creator-visible location**
- user-access state: **NOT VERIFIED**
- phone acceptance: **BLOCKED until an actual retrievable APK is delivered**

## INCLUDED on the current first-drop lane

| Capability / asset | Evidence | State |
| --- | --- | --- |
| Protected Synthia Prime 5.8 lineage | protected source SHA + Prime image verification records | INCLUDED, protected original preserved |
| Prime Android Resident 3 image | 1,564 files; embedded image hash recorded in candidate provenance | INCLUDED |
| APK-local ARM64 Alpine Linux residence | rootfs hash recorded and verified inside candidate | INCLUDED |
| Android PRoot bridge | pinned package hash recorded and verified inside candidate | INCLUDED |
| Native seed / local process host | final rootfs inspection + CI | INCLUDED |
| Echo resident loader | resident integration tests / final rootfs routes | INCLUDED |
| Synthia Prime 5.8 resident loader | resident integration tests / final rootfs routes | INCLUDED |
| mobile-to-native resident client and Computer routing | PR #10 implementation | INCLUDED |
| Prime hover/front screen | Prime regression set | INCLUDED |
| Admin Mode | current PR #10 source and regression coverage | INCLUDED; device UX acceptance pending |
| Talk hooks | Android/native + browser voice bridge source on PR #10 | INCLUDED; microphone/TTS device acceptance pending |
| authenticated Android Hands token | Prime regression coverage | INCLUDED; real cross-app action acceptance pending |
| local Python and shell execution | Prime regression coverage | INCLUDED; final Android-residence execution acceptance pending |
| Synthia 5.7 resident path | inherited base path preserved without flattening | INCLUDED/PRESERVED |

## PRODUCT VALUE ALREADY ACCOUNTED FOR

| Valuable lane | Durable authority | Relationship to first drop |
| --- | --- | --- |
| PurposeGuideService / Pathways to Purpose | PR #6; service file is also present on PR #10 | PRESENT on first-drop branch; visible end-to-end purpose/outcome path still needs acceptance |
| TaskFit matchmaking | PR #7 at `d603236168733f749648175871e10aa9661ebf7e` | PRESERVED / RECONCILE. Canonical TaskFit path was not present on PR #10 when checked |
| Device-world resolver + interface bricks + Android accessibility world bridge | PR #7 | PRESERVED / RECONCILE. PR #7 remains authority until deliberately converged |
| Self-contained Computer packaging with Purpose/TaskFit/5.7 evidence | PR #8 at `a4a21fa25b42cd6240e996df211c4cd63e8b89f7` | PRESERVED / COMPARE. Independent valuable packaging lane |
| recovered r21.22 self-cultivation graph donor | `main` commit `d7b355707ab7d2ea72c7e72a1ad5e546d1b6e522` | PRESERVED donor; runtime wiring remains an explicit integration decision |
| broader Resonance Network product path | source documents + PR #6/#7 continuation records | ACCOUNTED; first-drop scope needs explicit product-path acceptance before calling the broader Network shipped |

## Branch relationship snapshot

- PR #10 vs `main`: diverged, 265 commits ahead / 2 behind at the 2026-09-25 check.
- PR #10 vs PR #7 lane: diverged, 108 ahead / 40 behind.
- PR #10 vs PR #8 lane: diverged, 108 ahead / 76 behind.

These branches contain overlapping but independently valuable work. Convergence should be capability-by-capability, with tests, rather than treating any one divergent branch as disposable.

## Physical Android acceptance gate

The candidate becomes PHONE VERIFIED after evidence for:
1. install
2. launch
3. residence startup
4. automatic Prime summon
5. hover permission + visible hover
6. microphone/TTS
7. Accessibility Hands enablement + real cross-app action
8. Python/shell execution from the packaged Android residence
9. persistence across force-stop/reopen
10. Echo resident install/summon smoke test

## Swarm lanes for the next pass

- **PR #10 lane:** first-drop candidate, Prime/Echo resident packaging, phone acceptance.
- **PR #12 lane:** accounting/recovery documentation only.
- **PR #7 lane:** TaskFit + device-world/interface-brick authority.
- **PR #8 lane:** alternate self-contained packaging evidence.
- **main:** preserved donor/history baseline.

A new swarm should work from a named lane, create additive commits, and update both this accounting sheet and the Supabase preservation ledger when capability ownership or verification state changes.

## Binary archive and delivery status

The candidate's identity, SHA-256, component hashes, build provenance, and source lineage are stored durably. The final assembled APK bytes were created outside GitHub and were not durably uploaded before the temporary copy disappeared.

Under the canonical user-possession gate, this is a **FAILED DELIVERY**, not a completed release.

Recovery/reproduction closes this failure only when:
1. the exact binary is recovered or deterministically reproduced
2. the APK is uploaded to GitHub Actions/Release storage or Supabase Storage
3. the stored-object hash is rechecked against the intended artifact hash
4. a creator-visible access path is surfaced
5. that path is verified to exist
6. the creator successfully retrieves/installs/runs the artifact
7. the Android acceptance gate is completed

## Delivery recheck — 2026-09-25 10:46 Pacific

A fresh GitHub Actions artifact query for [run 36116773303](https://github.com/justappgrabbin/SynthAi/actions/runs/36116773303) returned `synthai-native-seed-linux-residence-debug-apk` (artifact ID 10854694080, 283,078,786 compressed artifact bytes) and the residence manifest. The [artifact page](https://github.com/justappgrabbin/SynthAi/actions/runs/36116773303/artifacts/10854694080) exists, reports expiry December 24, 2026, and is the **Computer/Linux host debug APK**, built before the 81,151,678-byte Prime Resident 3 image was inserted into the final 367,532,021-byte candidate. It must not be labeled the final Prime all-in-one APK.

The creator later reported retrieving an APK from GitHub. That is a positive access report for *an APK*, but the filename/hash of the retrieved file has not been matched to the exact Prime all-in-one candidate. The final candidate's delivery state stays open until the retrieved APK is identified by SHA-256 and compared with `4b5012ae88b2f89309d04596f19b5c380dcf9658a17f861e2d9c7a7c1f45cf23`. The host APK can be tested as a host build without asserting Prime is bundled.

PR [#13](https://github.com/justappgrabbin/SynthAi/pull/13) adds an automata cartridge magazine on top of PR #10. Resident Mesh Integration [run 36154523433](https://github.com/justappgrabbin/SynthAi/actions/runs/36154523433) passed; its artifact list was empty. The run is source/test evidence, not a new downloadable APK.

## Creator-defined RLS milestone

The creator explicitly holds Supabase RLS issues open until a usable app has been delivered and accepted. RLS closure is the final app-birth signal, not a pre-release shortcut. Inventory findings privately and preserve current policies; request/record the creator's authorization at that milestone before applying RLS remediation. This sequencing does not promote the app's current state to accepted.
