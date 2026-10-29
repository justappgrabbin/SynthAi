# Phone preview

The Android client reuses the Java WebView shell from justappgrabbin/Simlish, pinned to SOURCE-INTEGRATION.md. It connects to this app server over HTTPS. Use “Explore the interface and research pages offline” on the first screen to browse without a server. Chart calculation, persistence, matching and inference require your server; the offline preview supplies no fabricated chart values. This build does not contain a Python server or model weights. Server settings remain accessible in the Android action bar.

The active priorities are Human Design, four distinct chart frames and opt-in resonance connections. World embodiments and the interactive science lab are a later phase. Current research pages already specify predictions, controls and disconfirmation criteria.

## Run the server

Use Node 22 and Python 3.12.

```sh
python -m pip install -r requirements-web.txt
npm ci --prefix web
npm run build --prefix web
npm ci --ignore-scripts --prefix runtimes/isohuman
npm run build --prefix runtimes/isohuman
python run_app.py
```

The service listens on port 8000. Put it behind HTTPS and enter its origin in the APK. Live connections require this server to stay running. Birth records, accounts, network consent and experiment observations are local SQLite runtime data, excluded from Git. Back up these databases privately. Saved charts, journal entries, personal chat and predictions are private to their creating browser or linked account. Sign in from that browser to link a chart; another device signed into the same account can restore it. Unowned legacy charts stay unavailable by ID. This development server still needs an operational and administrative access review before an open public launch.

Configure Ollama or llamafile with SYNTHIA_MODEL_RUNTIME, SYNTHIA_MODEL and SYNTHIA_MODEL_URL. Models are supplied by that runtime; the app does not create or bundle its own model.

## Install and update

Download the direct APK from the GitHub prerelease, allow installation from your browser when Android asks, then open it and enter your HTTPS server origin. Do not use source archives or the GitHub Actions ZIP as an installer. Preview 2 uses application ID app.synthia.resonance.preview and installs alongside the first preview. Its original signing key was not retained, so do not uninstall the first app to force an update. If you have browser-only records there, sign in from that app and return to Human Design to link them before signing into Preview 2. The new key uses an explicit CI cache path and a pinned public certificate; a missing key or mismatch blocks a build. Production signing still needs owner-controlled encrypted key storage and backup.

The preview workflow builds and tests changes on its integration branch. Publishing later APKs uses an existing owner-approved source tag. After review, create a phone-preview-* tag on that commit, then run the workflow on the same integration-branch commit with release_tag set to that tag. It verifies the tag before building and publishes to the existing approved tag; the runner does not create an unapproved source tag. Android installation still requires the device owner's approval. No background source mutation or silent phone installation is enabled. Physical-device validation is still needed.
