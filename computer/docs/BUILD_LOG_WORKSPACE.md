# SYNTH AI Workspace — Versioned Build Log

2026-10-27 / Plan 001 / Integration branch: integration/workspace-plan-001-20261027

Source repository: justappgrabbin/SynthAi. All work is additive on a branch based on the existing Synthia resident integration; original Foundry and source donors preserved.

## Source inspection
- Seven Drive archives successfully retrieved, ZIP manifests counted, representative README/package content inspected, archive SHA-256 checksums recorded in PLAN_001_WORKSPACE_LANGUAGE_MODEL.md.
- Existing Computer public/index.html, public/computer-app.mjs, existing VFS and Node Computer runtime were inspected before editing. Existing application already had an HTML editor/preview; this feature extends its navigable UI rather than replacing it.

## Implementation changes (code added, not yet runtime verified)
- public/workspace.html, public/workspace.css, public/workspace.mjs: mobile source/library preview and goal board.
- public/workspace-core.mjs: bounded ZIP central directory and source extraction, safe path checks, evidence backed goals, isolated CSP HTML preview composition.
- public/index.html: link to Workspace from existing Computer navigation.
- computer/tests/workspace-core.test.mjs: source ZIP tests, path traversals, goal evidence contract and HTML preview checks.
- computer/plugins/workspace-mcp-handler.mjs, workspace-mcp-serve.mjs, api/mcp.mjs: bearer-authenticated read-only MCP, no private browser state exposure.
- computer/docs/PLAN_001_WORKSPACE_LANGUAGE_MODEL.md: plan, architecture, security, milestone acceptance and source inventory.

## Verification status
- GitHub file writes: successful on integration branch.
- Source inspections: successful.
- Automated Node acceptance: PENDING / record actual workflow result after CI.
- Live HTTPS deployment: PENDING.
- Browser GUI & physical Android device: NOT TESTED.
- ChatGPT custom MCP installation and live invocation: NOT TESTED / requires a supported workspace and user approval.
- A true generative language model: NOT IMPLEMENTED; resident classifier is separate.

## Blockers and next work
- Need GitHub Actions Node acceptance and browser integration testing.
- Need preview deployment and actual HTTP verification.
- MCP secret must be supplied in host environment, not committed to Git.
- Need private authenticated sync for cross-device uploads/goals before treating browser local files as visible in ChatGPT.
- Language plan must be reviewed before choosing decoder/training compute.


## 2026-10-27 — Deployment and security verification
- Published workspace branch to Vercel project `synthai-workspace-plan-001`; initial deploy failed because deployment requested unsupported Node.js 20.x. Corrected to Node.js 24.x and redeployed latest branch commit.
- Final checked deployment at commit `c18d1e60f87fbd2a833ffc8ef1f04aa31692bda3` reported **READY**. Production alias: `https://synthai-workspace-plan-001.vercel.app/workspace.html`.
- Vercel authenticated HTTP fetch verified 200 for `/`, `/workspace.html`, `/workspace.css`, `/workspace.mjs`, `/workspace-core.mjs`, and `/computer-runtime/ComputerRuntime.mjs`. Site responses and static content checked; Vercel deployment readiness is **not** proof of working GUI actions on physical Android or that public unauthenticated clients can access the URL.
- Corrected published source inventory to omit private Google Drive IDs. Reworked preview construction to inject restrictive iframe Content Security Policy even when source HTML omits a `<head>` element. Browser iframe remains isolated without `allow-same-origin`.
- Used JS-integration parser and core behavior checks in Code Mode: source syntax parsed for `workspace.mjs` and the MCP handler; `newBoard`, evidence-gated `updateGoal`, traversal rejection, and CSP injection with/without HTML head passed. These checks do not substitute for GitHub Actions, full browser tests, or MCP connection.
- Actual hosted `/api/mcp` returns **503** `bridge_not_configured` because `SYNTHAI_MCP_TOKEN` was deliberately not committed and hosting environment is not configured. No ChatGPT-side plugin installation, authentication exchange, or tool invocation has been verified.
- Original ZIP archives and sealed Foundry untouched. No generative language model trained, mounted, or claimed.
- Next actions: real Android/browser file-import and preview test; connect MCP with secure supported auth via user-approved plugin setup; verify tool discovery; then benchmark language donor-backed decoder end-to-end.
