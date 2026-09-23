# PROVENANCE — Foundry-Glyphs (recovered donor)

- Source repo: justappgrabbin/Synthia @ main (public vault), archive `Foundry-Glyphs.zip` (224 KB)
- SHA-256 of original archive: 9d8a894b95fdf7ad42d1bf2f5d9b9b6521c31d567edb7b6dc807dbb8835d84e5 (matches archive-recovery-wave1.md §8)
- Extracted: 2026-09-22 (re-extraction; recovery-agent /tmp workspace was session-local)
- Recovery report: /mnt/agents/output/synthai-reassembly/archive-recovery-wave1.md
- No shipped-bug fixes applied; donor tree vendored verbatim (root folder `Foundry-Glyphs/` flattened one level).

## Generated execution copies (repo runs Node 20 — no TS runtime; no npm deps added)
- `server/resonance-engine.ported.mjs`: esbuild type-erasure transpile of `server/resonance-engine.ts` (NO logic changes). Adapter change: value import `@shared/schema` redirected to `./shared-schema-constants.ported.mjs` because `shared/schema.ts` imports drizzle-orm/zod at VALUE level (not installed); the resolver consumes only three pure constants.
- `server/shared-schema-constants.ported.mjs`: verbatim byte-for-byte extraction of `zodiacSigns`, `MANDALA_CONSTANTS`, `GATE_SEQUENCE` literals from `shared/schema.ts` (only `as const`/inline type annotations erased).
- The .ts files are canonical. The rest of the Foundry-Glyphs app (client/server DB/routes/Overseer/Evolution) is vendored for completeness but NOT mounted.
