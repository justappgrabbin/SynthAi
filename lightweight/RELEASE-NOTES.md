Smaller installer derived from the original Synthia Adaptive 0.5.4 app. Download **Synthia-Adaptive-v0.5.4-lite.apk** below.

- Installs separately as **Synthia Adaptive Lite**; it does not replace or import data from the original app.
- In Computer, choose **Download / start model**. Initial setup downloads the original 1.12 GB Qwen Coder 1.5B weights from a pinned official source. Use Wi-Fi and allow at least 1.2 GB free storage.
- Download progress, Stop/pause and resumable retries are supported. The model must pass size and SHA-256 verification before use.
- The engine stays bundled. After the first setup, verified weights are reused and inference works offline.
- Original app assets are preserved byte for byte except the model-related status text; the original APK remains available under `synthia-adaptive-v0.5.4`.
- This is a separately signed distribution patch, not a rebuild from the unavailable original native Java source. Downloader regressions, package/signature/integrity checks pass; operation on a physical Android phone remains unverified.
