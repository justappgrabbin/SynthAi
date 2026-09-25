# Final preservation status

## Finished build

`ConsciousnessRealm-Synthia-v0.5.7-PERSON-SCOPED-FINAL.zip`

SHA-256:

`a75a3e31a7e4c4294c5b8d52a53d6ff468e0b24e304350686a045ea9c1ab3a40`

The final package excludes only repository history, runtime scratch, dependency caches, and nested archive ZIPs. The active Consciousness Realm source/assets and Synthia v0.5.7 runtime source are included.

## GitHub preservation

The GitHub connector cannot upload the 71 MB finished binary ZIP as a release/LFS asset. The branch therefore preserves:

- person-scoped server/runtime source;
- Realm morph client source;
- 3D Synthia/world morph renderer;
- verification scripts/results;
- original baseline hashes;
- final package hash;
- a byte-exact compressed overlay split into six Git-safe text pieces;
- reconstruction instructions.

The six remote overlay pieces were read back from GitHub, decoded, and SHA-256 verified as:

`0d8f093afaf356d20c894411d794704157e7659f31f3c527c1919e4badebcb80`

## Per-person invariant

VERIFIED: separate Synthia runtime, PracticeWorldPort, action queue, persistence lane, resolved-state history, and canonical morph packet per `personId`.

Observed isolation test:
- person-alice → Space / Gate 57
- person-bob → Movement / Gate 44

The same person's canonical packet is consumed by both Synthia's visible resident form and the Realm environment, so Synthia and the visible world morph together per person.
