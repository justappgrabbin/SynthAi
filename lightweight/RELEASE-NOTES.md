Synthia Adaptive Lite 0.5.5 adds **Settings → App updates**.

- Optional daily GitHub checks when the app opens; a manual Check button is always available.
- Download is offered only for a newer Lite APK with the same package and signing identity. Other applications and older releases are ignored.
- You choose whether to download. The browser downloads the APK; Android asks before installing. There is no silent install or forced update.
- The original downloadable, quantized Qwen model stays unchanged. Compatible updates preserve downloaded weights and app data.

**First-install limitation:** the previous 0.5.4 GitHub APK used a temporary signing key that was not retained. Android may reject installing this release over that build. Preserve existing work before considering any fresh installation. Future updater releases must use this release's pinned signing key.

The APK remains about 108 MB; first model setup downloads 1.12 GB. Automated policy/download tests, rebuilt-payload comparison, signature and integrity checks pass. Physical Android update installation remains unverified.
