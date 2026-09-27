# Repair Log

## R1 — `synthia-core` snapshot expectation

- Scope: integrated vendor-copy test only
- Original authority: untouched in `authorities/originals/02-synthia-core-v1.0.0.zip`
- Implementation code changed: no
- Canonical automata changed: no
- Repair: `vendor/synthia-core-v1.0.0/tests/synthia-core.test.mjs` now expects `waterCount === 2` after one direct `water()` call followed by `admit()`.
- Basis: `SynthiaCore.admit()` explicitly calls `this.water(piece.text)` to resolve the admitted piece. The counter therefore advances once for the direct watering and once for admission. The previous expectation of `1` contradicted the implementation and its “Resolve via watering” contract.
- Verification: the package authority suite changes from 7/8 to 8/8 without changing runtime behavior.
