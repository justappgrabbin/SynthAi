# Independent Computer v26.3 — Drive-based source integration

The original v26.2 source is the base. The original file `world-engine-foundry-4.original.html` is still byte-for-byte identical to its Google Drive source. The entire existing **Synthia Resonance Computer v11** (216 imported source modules, full integrated UI) was copied from Google Drive and is preserved byte-for-byte in `donors/`. The 216 exact decoded module source files are also available under `recovered/synthia-v11-modules/` for individual inspection and actual Node verification. `synthia-resonance-connected.html` is that exact file with an append-only message bridge.

## Real changes

- Connected the Independent Computer editor and source registry to Synthia v11's **actual** `DesktopRuntime.installFile`, `DesktopRuntime.files`, `projects.readFile`, `send`, and `open`. A successful source import requires a byte-for-byte readback comparison, not just a returned success label.
- Provided a selectable workspace file list and **bidirectional** source transfer, using Synthia's original project store. A source stored in that runtime can be pulled back into the original Independent Computer editor or sent to the existing original Living World Foundry.
- Repaired silent 5,000-character truncation **on both sides** of the Living World bridge and emits exact in-world content readback confirmation.
- Preserved the original `index.html` features, original `messy.js`, Klein, existing project import/analysis/test and its World Engine. No original modules were replaced with miniature stand-ins.

## Running

Extract the ZIP. Open `index.html` in Chrome. For the most consistent browser persistence behavior, serve the extracted directory over localhost (e.g. `python -m http.server 8000`, then `http://localhost:8000/index.html`). The original one-file offline host remains self-contained for its existing features, but this integration additionally requires the sibling `synthia-resonance-connected.html` file. The source ZIP is a **browser-hosted** rebuild, not an APK.

## Acceptance

1. Wait until **Resident Synthia Computer** reports ready, open its Files UI.
2. Select any text source in the Independent Computer file registry (or enter a file name and actual text). Choose **Send editor source to resident computer**. It must show verified exact readback and storage mode.
3. Choose **List actual resident files**, select the file, then **Read selected resident file into editor**. The source must match exactly.
4. Choose **Manifest selected resident file in Living World**. The World event log must show **World readback … EXACT**.
5. Run `node test_*.cjs` and `node test_*.mjs` using the included source tree. Existing original tests remain unchanged.

## Scope boundaries

Drive's Synthia v11 has many real existing modules. Mounting them and verifying file transport does **not** prove every Synthia engine is integrated with the Independent Computer's own ontology or that every UI button works on Android. The two resident systems still maintain their own internal state models; this checkpoint implements actual source transfer, not a falsely claimed single RSS. Existing voice, network and device features may require permission, hardware, or configuration. No fake backend, synthetic agent or placeholder tool was added.
