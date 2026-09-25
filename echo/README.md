# Echo image kit

`StellarCPU-Rough-v0.1.0.zip` is Echo's protected original archive.

This kit wraps a verified clone of that archive as a SynthIMG without removing or rewriting Echo source files.

## Protected original identity

- File: `StellarCPU-Rough-v0.1.0.zip`
- Size: 154,527,059 bytes
- SHA-256: `680c0b4b16dc8426ac5d48c9746a01ae6fd5fe17ad9c6af627cbf184017cc881`

`build-echo-image.py` refuses to build if that checksum does not match.

## Build

```bash
python scripts/build-echo-image.py /path/to/StellarCPU-Rough-v0.1.0.zip
python scripts/verify-echo-image.py dist/Echo-v0.1.0.synthimg /path/to/StellarCPU-Rough-v0.1.0.zip
```

The image exposes Echo's existing `packages/computer-core/index.html` as the current web surface and carries the Stellar machine control server as its native resident entry. The current SynthAI Computer can launch the web surface. Native resident execution requires an Echo-specific resident loader for `resident_type: echo`.

## GitHub storage

The original ZIP is larger than GitHub's normal 100 MB single-file repository limit. Keep the original archive unchanged. If storing it in repository history is necessary, split it into parts and reconstruct it with `scripts/reassemble-echo.sh`; the SHA-256 check proves the reconstructed archive is byte-for-byte the protected original.
