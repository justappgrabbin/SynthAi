# Klein Mesh Game Engine v5.1 — Validation/Fix Notes

## Validation
- TypeScript compile: PASS (`npx tsc --noEmitOnError`)
- Compiled pipeline execution: PASS (`node dist/pipeline.js`, exit 0)
- Parent context isolation smoke test: PASS
- Provenance-preserving hybrid merge: PASS
- Sensory observation → DISEMINER relationship ingestion: PASS
- Source-filtered hybrid action generation: PASS

## Fixes applied
1. Fixed stray comment syntax in `klein-full-toolkit.ts`.
2. Fixed malformed adult age expression in HistoricalChange agent creation.
3. Removed the hard dependency on the Node `Buffer` type from `pipeline.ts`; file ingestion accepts `Uint8Array` and decodes with `TextDecoder`.
4. Added missing `frameIndex` fields in structured demo relations.
5. Added a public pipeline `isPossible()` wrapper rather than reaching into a private mesh member.
6. Fixed hearing measurement typing so raw spectra do not violate `Record<string, number>`.
7. Fixed recursive gap filling so generated/synthetic nodes can be rolled out directly by node id.
8. Made hybrid action generation provenance-weighted, so `alpha` changes behavior rather than only stored metadata.
9. Added optional `sourceContext` routing to `generateNextAction(sourceContext)` for explicit parent-grammar execution inside hybrids.

## Important architectural boundary
The current KleinMeshGameEngine is a context manager over separate per-game `CompGramCoder`, `DiseMinerEngine`, `AutolingGrammar`, `HistoricalChangeEngine`, and VQ-code arrays. This gives strong isolation and safe explicit hybridization, but it is not yet one live shared mesh substrate.

A true live mesh should keep one shared observation/relationship substrate with game-context projections or namespaces. Then every game can see shared world facts while its grammar/mechanics remain context-bound. Cross-game mechanics should occur only through an explicit crossing/blend policy.

## Known non-blocking limitations
- The README's claim of one shared VQ-VAE codebook is ahead of the implementation; VQ code arrays are still stored per GameContext and frame compression is hash-based rather than a trained VQ-VAE.
- Hybrid contexts are snapshots at blend time. Later learning in a parent is not automatically propagated into existing hybrids.
- The 5W/sentence layer is currently heuristic extraction, not the full positional sentence-state system.
- HistoricalChange uses stochastic simulation but is not yet coupled back into live GameContext grammar after evolution.
