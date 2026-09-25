# Prime Resident 2 delta

Resident 2 is an additive clone of the already recorded Resident 1 patch.

Protected original remains unchanged:
- Synthia-Solo-Hover-v0.5.8-ANDROID-HANDS-SOURCE.zip
- SHA-256: c73d2bf2c688fc954cb3ac2e273662308a23577c6d29b08509eff85b6983a143

Resident 2 adds only the authenticated Android Hands client on top of Resident 1:

## src/solo/android-hand-executor.mjs
- reads `SYNTHIA_ANDROID_HAND_TOKEN`
- sends it as `x-synthia-hand-token` on every loopback Hands request
- keeps the Linux backend authoritative and the Android Accessibility bridge permissioned

## test/33-android-hand-token.test.mjs
- verifies the private token is present on every loopback request

Image:
- file: `Synthia-Prime-v0.5.8-Android-Resident-2.synthimg`
- version: `0.5.8+android-resident.2`
- size: 81,150,758 bytes
- SHA-256: `28ef14f14c96d35b0d4730f6490f43e72a3504b79c10872f21b8cb3cc539ebf8`
- files: 1,562 / 1,562 byte-for-byte verified against the tested clone
- packaging missing: 0
- packaging extra: 0
- packaging changed: 0

Targeted regression set:
- Admin Mode
- Android Hands token
- front screen
- birth mirror runtime
- 7 passed / 0 failed
