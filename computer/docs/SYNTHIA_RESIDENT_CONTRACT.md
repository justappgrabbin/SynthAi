# Synthia Resident — integration contract (2026-10-25)

## Chosen existing computer
`justappgrabbin/SynthAi` at `integration/relational-autolab-20261024`. The only new reasoning component is `computer/services/synthia-resident.mjs`; the current branch is `integration/synthia-resident-dual-graph-20261025`. No OpenAI template, hosted model API, or ChatGPT runtime is used.

The shipped Kimi Web Linux desktop, Computer runtime, donor execution spine, original Simlish world source and Back-up- Git submodule remain independent. Simlish is the original world/character host, not replaced by a new dashboard. In this patch, the Computer is the hosting runtime and the world is still a separate donor; no claim is made that the entire Simlish game is now visibly mounted in Android.

## Operational topology

```text
 Existing Kimi Computer UI
      |
   POST /api/chat
      |
   ConversationExecution.talk
      +-- resident.observe(message)
      |     +-- Online neural inference graph (96 -> 16 -> trainable task heads)
      |     +-- AutoLing canonical: linguistic analysis
      |     +-- DISEMINER canonical: distributional observation, provisional claims
      |     +-- RSS semantic graph: scoped actor -> utterance -> proposed claims
      |     +-- Shared Computer StateStore: episodes, features, evidence
      |
      +-- existing Morph Chat gateway (Back-up- pinned Git submodule)
      +-- existing SynthiaSystem execution-spine contact/learning
      +-- response persisted by existing ConversationExecution
      +-- resident.recordReply: message -> response with provider provenance
      +-- existing Computer event emitter receipt
      |
   Chat UI / response
```

All language generation for user-facing chat remains owned by the **existing** Morph Chat / Klein donor pathway; no free-form neural token predictor or pretrained LLM has been substituted. The new small network learns *task labels* from explicitly accepted/rejected examples, with dynamic named heads and backpropagation. Untrained models report `trained: false` rather than guessing.

## Existing canonical tool paths (already in Computer)
- `computer/engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-14-autoling.js`
- `computer/engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-15-diseminer.js`
- `computer/engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-07-autonovel.js`
- Existing Back-up- donor: `computer/donors/Back-up-` via pinned submodule defined in `.gitmodules` (build-time checkout required).

## Use
- Boot: `new ComputerRuntime().boot()` boots and registers `services.get('synthia-resident')` and `agents.get('synthia-resident')`.
- Local Computer: `npm --prefix computer run build` then `npm --prefix computer start`. Existing desktop at `http://127.0.0.1:8765`.
- Chat: `POST /api/chat` with `{"text":"..." }` now records a resident reading and response receipt; existing response fields remain backward compatible.
- Status: `GET /api/synthia/status` returns a non-sensitive component description without leaking conversations.
- Internal capability API: `computer.synthia.runTool('autoling', {text: ...})`; `runTool('diseminer', {operation:'observe',text:...})`; `runTool('autonovel', {operation:'register',domain:...})` and `operation:'generate'`.
- Online teaching is restricted to `computer.synthia.teach({text,capability,accepted:true|false})` from an **owner-authenticated** local action. No unauthenticated learning HTTP endpoint is exposed.

## Invariants
1. Actor utterances are stored as reports; automatically extracted SVO claims are **proposals, not facts**.
2. Inference predictions are not permission to execute tools; existing owner-approved effect boundaries still govern execution.
3. All tool/provider names in receipts identify their actual source; a missing submodule is an explicit failure, not replaced by a fabricated reply.
4. Inference features may be hashed to numeric indices; semantic identity is represented by scoped names and directed typed edges, never inferred from a hash.
5. Training is supervised with explicit feedback. A score is a model estimate, **not** calibrated proof of understanding.
6. The three Klein tools, the world, and the Computer execution engine remain unchanged donor modules.

## Evidence
Node acceptance workflow: `.github/workflows/synthia-resident-tests.yml`.
Run:
`node --test computer/tests/synthia-resident.test.mjs computer/tests/runtime.test.mjs computer/tests/reassembly-ingest-e2e.test.mjs`
**Requires the Back-up- Git submodule**: `git submodule update --init --recursive`.

The passing CI covers component startup, AutoLing, DISEMINER, AutoNovel combinator generation, explicit neural training/restart, provisional assertion provenance, existing Morph Chat response and original file import/restart/ATO execution.

## Remaining gates and limitations
- Android assembly and device installation have their own workflow `.github/workflows/computer-apk.yml` and must be verified independently.
- A successful APK compilation is **not** proof of functional terminal, mobile hands, audio, background autonomy, or Linux guest on a physical phone.
- A new owner-feedback UI has not yet been implemented; the trainable network will start **untrained** until it receives explicit examples through a trusted local surface.
- The resident is an intent/routing learner plus Klein-semantic reader, not a pretrained generative language model. It does not have open-ended natural language understanding.
- AutoNovel tool state created through ad-hoc `runTool` calls is not yet a cross-restart committed session. The existing Computer and execution spine provide their own persistent structures.
- Computer JSON persistence is local but is **not claimed to be encrypted at rest**. Sensitive deployments require an encrypted app-private persistence adapter, owner authentication and verified device storage controls.
- A fully rendered unified Simlish world, end-to-end business autonomy, and physical-device Android acceptance remain separate integration/verification tasks.
