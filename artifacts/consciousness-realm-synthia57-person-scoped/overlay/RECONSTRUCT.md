# Reconstruct the exact person-scoped Realm integration overlay

The six `.b64.partXX` files in this folder encode one gzip-compressed tar archive containing the exact edited integration files from the verified build session.

## Reconstruct

From this folder:

```bash
cat \
  synthia57-realm-overlay.tar.gz.b64.part00 \
  synthia57-realm-overlay.tar.gz.b64.part01 \
  synthia57-realm-overlay.tar.gz.b64.part02 \
  synthia57-realm-overlay.tar.gz.b64.part03 \
  synthia57-realm-overlay.tar.gz.b64.part04 \
  synthia57-realm-overlay.tar.gz.b64.part05 \
  > synthia57-realm-overlay.tar.gz.b64

base64 -d synthia57-realm-overlay.tar.gz.b64 > synthia57-realm-overlay.tar.gz

echo "0d8f093afaf356d20c894411d794704157e7659f31f3c527c1919e4badebcb80  synthia57-realm-overlay.tar.gz" | sha256sum -c -

tar -xzf synthia57-realm-overlay.tar.gz -C /path/to/ConsciousnessRealm
```

## Required baselines

This overlay is designed for the exact uploaded baselines recorded in the parent folder:

- `ConsciousnessRealm.zip`
  SHA-256: `a66c5cff5ad3557ff1fa67e12965a96d7ce1efa749ecbd2e4defa5b4ec7575c6`
- `Synthia-v0.5.7-CANONICAL-MORPH-INTEGRATION-FINAL-CHECKPOINT.zip`
  SHA-256: `c3590351f7b1831ec131ce00d7890d75a3fac5c99a4ee6a2afed38d3a9adfea9`

Synthia's canonical source tree is expected at `vendor/synthia-v0.5.7/` after applying the integration package. The overlay does not replace Synthia's organism with a simplified agent.

## Archive contents

- `.gitignore`
- `package.json`
- `server/synthiaResident.ts`
- `server/routes.ts`
- `client/src/integration/SynthiaRealm.ts`
- `client/src/pages/AgentWorld.tsx`
- `client/src/engine/EmbodiedWorldEngine.ts`
- `client/src/components/world/World3D.tsx`
- `client/src/types/embodiedAgent.ts`
- `scripts/verify-synthia-realm.mjs`
- `scripts/verify-person-morph-isolation.mjs`
- verification JSON and integration docs

The archive checksum is authoritative for byte-for-byte reconstruction of the edited overlay.
