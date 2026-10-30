# Synthia Adaptive v0.5.4 — GitHub-only one-file release

The release workflow **does not access Google Drive**, request Drive authorization,
create Google credentials, or download the 13 Drive parts.

It keeps the actual Synthia Adaptive Android package and embedded model intact.
It does not substitute the separate `org.synthai.computer` application for the
original `com.synthia.adaptive` APK.

## Where things stand

The original signed APK is 1,225,329,912 bytes and its SHA-256 is:

`068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5`

The release workflow can publish it as **one GitHub Release asset** once GitHub
Actions actually contains an artifact named
`synthia-adaptive-v0.5.4-apk`, holding exactly
`Synthia-Adaptive-v0.5.4.apk`.

**There is no evidence this GitHub Actions artifact currently exists.**
The previous delivery was built outside this workflow; simply merging it
will not manufacture an APK, repair Android runtime behavior, or instantly
produce a download. Do not use unrelated Synthia Computer build outputs.

## How automatic recovery works

The workflow `.github/workflows/synthia-adaptive-self-service.yml`:

1. Runs regression tests on changes.
2. Every Monday, checks the v0.5.4 GitHub Release. An existing asset must
   match both size and GitHub's reported SHA-256.
3. If the APK is missing, searches GitHub Actions artifacts for the exact
   name `synthia-adaptive-v0.5.4-apk`.
4. Uses only a successful `main`-branch GitHub Actions run triggered by
   `push` or `workflow_dispatch`.
5. Downloads that artifact using the repository's existing GitHub token,
   checks the exact APK hash, Android APK structure, package identity and
   Android signature, then creates/uploads the single Release APK.
6. Never overwrites a conflicting release file.

If no artifact exists, the check finishes without publishing. Once a trusted
build provides the exact original APK artifact, the next automatic check
can publish it with no Google authorization.

For an existing successful build, **Actions → Synthia Adaptive — GitHub-only
single-APK release → Run workflow** can optionally target its numeric
`source_run_id`. The run must still provide the exact-named artifact and
pass every verification check.

A future GitHub build from Synthia Adaptive's **actual source** can emit the
named APK artifact and hand off to this workflow. The currently inspected
`SynthAi` repository has separate Computer Android build implementations,
not a proven reproducible source for the v0.5.4 signed Adaptive APK; do not
claim they are interchangeable.

## Verification and historical archive tools

```sh
python -m unittest discover -s delivery/tests -p 'test_*.py' -v
python delivery/synthia_adaptive_release.py \
  --manifest delivery/synthia-adaptive-v0.5.4.json \
  verify-apk --apk /path/to/Synthia-Adaptive-v0.5.4.apk
```

The original 13-part split-delivery manifest and optional **local-only**
`assemble` command remain for historical verification. GitHub Actions does
not invoke them and has no Drive access.

## Explicit limits

This is a release-delivery workflow, not a Synthia application rebuild, model
replacement, or in-app autonomous server. The original build verification
reported 47 passing tests, but physical phone installation, inference, native
permission behavior and Android background persistence remain unverified.
