# Need-directed functional morphing

Morphing can serve authored actor needs (tree, person, building, or other roles), host-app gaps, and runtime needs. It does not require one fixed role vocabulary, appearance, purpose, or success score. `registerMorphRole()` registers addressed `id`, `provides` need labels, an executable `perform`, and a behavioral `verify`. `morphForNeed()` selects an exact provided need, or a supplied role id among candidates. Unknown/ambiguous needs remain held rather than choosing arbitrary defaults.

```js
system.registerMorphRole({
  id: 'runtime-example', address: resolvedRoleAddress,
  provides: ['execute-example'],
  perform: ({ input, executeArtifact }) => executeArtifact(input, {
    residentFallback: true, fallbackScope: 'example'
  }),
  verify: record => ({
    pass: record.execution.ok && record.execution.result.returnValue === 42,
    evidence: { value: record.execution.result.returnValue }
  })
});
const result = await system.morphForNeed({
  need: 'execute-example', address: resolvedNeedAddress,
  input: { name: 'example.js', content: 'return 6 * 7;' }
});
```

The addresses above must be resolved 13-part addresses. A browser host that must avoid Worker initialization should select `executionMode:'resident'` at construction; primary execution can be supplied through an execution surface. Resident direct JavaScript is the existing execution capability and is not an isolation mechanism for arbitrary untrusted source.

## Actual work across dimensions

- Evolution recalls previous outcomes for the same identity and need.
- Being binds the current identity, full need address, and supplied world/object context.
- Design resolves the capability owner; optional authored experiences retain the verified automata reduction work-up.
- Movement calls the selected role's executable function.
- Space records output and behavioral verification from the four contributing operations; it is not a fifth worker.

These operation roles are grounded in the supplied v0.5.3 dimensional perspective registry. Each work unit has a full dimensional context projection with its unchanged origin address retained explicitly. Context projection does not constitute a new personal origin or inferred landed meaning. No ingestion field is equated with a resonance dimension.

The history is retained in organism memory with unique manifestation ids. Executable providers must be re-registered after reload; history restoration never replays a role. Only verified results with evidence reach `WorldEmbodiment.witnessRole()`. They preserve organism identity and self-state and expose the manifestation to world renderers via `snapshot().avatar.manifestation`. There is no fixed visual renderer for trees, people, or buildings; appearance belongs to the world/role provider.

## Optional resident fallback

`residentFallback` is opt-in at assembly construction or per execution request. Primary failure is retained, followed by existing resident execution only when `fallbackScope` explicitly declares `example` or `read-only`. This prevents an automatic repeat of a possibly mutating operation. Primary success never invokes fallback. Failed local capability resolution remains failed.

Returned and admitted execution records preserve `fallback.used`, attempts, scope, primary failure, and a plain-language disclosure. Successful fallback states: “The primary execution failed. This result was executed locally using resident capabilities.” This executes what the resident host actually supports; it does not manufacture unavailable backend data, credentials, external effects, or language runtimes. Disclosures are available to host UI consumers; a dedicated frontend notification component has not been added.

## Validation and remaining scope

29 root tests pass. New tests exercise tree/person/building role transitions under one identity, actual dimensional context addressing, retained history, ambiguous role holds, and a verified runtime example returning 42 after primary failure with network and Workers disabled. The fallback disclosure survives admission and recall. Optional/blocked/failed fallback paths are checked.

This adds functional role execution and witnessed embodiment to the resident assembly. It does not yet supply general natural-language need inference, universal role synthesis, arbitrary program splitting into dimension-executable code, numeric rescaling, or a completed visual world/swarm renderer. Those require their own supplied behavior contracts and verification; the new coordinator gives them a concrete integration boundary.
