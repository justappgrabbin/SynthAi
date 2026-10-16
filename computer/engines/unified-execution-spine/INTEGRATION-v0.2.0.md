# Integration record — v0.2.0

## Purpose
Merge the Browser v1.3.7 runtime-adapter execution contract into the Universal
Execution Spine without replacing or deleting existing state-space, address, DAG,
state-machine, realization, verification, or donor components.

## Files added
- `src/runtime-adapters.mjs`
- `tests/runtime-adapters.test.mjs`
- `RUNTIME-ADAPTERS.md`
- `donors/Synthia-Universal-Browser-Execution-v1.3.7.zip` (unchanged donor archive)

## Files changed
- `src/universal-runtime.mjs` — adds runtime-adapter registry plus `executeArtifact()`.
- `src/index.mjs` — exports runtime-adapter API.
- `README.md` — documents runtime-first execution contract.
- `DONOR-MAP.md` — records Browser donor.
- `package.json` — version/description only.

## Files deliberately not replaced
- canonical address implementation
- fine-index implementation
- predicate IR / Boolean / BUT / Hamming implementation
- state-space enumerator
- state machine
- DAG runtime
- realization registry and existing realizers
- semantic verifier
- all pre-existing donor archives/files

## Runtime behavior
1. Detect artifact kind.
2. Resolve a registered runtime adapter.
3. If found, prepare and execute the original artifact with that engine.
4. Capture engine/stdout/stderr/return value and truthful provenance.
5. If absent, return `runtime-unavailable` unless an explicit fallback realization is supplied.
6. Fallback execution is labeled `fallback-realization`; it is never reported as native.

## Verification
`npm test`: 14 tests passed, 0 failed after integration.
