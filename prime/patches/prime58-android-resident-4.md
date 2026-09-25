# Prime Resident 4

Resident 4 is a fresh additive rebuild from the protected Synthia 5.8 source archive.

Protected original:
- file: `Synthia-Solo-Hover-v0.5.8-ANDROID-HANDS-SOURCE.zip`
- SHA-256: `c73d2bf2c688fc954cb3ac2e273662308a23577c6d29b08509eff85b6983a143`
- original archive remains untouched

Image:
- file: `Synthia-Prime-v0.5.8-Android-Resident-4.synthimg`
- version: `0.5.8+android-resident.4`
- size: 81,152,196 bytes
- SHA-256: `49c0c31e0fc4a977ebd2004bada58a3eca03361716d92fa07d463dafec35cf08`
- 1,564 / 1,564 files verified byte-for-byte against the tested clone
- packaging missing: 0
- packaging extra: 0
- packaging changed: 0

Additive behavior:
- session-scoped Admin Mode over the existing birth/design execution gate
- Talk hooks in the existing hover chat
- private `SYNTHIA_ANDROID_HAND_TOKEN` on Android Hands requests
- `synthia-local-linux` runtime adapter
  - Python through `python3`
  - shell through `/bin/sh`
  - Node for JavaScript only when explicitly requested

Verification:
- targeted Prime stack: 8 passed / 0 failed
- full suite observed green through test 29 before the local command window timed out
- no source files removed

Resident 4 is a new checkpoint. It does not overwrite the original 5.8 image or Resident 1/2/3 lineage.
