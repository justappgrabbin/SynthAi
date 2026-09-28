# Synthia v0.6.5 — Contact → Understand → Act

This checkpoint adds an executable contact router on top of the v0.6.4 GraphRuntime.

## Flow

1. User contact enters GraphRuntime.
2. Existing semantic preflight executes Enhanced AutoLing, Enhanced DISEMINER, and computational grammar analysis.
3. `ContactActionRouter` chooses one of three surfaces:
   - basic contact → `LanguageContactModel`
   - external website task → browser workflow
   - strong/constructed expression → AutoNovel planning role → MESSY morph-routing role → existing materializers
4. Browser form workflows use the existing consent-gated ATO `browser-form` automaton.

## Browser guarantees in this build

- Inspects supplied page/form structure.
- Drafts values from a supplied local profile with provenance.
- Types only fields listed in `preapprovedFields`.
- Never autofills signature, e-signature, initials, consent, CAPTCHA, passwords/PINs, payment/card/CVV fields.
- Validates required fields.
- Stops at unresolved human-only fields.
- Existing ATO form state also requires final confirmation before external submission and requires a mounted browser executor.

## Acceptance proof

`npm run smoke:contact` verifies:

- a greeting remains on the basic LCM path;
- “I need to fill out this application” routes to browser form handling;
- pre-approved name and email are filled;
- e-signature remains unresolved and is the only human-only field in the fixture;
- “I need to order dog food” creates a purchase workflow that pauses before final purchase;
- a video request routes AutoNovel planning → MESSY morph routing.

## Honest boundary

v0.6.5 contains the orchestration and consent/state machinery. The Node acceptance test uses an inspected-page fixture; live arbitrary-site DOM/browser control still requires a mounted browser executor/host capability. The system does not claim a live browser session when one is not mounted.
