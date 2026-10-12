# Current Android build: 0.5.0 (ARM64, Android 8+)

The APK contains the original Prism keyboard, compact toolbar and expandable tools, lavender/pink palettes, glyphs, launcher icon, Java localhost server, and an ARM64 Alpine/PRoot Linux runtime with Node and the requested Synthia Hover 0.5.8 branch. No separate Termux installation is needed for this bundled runtime. Older sections below describe earlier releases and the optional external Python worker.

Install `dist/prism-keys-v0.5.0-arm64.apk`, open Prism, allow the first Linux unpack to finish, enable/select Prism in Android keyboard settings, then open **Server → Synthia identity and tools** to configure the identity required by the original donor. Device interaction requires enabling **Prism Synthia Hands** in Android accessibility settings. The app cannot grant these permissions itself.

Chat invokes the donor sequential AutoLing/DISEMINER/Klein/success/language-contact/conversation pipeline. The host adapter preserves caller situational meaning context across the donor federation and reduces only HTTP response size. Run sends generated artifacts to the donor `/api/execute` pipeline; it does not force a Python interpreter or replace the universal JavaScript engine. Existing registered-runtime/probe/synthesis behavior remains unchanged. A Python example was reconstructed by the existing JavaScript bridge; this does not establish support for arbitrary Python programs.

Verified on the build host: two real donor chat turns; keyboard Run job through Java server, donor execution and persistent Inbox; JavaScript execution and a small Python reconstruction with Klein analysis; server/auth/context/MCP checks; compact toolbar, palettes and glyph persistence; APK compilation and signature. This is a debug APK, not physically tested on a phone. The local canonical Synthia runtime does not require a model API key, but general model writing/research/code generation needs a configured provider or local model. No trained language model is bundled.

Donor source: https://github.com/justappgrabbin/SynthAi/tree/integrate/hover-tool-factory at a5168b099bcfb0ed153bf962e267441b6c356c3b. The primitive system is imported by this branch's live resolver and execution pipeline, unlike the older disconnected architecture described in the supplied analysis. Not all proposed theoretical mechanisms or arbitrary artifact equivalence have been validated.

---

# Prism Keys — proactive keyboard companion

This keeps your supplied rainbow keyboard, punctuation engine, code pairs and indentation, tone selector, claim highlighting, undo and copy. The old host-only Claude calls are replaced by a local persistent worker. Synthia's semantic simulation is retained in the original attachments but is not presented as a working language model.

## Run on Android with Termux

1. Install Termux from F-Droid, then run `pkg install python`.
2. Extract this project into your Termux home directory.
3. For AI, configure an OpenAI-compatible model in the same shell:
   ```sh
   export PRISM_API_KEY='your-key'
   export PRISM_MODEL='gpt-4.1-mini'
   # Optional: export PRISM_API_BASE='https://your-provider.example/v1'
   ```
4. Run `bash start-termux.sh` (desktop: `python3 server.py`).
5. Open **http://127.0.0.1:8765** in your Android browser.
6. Read the pairing token with `cat state/token` and paste it in **Settings → Worker token → Connect**.

### Proactive behavior

In Settings, enable **Allow companion to automatically change my words**. It directly rewrites prose after a 2.5-second pause, using the selected tone. No suggestion approval step. Auto-punctuation remains the existing separate switch. Automatic AI changes are off until you opt in. Results only apply when the input is unchanged, the setting remains enabled, and code mode is off. Undo restores previous text. If you type while AI is working, the result remains in Inbox and does not overwrite your newer words.

Enable **Automatically research detected claims** for background source retrieval. It does not declare claims true: receipts identify real retrieved URLs, excerpts and retrieval dates. Retrieval searches Wikipedia with Crossref scholarly fallback. Journal article mode uses Crossref. Google API search is available with PRISM_GOOGLE_API_KEY and PRISM_GOOGLE_CX; Google Search links work without those keys. Retrieved metadata does not establish peer-review status or claim support. Research answers use those retrieved excerpts. Failed network/model jobs show an error in Inbox.

Use Fix prompt, Rephrase/Refine, Write, Research, Receipts, Attach, Save context, Copy and Talk back. Choose saved context in Settings to include it in model requests. Export it as JSON. Draft and settings persist in the browser; jobs and context persist in SQLite. API keys remain on the worker. The token is session-scoped in the browser.

### Background and platform limits

The worker continues tasks with the browser closed as long as Termux is running. Wake lock helps keep it running; Android may still stop Termux. Exempt Termux from battery optimization for longer runs. Restarting the worker requeues interrupted jobs, which may repeat a provider request. The queue is sequential.

An Android InputMethodService wrapper is included in `android/`. It loads this same original keyboard from the local worker, mirrors the active editable field, and applies edits only when the field still matches its snapshot. Password fields and fields that do not provide a complete text snapshot are blocked. Use Android’s keyboard picker to switch for those fields. It can see the editable input, not an app’s entire conversation history. The native integration requires device testing; the APK workflow builds a debug APK on GitHub.

The browser version remains usable on its own. Talk back uses browser speech synthesis or Android TextToSpeech in the native keyboard. Dictation in the browser uses SpeechRecognition where supported; in the native wrapper the Dictate button opens the installed recognizer (automatic result insertion is not yet integrated).

Text and selected context are sent to your configured AI provider for AI tasks. Search queries go to Wikipedia. The worker listens only on device loopback and requires a token. Stored drafts/context are not encrypted; keep the device account protected. The app generates code but does not execute it.

## Validate

```sh
python3 -m unittest discover -s tests -v
node --check web/companion.js
```

`web/original.html` is your unmodified keyboard. `web/index.html` is the extended version. `patch_original.py` reproducibly adds the extension points. Original code author attribution remains with the supplied files.

## Inbox, previews and hands

**Push** queues the current request. When ready, a highlighted **Check your inbox** button appears. Open the result to replace the keyboard area with a preview. **Push / use result** puts it into the editor; **Back to keys** restores the rainbow keyboard. HTML code blocks render in a sandboxed frame with external network access disabled. Other results show a text/code preview. Each code block has a download button in Inbox.

Enable **Do repeated requests for me in the background** in Settings. Entering the same normalized request on three separate occasions queues writing or code. This is a simple repetition heuristic, not semantic intent detection. Enable **Retrieve relevant saved context automatically** for local RAG (keyword overlap ranking over saved snippets).

Python code jobs have **Run Python in container**. This requires a Linux worker with Docker and a preinstalled `python:3.12-alpine` image. Runs have no network, a read-only filesystem, an unprivileged user, resource limits, and a 30-second timeout. Output comes to Inbox. Container execution requires the execution image to be installed. Other code languages are downloadable but not executable through this adapter.

Generated files can be pushed to a project directory explicitly configured with PRISM_PROJECT_ROOT; overwritten files are backed up under .prism-backups. Paths outside that directory are rejected. The Android hands menu provides explicit Back, Home, Recent Apps and app-launch controls; enable the optional accessibility service for the first three. It does not read screens or automate arbitrary app workflows. Website links open in the device browser; website automation is not implemented.


## Android install

In GitHub → Actions → Android APK, download `prism-keys-debug-apk` from a successful run, extract and install the APK. Start the Termux worker first. Open Prism Keys, enable it in Android settings, then choose it as the keyboard. Pair it from the keyboard’s Settings. This is a debug build for device testing, not a signed production release.

**Proof** retrieves source candidates; automatic claim lookup and automatic link attachment default to on per the requested behavior. You can disable either in Settings. Source candidates are explicitly labeled as unverified. Automatic keyword lookup can also be enabled; retrieved context and sources show under the highlighted editor.

GitHub repository creation in this session was denied by the connected integration permissions. No GitHub push occurred. The worker has a private-repository creation action that works only when its configured PRISM_GITHUB_TOKEN has the required permission. Failures are reported in Inbox.


## Final added tools

Feature Store installs/removes built-in tools and custom prompt actions. Proactive Solutions defaults on and recognizes a limited set of problem phrases, generating proposed solutions/code in Inbox without a separate request. It does not guarantee detection of every problem or automatically apply project changes.

GitHub RAG retrieves up to six source files from a selected owner/repository, using public access or PRISM_GITHUB_TOKEN. Optional comma-separated file paths give precise control. AI code tasks include retrieved file context and source references.

Context Translator uses AI to interpret literal meaning and intent. Swahili mode includes tentative subject/tense/object prefix analysis and explicit-pronoun agreement checks. It is not a full Bantu syntax or morphology engine. Zulu/Xhosa use AI interpretation without a verified local grammar.

Review result queues an AI second-pass review; this is not independent human peer review. Journal-article retrieval is available separately and does not verify a journal's review process.

Self editing: select a generated file, enter one of the supported app paths, and click Preview self-edit for approval. Open the diff in Inbox, then Approve self-edit. The worker checks the original hash, validates Python/JavaScript syntax, and backs up the original. Reload web changes; restart Python changes. Broken behavior can still require restoration from the backup. No self-edit is applied by proactive detection alone.

MCP: Settings can list and invoke tools from the bundled read-only workspace stdio server. Extra stdio servers are configured in a JSON file referenced by PRISM_MCP_CONFIG, e.g. `{"my-server":{"command":["executable","argument"]}}`. Tool calls require pressing Run selected tool. HTTP MCP transports, interactive auth, and automatic tool planning are not implemented.

The Android launcher includes a system file picker: choose Google Drive or device storage and import a UTF-8 text file (up to 1MB), then Save context if desired. Drive must be installed/available as an Android document provider. PDF parsing, native Google Docs export, and automatic Drive-wide access are not included.

The debug APK includes the keyboard assets and works for local typing without Termux. Model and background features require the worker. Browser flows, persistent jobs, bounded container execution, live scholarly lookup and MCP read tools were checked in this environment. Android sources compiled and the APK signature verified; no physical-device test was performed.


The Terminal panel runs explicit shell commands inside the Linux worker's restricted Python/Alpine Docker container. It is not an embedded Termux distribution, does not preserve shell sessions or install packages, and cannot run on plain Termux without a separate Docker-capable Linux worker. A full Android Linux/Termux runtime is not bundled in this debug APK.


## 0.3.0 keyboard update

The launcher now shows whether Prism is enabled/selected. Choose focuses a native test field before opening Android’s picker; if Prism is not enabled, it opens the keyboard settings first. Android still requires you to enable and select the keyboard yourself.

The native keyboard is at most 330dp tall and no taller than 48% of the screen. Its editor and long action rows are hidden during typing. The top four-square button opens tools; Colors opens the rainbow, lavender, pink, lavender/pink and night palettes. Glyphs opens symbols, emoji and text faces. Number-row and animation preferences persist. Settings contains the original typing preferences. A lavender/pink adaptive launcher icon is included.

The picker changes compile against Android 35 but cannot be verified on a physical phone in this workspace. The toolbar, palette persistence, glyph insertion, panel navigation and compact viewport were tested in Chromium.


## 0.4.0 — server inside the APK

The Android app now contains its own Java local server at `http://127.0.0.1:8770`, persistent context/job storage, background notification service, and a workspace MCP endpoint at `/mcp`. Launching Prism starts and pairs the server automatically. These no longer require the external Python worker. Android may stop background services; queued/read-only jobs persist, but continuous execution is not guaranteed.

Use the launcher’s **Server** button for configuration. API keys, GitHub tokens and bridge credentials are stored encrypted with Android Keystore. A local OpenAI-compatible model on localhost can be used without an API key. Remote providers still require appropriate credentials.

**MCP:** `workspace` provides `list_files`, `read_file`, and `search_context` from app-owned storage. The loopback endpoint accepts authenticated JSON-RPC initialize/tools/list/tools/call requests. The Server dialog displays the token for trusted MCP clients. `remote` supports stateless JSON-response HTTP MCP endpoints; SSE and session-bearing MCP servers are not yet supported. `linux:server-name` routes stdio MCP operations to a configured Prism Python worker in proot/VM. `synthia` adapts the Operator's existing `/mcp/tools` and `/mcp/call` endpoints (this legacy JSON API differs from standard MCP JSON-RPC).

**Hands / Linux connections:** Android shell commands run in app-owned workspace by default. This is the Android shell, not a full bundled Termux distribution. Enter an adapter and base URL in Server settings:

- `prism`: this project's Python worker at `http://127.0.0.1:8765`, with its `state/token`. Install/run the worker in your existing proot or VM for Python and packages. Its `linux-python` and `linux-shell` actions run in that connected environment with time/output limits; they are not Docker-sandboxed. Shell commands are executed only when you press Run, and generated Python only when you press Run Python.
- `synthai2`: existing Studio backend, commonly `http://127.0.0.1:5000`, using `/api/container/exec`. The repository's `LINUX_CONTAINER_ENABLED` must be `true`; the bootstrap currently defaults to false.
- `synthia`: existing lite backend, commonly `http://127.0.0.1:10000`, using `/terminal/run`; configure the backend's terminal token.

A VM needs a localhost port forward, or an HTTPS endpoint. The APK's network policy permits cleartext only to localhost. The app does not create or install a Linux VM, proot distribution, or Termux binaries.

**Synthia chat:** More tools → Synthia chat. The original uploaded Synthia core is bundled for hypothesis/state/provenance management. Without a model connection, chat is a clearly labeled rule/context helper, not a trained language model. A **Synthia Operator base URL** connects the `Synthai2/synthia-server/synthia_operator_server.py` endpoint `/operator/do`; this may return local heuristic output or HF model output depending on that server's configuration. Alternatively configure an OpenAI-compatible local or remote model. The adapters were checked against retrieved repository endpoint definitions and local contract stubs, not against the user's running phone servers. No module named 5.8 was identified in the inspected trees; version-specific Hover integration is unresolved.

**Approved self edits:** The embedded runtime can replace `web/index.html`, `web/companion.js`, or `web/keyboard-ui.js` only after a preview and explicit Approve. It verifies the old hash and saves a backup. On-device behavior/syntax is not automatically verified; **Server → Restore UI** removes overrides if needed. Native Java/APK changes require a rebuild. Project pushes write to the app's workspace; they do not automatically edit another app's files.

Validation: Android source compilation and APK signature verification; Java server HTTP/auth/persistence/jobs/MCP/shell tests; bounded path rejection; browser-to-native-server chat/terminal UI tests; Synthai2 and Synthia endpoint contract checks. No physical phone test has been performed. The build container is not embedded in the APK.
