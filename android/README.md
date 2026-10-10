# SynthAI Relay 0.1

This is an offline Android packaging target for the existing Computer project workspace and resident Klein automata. It is a limited working builder, not the completed SynthAI organism or an arbitrary autonomous coding agent.

## Working path

Build opens a task tracker by default. Writing `notebook` in the app purpose selects a notebook. AutoLing recognizes the declared build operation; AutoNovel combines the document and executable program. Both are the existing donor implementations, unchanged. The added integration rules support these two app types only. Each project contains its actual HTML source and `build-evidence.json` recording the tools' outputs.

Open app launches the saved artifact in a separate window, with no iframe. Tasks support adding, completing, undoing and deleting. Notes support adding and deleting. Data persists locally. Export app saves a standalone HTML file; Export JSON in the generated app backs up its data. GitHub publishing requires the existing authenticated bridge and is not preconnected in the APK.

Build commands persist in the existing StateStore and unfinished commands resume when Relay opens. There is no Android background worker yet. Closing Relay does not continue arbitrary coding. Node/Python world and ephemeris providers remain on the server runtime; browser calls report that a worker is required. The new swarm/memory rules have not been implemented or reinterpreted here.

## Rebuild

Install Node, JDK 17, Android platform 35 and build-tools 35.0.0. Set `ANDROID_SDK_ROOT`, then run `bash android/build-apk.sh`. The script generates a development signing key on its first run; retain `android/build/debug.keystore` for compatible updates. It packages local web assets and needs no live server for the supported builds.

For repository tests: initialize the Back-up- submodule (`git submodule update --init --recursive`), install `requirements.txt`, then run `npm test`.

## Verification scope

Repository tests cover real donor calls, persisted project recovery and queued build recovery. Browser interaction checks cover startup, build, task creation/completion/deletion, reopen with saved data, notebook creation and exports. Android compilation, manifest/asset inspection and APK signature verification are checked separately. Physical-device installation and Android-specific popup/file-picker interactions still require device validation; browser checks do not establish those.
