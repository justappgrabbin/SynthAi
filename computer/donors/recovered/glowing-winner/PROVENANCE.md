# PROVENANCE — glowing-winner free-agent world (recovered donor, wave-3 P0)

- Source repo: justappgrabbin/glowing-winner @ main, commit a9afc57a455e0c6070b8107c0a32ea299c591414
- Cloned shallow 2026-09-23; files taken (verbatim, no shipped-bug fixes applied):
  EmbodiedWorldEngine.ts, HumanDesignSimulation.ts, InfluenceManager.ts, SharedSession.ts,
  SynthiaClient.ts (import dependency of InfluenceManager/SharedSession), README.md.
- No modifications to donor logic.

## Generated execution copies (repo runs Node 20 — no TS runtime; no new npm deps)
- `EmbodiedWorldEngine.ported.mjs`: esbuild type-erasure+bundle of EmbodiedWorldEngine.ts
  (NO logic changes). Import redirect: 'uuid' (npm, NOT installed) -> ./uuid-shim.mjs
  (env adapter: Node crypto.randomUUID = faithful RFC4122 v4). 'events' is a Node builtin.
- `uuid-shim.mjs`: documented env adapter, not donor logic.
- NOT ported (env requirements unmet, left PRESENT):
  - HumanDesignSimulation.ts — imports onnxruntime-node (not installed)
  - InfluenceManager.ts — imports react + ./SynthiaClient (network) + onnxruntime chain
  - SharedSession.ts — imports ./SynthiaClient (network)

## KNOWN donor limitations (recorded, not hidden)
- Placement13/OntologicalAddressGenerator ephemeris is a PLACEHOLDER (synthetic
  placement generation, not real ephemeris). FUTURE WIRING PATH (routing note, not
  implemented): Placement13 could consume recovered:foundry-glyphs-ephemeris real
  mandala ephemeris.
- Movement integrates over real simulation ticks (moveAgent sets target; positions
  converge during start() ticks).
