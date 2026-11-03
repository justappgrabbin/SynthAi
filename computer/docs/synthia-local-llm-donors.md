# Synthia local LLM — archive-derived provider integration

## User archive inspection (2026-10-27)

* `Super-Polo-Custom-LLM-Builder-main.zip`
  [original Drive archive](https://drive.google.com/file/d/1_xxM1YwGxHTeukfVkw4SFTc67LnNyf_l/view?usp=drivesdk)
  contains a provider-based chat application, DeepSeek/Unsloth/QLoRA
  fine-tuning guidance, Ollama deployment instructions, and
  `fedSA-LoRA/federatedscope/llm/` training code. It contains **no
  pretrained language-model weights**.
* `transformer-builder-master.zip`
  [original Drive archive](https://drive.google.com/file/d/1N4UqFlKHvsB_7uhNmRpqghsH6pZUi_sg/view?usp=drivesdk)
  contains PyTorch self-attention, multi-head attention, residual connection,
  but its core `transformer/transformer.py` is empty and many encoder/decoder
  classes are only placeholders. It cannot provide a working pretrained LLM.
* `generativeSimulation-main.zip`
  [original Drive archive](https://drive.google.com/file/d/1Bix3Xnmmebd3WDCVQ9zK9O_tWI1RUiBz/view?usp=drivesdk)
  is principally a generative-simulation research site with an example
  scientific regression notebook/script, not a trained conversational LLM.

## What is integrated

The Computer now has an **optional** local language model inference provider.
This reuses the Super-Polo approach of **serving a separately installed
pretrained model** with Ollama; there is no third-party source code copied
from the three archives. All originals remain unchanged.

The component is `computer/services/local-ollama-llm.mjs`. The existing
Computer host opts in with a model tag from `SYNTHIA_LLM_MODEL`, registering
`computer.services.get('synthia-language-model')`. When configured, the
existing `ConversationExecution.talk()` uses the model's *actual generated
text*, and records the model tag as provider with the reply. Synthia still
runs her AutoLing, DISEMINER, state-space inference, and donor learning path.
Computer-owned answers about imported files keep their deterministic route.

When the model is **not** configured, existing local Morph Chat stays intact
with no network call. When it is configured but unavailable, errors are shown
rather than claiming successful LLM generation.

## How to activate on the same host that runs Computer

1. Install Ollama **separately** and make sure its service is listening on
   `127.0.0.1:11434`. Ollama and Computer must share the relevant loopback
   network namespace. This may require adjustment for Android/container setups.
2. Download a pretrained model supported by your Ollama installation, for example
   `ollama pull deepseek-r1:1.5b`. This fetch is **not** performed by this PR.
3. Start Computer using its existing build/start commands with
   `SYNTHIA_LLM_MODEL=deepseek-r1:1.5b` set in the host environment.
4. Use the existing `/api/chat` endpoint or Morph Chat interface.
5. Read `/api/synthia/status` or `/api/status` for truthful configured/model
   metadata. Status intentionally says `reachable: not-checked` until a live
   inference response; it is **not** proof a model has been downloaded.

The adapter always connects to `http://127.0.0.1:11434/api/chat`; clients
cannot supply an arbitrary URL. No cloud API key or endpoint is injected.
It uses fixed output token limit, message-length validation, six-turn context,
an abort timeout and strict response validation.

## Important limitations

- **Not a bundled or newly trained LLM**. This PR connects Computer to one,
  if its operator has installed actual pretrained model weights locally.
- No fine-tuning is performed. Training the user-specific Synthia personality
  requires curated consented data, PII scrubbing, license inspection, GPU
  budget, proper dataset chat templates and evaluation.
- An LLM reply is **not** ground-truth evidence or permission to operate tools.
  Synthia's semantic/epistemic services and owner-authorization remain in place.
- The connector returns complete responses; it does **not** yet support token
  streaming, tool calling, multi-model routing, or a remote GPU server.
- The language model used must be installed in Ollama **and tested live**
  before describing Synthia's intelligence as operational.
- The Super-Polo README's example Ollama Modelfile suggests a
  `llama3.1:8b` base for a DeepSeek-trained adapter: adapter weights must
  match their exact training base, so don't copy that Modelfile blindly.
- Local-only loopback avoids remote network egress from this connector,
  but other existing Computer services retain their own permissions.
- Repo CI tests use a mocked Ollama HTTP response. A real model benchmark
  and host-specific system test remain separate operational gates.

## Test expectations

Unit tests check disabled-state behavior, explicit local protocol construction,
rejection of URL-shaped model names, missing weights failures and bad output.
Computer integration tests verify the model reply has genuine model provenance
and that existing donor semantic and linguistic receipts still appear.
