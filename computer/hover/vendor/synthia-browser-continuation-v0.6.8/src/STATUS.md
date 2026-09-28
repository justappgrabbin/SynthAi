# Synthia Progressive Upgrade v0.2 — Wired & Verified

This runtime now actually boots and runs end to end. Verified live on 2026-08-10.

## What was added
- `package.json` (devDependencies: typescript, tsx) — this is what was missing.
  Nothing else here previously existed as a runnable project.
- `smoke-test.ts` — boots `createSynthiaRuntime()` and runs real input through
  the enhanced AutoLing and DISEMINER tools to prove the wiring works, not
  just that it compiles.

## How to run it
```
npm install
npm run smoke
```

## What the smoke test proved (real output, not simulated)
- 15 tools registered: autoling-lite, diseminer-lite, klein-analogy,
  iching-grammar, language-contact, historical-monte-carlo, autonovel,
  messy, success, conversation, browser-form, research-browser,
  computational-grammar-coder, autoling, diseminer
- Canonical `autoling` = Enhanced AutoLing (full pipeline, rule induction) —
  `autoling-lite` retained per the progressive-substitution rule
- Canonical `diseminer` = Enhanced DISEMINER (distributional space,
  claim extraction) — `diseminer-lite` retained
- Boolean operator bank attached
- Real pipeline run on "the gate learns from the user":
  AutoLing coined a rule from it; DISEMINER built a distributional space
  and extracted a claim from it

## Untouched, as instructed
- `runtime/_preserved/` (original pre-upgrade files) — not modified
- `-lite` fallback adapters — not modified
- No source logic files were rewritten; only `package.json` and
  `smoke-test.ts` were added

## Update: Morph MIR wired in (Ingest -> Analyze -> Regenerate)

Added `UPGRADES/vendor/morph-mir-system/` (from morph-mir-system-v3, `@/` path
aliases rewritten to relative imports so it resolves without a bundler) and
`UPGRADES/adapters/MorphMirAdapter.ts`, which wraps `MorphMemoryEngine` as a
16th tool: `morph-mir`, capabilities `ingest`, `analyze`, `remember`,
`regenerate`.

Verified live with a real 5-line JS function pushed through the full
pipeline:
- Ingest: built a real Artifact record
- Analyze: correctly extracted intent ("says hello to the user", pulled from
  the function's own comment) and functionality (`Method: greet`)
- Remember: committed nodes to the GNN memory graph
- Regenerate (`morph_runtime` mode): produced real output, confidence 0.78

One honest note on the engine's own design: `integrity` is only meaningfully
computed in `"exact"` mode (byte-for-byte comparison). `"morph_runtime"` mode
is intentionally generative, not a copy, so it reports `integrity: 0` by the
engine's own "brutally honest" rule, not because anything is broken — worth
knowing if you see that value elsewhere and wonder about it.

## Update: The orchestrator already exists — GraphRuntime IS it

Ran a full end-to-end session through `GraphRuntime` itself (not just
individual tools): `ingest()` -> `step()` through all five dimensions
(Movement/Evolution/Being/Design/Space) -> `materialize()`. This is the
real Ingest -> Understand -> Address -> Place -> Execute pipeline, already
built, under the runtime's own vocabulary. See `orchestrator-smoke-test.ts`.

Verified live with intent "A small tool that greets the user by name and
remembers the greeting":
- Ingest: session created
- Understand/Address/Place: stepped cleanly through all 5 dimensions,
  30 active states, 36 open arcs opened by dimension 4, coherence held at
  0.50 throughout, zero errors
- Execute: materialize() succeeded, produced a real file (`cli.js`)

**Honest gap found, not yet fixed:** the materialized output is a generic
CLI boilerplate template, not something built from the specific intent or
routed through the tool stack (enhanced AutoLing / DISEMINER / Morph MIR).
`ArtifactAssembler` currently doesn't consume what the registered tools
produce. That's the real next step to make `materialize()` actually
intent-aware instead of templated — flagging it rather than claiming it
already does that.
