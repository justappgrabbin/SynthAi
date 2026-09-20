# Synthia v0.5.1 — Pre-DNA Wiring Checkpoint

This directory preserves the exact frozen Synthia checkpoint made **before** the current DNA/swarm integration work.

- Archive: `Synthia-v0.5.1-PRE-DNA-WIRING-CHECKPOINT.zip`
- Exact size: **80,178,682 bytes**
- Parts: **153 × 524,288-byte maximum**
- SHA-256: `1cd97f41a70006b98fb7a95db927a7e026d42331822c67f07bd99c7b2f67df82`
- Checkpoint test result: **32/32 passed**
- Status boundary: the checkpoint preserves the pre-DNA runtime; it does **not** claim the later DNA wiring is complete.

The normal one-file ZIP is published by the included GitHub Actions workflow as the release **Synthia v0.5.1 — Pre-DNA Wiring Checkpoint**.

## Manual reconstruction

Linux/macOS:

```bash
bash assemble-checkpoint.sh
```

Windows PowerShell:

```powershell
./assemble-checkpoint.ps1
```

Both scripts reconstruct the archive from the numbered parts and reject it if the SHA-256 does not match.

The repository's existing `main` source was preserved. This checkpoint is isolated on the `synthia-v0.5.1-pre-dna-checkpoint` branch.
