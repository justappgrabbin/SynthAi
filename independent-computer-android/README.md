# Independent Computer — Android local build

Android package for the existing JavaScript computer, full-source acquisition,
verified recursive construction and persistent local Qwen/Klein tool execution.

The APK includes the original engines, the corrected named-input tool adapter,
the pinned WebLLM runtime and complete quantized Qwen 2.5 0.5B model weights.
There is no model account, API key, remote inference server, Node installation,
or manual web-server setup on the phone.

The native foreground service serves **bundled assets on 127.0.0.1 only**. Chrome
Custom Tabs supplies the on-device WebGPU renderer. A WebView fallback can expose
the foundation where Chrome is absent, but local inference requires a browser/device
with working WebGPU. This is a packaged local browser application, not a native
llama.cpp model port. Model weights never go to an external inference endpoint.

## Build

Requirements: Linux, Java 17+, Python 3, curl/unzip-compatible networking and Internet
access during the build. Run:

```sh
bash android/build-apk.sh
```

The build fetches pinned Android tools, compiler and public model files, checking
SHA-256 for each. Output: `dist/Independent-Computer.apk`, signature verification
and a build receipt. All original runtime assets are preserved. Large generated
assets are stored losslessly as `.gz` files and expanded before packaging.

Private Drive reference notes, user workspaces, credentials, model binaries and
signing keys are not committed. Model binaries are bundled into the final APK from
pinned public sources. The original supplied JavaScript engines are kept, including
MESSY and the complete recovered donor modules. No miniature replacements are added.

## Validation and limits

The web foundation has 16 passing tests. Actual local Qwen generated the required
input `arg0:21`; the original Klein CALL executed the saved capability and returned
42. A separate Java test checks the real native asset server's binary readback,
MIME types, HEAD requests, missing paths and local origin/host boundaries. The APK
build verifies ZIP integrity, every asset checksum, the full model, alignment and
signature. These checks do not establish physical Android UI or GPU compatibility.

Application ID: `org.independentcomputer.local`. It installs separately from existing
`org.synthai.computer` installations. This evaluation APK uses a development signing
key retained locally by the builder, never committed. Reproducible source builds do
not imply the same signing certificate: preserve an owner-controlled key for future
in-place upgrades. Physical Android installation has not been verified.
