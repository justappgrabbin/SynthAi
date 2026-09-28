# Synthia v0.5.7 — Canonical Morph Integration

This release continues directly from v0.5.6.

Runtime path:

`canonical resolved state → relationship/Klein context → temporal superposition → mesh evidence → surface endpoints → deep surface morph`

Canonical morph input preserves:

`Planetary → Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc → Zodiac → House`

Public runtime surfaces:

- `FederatedSynthia.morphState(spec, context)`
- `FederatedSynthia.embodimentMorph(spec, context)`
- `FederatedSynthia.attachEmbodimentRenderer(renderer)`
- `CanonicalMorphRuntime.prepare(...)`
- `CanonicalMorphRuntime.execute(...)`
- `createDeepSurfaceMorphAdapter(...)`

The browser donor runtime is packaged at `src/morph/browser/vendor/deep-surface-morph.js`.
The physical Python reference engine is packaged at `src/morph/reference/surface-morph-python/`.

Verification: 47/47 bounded Node tests pass, `npm run verify` reports PASS, and the preserved physical morph reference demo exits PASS. See `docs/CANONICAL-MORPH-INTEGRATION-FINAL-VERIFICATION-v0.5.7.md`.
