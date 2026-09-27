# Synthia Progressive Upgrade v0.2

This build follows progressive substitution: a component may be replaced in the active slot only when the replacement preserves the existing contract and adds equal-or-greater capability. Replaced implementations remain present for fallback/history.

## Preserved spine

The complete original GraphRuntime ecosystem remains under `runtime/`. Original pre-upgrade copies of the three touched runtime files are retained in `runtime/_preserved/`.

## Runtime upgrades

- `GraphRuntime.ts`: adds public `registerTool(s)`, tool listing, and capability listing. Existing ingest/step/settle/materialize behavior is unchanged.
- `ToolRegistry.ts`: adds introspection (`hasTool`, `getTool`, `getAllTools`). Existing registration/matching/execution behavior remains.
- `ToolScheduler.ts`: passes the real session intent, activation, source/target states, and message state into tools instead of `{}`.

## AutoLing

Active canonical `autoling` is `EnhancedAutoLing`:
- preserves rule induction, rule validation, hypothesis generation/feedback, `getRules()`, and import/export compatibility;
- adds the existing full AUTOLING morphology, phrase-structure learning, semantic parsing, transformation learning, state save/load, and full pipeline from `runtime/autoling.ts`.

The smaller ATO-core AutoLing remains available in the tool stack as `autoling-lite`.

`runtime/KleinAutoLing.ts` is intentionally retained unchanged. It is a separate state-driven transition grammar generator, not automatically treated as a duplicate merely because its scope differs.

## DISEMINER

Active canonical `diseminer` is `EnhancedDiseminer`:
- preserves synchronous `observe()` / `sense()` familiarity and entropy behavior;
- feeds the existing full distributional engine in order;
- exposes distributional-space construction, claim extraction, simulation, narrative generation, evidence synthesis and message handling from `runtime/diseminer.ts`.

The smaller ATO-core DISEMINER remains available as `diseminer-lite`.

## Boolean operators

`UPGRADES/shared/boolean-operator-bank.mjs` exposes all 16 possible two-input Boolean functions. No operation is globally banned or privileged. Aliases include `equivalence`, `biconditional`, `iff` -> XNOR. XOR remains a first-class operator. The bank also includes unary NOT and truth-table inspection.

The verified Klein worked example remains reproducible through XNOR/equivalence, but that fact does not remove XOR or any other Boolean operation from the general stack.

## Vendors / donors

- `UPGRADES/vendor/ato-core/`: full tested ATO core copy.
- `UPGRADES/vendor/integrated-tool-factory/`: Integrated Tool Factory v1.6.
- `UPGRADES/vendor/src-donor/`: the uploaded `src.zip` code tree, preserved as donor modules.

## Bootstrap

`UPGRADES/bootstrap/createSynthiaRuntime.ts` creates the original GraphRuntime, installs the real ATO tool stack, substitutes enhanced AutoLing/DISEMINER into their canonical active IDs, retains their lite predecessors under explicit lite IDs, and exposes the shared Boolean operator bank.
