# First composition repair

Implemented in the extracted copy of Synthia-State-Space-and-Execution-v0.3.0. Original supplied archive remains unchanged.

## Changes

- State-math and live execution-spine sequence identities now include ordered constituent identities instead of sequence length.
- The organism address bridge retains missing/invalid fields, original supplied values, and the original request as non-executable unresolved records. These records use the existing LocalMemory adapter and are restored when its data is available.
- SynthiaUnit owns a SymbolCompositionGraph. ScientificSynthiaAssembly exposes registerSymbol/composeSymbols against the same graph.
- The graph uses the supplied sequence operator; overlapping compositions retain identical constituent objects. Restoring the graph reconnects shared references by ID. New occurrences and compositions append event records, and duplicate occurrence IDs cannot replace prior symbols.
- The existing LivingWorldView projects explicit symbol compositions from this graph and carries runtime occurrence/composition IDs into the visible markup. The prior gate SVG remains available alongside it.

## Limits

This adds an ordered symbol view, not dense world geometry. No guessed dimensional-quality-to-letter mapping, model-count change, or new sensory rule was introduced. Callers must explicitly register symbols and request composition. Existing source fixtures and other address producers remain outside this repair; it does not establish a complete recursive resolver or elimination of every default elsewhere.

Memory durability depends on the existing LocalMemory backend (browser localStorage when available). Its storage errors are swallowed by the supplied adapter. Restart tests verify reconstruction from saved records; they do not certify server durability, browser storage quotas, or cross-device synchronization.

## Validation

- Top-level npm test: 8 passed, 0 failed (5 existing, 3 new integration/regression tests).
- Supplied state-math ports-c suite: 59 passed, 0 failed.
- Supplied state-math scale-experiments suite: 41 passed, 0 failed.
- Supplied generative-organism and assembly-state-space smoke checks: passed.
- Supplied execution-spine full-wiring suite: 5 passed, 0 failed.

New checks verify overlapping membership through restoration, parent composition retaining child identity, distinct composition IDs, preservation of partial/invalid addresses without sentence admission, and projection through the actual OrganismExpression → LivingWorldView call path. Visual layout has not been inspected in a browser. Builder-removal autonomy remains untested.

No deployment performed. The accompanying ZIP is a source overlay for the exact supplied v0.3.0 archive, with baseline and updated hashes for review.
