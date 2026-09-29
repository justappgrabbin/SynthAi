# Runtime adapters

This package now treats universal execution as composition of real execution engines.

## Contract

```js
{
  id: 'engine-id',
  kinds: ['python'],
  canRun({ artifact, kind, context }) {},
  prepare({ artifact, kind, context }) {},
  execute({ artifact, kind, context, prepared }) {}
}
```

`execute()` receives the original artifact and must execute it in the adapter's actual
runtime domain. It should return at minimum `{ ok, engine }`; stdout, stderr,
returnValue, exitCode, diagnostics, trace, and generated files may also be returned.

## Execution truth rule

- `registered-runtime`: original artifact was handed to a real registered engine.
- `fallback-realization`: no matching runtime existed; an explicit alternative
  realization was used instead.
- `runtime-unavailable`: nothing installed can execute that artifact yet.
- `runtime-error`: a runtime adapter was selected but execution failed.

This prevents a Python→JavaScript translation, for example, from being labeled
"Python execution." It may still be a useful fallback, but provenance stays truthful.

## Browser integration

The Browser package's adapter design is merged into the Spine at this layer. Existing
Browser adapters can be registered directly if they satisfy the same contract. The
Spine remains responsible for state/DAG/verification; the adapter remains responsible
for its runtime.

## Foreign-runtime status

The adapter infrastructure is live. Actual language support is exactly the set of
engines registered by the host. No runtime is claimed merely because its file extension
can be detected.
