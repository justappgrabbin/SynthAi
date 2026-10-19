# SYNTHAI CONTINUITY — Acode / Cynthia Code connector

This is an Acode plugin using the documented `setPluginInit` / `setPluginUnmount` lifecycle. Install its ZIP using Acode → Settings → Plugins → + → Local. The ZIP root contains `plugin.json`, `main.js`, and `readme.md`.

The four commands, available from Acode's Commands menu, are **Address current editor file**, **Open file from Continuity**, **Add a development checkpoint**, and **Show project goals**.

The plugin talks only to the existing Android-local SYNTHAI CONTINUITY service at `http://127.0.0.1:4183` using its per-install access key. Start the companion APK first. Explicit approval is required before transferring source. The original editor content is not overwritten; imported copies are content-addressed and append-only in the Continuity ledger. Nothing gets committed to another project's default GitHub branch.

This adds integration with the already existing Acode editor; no additional Acode editor UI is created. **It is not a claim that Acode is installed, nor that Android successfully granted Acode access to the local companion.** The Acode plugin and the APK still need device testing (native Cordova HTTP availability; connection; round-trip of UTF-8 source; receipts). If using an installed private Acode/Cynthia fork, check its plugin compatibility first.

The SynthAi 2 IDE can be connected separately through its tracked GitHub source repository and its installed Android package, when verified on the phone. Both share Continuity's same project records and artifact addresses.

The plugin does not collect keystrokes, copy private chats automatically, execute commands on its own, install APKs, or silently push changes.
