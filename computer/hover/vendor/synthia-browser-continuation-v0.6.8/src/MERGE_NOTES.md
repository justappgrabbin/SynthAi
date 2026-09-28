# Merge: what I made + what you gave me, into v0.5

v0.5 already had real channel routing, tool scheduling, artifact
materialization, and a closed learning loop. Two engines from earlier work
were not yet part of it. Both are now merged in, following the exact same
progressive-substitution pattern as Enhanced AutoLing/DISEMINER (thin
original kept as `-lite`, enhanced version becomes canonical).

## Added

**`autonovel` (canonical) — Enhanced AutoNovel+MESSY**
`UPGRADES/vendor/autonovel-messy/engine.ts` — the full, real AutoNovel +
MESSY engine (not the thin klein-tools.mjs stubs). Verified live: a real
generate -> simulate -> refine loop converging against the Propp Morphology
of the Folktale model — 5 iterations, finalFit 0.775. `autonovel-lite` and
`messy-lite` (the original thin automatons) are retained, not deleted.
Wired to real gates 56 + 3 via `channelsForGate`, same as AutoLing (17) and
DISEMINER (48).

**`morph-mir` — Morph MIR Regeneration Engine**
`UPGRADES/vendor/morph-mir-system/` (ported from morph-mir-system-v3,
`@/` path aliases rewritten to relative). This is the Execute-stage engine
v0.5 didn't have: ingest -> analyze -> remember -> regenerate (exact /
equivalent / morph_runtime / improved), backed by GNN memory. Verified
live on real input. Wired to gate 25.

## Bugs found and fixed while wiring these in
- The engine's own demo/CLI script would have run automatically on import
  (no module boundary) — guarded behind `require.main === module`.
- My first pass at registering AutoNovel's domain used a hand-built
  minimal example that was missing required fields (`domain.id`, full
  `Combinator` shape) and silently produced `finalFit: 0` / then threw.
  Fixed by exporting and reusing the engine's own proven-correct
  `narrativeDomain` / `proppModel` data instead of re-deriving it.

## Verified after merge (no regressions)
Reran every existing v0.5 test after merging:
- `learning-loop-smoke.test.ts`: same output as before (8 observations,
  14 deep rules, 1 correction generated for 34-57, quarantine working)
- `channel-topology-smoke.test.ts`: still 36/36 real channel rows
- `artifact-materialization-smoke.test.ts`: still materializes real tool
  files + learning-state.json
- Boolean operator bank: still 4/4 passing

## Known limitation, not introduced by this merge
`activateInitialStates()` always activates the same fixed 5 gates
(1, 25, 10, 34, 57) regardless of intent text. Only channel 34-57 exists
among those five, so under natural settle-driven scheduling, AutoNovel/
MESSY (gate 56) and Morph MIR (gate 25's real partner is 51) won't
activate on their own yet — they're correctly wired and individually
verified working, but reaching them through a real session would need
intent-driven gate selection, which doesn't exist yet. Flagging this
rather than quietly working around it.
