# Klein → Synthia model connection (Linux / model-agnostic)

## What was actually connected

This integration uses the existing, versioned pure-Synthia donor code, with no rewrite:
- `AutolingEngine` (`tool-14-autoling.js`): morphology, grammar, heuristics.
- `DiseminerEngine` (`tool-15-diseminer.js`): distributional context and **provisional** candidate claims.
- `AutonovelAutomaton` (`tool-07-autonovel.js`): registered-domain combinator generation.

All three were already imported by `SynthiaResident`. The missing path was
**resident Klein evidence → model grounding context → generated answer**.
The new `computer/services/klein-tool-bridge.mjs` closes that gap:

```
User text
    ↓
SynthiaResident.observe() — original AutoLing + DISEMINER, learned intent
    ↓
KleinToolBridge.ground(reading, donorText) — bounded provenance + epistemic labels
    ↓
SynthiaLanguageModel.generate({ text, context: kleinGrounding.text })
    ↓
Model-generated reply (if configured) / existing donor reply (if unavailable)
    ↓
SynthiaResident.recordReply(...) — original semantic-memory receipts
```

`ComputerRuntime.boot()` registers the bridge as `klein-tools`; the
provider shares the **same** Synthia resident instance (not duplicate,
untrained engines). The bridge does not re-observe, avoids re-training,
does not include complete chat history/semantic graph, and does not perform
automatic tool calling. The existing `AutomataEngineGateway.talk()` remains
in place.

`KleinToolBridge.invoke(tool, input, {ownerApproved:true})` forwards an
explicitly approved AutoLing, DISEMINER or AutoNovel invocation to the
original `SynthiaResident.runTool`, including the real AutoNovel domain
register/generate operations. It does not add a public write endpoint.

`ConversationExecution` logs the epistemic provenance, run evidence,
and whether that context was actually passed into a successfully responding
language model. A fallback does not claim model use.

## Her special weights are preserved

The resident's saved `computer.synthia.resident.v1` state, 96×16 trainable
neural inference graph, trained capability heads, `teach()` method and
memory semantics are **unchanged** in this PR. This graph is not a
pretrained generative LLM. Existing training state is restored from Computer
persistence. No random model is installed and no user's weights are reset.

This bridge does **not** prove that other custom or externally trained
weight files exist; inspect the actual saved Computer state, archive
manifests and model checkpoints before migrating or fine-tuning anything.

## Linux inference deployment (optional; not performed by this PR)

The existing `SynthiaLanguageModel` consumes an OpenAI-compatible endpoint,
not the separate `LocalOllamaLlm` prototype. If using Ollama on the same
Linux host, install a suitable pretrained model and start the Ollama service.
Set:

```bash
export SYNTHIA_LLM_BASE_URL=http://127.0.0.1:11434/v1
export SYNTHIA_LLM_MODEL=qwen3:1.7b
cd computer
npm run install:shell
npm run build
npm start
```

The model tag is an example. Confirm it is actually available in `ollama list`.
Use `curl http://127.0.0.1:11434/api/tags` to check server reachability.
Neither command proves a complete Computer-model conversation. Check
`/api/chat` and the returned `model.used`, `klein.passedToModel` and
`resident.toolEvidence` together to verify the actual connection.

**Security**: this transport is loopback by default. Keep model and Computer
ports private, prohibit unattended owner-only tool execution and avoid exposing
`/api/chat` remotely without separate authentication. The Klein context
is tagged untrusted heuristic observations, not verified facts and not model
instructions. No generated answer is privileged to authorize new tool runs.

## Acceptance gates

- Original resident donor tools execute and the model sees actual structured
  AutoLing/DISEMINER observations in the HTTP payload.
- AutoNovel does not run without explicit owner approval.
- Model failure or unconfigured transport is not described as model success.
- `SynthiaResident` trainingExamples/weights are not changed by this bridge.
- Node tests validate mock network payload; live Linux inference and host
  resource/latency testing remain **unverified until run on the user's machine**.
