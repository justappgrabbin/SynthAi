# Synthia: Adaptive Agent + Bitterbot model provider audit (2026-10-27)

## Donors examined

- Google Drive `adaptive-agent-main.zip` (file ID `17Sx8f-8WleGUnZOIXG3l7bbODsiHTToJ`): 9 project files plus directory records. Python implementation of Observe → Analyze → Evaluate → Select → Execute → Feedback, state observers, weighted goals, constraints, action scoring and feedback. It also offers destructive operating-system actions (process termination, caches and container restarts), which are NOT imported or authorized here. No standalone pretrained model weights. Its archive does not include a license declaration.
- Google Drive `bitterbot-desktop-main.zip` (file ID `1agZOS_vKwb00gttblHQF21Yqucyuev2s`): large TypeScript/desktop agent platform. MIT license with copyright Victor Michael Gil / Bitterbot AI. Provider/model definitions in `src/config/types.models.ts` include `openai-completions`, Ollama and other backends; provider configuration, fallback and agent scopes are code, not model weights. The complete platform is unnecessary and would introduce a competing agent runtime.
- Google Drive `generativeSimulation-main.zip` (file ID `1Bix3Xnmmebd3WDCVQ9zK9O_tWI1RUiBz`): simulation kernel previously brought into this Computer via PR #61; see `GENERATIVE_SIMULATION_LFCL_INTEGRATION_20261027.md`.

## Architecture

```
Existing Synthia phone/browser Chat
            |
     POST /api/chat
            |
      ConversationExecution
            |
     SynthiaResident.observe  ---> Klein/AutoLing/DISEMINER graphs
            |
     Existing Morph Chat + execution-spine grounding (preserved)
            |
     explicit file inquiry? ---> existing file listing (preserved)
     explicit PP/HDPE simulation? ---> GenerativeSimulationLab.run (model evidence)
     otherwise if LLM endpoint configured? ---> SynthiaLanguageModel
     otherwise ---> existing Morph donor response
            |
      SynthiaResident.recordReply
            |
      Computer state + event history (provider + model outcome recorded)
```

Independent adaptive-goal-loop service is registered in Computer; it creates a *proposal* from observed numeric metrics, goals, declarative constraints and predicted effects. It never executes actions. An authenticated owner-mediated caller can record feedback, but no unauthenticated HTTP feedback or action execution route is exposed.

## Enable a real language model

The adapter does not include model weights. An actual OpenAI-compatible chat-completions endpoint must be reachable by the Node runtime.

Example: Ollama in an environment where it serves compatible `/v1/chat/completions` at `127.0.0.1:11434`. Install/pull a chosen chat model on that same machine before starting Computer. Then set:

```sh
SYNTHIA_LLM_BASE_URL=http://127.0.0.1:11434/v1
SYNTHIA_LLM_MODEL=<name-of-model-actually-installed>
npm --prefix computer start
```

The adapter sends a limited conversational prompt to this model. It does NOT allow tool calls from the model; numerical simulation invocation uses deterministic intent parsing and existing Computer service calls.

Remote models are OFF by default. To opt in, provide all of:

```sh
SYNTHIA_LLM_ALLOW_REMOTE=true
SYNTHIA_LLM_BASE_URL=https://your-provider.example/v1
SYNTHIA_LLM_MODEL=<provider-specific-model-id>
SYNTHIA_LLM_API_KEY=<secret-from-your-secret-manager>
```

Never commit credentials or send them from a browser. A remote provider receives your submitted input and up to 1,200 characters of grounded donor context. The status endpoint exposes no API keys. API/model pricing varies by provider, and there is no automatic spend cap here yet.

*Android note:* `127.0.0.1` on the phone refers to the phone, NOT your development laptop. A laptop-hosted Ollama instance is not automatically accessible on Android. For real phone inference, run a local compatible service on-device or use a deliberately configured secure HTTPS model endpoint. No phone-device verification is claimed until tested.

## Evidence, controls and limitations

- Language model is optional: no configured endpoint means *no LLM* and the existing morphological reply persists. Configured does not mean live until a request succeeds.
- Model API failure explicitly falls back to the local donor and is visibly marked in the chat response; failed requests do not gain tool privileges.
- Synthetic simulation replies cite their source and identify their output as NOT measured or empirically calibrated.
- Existing graph observations, reply receipts, event log and 120-turn history remain intact. A model response is text-generation evidence, not a verified real-world fact.
- The adaptive agent is not a self-operating host administrator. The donor's destructive actions were excluded.
- Owner feedback on adaptive proposals is the only learning path in this service; inferred expected improvements are not actual measured outcomes.
- No autonomous model installation, model fine-tuning, memory index, streaming endpoint, authenticated owner management screen, live-availability probe, token-bucket quota or smartphone app APK proof in this PR.
- The mobile/web Chat component displays model configuration, kernel availability and source information without disclosing credentials.

## Verification

`node --test computer/tests/synthia-agent-model-routing.test.mjs` and existing acceptance suite (with checked-out submodules); `npm --prefix computer/shell/kimi-linux ci` plus build. GitHub CI is the authority for integration tests; report actual status, not expected results.

## Operational targets (proposed, not yet measured)

- LLM calls: 20s default timeout, bounded to 1,000–60,000ms; 512 requested output tokens, bounded user and context input.
- Adaptive proposals: in-process, bounded to 32 candidate actions, 32 constraints, 16 goals.
- Failure policy: degrade to the original, working Morph reply and preserve Synthia resident history.
- Cost: numerical kernel and planning are in-process CPU operations; model serving incurs resources or provider fees, which cannot be estimated without model, hardware and request volume.
