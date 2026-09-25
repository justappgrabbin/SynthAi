# Prime APK delivery gate

This additive gate closes the artifact-identity hole that allowed a Computer/Linux host APK to remain downloadable while the separately assembled Prime all-in-one candidate disappeared.

It does not modify the protected Synthia Prime 5.8 source, resident image, or life-process swarm.

`scripts/verify-prime-apk-candidate.sh` accepts an APK only when it contains all three expected byte identities:

- the named Prime 5.8 `.synthimg` asset
- the APK-local ARM64 Linux rootfs
- the pinned Android PRoot package

The gate writes a manifest that records the resulting APK hash and size while explicitly retaining `acceptance=not-phone-verified`. A host-only APK fails before publication and cannot be mislabeled as the Prime all-in-one artifact.

The known Resident 3 identities remain:

- Prime asset path: `assets/residents/Synthia-Prime-v0.5.8-Android-Resident-3.synthimg`
- Prime SHA-256: `8d5874a11f0a73027be14119bc13f6a0efd1adeb2aa9ac877c2284fcd5ab2f72`
- original lost-candidate rootfs SHA-256: `2db2bf52de55956a186fb79494ae4932dcd07d8d9dfba408927258e6deab1ea9`
- PRoot SHA-256: `9629eb30cdf86e95c6ba681f8ab89c6fdaa9eca093d5577163513c99af5ca281`

The exact Resident 3 image bytes are still required to produce a recovery candidate. Once those bytes are preserved as a GitHub Actions artifact, the promotion workflow can copy the image without altering it, rebuild/sign the APK, verify the newly built rootfs identity plus the pinned PRoot and Prime identities, and publish the APK and manifest together. Because the Linux build input is not byte-reproducible from the old mutable Alpine package state, a recovered build is a new candidate and does not claim the vanished candidate's APK or rootfs hash.
