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

Download the direct APK from the GitHub prerelease, allow installation from your browser when Android asks, then open it and enter your HTTPS server origin. Do not use source archives or the GitHub Actions ZIP as an installer. The initial preview is debug-signed; retained CI signing keys allow updates unless their cache is lost.

The preview workflow builds and tests changes on its integration branch. Publishing later APKs is a manual workflow action: review the change before running it. Android installation still requires the device owner's approval. No background source mutation or silent phone installation is enabled. Physical-device validation is still needed.
