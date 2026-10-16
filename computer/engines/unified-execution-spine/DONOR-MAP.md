# Donor map

Nothing in `donors/` was modified.

## dagengine-main.zip
Use for mature orchestration mechanics and reference implementations:
- dependency graph validation
- parallel phases / concurrency
- retries / timeouts
- progress
- checkpoint/resumption patterns
- provider routing
- Inngest optional orchestration

The new spine does not require its AI-provider abstraction. DAG mechanics are separated from provider semantics.

## state-manager.ts / dag-engine.ts / inngest-orchestrator.ts
These uploaded standalone files are byte-for-byte source-equivalent to their counterparts in `dagengine-main.zip` at inspection time. They are preserved unchanged.

## godot-quickjs-master.zip
Useful execution realization: deterministic embedded JavaScript via QuickJS across Godot targets. It remains an optional host adapter, not the state model itself.

## Online-Code-Execution-Engine-main.zip
Useful donor for browser bundling / module resolution ideas. Its current execution surface is an iframe, so it is not promoted to the core runtime.

## fine-index-addressing.test.mjs
Defines and stress-tests the exact 6,842,880-unit Gate × Line × Color × Tone × Base × ArcUnit local fine index. The spine provides a compatible implementation while retaining the complete canonical address separately.

## constants.pdf
Preserved unchanged. Useful wheel and subdivision constants. Contains an 8-house trigram constant that conflicts with the canonical 12-house address model; the spine does not import that conflict.

## Synthia-Universal-Browser-Execution-v1.3.7.zip
Preserved unchanged as the source donor for the Browser runtime-adapter contract and
runtime-first execution priority. Its adapter design is merged into the Spine's
`src/runtime-adapters.mjs` / `UniversalRuntime.executeArtifact()` API; the full donor
archive remains intact here for provenance and future Browser integration work.
