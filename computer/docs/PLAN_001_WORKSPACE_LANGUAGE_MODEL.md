# SYNTH AI — PLAN 001 / Workspace and First Language Model

Date: 2026-10-27
Source-of-truth repository: justappgrabbin/SynthAi
Feature branch: integration/workspace-plan-001-20261027, based on the existing Synthia resident integration.
Foundry status: SEALED / READ ONLY. Existing donor ZIPs remain unchanged.

## Outcome and measurable gates
Create one accessible website linked from SYNTH AI Computer with file/ZIP intake, real isolated HTML preview, goal checklist with evidence, and a versioned first language-model plan. A remotely hosted, authenticated MCP plugin should later expose read-only inspection to ChatGPT, not assume access to local browser files.

### Component flow
Computer Home -> Workspace URL -> Browser source intake -> bounded ZIP inspection -> IndexedDB library -> sandboxed HTML preview
Computer Home -> Workspace Goal Board -> localStorage -> JSON export/import and Git versioned plan
Computer resident -> existing AutoLing, DISEMINER, AutoNovel -> morphology / semantic relations -> verified generative backend -> feedback/evaluation
Read-only MCP HTTPS endpoint -> verified public plan and HTTP deployment probe -> ChatGPT (when connected)

## PLAN 001-A Website
Deliver mobile-friendly file and ZIP selection, entries/size limits, safe path validation, and independent source preservation. Extract text only. React/Vite/Expo/Python/APK packages are not executed inside an HTML iframe. Plain HTML+CSS+JS can be previewed with a CSP-restricted iframe without same-origin permission or network access. Persist extracted files locally in IndexedDB and provide source browsing.

Acceptance: import representative nested HTML/CSS/JS ZIP, verify preview and blocked network; reload the page and recover files; test on an actual phone. A passing Node unit test does not prove this browser behavior.

## PLAN 001-B ChatGPT plugin
Build read-only Model Context Protocol server with tool discovery and endpoints for the canonical plan, build log, and deployed workspace reachability. Require HTTPS and bearer authentication from hosting secrets; no direct access to private browser IndexedDB and no arbitrary URL fetch. Connect through ChatGPT's own plugin setup from an eligible ChatGPT web workspace. A source file or test server is not an installed plugin.

Acceptance: server starts; unauthorized request gets 401; initialize, tools/list and tools/call work; deploy HTTPS endpoint; real call from ChatGPT after user-authorized connection. Claims about live UI remain unverified until actual browser observation.

## PLAN 001-C Accomplishment board
Goals G01–G09: original Computer verified, seven archive manifests inventoried, phone ZIP import, HTML preview, persistence/export verified, website deployed, MCP connected, language plan agreed, genuine generative language demonstrated. Mark a goal complete only with a verification note. The browser board stores locally until authenticated sync is implemented; export/import is required for cross-device use.

## PLAN 001-D First necessary piece: Synthia language model
Purpose: A functioning, grounded, creative language system using the existing resident and language tools, not a mislabeled rule template.

Stage 1. Audit donors and licenses: locate language generation, tokenizers, language datasets, training/inference adapters, reproducible tests. Use read-only evaluation and immutable archive checksums.
Stage 2. Define semantic-spacetime input contract: utterance; observer; context; temporal scope; relationship edges and their source; claim provenance; uncertainty; intent; requested effect. Preserve distinctions among observed facts, assertions, and conjectures.
Stage 3. Reuse established AutoLing, DISEMINER and AutoNovel in the canonical execution spine, Klein transformations and morphology as planners and interpreters. The 96→16 supervised neural Synthia resident is a classifier, NOT a generative language model.
Stage 4. Attach a REAL local inference decoder, such as Ollama/llama.cpp or a separately validated WebLLM implementation, without requiring external API keys. Do not claim a library scaffold itself has learned language. Train a small transformer only after a corpus, compute budget, evaluation and licensing plan exist.
Stage 5. Record feedback and learned examples with explicit authorization and versioned model weights, separate from original sources. Keep logs, provenance, and checkpoint rollback.
Stage 6. Verify held-out prompts, novel non-template replies, meaning preservation under paraphrase, factual abstention, multi-turn contextual coherence, restart recovery, latency and memory on phone/laptop. Keep exact input/output traces and baseline comparisons.

Release criterion: actual model inference on unseen prompts passes reproducible tests with observed outputs. Neither draft code nor a demo UI qualifies.

## Archive inventory: seven user-supplied original ZIP files
- Paper-Mobile-Termux-Build (1).zip: 58 entries, Termux Android WebView build kit, not compiled APK. SHA256 93c64c7212bda427e95b724f9b5d853fc5b7a7c5be87b40f4d96da7f6570ac84
- DaRk-LLM-main.zip: 111 entries, Tauri/Vite/React desktop local inference studio. SHA256 db442771ab54f617182ca6b72beec3edbad4c1bf3343cfb539f82be5b99f5600
- Model-Weaver.zip: 879 entries, React/Express/WebLLM candidate workbench; full runtime unverified. SHA256 9630ae4e8e0805b8b725149be8ee6addc5452450e7dd8ecf91754102d5f87877
- Synthia-Computer-r22.4-source.zip: 2959 entries, 222.2 MB expanded, Expo/web/server modules, Foundry untouched. SHA256 2a43915b847c7a6143813872694a7dc402ae0afe9bec6cb0af8166797d4a2130
- USB-Uncensored-LLM-main.zip: 36 entries, upstream README says deprecated. SHA256 44dd83025d3c50412718447436448ec0203e4da06f519d7bd3eb071cd0d8a703
- transformer-builder-master.zip: 103 entries, pre-alpha BSD-3-Clause PyTorch building blocks. SHA256 5abba333dce6f61c6d1398717841537a695640f781bf04a4cff53d1871ff1871
- Neural Architecture Generator with 64 Primitive Functions.zip: 51 outer entries, includes nested ZIPs and compact neural-runtime source. SHA256 d150688eb1dc7a18fbda31e761c90c86945f48a5a66795792e264c3ec61e0a41

## Operational targets and budget
- Static browser UI: no inference hosting compute. Storage limited to device storage. HTTP uptime SLO target 99.5% after deployment; source preview functioning requires additional browser tests.
- Hosted MCP service: small CPU Node runtime, monthly spend to be estimated from chosen host and request volume; secrets outside git; HTTPS, restricted token, read-only by default.
- Local generative model: device memory and CPU/GPU requirements measured on actual hardware before selecting model size, with no fictional cost estimate.
- Restore: original ZIPs remain in Google Drive; git revert for code; JSON backup for browser goals. Incident checks: ZIP decompressor, path quotas, blocked iframe resources, IndexedDB quota, TLS/token/MCP status.

## Current engineering truth
Implemented on integration branch: source-intake module, local board, preview page and Computer navigation link.
Still unverified: live web/phone behavior, remote MCP ChatGPT connection, real generative language model. No donor or Foundry code modified. Versioned change log: computer/docs/BUILD_LOG_WORKSPACE.md
