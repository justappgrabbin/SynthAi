# Synthia Model Maker — dual interface

This implementation adds a real Model Maker inside the existing SYNTH AI Computer, not a disconnected UI. It does not claim to be a pretrained LLM.

## Two cooperating interfaces

- Meaning: canonical AutoLing and DISEMINER, resident semantic-spacetime graph, and shared trained neural intent heads (96 inputs / 16 tanh hidden).
- Language: an online trained conditional 2-gram / 3-gram word decoder. It learns only from explicitly approved owner response examples. It reports NOT READY when untrained or lacking relevant examples.
- Neural capability predictions condition the starting distribution for the word decoder, while Klein tools provide the meaning analysis and provenance.
- Existing Morph Chat stays the fallback. Its reply may be replaced only with 12+ approved examples, relevance 0.55+ and a minimum output length.
- Memory: feedback, examples, source and revision remain in Computer StateStore after restart. Original examples remain append-only; the working language index is bounded to the newest 256 records.
- Multiple models can be created with separate IDs through computer.synthia.modelMaker.create({id:'project'}).

## Native Computer UI

The launcher's Model Maker app provides Understand and Speak & Learn panels. Every control invokes the actual local API. The owner can approve or reject training examples after configuring a local owner secret.

## Local APIs

GET /api/synthia/model gives sanitized model status.
POST /api/synthia/model/semantic with {"text":"..."} calls canonical semantic tools.
POST /api/synthia/model/generate with {"text":"..."} generates from owner-trained language data or returns NOT READY.
POST /api/synthia/model/teach with {"prompt":"...","response":"...","accepted":true,"capability":"language-response"} requires X-Synthia-Owner-Token matching SYNTHIA_OWNER_TOKEN environment variable, length at least 32. No token means no public teaching.

Example on a trusted local computer (keep the printed token private):

    export SYNTHIA_OWNER_TOKEN="$(openssl rand -hex 32)"
    printf 'Owner token: %s\n' "$SYNTHIA_OWNER_TOKEN"
    npm --prefix computer run build
    npm --prefix computer start

Run verification:

    node --test computer/tests/model-maker-dual.test.mjs computer/tests/synthia-resident.test.mjs
    npm --prefix computer/shell/kimi-linux ci
    npm --prefix computer/shell/kimi-linux run build

## Limitations

- This is a genuinely trainable small conditional probabilistic language model; it is not an LLM or coherent open-domain pretrained chatbot.
- The neural classifier's task-label learning is not end-to-end gradient training of the word decoder or Klein operations. Tool results, shared provenance, capability predictions and candidate language selection are connected operationally.
- User statements remain attributed reports, not automatically established facts.
- There is no autonomous external execution and no automatic training from untrusted chat.
- It does NOT import or overwrite TRIDENT (the separate PyTorch language model in SynthAi2/synthia-server/model.py). Integrating that full neural decoder would be a separate migration.
- APK and physical Android-device acceptance are not verified on this branch.
- Local JSON persistence is not encrypted at rest; do not use for sensitive content without an encrypted app-private store.
