# TRIDENT FLOAT — Self-hosted release checkpoint (2026-10-27)

## Identity / what this release does
- Owner: stellarproximology.
- Preserves ORIGINAL PyTorch three-head TRIDENT architecture (Code / Math / Research) from Synthia-Computer-r22.4-source.zip; SHA-256 ca793d6a53f7bac29d2fa01d4dd36998d9b95d48529d51cc236b543a14333800.
- Packs SEPARATE NEW functional small-corpus checkpoint with 240 training updates, 3,594,755 FP32 trainable parameters, SHA-256 d1f70351eecfc56bb606386c877c5770d6eb933cdcc17337147a6a414551b66d; 14,556,033 bytes.
- TRIDENT's original historical trained weights are NOT established as recovered. The new checkpoint is NOT a fluent or fully trained assistant. The historical ONNX Synthia address model and original HF stellarproximology/Trident repo remain separate, unchanged.
- This new deployment is not a JavaScript reimplementation: original model.py and exact trained state_dict are loaded by PyTorch on CPU.
- Independently packaged original 3-head weights, fixed-size input, sample inference, experimental quality notice and explicit provenance. Chat UI is an interface over actual model generations, not GPT response substitution.

## Deliverables produced in this session
1. TRIDENT_FLOAT_HuggingFace_model_weights.zip (13,372,015 bytes; SHA-256 840a7d1ed9314b2ab7e5d4160fb17548a828ae844caec504aa9655f7632c6cb4)
   - Original model.py, newly trained .pt, training receipt, model card, verification report.
2. TRIDENT_FLOAT_self_hosted_HuggingFace_Space.zip (13,387,384 bytes; SHA-256 df5ee9de6aaec8bc4c65f567c795c71d14c8c63f124b3c37f4743254789e3330)
   - Docker: original model + weights, FastAPI on port 7860, floating web chat, limited OpenAI-style chat JSON, health/status, upload helper, strict checksum verification.
3. TRIDENT_FLOAT_HuggingFace_ZeroGPU_FREE_Space.zip (13,373,867 bytes; SHA-256 37c6ee776ef3f8b7957d6dc232e9959ed8bd37f6e8ef71c0956d175d7a0ab956)
   - Gradio 6.5.1 / eligible Free-account ZeroGPU: 3 specialist selectors + auto router, original PyTorch inference, hash checks, separate upload helper and README.

The ZIP artifacts are conversation attachments, NOT uploaded to GitHub or Hugging Face. They cannot be addressed by made-up GitHub URLs. Their exact paths are available in the originating ChatGPT turn.

## Real verification
- Docker/FastAPI folder: 7/7 acceptance tests passed, covering exact original source and checkpoint SHA-256, real PyTorch execution on each specialist and auto router, FP32 weights, FastAPI /healthz, /api/status, /v1/models, /api/chat and /v1/chat/completions, input validation, tamper rejection and 429 rate limiting.
- Real Uvicorn HTTP process: GET /healthz 200, GET /api/status 200, POST /api/chat generated six native research tokens, POST /v1/chat/completions generated four native code tokens; observed sample research continuation was 'ir o e'. These outputs confirm real but LOW-quality model generation.
- Gradio 6.5.1: source and checkpoint SHA verified; all 4 head choices executed; actual Gradio HTTP GET / and GET /config returned 200 in local server process.
- Docker image not built in this container (Docker CLI unavailable); Hugging Face cloud build not tested; public hosting not claimed.

## Hugging Face status and publishing boundary
- Connected Hugging Face account check: authenticated as stellarproximology (Free/non-Pro) with OAuth scopes jobs, openid, profile, read-mcp, read-repos; **NO write-repos / contribute-repos / manage-repos permission**, so remote model or Space creation from ChatGPT is NOT authorized and was NOT attempted.
- DO NOT overwrite existing stellarproximology/Trident, stellarproximology/Synthia or TRIDENT ONNX assets.
- Intended independent repositories: stellarproximology/Trident-Float-3Head (new model repo), stellarproximology/Trident-Float (new Gradio Space for eligible Free accounts), stellarproximology/Trident-Float-Docker (optional paid Docker Space).
- Hugging Face as of 2026-10-27 requires PRO for new Docker or ordinary CPU Gradio Spaces. Verified eligible Free personal accounts can create up to 2 Gradio ZeroGPU Spaces (with eligibility/capacity restrictions). Self-hosted Docker can run on an independently managed computer without Hugging Face PRO.
- Bundled publish_to_huggingface.py scripts default to dry-run and PRIVATE, require explicit --publish and locally authenticated write permission, and refuse overwriting existing repositories absent --update.
- The current user-facing site and integrated Computer branch are unaffected. MCP ChatGPT plugin connection remains a separate task; no implication of direct ChatGPT remote model execution.

## Reproduction / next actions
1. Upload ONLY to NEW separate HF repositories after owner grants write-authorized publication, choosing private default. For Free account, unpack the Gradio ZIP and upload its folder to new Gradio ZeroGPU Space; user may need to select ZeroGPU explicitly.
2. If using own computer/server: unzip Docker ZIP and run docker build -t trident-float:0.1 . && docker run --rm -p 7860:7860 trident-float:0.1, then verify localhost:7860/healthz.
3. For existing Computer integration: original repository already has /api/models/import-checkpoint, /api/models/status and /api/models/generate on the separate feature branch. Point SYNTHIA_TRIDENT_MODEL_SOURCE at the exact preserved model.py, then import this .pt checkpoint as weights (not as a new architecture); test through the Computer / Model Lab.
4. Retrain with actual authored language corpus and separately test coherence on unseen prompts. Do not mark language model as complete until response quality and loaded weights are proven.

## Operational model
- Single-process CPU float32 transformer (3.59M trainable parameters, 14.6 MB state dict). Local CPU usage only; no paid inference API calls.
- Rate limit 15 requests/minute/IP, max text 1200 chars and response 48 raw character-tokens; do not expose public private-data prompts without additional auth.
- Initial SLO goal for dedicated self-host: 99% valid request success, generation p95 and CPU/rss to be measured after actual deployment; not yet achieved/verifiable from local smoke test.
- Zero-trust separation: separate model and HF Space from private original, no arbitrary code execution, SHA validation with torch.load weights_only=True, non-root container user, no chat storage.
- GitOps rollback: revert this documentation branch; no sealed Foundry or source-branch modifications.

## Status
Source preserved: VERIFIED.
New native checkpoint trained/reloaded: VERIFIED.
Self-host FastAPI + Gradio local HTTP: VERIFIED.
Docker build/hardware: UNVERIFIED.
Hugging Face published: BLOCKED (OAuth write scope + Free Docker restriction).
Production-quality language intelligence: UNVERIFIED / NOT COMPLETE.

## Owner-phone upload option (2026-10-27)
- Created fourth artifact `TRIDENT_FLOAT_FREE_HF_ANDROID_UPLOAD.zip`, 13,370,605 bytes, SHA-256 `507dc10c8056984b3ead850a92da6bcc0fe6f8e3619df2b5156f02efe5c2fdfd`.
- This ZIP is FLAT (six root files): `README.md`, `app.py`, exact owner `model.py`, `requirements.txt`, `training_receipt.json`, new trained `trident-trained-synthia-240.pt`. Unzip on Android and upload the files directly into a new Hugging Face **Gradio ZeroGPU** Space, preserving names. Android need not run Termux or Python.
- All four Gradio specialist selections executed locally using original PyTorch. In addition, original Gradio Space folder served HTTP `/` and `/config` with status 200 on localhost.
- HF Docker/standard CPU Spaces require paid account as of late October 2026; the connected user is Free. Free personal ZeroGPU Gradio is limited to two Spaces for eligible accounts, with remaining quota/eligibility not established. No capability to create a write-authorized new Space in the current HF connector. Do not claim this artifact is already hosted.
