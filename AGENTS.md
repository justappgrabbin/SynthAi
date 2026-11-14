# Adaptive APK delivery branch

The original full APK and model hashes are immutable. Do not replace them with another Synthia app.

For a Lite update:
- Read lightweight/README.md and use the existing private signing identity. Public certificate: lightweight/signing.json. Never commit or publish the private keystore.
- The local keystore is .signing/adaptive-lite.keystore. A private Drive backup was blocked by automatic review pending explicit owner permission; do not assume a backup exists.
- If the matching keystore is unavailable, stop the release step and explain that a compatible Android update cannot be signed. Do not silently generate a new key or advise deleting user data.
- Increase lightweight/version.json for each actual update. Build/test using lightweight/build.sh, then refresh lite-delivery/current.json and the corresponding Git-sized signed APK parts. CI rebuilds and compares the unsigned payload before publishing the signed artifact and update.json.
- App updates are optional. Preserve the opt-out and explicit download action. Never add a forced or silent install.
