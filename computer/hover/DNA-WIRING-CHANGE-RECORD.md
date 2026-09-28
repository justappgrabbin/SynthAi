# Synthia v0.5.1 DNA Linguistic Wiring — Change Record

## Baseline
Source: `Synthia-v0.5.1-PRE-DNA-WIRING-CHECKPOINT.zip`.
The baseline was extracted to a new working directory. The uploaded checkpoint was not modified.

## Preserved
- Existing SemanticGenome and its 64 hexagram codons / persistent aspect substrate.
- Existing five-dimensional runtime field.
- Existing nested agent address and state-space mechanics.
- Existing center/channel bodies, execution, chat, cultivation, persistence, governance, and vendor authorities.
- Existing source-status distinction between project model and biological identity.

## Added
- `src/state-space/dna-linguistic-observer.mjs`
- `test/12-dna-linguistic-runtime.test.mjs`
- Export from `src/index.mjs`
- Runtime observer registration in `src/federated-synthia.mjs`

## Connected
`SemanticGenome` runtime activation -> existing onStateChange event -> `DnaLinguisticObserver.observeActivation()` -> linguistic-role observation + transition trace.

The observer records eight experimental roles from the Ji paper: alphabet, lexicon, sentence, grammar, phonetics, semantics, first articulation, second articulation. These are explicitly observations/candidates, not asserted biological equivalences.

## Status
- Existing state-space mechanics: PRESERVED (not redefined by this patch).
- DNA linguistic observer implementation: WIRED.
- SemanticGenome -> observer runtime path: VERIFIED by focused test.
- Transition trace between successive real SemanticGenome activations: VERIFIED by focused test.
- Paper-role biological equivalence: NOT CLAIMED. First/second articulation remain CANDIDATE_TO_TEST.
- Full repository regression after patch: NOT VERIFIED in this environment. `npm test` exceeded the 120-second execution window before completion. No passing status is claimed for tests that did not finish.

## Exact focused test result
`node --test test/12-dna-linguistic-runtime.test.mjs`

PASS: 1 test, 0 failures.

Observed assertions include:
- observer begins with zero observations;
- two real SemanticGenome activations reach the observer;
- five-dimensional sentence evidence contains five frames;
- grammar evidence retains the resolved runtime address;
- semantic evidence retains manifestation output;
- the second observation contains a transition record;
- an intentionally changed Line is detected as a changed address layer;
- provenance explicitly records `biologicalIdentityClaim: false`.

## Not yet wired
- Learned sparse dictionary over accumulated linguistic observations.
- Reconstruction/inference experiment over those observations.
- Durable persistence specifically for observer history.
- UI visualization of linguistic roles and transition traces.
- Empirical promotion/rejection of first- and second-articulation mappings.
