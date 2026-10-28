# TRIDENT + Synthia proactive integration — executable Computer service

Date: 2026-10-27. Feature branch: `integration/trident-proactive-synthia-20261027` (based on original TRIDENT FLOAT PR #70). **Foundry untouched.**

## Owner objective and boundaries

The user wants Synthia to notice work, proactively do useful building, preserve every original project, never delete anything, and ask before a large build or any Git push. This release is integrated into the **existing** `justappgrabbin/SynthAi` Computer. No throwaway dashboard, second Computer architecture, or substituted LLM.

### Upstream evidence

Source: THUNLP ProactiveAgent, https://github.com/thunlp/ProactiveAgent, main commit `3fcf9beebe256b86871659fbb12541c41c9381b9` (2026-05-12), Apache-2.0. Inspected its `agent/README.md`, `agent/prompt.py`, `agent/agentmodule.py`, `agent/components.py`, `agent/register/tools/android.py`, `agent/ragent.py`, `agent/register/tools/filesystem.py`, and `example_config.toml`.

The **adapted** observation → propose → user feedback → action structure is executable as `computer/services/proactive-synthia.mjs`. This is not the unchanged THUNLP Python runtime: the original expects CodeLinker/ActivityWatcher and a configured LLM provider, and its Android tools are placeholders. The upstream 8B proactive and reward weights are **not** included, not attributed to TRIDENT, and not claimed to load.

### Existing Computer integration

- `ComputerRuntime.boot()` constructs `ProactiveSynthia` after its original online-trainable `SynthiaResident` and registers the service in its original registry.
- Watches real `vfs:write` Computer events for **admitted** `/home/user/Imports/` text. Runs the original `AutolingEngine` through `SynthiaResident.runTool`; records a grammar confidence and bounded TODO/FIXME line evidence, deduplicates repeated source signatures, creates review proposals if needed. This is actual automated analysis, not a static demonstration.
- Explicit `observe` messages also run original resident AutoLing + DISEMINER and persist their reading identifiers, with suggestions for observed test failures and build requests. Accept/reject/ignore feedback is persisted; accept/reject on user events updates original resident learning heads.
- `draftWithTrident` calls the **existing** `ModelIntegrationGateway.generate` with the original `trident` Code head and requires its real verified checkpoint. It rejects errors, malformed JSON/code, unverified inference, and low-quality generated text; it never replaces a failed model response with canned source. Upstream proactive-model weights are not loaded here.
- `buildNewFiles` uses the original `ProjectWorkspace.create` and `writeFile`, never a shell or hidden app. Small new-file builds may be automatic. A build with more than 3 files or >8 KB source requires exact `BUILD <proposalId>` approval before writing. Writes to existing file paths and unsafe paths fail. Source written != executable app verified (receipt says so).
- Publishing uses ONLY the existing Computer project Git backend and requires a separate `requestPublish` and explicit `PUBLISH <projectId>` confirmation. No auto Git push; in the absence of an actually configured backend it errors without claiming a publication.
- Android permissions are **not** silently acquired: the existing app can host local Computer APIs but this does NOT yet grant phone-wide Accessibility or observation of other mobile applications. THUNLP's `android.py` tools contain unimplemented `pass` methods. No background Android agent functionality is claimed.
- Five local Computer HTTP routes: `/api/proactive/status` (GET), `/api/proactive/observe`, `/api/proactive/draft`, `/api/proactive/build`, `/api/proactive/decide`, `/api/proactive/request-publish` (POST). Browser writes accept only same-origin local requests. Existing `/workspace.html` gains Synthia Agent tab.
- Android/browser build staging includes the new native browser-compatible service, so existing browser runtime imports remain resolvable.

## Verification

- Unit acceptance file: `computer/tests/proactive-synthia.test.mjs` (original runtime, Klein and persistence; added during integration).
- Independent regression: `computer/tests/trident-proactive-agent.test.mjs` (imported source actual analysis; add-only persistent files; explicit approval; original model error behavior; restart).
- Existing neural resident regression: `computer/tests/synthia-resident.test.mjs`.
- GitHub Actions `.github/workflows/trident-proactive-synthia.yml` checks syntax and runs all three suites. **Record actual results after CI**. Unit test model gateway is injected only to test contract; it is not proof that TRIDENT generated valid source in production.
- NO claim of complete TRIDENT conversation, trained upstream 8B deployment, Android app execution, mobile device-wide observation, background autonomous building outside the locally running Computer, or production release.

## Next verified increment

Install/exercise owner original `.pt` on the real local Computer, measure Code-head generations against the JSON/new-file contract; then implement an explicitly authorized Android observer/Accessibility bridge, or use the user's existing Android host event sources, before claiming real proactive phone operation. Maintain separate Git PR review and do not merge to production without owner approval.
