# Local construction foundation (v26.4)

Start the included local server with Node.js 22+:

```sh
node serve.cjs
```

Open http://127.0.0.1:8080. The default screen is `foundation.html`; the preserved
computer is linked from its header. A browser with WebGPU is required for the tiny
Qwen/Llama model. The foundation's ingestion, verification and construction tools
also run without a language model.

## What changed

The new path captures **complete JavaScript source and its local dependency closure**.
Native JavaScript modules execute in disposable workers with deadlines. It supports
ordinary functions, classes/private fields, closures, array/object operations,
asynchronous functions and built-ins. It does not reduce imported source to the
old arithmetic interpreter's subset. Original source is stored alongside structural
inspection, actual expected/observed results, holdouts, parent digests and version history.
Failed verification cannot replace a verified active capability.

`@cap/name` imports capture previously verified implementations by digest. They are
ordinary modules, so a construction can import another construction indefinitely,
subject to device resources. Changing an original does not silently change its descendants.
Browser artifacts use IndexedDB transactions; the Node harness uses atomic disk writes.
Browser file imports retain original binary bytes as well as readable UTF-8 source.
Source edits preserve previous versions. Tool runs and their actual results persist.

The local Qwen controller can inspect/read/write source, acquire modules, construct
new modules, execute them, replay contracts and retain its work. It uses the same
execution and verification path as direct UI actions. Output `{html: "..."}` opens
in a separate preview frame, where the user can test an app and request the next change.
It never claims that a proposed model action was executed before the tool returns.

## Local model and Klein

WebLLM 0.2.78 is bundled in `vendor/webllm.mjs`, with matching compiled model runtimes.
The complete quantized Qwen 2.5 0.5B weights are in `models/`. The tested f32 variant is included. The optional f16 variant can be installed separately for GPUs with shader-f16 support. Local configuration routes model loading
to this server. Once extracted, the Qwen path requires no external model endpoint,
API key, account or weight download. Llama is an optional selection; install its weights
with the setup command below before using it entirely offline.

The original full `klein_ato.js` is retained and used. Local model commands pass through
its `SemanticComputer` CALL instruction, and its actual three-input ATO computes
analogies from witnessed tool trajectories. Six adapter bits explicitly represent
inspection/read/acquisition/construction/execution/verification evidence. They are
**not** asserted to be canonical gate or trigram mappings. The adapter does not change
Qwen's weights or pretend to be a recovered trained three-head Trident checkpoint.

The complete retrieved reference documents are included under `reference/`; the inspected Klein sections contain both Trident code/math/research heads and SPEC-2's
relation/intensity/direction structure. A unique quantitative SPEC-2 operator is not
established by those sources; no replacement formula was invented. That full model
integration remains distinct from the operational ATO/tool-bus adapter supplied here.

The Qwen Computer source recovered from Drive supplied the local WebLLM approach.
Its original is retained in `donors/`. Its previous 800-character source-read cutoff
and shortened tool-result history are not used as the source of executable artifacts.
The new foundation always captures the complete implementation. Small-model reading
windows are explicit character ranges with total length, never silently shortened files.

## Reproduce the proof

```sh
node test_foundation.mjs
node foundation-demo.mjs
```

Or choose **Run acquisition & reuse proof** in the browser. This acquires the existing
complete `project-intake.js`, independently checks CRC32 against the standard 123456789
vector, builds a ZIP-writing capability from that module, loads a fresh Computer instance,
and constructs a second-generation capability from the persisted first construction.
The computer also exports its own state through the acquired ZIP implementation.
The ZIP was separately opened and CRC-checked with Python's standard ZIP reader.

Additional tests execute the recovered complete VersionLineageRegistry class, including
its private methods, acquire multi-file modules with closures/classes/async behavior,
check native live bindings and shared dependency identity, verify version pinning,
reject failed examples and corrupt artifacts, and terminate infinite loops/unsettled promises.
Scripted-controller tests exercise real tools but are explicitly not model-inference proof.

Evidence is in `evidence/`: regression results, browser screenshots, executable
acquisition receipt, ZIP backup, and the separately recorded local inference result.

## Install another local model or rebuild the runtime bundle

```sh
npm ci
npm run bundle:model
node setup-local-model.mjs Qwen2.5-0.5B-Instruct-q4f32_1-MLC
# Optional:
node setup-local-model.mjs Llama-3.2-1B-Instruct-q4f16_1-MLC
```

Setup downloads original model files and records SHA-256/source URLs for each file.
It only publishes the local model configuration after the downloads complete.
Behind an environment proxy, Node 24 can use `node --use-env-proxy setup-local-model.mjs ...`.
The delivered bundle and Qwen weights make npm and setup unnecessary for normal use.

## Practical boundaries

A small model can misunderstand a goal or generate faulty code. Tests reject wrong
examples, but examples are not general correctness proofs. Full autonomous comprehension
of arbitrary programs, canonical semantic ontology, all historical Klein systems, learned
Trident heads, native phone installation and general app completion are not claimed.
The former restricted workbenches are preserved and reachable; they are not silently
represented as expanded capabilities by this new path.

Supported module graphs use local literal imports/re-exports, literal dynamic imports,
and CommonJS with literal require. An explicit `importMap` can resolve source-backed bare namespaces such as `synthia/`; exact project-root paths are also supported. Unmapped bare packages, host-specific APIs, cyclic graphs,
import.meta and computed dependency names require explicit environment/package adapters.
CommonJS executes in a strict module wrapper; integrations depending on non-strict or
Node-specific wrapper behavior need an adapter. Results/contracts use JSON values.
The runtime preserves whole modules rather than guessing a safe function-only extraction.

Workers bound execution time; they are **not hostile-code security sandboxes**. Use
trusted source. Node workers are development harnesses and should not execute arbitrary
untrusted uploads. Browser storage is origin-specific and can be cleared by the browser;
use the backup/restore controls. Node storage supports one writer process per state directory.
Browser dictation is optional and depends on the browser's speech facilities; local speech
is requested where supported. No claim of offline dictation on every device is made.

## Observed local inference

The bundled Qwen f32 variant loaded from this local server and generated
`{"answer":42}` for 6 × 7. The receipt records 217,135 ms on Chromium's **software**
WebGPU adapter in this environment. This is actual local inference, not a practical
phone-speed benchmark. Hardware GPU speed and memory availability must be measured
on the target device. Browser tests also verified importing text and exact binary bytes,
saving/executing a capability, reloading the page, replaying tests and downloading backup.

## Model-driven tool-use result

The separate one-shot tool test did **not** pass. Qwen selected the real `execute`
command and the correct saved capability, but omitted the numeric argument. The first
unconstrained command also had a malformed argument shape. Command-specific JSON
schemas now constrain the shape, and execution rejects non-finite JSON results rather
than displaying them as null. Tool failures include verified argument examples, and
the controller returns errors to the model for repair within a finite step budget.
The scripted integration test verifies that this feedback/repair path executes real tools;
a successful **model-driven** repair has not been demonstrated. Tiny-model autonomous
construction reliability remains unestablished. See `local-model-action-receipt.json`.

The source-only ZIP excludes weights. Run the setup script once to install them,
or use the local-Qwen ZIP, which includes the tested model and needs no setup download.

## v26.4.1 input-contract repair

Model calls now use `execute {name, inputs:{arg0: value, ...}}`. Required input fields
come from the saved capability's verified invocation shapes. The model's generation
schema requires those fields, instead of allowing an empty positional list for every
function. The tool adapter independently validates the shape before calling the original
implementation. It never supplies a default number or copies an example into a missing
input. Different verified arities remain separate valid signatures; original module
source and direct JavaScript semantics are preserved. Legacy positional tool calls are
accepted when their shape matches a verified contract. This addresses the omitted-input
failure, not a guarantee that a small model always chooses the correct input value.

## After-fix live result

The local Qwen regression passed: `execute {name:"double",inputs:{arg0:21}}`
was generated by the actual model, passed through the original Klein CALL instruction,
and returned **42** from the saved implementation. The before-fix failure remains in
`evidence/local-model-action-before-fix.json`; the after-fix result is in
`evidence/local-model-action-receipt.json`. The software GPU run took 709,641 ms.
This establishes this tool-call repair; broad autonomous construction is not established.

The adapter also streams generation and interrupts after the first complete command,
rather than waiting for extra whitespace or an end token. Its stopping behavior has a
separate regression test. The live call above used the non-streaming decoder; the
streaming early-stop timing has not been measured on the actual model.
