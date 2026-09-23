# PROVENANCE — you-n-i-verse-corrected (recovered donor)

- Source repo: justappgrabbin/Synthia @ main (public vault), archive `you-n-i-verse-corrected.zip` (28 KB)
- SHA-256 of original archive: f913997b787f15ac825446ad93c4664d006e51cabff6361d1d426e2cc2645197 (matches archive-recovery-wave1.md §6)
- Extracted: 2026-09-22 (this session re-extraction; original extraction by archive-recovery agent, /tmp/vault-recovery was session-local and lost)
- Recovery report: /mnt/agents/output/synthai-reassembly/archive-recovery-wave1.md

## Shipped-bug fixes applied to THESE EXTRACTED COPIES ONLY (originals untouched)

1. `synthia-bridge.ts` line 86 — unbalanced paren (file could not parse as shipped):
   `-  return ((g * 6 + l) * 6 + c) * 6 + t) * 5 + b;`
   `+  return (((g * 6 + l) * 6 + c) * 6 + t) * 5 + b;`
2. `state-space-engine-v2.ts` — three one-line-class fixes:
   a. `createNode` referenced undefined `second` (ReferenceError) and had a duplicate `second` key → signature extended with the `degree, minute, second, arcSecond` params that `parseCoordinate` already passed; body sets degree/minute/second/arcSecond from them.
   b. `base` clamped to 1-6 vs the file's own 5-base spec → clamped to 1-5.
   c. Duplicate re-export block (lines ~677-684) removed — the five operators were already `export const` at definition.

## KNOWN donor defect NOT fixed (out of sanctioned scope; recorded honestly)
- `synthia-bridge.ts` `runPipeline()` reassigns `const state` (lines 408-437) — will throw TypeError if called. We do not call runPipeline; recorded as known limitation.

## Generated execution copies (repo runs Node 20 — no TS runtime)
- `synthia-bridge.ported.mjs`, `state-space-engine-v2.ported.mjs`, `emergent-edge-resolver.ported.mjs`: esbuild 0.x type-erasure transpiles (NO logic changes), import specifier `./synthia-bridge` → `./synthia-bridge.ported.mjs` in the edge resolver. The .ts files are canonical.
