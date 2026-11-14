# Synthia Adaptive 0.5.4 — original APK

This delivery branch preserves the original Synthia Adaptive 0.5.4 Android APK from the owner's Drive delivery, uploaded October 29, 2026. The APK is reconstructed from all 13 original archive parts, without rebuilding, resigning, or changing app contents.

Download `Synthia-Adaptive-v0.5.4.apk` from the **synthia-adaptive-v0.5.4** release. No split-archive extraction is needed for the GitHub APK download. The application ID is `com.synthia.adaptive`, version code 9. It includes the original bundled model and ARM64 engine.

Original APK SHA-256:

```
068cae9639be745bdb9540fa5b0de790d66c506ba9973589251004fb9249a5b5
```

`START-HERE.txt`, `ARCHIVE-SHA256SUMS.txt` and `VERIFICATION.md` are the original delivery documents. Their test claims describe the original build; this upload independently checks archive hashes and reconstructed APK integrity, and does not establish physical-phone operation. This is an APK distribution repository, not a newly reconstructed source repository.

The original split archives are preserved in `parts/`. `assemble_original.py` verifies and reconstructs the existing APK without changing it. The branch workflow publishes that exact binary to the GitHub release.

## Smaller installer

The **Synthia Adaptive Lite** releases provide a separate ~108 MB installer with first-use model downloads. See [lightweight/README.md](lightweight/README.md) for setup, build details and verification boundaries. The original full APK remains unchanged under `synthia-adaptive-v0.5.4`.
