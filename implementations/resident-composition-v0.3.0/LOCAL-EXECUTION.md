# Existing resident execution path — recovered and mounted

The supplied v0.3.0 archive contains two materially different UniversalExecutionBridge implementations.

## Resident path

`components/state-math/src/integration/universal-execution-bridge.js` directly executes host-supported JavaScript, JSON, data, and WebAssembly, and can mount HTML through an explicit DOM host capability.

When direct execution fails:

artifact → capability gap → resident donor ranking → executable fragment composition → installed capability → retry → result and trace.

`mesh-capability-deriver.js` uses Hamming distance, XOR/XNOR/AND/OR/BUT signatures and semantic requirement coverage to select registered executable donors. This is an existing supplied mechanism, not a newly substituted interpreter. File extension contributes an initial kind hint; foreign-format derivation is driven by the capability gap and available executable donors.

## Different assembly default

The original top-level assembly mounts the execution-spine variant. Its PaperRuntimeSandbox attempts a Web Worker when available and otherwise uses host fallback. Its writer currently includes explicit Python-to-JavaScript emission. That variant is not the same mechanism as the resident bridge.

## Implementation

ScientificSynthiaAssembly now accepts `executionMode: 'resident'` to mount the existing resident bridge inside the existing execution façade and admission boundary. `registerResidentCapability()` passes executable donors to its original deriver. The supplied-spine mode remains available. No backend or Worker was added.

Example:

```js
const assembly = new ScientificSynthiaAssembly({
  autoStart: false,
  executionMode: 'resident',
});
// Register recovered executable donors through:
// assembly.registerResidentCapability(existingDonor)
// Execute through the existing address-first admission boundary:
// assembly.executeArtifact(artifact, { organismAddress })
```

## Tests actually performed

A new regression test makes reads of Worker, SharedWorker, fetch, XMLHttpRequest and WebSocket throw. With these interfaces inaccessible, it verifies:

- Local JavaScript arrays, computation, console capture and returned values.
- Foreign-format realization by a registered executable donor, with actual result 42 and donor/Boolean relation trace.
- Reuse without re-deriving the installed capability in the same runtime.
- Explicit unresolved failure without an executable donor.
- Local JavaScript through the assembled address-first admission path in resident mode.

No forbidden interface was accessed. Top-level suite: 9 passed, 0 failed. Supplied state-math universal-execution-bridge and execution-during-ingest checks also passed.

## Evidence boundaries

The foreign-format donor in the regression test is a controlled fixture, not evidence of all-language support. Installed executable capabilities are in-memory maps; this test does not establish restart retention of those functions. The host execution uses AsyncFunction on the current thread; no Worker isolation or background execution is implied. Node verification establishes the local mechanism, not browser layout, browser policy compatibility, or every possible code artifact.

Remaining inspected issues include default/hashed six-bit addresses in donor ranking, per-capability installed-rule reuse, and deriver terminal handling semantics. These deserve tests before admitting automatically discovered behavior as persistent law.

The swarm/world work can use this resident execution option. Automatic quality-to-symbol formation, dimensional-depth stabilization, and full-page world morphing remain separate unfinished work.
