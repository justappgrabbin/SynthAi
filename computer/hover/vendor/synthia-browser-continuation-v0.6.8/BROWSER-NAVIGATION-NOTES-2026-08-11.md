# Synthia v0.6.7 — Browser Perception + Autonomous Navigation

## What changed

v0.6.6 could control a real Chromium DOM once it was already on the correct form.
v0.6.7 adds the missing perception/navigation layer.

### ChromeDevToolsBrowserExecutor
`inspectPage()` now exposes:
- page title/text/headings
- forms and fields
- actionable links/buttons/submit controls
- stable `data-synthia-action-id` locators
- action text, role, href and local context

`clickAction(actionId)` operates those discovered controls in the live Chromium DOM.

### BrowserPerceptionNavigator
A deterministic goal-directed navigator now:
1. derives task-relevant terms from the user's message and browser route,
2. scores currently visible controls,
3. excludes visited controls,
4. refuses binding/destructive controls during autonomous navigation,
5. clicks the best safe relevant action,
6. re-inspects the resulting page,
7. stops when the task surface is reached or asks for guidance if no safe route is strong enough.

Binding controls are deliberately suppressed during navigation, including patterns such as submit, pay, place order, authorize, agree, sign now, delete, and final application send actions.

### BrowserSessionManager
`startGoal()` now lets one live browser session perform perception/navigation first and then hand the reached form to the existing consent-gated form workflow.

## Acceptance proof

Unknown application site; Synthia was given only:
- the starting page,
- the request: `I need to fill out an application for a job`,
- pre-approved profile fields `name` and `email` (a stored signature value was also deliberately present as a trap).

Observed route in real Chromium:

`Acme Home -> Work With Us -> Careers -> Open Roles & Apply -> Candidate Application`

No selectors or page-route map were supplied.

At the reached application:
- name filled from approved profile,
- email filled from approved profile,
- stored signature ignored,
- workflow stopped at `signature`,
- final submit remained outside autonomous navigation.

Proof: `proofs/browser-navigation-v0.6.7/navigation-result.json`

## Verification

- all smoke suites passed, including real Chromium browser executor and autonomous navigation smoke
- full Node test tree: 126/126 pass, 0 fail, 0 skipped

## Honest boundary

The navigation scorer is deterministic lexical/structural perception, not a claim of general web understanding. It can safely navigate interfaces whose controls expose enough meaningful text/context. When it cannot identify a sufficiently relevant safe action, it returns `needs-guidance` instead of guessing.

Normal network URL navigation remains subject to the host browser's policy/network permissions. The acceptance site used a real Chromium DOM with multi-page-style state transitions so the CDP interaction itself was genuine while avoiding this host's URL policy restrictions.
