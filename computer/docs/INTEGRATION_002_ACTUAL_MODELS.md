# SYNTH AI Plan 002 — Original model and language integrations

Date: 2026-10-27. Feature branch: integration/archive-functional-mount-20261027. Draft PR #62.
All changes are additive. Foundry remains sealed; external donor source files are not modified.

## Provenance and responsibilities

- Computer: original file-admission, addressed VFS, persistent receipts and local host.
- Canonical Pure Synthia: AutoLing, DISEMINER, AutoNovel, Tool Factory; browser archive connector invokes them on exact fingerprinted source.
- Generative Address System: unmodified external process on loopback port 8787; Klein/Morph routed there, Communication remains in existing Computer conversation path.
- TRIDENT: existing source from Synthai2/synthia-server/model.py; checkpoint must be real and compatible. The TRIDENT ONNX address model is a separate artifact, not language weights.
- Model Maker: original Stellarproximology-lab/Modelmaker-repair/app.py, invoked directly for user-supplied training. Its original Hugging Face-format export is stored locally and then used for inference. No substitute weights or remote API calls.

## Local execution

Check out the Computer branch, original Synthai2, Generative-address-system, and Stellarproximology-lab separately. Install Node 24 and Python dependencies listed in the original Modelmaker-repair/requirements.txt (PyTorch, tokenizers, transformers and Gradio). Use Python 3.11+.

Set local operator environment variables:
- SYNTHIA_PYTHON: Python executable with required packages.
- SYNTHIA_TRIDENT_MODEL_SOURCE: absolute path to the user's original model.py.
- SYNTHIA_TRIDENT_CHECKPOINT: absolute path to a real, trained TRIDENT state_dict; not the ONNX address model.
- SYNTHIA_MODELMAKER_TRAIN_SOURCE: absolute path to Modelmaker-repair/app.py.
- SYNTHIA_TRAINED_MODELS_DIR: an existing writable directory for privately stored model weights.
- SYNTHIA_GENERATIVE_CORE_URL: loopback URL, default http://127.0.0.1:8787.

Run original Generative Address engine's npm run start:generative in its unmodified root. Run node computer/build-web.mjs and node computer/host/server.mjs in the Computer checkout, then open http://127.0.0.1:8765/workspace.html. The hosted Vercel website is static; it can inspect browser-local sources but cannot reach private server-side weights by itself.

## Functional contract

- GET /api/models/status: actual checkpoint presence, dependencies, readiness.
- POST /api/models/generate: original TRIDENT or exported Modelmaker model inference; requires loaded weights. No silent fallback.
- POST /api/models/train: only owner-admitted UTF-8 /home/user/Imports source, verified by existing address/digest/ATO before invoking the ORIGINAL Modelmaker trainer. One active job, bounded 1–3 epochs, local export into versioned model directory, with an honest receipt.
- GET /api/generative-address/status: unmodified donor's audit endpoint.
- POST /api/chat/forms: Communication uses Computer, Klein/Morph use original engine. Errors are surfaced rather than hidden.
- Browser source integration: imported text is kept in IndexedDB; only project fingerprints and references are persisted in Computer's browser state. Original source text is not treated as executably trusted merely because it was uploaded.

## Acceptance results / unresolved gates

GitHub Actions 40526327177: PASS. Checked out original Generative Address repo and ran real Klein/Morph paths; original Computer archive/VFS intake, SHA256 match, original AutoLing and Tool Factory tests passed. CI 40526327476: resident acceptance PASS. CI 40526327067: existing workspace security acceptance PASS.
GitHub Actions 40527082917, 40527082658, and 40527082813: PASS after Modelmaker routing, local Computer HTTP integration, and evidence goal changes.
Vercel preview deployment dpl_GyMFGBvCXrYJV1ZwtvS7sFnPbfpa: READY at source SHA a4000b02046ee6166db662e653ef5e849dc67282. HTTP 200 for workspace HTML, JS, Computer browser connector, original Synthia resident and original Tool Factory. Hosted /api/models/status correctly returns 404 (local host is required for real models).

NOT verified: trained TRIDENT generation using a compatible owner checkpoint; production-quality Modelmaker training on the owner's actual corpus; Android physical device; end-to-end ChatGPT MCP connection. No weights were fabricated or promoted. Model Trainer and inference adapters are operational code paths but require existing local dependencies, original source, and real model files. Do not call the language model complete yet.

## Security / operations / cost

Loopback-only services; original sources immutable; no keys needed for local inference; no arbitrary executable path provided by web user; no silent fallback between chat modes. Python model training uses real CPU/GPU compute; sizing and price need measurement against actual target hardware. At most one local Modelmaker training job may run. Restore is original Drive ZIPs + versioned Git revert + private model/checkpoint backups; never rewrite Foundry.
