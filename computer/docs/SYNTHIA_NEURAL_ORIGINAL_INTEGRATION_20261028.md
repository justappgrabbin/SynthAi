# Original owner neural Synthia + TRIDENT assembly

2026-10-28. Integration branch `integration/synthia-neural-standalone-20261028`, derived from the existing TRIDENT/proactive Computer branch `integration/trident-proactive-synthia-20261027`. All canonical source files, training weights, donor libraries, and **sealed Foundry** remain unmodified. No production merge or Git publication is automated.

## The four user-supplied sources (exact)

1. `Synthia-Neural-Standalone.zip`, owner Google Drive ID `1vubEfGWwk7SopDMNd2pnAwdKjj_ApZu0`, 23,436,684 bytes, SHA-256 `38bde0b7635e8d9a32ebf719a6e4bdf5c6f06c6717d67d6046c85ff55895938d`. Contains original `host/computer-adapter.mjs`, `host/runtime.mjs`, Python PyTorch worker, Semantic Spacetime, owner-original ATO/Klein, Human Design coordinate and UniMorph engines, Yi Jing/adaptive lifecycle, and alignment model.
2. `synthia_weight_audit_20261027.zip`, Drive ID `1d9ca9lUL8iROqGf96_Ce3scoQWjlq2hu`, SHA-256 `1fd72bab780cc3672785efe3b446fb27cfa5667872f3324af515c17932dd149f`. **Read-only** resident+Simlish checkpoint structure audit; not itself model weights or live neural inference.
3. `synthia_quantum_engine_bridge.zip`, Drive ID `1yPtbHrfMIIQf1YwxxWM4uQj4t_tDjYhd`, SHA-256 `9f98c9d77c875072d8dacb0e8b1d3608a451b4f001357f9f01acb446f2e32141`. Experimental coordinate shape/range, distance and partial constitutional checks. Its original code contains hardcoded domain values and security issues, including untrusted `eval()` in an unused Redis backend; **not mounted into policy, neural training, or the live Computer**.
4. Goyal, Chang & Terry (2024), *Designing for Human-Agent Alignment: Understanding what humans want from their agents*, arXiv `2404.04289v1`. The standalone already implements its **six alignment dimensions** in `host/alignment.mjs` (knowledge, authority, operational strategy, commitments, protected disclosures and engagement) and runs acceptance tests. Paper is qualitative human-subject research, not a trained alignment checkpoint.

### Donor provenance inside original standalone

Owner-provided `host/computer-adapter.mjs` SHA-256 `85afaa3c77c865cb0492b0557531fb952a89ea6bb9e3cc1a0568cbac07fbac90`.
`host/alignment.mjs` SHA-256 `195f6d406d2c5b7b2f0daa8758df4faa230b6f8660bff99efcac2b9d8d60a6b3`.
`engine/worker.py` SHA-256 `3c0dbe5280bc307059a3f2538f867234d628d1d6852770e5b157a7d7bc483f26`.
Standalone `IMPLEMENTATION_MAP.md` SHA-256 `af2906866b1a8e7dc219972828b320a291f7ea8f11c166c3a3fcf239e0c7e7ee`.

## Actual technical integration

- `computer/services/standalone-neural-gateway.mjs` executes **the original** `createComputerModelAdapter()` from the user-extracted archive. `SYNTHIA_NEURAL_HOME` configures the local source home; `SYNTHIA_NEURAL_WORKSPACE` selects a **separate** persistent workspace. No automatic model training, inference substitution, source rewrite, or trained-weight conversion.
- Existing `computer/host/server.mjs` mounts this gateway as `synthia-neural-standalone` in the original Computer service registry and binds `GET /api/neural/status`, `POST /api/neural/inspect`, and `POST /api/neural/generate` to original semantic and PyTorch code. Those API paths are usable ONLY from the local Computer host; write requests retain same-origin checks. Training and alignment revisions are **not** remotely exposed in this integration.
- Existing `public/workspace.html` / `public/workspace.mjs` Model Lab adds original Synthia Neural meaning/trajectory options and semantic inspection; existing TRIDENT Code/Math/Research model modes remain unmodified.
- Existing proactive Synthia can explicitly select `backend=synthia-neural` for code-generation attempts but uses the SAME no-fake-output and add-only project-files logic. It cannot fabricate a working app from invalid neural output. Major builds and publishing still require a separate owner approval.
- `computer/scripts/attach_neural_archive.py` extracts the supplied original ZIP into a **new** destination only; validates paths, duplicate entries, symlink rejection, compression limits, source presence, and preserved bytes. It never mutates the source, does not run it on extraction, and refuses to overwrite any existing installation.
- Distinct original small TRIDENT 3-head weights, new standalone meaning-conditioned TRIDENT model, and Simlish contact model remain **separate**. A warm-start migration changes tokenizer semantics and requires independent evaluation, not an automatic overwrite.

## Reproduction on a Linux/Windows Computer with Python 3.11+, PyTorch and Node.js >=20

1. Download the original `Synthia-Neural-Standalone.zip` from the linked user Drive file, intact.
2. Run `python3 computer/scripts/attach_neural_archive.py /path/to/Synthia-Neural-Standalone.zip --destination /path/to/new-installation`. Use the resulting `mountedHome` path.
3. Set `SYNTHIA_NEURAL_HOME=/path/to/new-installation/Synthia-Neural` and choose a persistent private `SYNTHIA_NEURAL_WORKSPACE`. Start the original `computer/host/server.mjs`.
4. Use `http://127.0.0.1:8765/workspace.html` → Model Lab → "Synthia Neural · Semantic Spacetime + TRIDENT" to inspect semantic readings, check actual weights and generate real model tokens.
5. Only user-approved examples are trainable through the **original standalone** `node host/cli.mjs train --corpus ... --steps N --approve` command. After a training checkpoint is saved, the existing Computer bridge can generate through that same workspace. Test independent unseen prompts and coherence before claiming conversational completeness.
6. For mobile: this branch does **not** install Python/PyTorch inside the original Android Node APK, and has no external mobile-wide observation permissions. Thus the standalone model runs on a Linux/Windows Python host and is **not** claimed to be offline Android inference.

## Verification receipts

Run against the exact user-supplied ZIP extracted only in an isolated container:
- `npm test` → 7 passed, 1 optional Computer bridge skipped; 0 failed.
- `python -m unittest discover -s tests -p test_*.py` → 5 passed, preserving 208 source files and verifying real PyTorch gradients and neural-attention changes.
- Exact original `host/computer-adapter.mjs` connected through the new native gateway in an independent local test: **2/2 passed**, booted source, original PyTorch status cold/untrained, executed structured Semantic Spacetime inspection, refused untrained generation, trained 3 approved steps through original adapter, then executed real saved-checkpoint generation via original autoregressive TRIDENT.
- Quantum bridge tests: 6 passed; weight audit tests: 3 passed. No physics, consciousness, or production policy validation claimed.
- Repo CI: `.github/workflows/standalone-neural.yml` tests unconfigured fail-closed behavior, additive ZIP mounting and original resident/proactive regression. Its full optional original-donor test requires an explicitly mounted `SYNTHIA_TEST_STANDALONE_HOME`; skipped in generic CI, **but locally tested against real supplied archive**.
- Still unverified: physical Android compatibility, live local Computer host mounting owner ZIP, end-to-end coherent unseen prompts, autonomous code generation quality and production deployment.

**Next acceptance**: stage mounted exact owner archive on the target Linux Computer, perform actual local host HTTP `/api/neural/inspect` and `/api/neural/generate`, then evaluate context-specific real conversational quality. Keep PR draft until reviewed; no Git auto-push.
