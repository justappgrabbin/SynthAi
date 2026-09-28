# Synthia v0.6.6 — Real Browser Hand

## Goal
Mount an actual browser executor underneath the v0.6.5 Contact → Understand → Act routing layer without weakening the existing browser-form consent gate.

## Added

- `src/runtime/ChromeDevToolsBrowserExecutor.js`
  - Dependency-free Chromium/Chrome control over the Chrome DevTools Protocol (CDP).
  - Uses Node built-ins only: child_process, net, fs, WebSocket, fetch.
  - Opens a browser target, evaluates DOM code, inspects forms, types values, clicks, selects, uploads files, and dispatches forms.
  - Detects host Chromium/Chrome and reports unavailability instead of faking execution.

- `src/runtime/BrowserSessionManager.js`
  - Keeps browser sessions alive across the human boundary.
  - Starts live form workflows.
  - Applies only browser-form-approved draft values to the real DOM.
  - Accepts explicit human-only input separately.
  - Re-inspects the live page before submission.
  - Requires a separate explicit final-confirmation call before dispatching submission.

- ContactRuntime browser-session methods:
  - `provideBrowserInput(sessionId, values)`
  - `reviewBrowserSession(sessionId)`
  - `confirmBrowserSubmission(sessionId, { confirmed })`
  - `closeBrowserSession(sessionId)`

- `src/browser-executor-smoke-test.js`
- `src/runtime/ChromeDevToolsBrowserExecutor.test.js`
- `npm run smoke:browser`

## Proven acceptance path

Request: `I need to fill out this application`

1. Contact route selects browser/form workflow.
2. Real Chromium document is inspected through CDP.
3. Stored name/email are present in the profile and explicitly pre-approved.
4. Synthia types those values into the actual DOM.
5. A stored signature value is deliberately supplied in the test profile but is NOT typed.
6. Runtime returns `awaiting-human` with only `signature` unresolved.
7. Explicit human input supplies the signature.
8. Submission remains blocked when `confirmed:false`.
9. Explicit `confirmed:true` creates the final reviewed draft, records confirmation, and dispatches the real Chromium form submit event.

## Safety / control boundary

The executor does not bypass browser-form policy. Browser-form remains the authority for field approval and final submission confirmation. Human-only fields include signature/e-signature, initials, consent, CAPTCHA, passwords/PINs, payment/card/CVV/security-code fields.

## Host limitation observed during verification

The ChatGPT execution host has a Chromium administrator policy that blocks normal navigation to HTTP/HTTPS/file/data URLs. That policy is external to Synthia. For verification, CDP's `Page.setDocumentContent` loaded the acceptance application into a genuine Chromium page, after which DOM inspection, typing, pause/resume, and form-submit dispatch were exercised in Chromium itself.

Network navigation remains implemented in `navigate(url)` for hosts where Chromium/WebView permits it. Android integration should mount the same browser-executor contract to a WebView/Custom Tab/Chromium host rather than assuming desktop Chromium exists.

## Verification

- Real browser smoke: PASS
- Runtime smoke: PASS
- Orchestrator smoke: PASS
- Visual smoke: PASS
- Scene smoke: PASS
- Contact smoke: PASS
- Full Node test tree: **123 / 123 PASS**
