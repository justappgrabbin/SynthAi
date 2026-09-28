# Synthia v0.6.1 — merged runtime repair baseline

Date: 2026-08-11

## Scope

This repair normalizes the merged distribution without replacing the current canonical reasoning/runtime engines. The original `Synthia-merged.zip` was kept untouched during repair.

## Repaired executable boundaries

- Normalized relative ESM imports in the merged JS execution paths.
- Added a CommonJS boundary for the preserved compiled AutoLing/DISEMINER subtree under `src/UPGRADES/compiled/`.
- Repaired Morph MIR's emitted-JS runtime import boundary.
- Wired the existing Morph MIR adapter into `SynthiaToolBootstrap` in both JS and TS sources.
- Corrected the executable tool count to **16** (the prior audit text said 15 while listing/expecting Morph MIR as an additional tool).
- Redirected the stale ATO native bridge test to the canonical bundled `ato-core` source that actually exists in this merged distribution.

## Legacy compatibility restoration

The merge omitted part of the historical Klein mesh tool set while retaining integration tests written against it.

Exact donor: `synthia-klein-mesh-poc-7.zip`.

The donor tool files were restored under:

`src/runtime/legacy-klein/`

This is deliberately a compatibility enclave. Current canonical `src/runtime/autoling.js`, `diseminer.js`, `ToolBase.js`, etc. were **not** replaced by legacy implementations.

The original stale integration test sources are preserved as text snapshots under:

`src/runtime/legacy-test-snapshots/`

Two integration scripts were updated only to reflect the current v0.6 API:

- optional legacy style profiles (`playful_casual`, `functional_code`) are no longer assumed to be canonical defaults;
- removed engine-private `transformationHistory` / `learningWeights` fields are no longer required when the current API exposes transformation logs per result.

## Verification

### Engine smoke

`npm run smoke`

Proves:

- 16 tools register and boot;
- AutoLing executes rule induction;
- DISEMINER executes distributional/claim analysis;
- Morph MIR ingests, analyzes, remembers, and regenerates artifacts;
- Morph MIR regeneration confidence remains 0.78 on the bundled smoke case.

### Orchestrator smoke

`npm run smoke:orchestrator`

Proves:

- GraphRuntime ingests a request;
- steps through all five dimensions;
- schedules/executes tools;
- materializes artifact files;
- ArtifactAssembler receives/materializes tool outputs and provenance.

### Full suite

`npm test`

Result at repair freeze:

- tests: 109
- pass: 109
- fail: 0
- skipped: 0

## Corrected ArtifactAssembler diagnosis

The old statement "ArtifactAssembler does not consume registered tool outputs" is stale for the canonical v0.6 implementation.

Current v0.6 **does** harvest executed tool outputs, preserve provenance, and materialize those outputs.

The remaining quality bottleneck is narrower and more important:

> routed reasoning/tool outputs are not yet semantically compiled into the requested application behavior.

Example: a request for a tool that greets a user by name and remembers the greeting successfully traverses the five-dimensional runtime and produces addressed/generated artifacts, but the resulting application does not yet implement the requested greeting + persistence behavior.

That semantic compilation layer is the next technical target.

## One-command verification

```bash
npm run verify
```

