# SYNTH AI — Google Play entry checkpoint (2026-10-23)

This is an ADDITIVE change to the existing Computer; it does not change the
ComputerRuntime boot flow, remove any donors, or substitute a new chat app.

## What is implemented

- `installation/index.html`: phone-first, shareable, accessible public
  introduction to SYNTH AI and the system's chart, scientific-parallel,
  hypothesis-testing, library, and consent-based discovery intentions.
- In prelaunch mode, there is NO fake Play listing or APK download.
- Once there is a verified PUBLIC Play listing, replace the in-page `RELEASE`
  object with `{published:true,packageId:"<verified-app-id>"}`.
- Google Play URL construction carries only an opaque, sanitized 1–48 character
  `via` invitation code, via the documented `referrer` parameter.
- Android `PlayInvitation` reads the Play Install Referrer on first launch.
  It asks before saving an invitation on the phone, NEVER auto-connects users,
  and never uploads a chart. A missing Play Store does not block local startup.
- MainActivity continues to start the SAME bundled Node computer and WebView;
  the new invite check runs independently from those systems.
- Gradle/Android CI moved to API 36, AGP 8.11.1, and Gradle 8.13;
  this follows Android's 2026 Play target and official tool compatibility.
- The existing APK CI remains a DEBUG BUILD. Production Play publishing
  requires app signing, a verified .aab, and the real Play listing.
- `installation/landing.test.mjs` verifies the release gate, Play URL, and
  invitation-code sanitization.

## Exact open dependencies

1. **Public HTTPS origin:** decide and verify the final domain, then deploy
   `installation/index.html` there (not a Netlify-only workflow).
2. **Release identity:** verify `org.synthai.computer` in Google Play Console.
   This is the current build's applicationId, NOT a confirmed Play listing.
3. **Already-installed links:** after the HTTPS origin and Google Play signing
   certificate fingerprint are verified, add an App Links intent filter to the
   actual MainActivity and publish `/.well-known/assetlinks.json`. Do not
   invent a fingerprint.
4. **Invitation identity:** a `via` code is untrusted. If real person-to-person
   matching is enabled, the issuing service must prove ownership and ask both
   parties for consent. A saved opaque referrer is not a social relationship.
5. **Native-compatibility gate:** inspect all packaged `.so` libraries, including
   the prebuilt nodejs-mobile binary, for 16 KB page support before any Play
   release. Upgrading Gradle alone does NOT make prebuilt libraries compatible.
6. **Runtime verification:** run Android emulator and real-device installation,
   open the actual computer, inspect invitation dialog behavior, validate
   repeat launches and declined consent, and check Play Data safety.
7. **Google Play:** generate and upload a signed app bundle through the
   owner's authorized Play account; no uploads happen automatically here.

## Design/data rules

A chart is user-provided input to an existing semantic system, not mandatory
just to view a landing page. Interpretive parallels should be testable
hypotheses where appropriate, backed by an inspectable source and recorded
observation. Existing architecture and all the linked donor projects remain
in the backlog; none is discarded by this installation checkpoint.

## Local tests

```bash
node --test computer/installation/landing.test.mjs
```

Current Android CI additionally builds and exercises the existing Computer.
Google Play does not install an app without the person's confirmation.

## Sources

- https://developer.android.com/google/play/requirements/target-sdk
- https://developer.android.com/build/releases/agp-8-11-0-release-notes
- https://developer.android.com/google/play/installreferrer/library
- https://developer.android.com/training/app-links/configure-assetlinks
- https://developer.android.com/guide/practices/page-sizes
