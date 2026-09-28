# Synthia v0.6.2 — semantic execution + first behavior compiler

Date: 2026-08-11
Parent checkpoint: `Synthia-merged-repaired-v0.6.1.zip`

## What changed

The v0.6.1 repair proved that GraphRuntime, the 5D state graph, tool generation, memory, and ArtifactAssembler were executable. It also exposed the actual output bottleneck: the orchestration path was executing generated channel-transition tools, but the semantic engines were not being selected because their advertised capabilities were tied to specific Gate channels that were absent from the initial state set.

v0.6.2 adds an explicit semantic execution stage before channel-specific scheduling.

### Semantic intent capability

New capability:

`semantic.intent.analysis`

The canonical stack now advertises this capability from:

- Enhanced AutoLing
- Enhanced DISEMINER
- computational-grammar-coder

`ToolScheduler` executes that semantic stage exactly once per runtime session before channel-specific scheduling. The resulting expression nodes and provenance are stored in the same ExpressionGraph as all other tool executions.

This does not bypass ToolRegistry: the semantic stage is still capability-discovered and executed through the normal registry/execution path.

## Semantic Artifact Compiler

New runtime component:

`src/runtime/SemanticArtifactCompiler.{js,ts}`

It consumes the semantic tool outputs already present in the ExpressionGraph and derives a deterministic behavior specification. It does not call an LLM and does not invent behavior when semantic evidence is absent.

Every grounded request receives:

`synthia/semantic-spec.json`

### First executable behavior family

Acceptance intent:

> A small tool that greets the user by name and remembers the greeting

Derived behavior spec:

- action: `greet`
- action: `remember`
- input: `name`
- persistence: local
- evidence: AutoLing + DISEMINER + computational grammar coder

For CLI materialization the compiler now emits a real `cli.mjs` that:

1. accepts a user name;
2. emits `Hello, <name>!`;
3. persists the name and greeting to a local JSON memory file using an atomic temp-file rename;
4. recalls the last name on the next process invocation;
5. exposes `--history`;
6. ships with its own generated Node test.

For WEB_APP / ANDROID_APP targets the same behavior family emits an HTML/JS surface with localStorage persistence.

## End-to-end proof

The full GraphRuntime path was exercised with the acceptance intent above.

Observed:

- AutoLing executed once through GraphRuntime.
- DISEMINER executed once through GraphRuntime.
- computational-grammar-coder executed once through GraphRuntime.
- ArtifactAssembler received their semantic outputs.
- `synthia/semantic-spec.json` contained `greet + remember + name`.
- the emitted CLI greeted `Mira`.
- a second process invocation with no name still greeted `Mira`, proving persistence across process restarts.
- the generated artifact's own test passed 1/1.

## Regression protection

Added:

- `SemanticIntentStage.test.js` — semantic tools must execute exactly once per session.
- `SemanticArtifactCompiler.test.js` — generated greeting tool must execute and remember across invocations.
- `orchestrator-smoke-test.js` now fails if the greeting acceptance intent materializes as generic output again.

Current full verification:

- tests: **111**
- pass: **111**
- fail: **0**
- skipped: **0**

Run everything with:

```bash
npm run verify
```

## Honest remaining boundary

v0.6.2 is not a universal natural-language-to-code compiler.

It establishes the missing architecture and proves one complete semantic behavior family end-to-end. Requests with behavior that is not yet represented by a grounded compiler template still fall back to the generic target surface while retaining their semantic spec and executed tool outputs.

The next semantic milestone is to expand the behavior compiler from one family into composable primitives (input, transform, store, retrieve, list, compare, route, render, etc.), so novel requests can be assembled from known operations instead of requiring one bespoke template per sentence.
