# Synthia Universal Execution Spine v0.4.0

# Synthia Universal Execution Spine v0.1.0

A pure-JavaScript first integration layer for:

**canonical address → state space → serializable predicate IR → state machine → DAG execution → realization → semantic verification → persistence evidence**

This package does **not** overwrite the uploaded donor projects. They are preserved under `donors/` unchanged.

## What is live now

- Full 13-field canonical address shape retained.
- Fine-index codec for Gate × Line × Color × Tone × Base × 99 arc units.
- Serializable predicate/expression IR.
- Boolean family: AND, OR, NOT, XOR, XNOR, NAND, NOR, implication, equivalence.
- Direction-preserving `BUT` IR node.
- Hamming distance for strings, arrays, and 32-bit integers.
- Weighted scoring + thresholds.
- Event-driven state machine with guards, assignments, bounded named effects, event emission, append-only history, snapshots, restore.
- Dependency-aware DAG executor with bounded concurrency and checkpoints.
- Realization registry supporting expression IR, named JS capabilities, bounded predicate search, QuickJS host adapters, and explicitly opt-in host JS execution.
- Predicate-faithfulness verifier.

## Architectural boundary

The runtime intentionally separates:

1. **Specification** — state spaces, predicates, relations.
2. **Temporal behavior** — state machines and events.
3. **Plan** — DAG dependencies.
4. **Realization** — which executor actually performs a task.
5. **Verification** — whether a replacement realization preserves required semantics.

That means inability to execute one realization does not require changing the specification. A different realization can be selected/generated and checked.

## Quick start

```bash
npm test
npm run demo
```

No npm dependencies are required for the spine itself.

## Important: bounded enumeration

The built-in predicate-search realizer intentionally refuses to enumerate state spaces larger than its configured limit. Large spaces must use a registered solver, index, heuristic, simulator, generated executor, or other realization. This prevents the formal state space from being confused with brute-force execution.

## QuickJS donor

`godot-quickjs-master.zip` is preserved unchanged in `donors/`. The runtime includes a `quickjs` adapter contract:

```js
const runtime = new UniversalRuntime({
  quickJS: {
    eval: (code) => yourQuickJSBridge.eval(code)
  }
});
```

This keeps QuickJS as an execution realization rather than making QuickJS itself the architecture.

## Browser code-executor donor

The uploaded Online Code Execution Engine executes bundled JS in a sandboxed iframe. It is preserved as a donor but is **not** made the core runtime, because the spine does not require iframes.

## House-count conflict preserved, not propagated

The uploaded `constants.pdf` contains an 8-house trigram constant. The canonical address model in this package remains 12 houses. The donor file is preserved unchanged; the conflicting constant is not silently imported into the canonical schema.

## Runtime-first foreign artifact execution (v0.2 integration)

The spine now includes a `RuntimeAdapterRegistry` and `UniversalRuntime.executeArtifact()`.
This closes the architectural gap between a generic realization registry and actual
foreign-language execution:

`artifact → detect kind → resolve runtime adapter → prepare → execute original artifact → capture result`

A runtime adapter must report the engine that actually executed the artifact. If no
adapter is available, the runtime returns `runtime-unavailable` unless the caller
explicitly supplies a fallback realization. A fallback remains labeled
`fallback-realization`; translation/synthesis is never reported as native execution.

Example:

```js
runtime.registerRuntimeAdapter({
  id: 'python-runtime',
  kinds: ['python'],
  canRun: () => true,
  prepare: ({ artifact }) => ({ source: artifact.content }),
  execute: async ({ prepared }) => pythonEngine.run(prepared.source),
});

const result = await runtime.executeArtifact({ name: 'hello.py', content: 'print(42)' });
```

The registry is deliberately host-neutral: Browser/PWA, Godot/QuickJS, Android,
WASM runtimes, workers, or other local execution engines can be installed behind the
same contract without changing the canonical state/address/DAG layers.


## v0.4.0
Post-first-execution canonical address resolution is now live. See `ADDRESS-RESOLUTION-v0.4.0.md`.
