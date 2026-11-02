# Synthia Computer — non-destructive neurosymbolic self-inventory

This is **an additive feature of the existing resident-Node Synthia computer**. It does not replace the Android/PRoot lineage, canonical ontology, or existing application architecture.

## What it does
- Automatically inventories embedded Computer files and assets on startup and resident virtual files, capability declarations, agents, worlds, tools, and registries.
- Tracks original paths, original names, SHA-256 source hashes, registry IDs, existing address values, provenance, and evidence for relationships.
- Records static-import hints, not execution claims; names/path role hints are explicitly unverified suggestions.
- Retains the established 13-field grammar without rewriting addresses. Missing addresses are marked unresolved; legacy formats are preserved unchanged.
- Writes only to its own **content-addressed snapshot directory** and an append-only inventory ledger inside app-private data.
- Responds to runtime changes and exposes the inventory through the existing authenticated loopback API.

## API
- `GET /api/inventory?summary=1` — totals, snapshot ID, issues, model status.
- `GET /api/inventory` — metadata entries and relationships.
- `POST /api/inventory/refresh` — request a new scan; unchanged snapshots are not duplicated.

## Neurosymbolic scope
The symbolic engine (identity, evidence, structural relationships, immutable audit) is wired. The service exposes a `neuralAnnotator` adapter that can supply candidate interpretations without changing any original. **No new neural model has been connected here.** Existing computational and Code-DNA machinery is not replaced.

## Installation/testing status
This branch is an isolated source change only. Four focused inventory tests and an HTTP endpoint smoke test passed on the local September 29 extracted Computer source. The source service was wired into this GitHub branch with its prior session authorization guard preserved. **The new GitHub branch has not been built into an APK, tested on a physical Android device, merged, or deployed.** Do not uninstall or overwrite an existing Synthia installation to try an experimental build.

## Inventory boundaries
- The packaged source scan excludes `runtime/data` content because it may include private user data. Resident VFS metadata remains inventoried through existing state.
- This source scan cannot see native .so libraries stored outside the extracted Computer payload, an older PRoot rootfs, or installed device-private data belonging to another Android package.
- No source file is modified by scanning. No item is deleted, deduplicated, renamed, moved or assigned a guessed semantic address.
