# Synthia Adaptive v0.5.4 — one-file, self-service release delivery

This workflow repairs **delivery of the original, already-built APK**. It does not
replace the existing Synthia Adaptive implementation, change its model, infer
the app architecture, or claim on-device acceptance.

## Original evidence

- The owner-delivered original is a 13-part archive in Google Drive.
- All 13 SHA-256 hashes are recorded in [synthia-adaptive-v0.5.4.json](synthia-adaptive-v0.5.4.json).
- The APK must be 1,225,329,912 bytes with SHA-256
  `068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5`.
- Package identity is `com.synthia.adaptive`. **Do not replace it with**
  `org.synthai.computer`; that is a separate Android application.
- The original VERIFICATION.md reports 47 passing tests, but no successful physical Android install, on-device model inference, or background lifecycle test.

## One-time private GitHub setup

The connected Google Drive files are private, so GitHub Actions **cannot** fetch
them with its standard GitHub token. Do not make them public or put tokens in
source code.

1. In Google Cloud, enable the Drive API and create a dedicated service account
   with only the Drive read scope used by this workflow.
2. Share only the existing Google Drive delivery folder with the service
   account's `client_email` as **Viewer**.
3. In **justappgrabbin/SynthAi → Settings → Secrets and variables → Actions**,
   add two repository secrets:
   - `SYNTHIA_DRIVE_SERVICE_ACCOUNT_JSON`: the full service-account JSON.
   - `SYNTHIA_DRIVE_FOLDER_ID`: the ID of the existing 13-part delivery folder
     (not its full URL).
4. Merge the reviewed pull request containing the release workflow to
   `main`. Then open **Actions → Synthia Adaptive — single-APK release
   recovery → Run workflow**. The first run publishes one APK as a prerelease
   asset on `synthia-adaptive-v0.5.4` once checks pass.

No service-account key is committed; folder identifiers remain private. It is
also valid to leave credentials unconfigured: that fails explicitly and changes
nothing.

## After setup: what is automatic?

Every Monday GitHub checks the release asset metadata without downloading the
model. If the APK is **missing**, GitHub Actions retrieves the 13 original
pieces from Drive, verifies each hash, reassembles the archive, verifies the
APK bytes and Android signature, and publishes **one GitHub Release APK**.
A complete verified asset causes no download. An existing conflicting or
unverified asset causes a hard failure rather than silent replacement.

The APK is still about **1.23 GB**: bundling the local quantized Qwen model
keeps inference available offline. Converting this to a small installer with
one-time model provisioning is a separate **app-code** change that requires
the exact Synthia Adaptive source and phone tests. The release workflow does
not create a substitute app or pretend to fix Android runtime behavior.

## Reproducible no-network test

Run `python -m unittest discover -s delivery/tests -p 'test_*.py' -v`.

For an operator with authorized local copies of the original 13 files:

```sh
python delivery/synthia_adaptive_release.py \
  --manifest delivery/synthia-adaptive-v0.5.4.json \
  assemble --parts-dir /path/to/parts --output-dir /path/to/out
```

No part is re-signed or modified. ZIP CRC is checked during extraction, and
the APK SHA-256 must match exactly before publication.

## Limits and next real app acceptance gate

This does **not** implement self-repairing code or an always-running resident
agent in the Android app. A CI monitor can repair a missing download; it cannot
verify how Android Accessibility, native inference, v86, background persistence,
or user-data migration behave on a physical phone. Those need device results
and the original Synthia Adaptive source, without conflating its package with
any unrelated Synthia/Computer branches.
