# Synthia Exact Address Recall

This patch is additive to the existing r21.22 + Execution Spine + repaired wrapper lineage.
It does not replace Synthia, the wrapper, ATO, Foundry/ArtifactAssembler, or the canonical address runtime.

## Contract

- **ATO = tools.** Known tool addresses rematerialize through the existing IntegratedToolFactory + ATONativeBridge.
- **Foundry = apps.** Known app addresses rematerialize through exact app recipes or the resident ArtifactAssembler.
- **Canonical 13-field address = authority.** Exact commitments require planetary, dimension, gate, line, color, tone, base, degree, minute, second, arc, zodiac, and house.
- **SHA-256 = exactness proof.** If rematerialized content does not match the SHA-256 committed to that address, recall fails closed.
- **VQ-VAE = recognition only.** A VQ candidate never creates authority and cannot return an artifact by itself.
- **No silent overwrite.** A different hash at an already committed address is rejected unless supersession is explicit; previous commitment is retained in history.
- **No Gradle is used by Exact Recall.** It operates in the existing JavaScript/ATO/Foundry runtime.

## Runtime surface

`SynthiaUnit` now owns `unit.exactRecall`.
The browser/WebView front door also exposes the same instance as `globalThis.SynthiaExactRecall`.

### Commit a real ATO tool

```js
const committed = await SynthiaExactRecall.commitTool(address, request, {
  provenance: [{ type: 'source', value: '...' }]
});
```

The tool is produced by the existing ATO factory, exported without transient runtime state, hashed, stored content-addressably, and committed to the exact address.

### Commit an app

For an exact file-set:

```js
await SynthiaExactRecall.commitApp(address, {
  files: [
    { path: 'index.html', content: '<!doctype html>...' },
    { path: 'app.mjs', content: '...' }
  ]
});
```

For an existing binary (APK/ZIP/etc.), pass its exact bytes/Blob instead. Binary mode hashes and returns the literal bytes rather than reconstructing them.

### Recall

```js
const tool = await SynthiaExactRecall.recall(address, { kind: 'tool' });
const app  = await SynthiaExactRecall.recall(address, { kind: 'app' });
```

If the exact bytes are locally present, they are returned after a fresh SHA-256 check. If not, ATO/Foundry may rematerialize only when a deterministic recipe exists, and the result is returned only after matching the committed hash.

## Exactness boundary

For a binary commitment, SHA-256 covers the literal binary bytes.
For a Foundry file-set commitment, SHA-256 covers a deterministic canonical bundle of every file path, type, and exact text content. ZIP/APK container timestamps and signing bytes are deliberately not pretended to be reproducible from a source bundle; a byte-identical APK should be committed in binary mode.

## Verification

New smoke test: `npm run smoke:exact-recall`

It verifies:
1. ATO tool cold rematerialization produces the exact committed SHA-256.
2. Foundry app cold rematerialization produces the exact committed SHA-256.
3. VQ recognition does not grant artifact authority.
4. Corrupted app recipes fail with `HASH_MISMATCH`.
5. Address/hash conflicts cannot silently overwrite an existing identity.
6. Exact commitments require all 13 canonical address fields.
7. Exact Recall is mounted on `SynthiaUnit` and included in snapshots.

The complete existing `npm run verify` suite passed after integration.
