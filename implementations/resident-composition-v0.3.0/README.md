# Resident execution and shared composition overlay

This implementation preserves the supplied Synthia State Space and Execution v0.3.0 source. It adds shared symbolic composition, holds incomplete foundation addresses unresolved, and exposes the existing state-math execution bridge through `executionMode: 'resident'`. Resident execution was tested with network and Worker interfaces inaccessible.

This directory is an overlay for the supplied archive, not a replacement for `computer/`. The two source trees differ. The installer checks all source hashes before writing and accepts already-applied files.

## Apply and verify

Extract the supplied archive into a separate directory, then run:

```sh
python3 implementations/resident-composition-v0.3.0/apply.py /path/to/Synthia-State-Space-and-Execution-v0.3.0 --check
python3 implementations/resident-composition-v0.3.0/apply.py /path/to/Synthia-State-Space-and-Execution-v0.3.0
cd /path/to/Synthia-State-Space-and-Execution-v0.3.0
npm test
```

The original archive SHA256 is in `manifest.json`; every overlay file includes its baseline and updated hash. See `COMPOSITION.md` and `LOCAL-EXECUTION.md` for implementation evidence and remaining limitations.

Nine assembly tests passed. Tests cover overlapping symbol identity, restart restoration, unresolved address preservation, visible composition wiring, direct local execution, resident capability derivation/reuse, and explicit unresolved capability reporting. Capability reuse was verified within one runtime; persisted executable capability restoration and arbitrary-language support are not established.

The full-screen morphing world and the canonical three-nested-dimension stability rules are still pending. No guessed stability thresholds or quality-to-letter laws are introduced here.

## Active host participation experiment

See [ACTIVE-HOST-PARTICIPATION.md](ACTIVE-HOST-PARTICIPATION.md) for the isolated discovery/action/clarification loop and its 33 targeted tests. Routine authorized repairs act without asking and retain verified change records. [DNA-ADDRESS-EXPRESSION-AUDIT.md](DNA-ADDRESS-EXPRESSION-AUDIT.md) traces actual DNA, named qualities, primitive composition, and addressing mechanisms, including unresolved source conflicts. This experiment does not complete chart-driven or reference-image world embodiment.
