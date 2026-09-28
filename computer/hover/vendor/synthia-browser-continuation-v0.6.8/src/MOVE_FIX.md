# What happened to the move, and what got fixed

You're right that something didn't come across cleanly. Here's exactly what:

## The problem
`UPGRADES/compiled/` (the compiled AutoLing + DISEMINER engine JS that the
enhanced adapters import directly) was present in your v0.2 package but
missing from this v0.5 package. Both `EnhancedAutoLing.ts` and
`EnhancedDiseminer.ts` import from it directly, so without it the runtime
can't boot the real engines at all.

## Confirmed and fixed
Restored `UPGRADES/compiled/` from the v0.2 package you sent alongside this
one. Re-ran `artifact-materialization-smoke.test.ts` after restoring it —
it now passes for real, live:

- Real integration channels activated: `10-34`, `10-57`, `34-57`, `20-34`,
  `20-57`, `10-20`
- Real generated tool files materialized (`.mjs` + manifest + metadata per
  tool), plus `expression-graph.json`, `runtime-output.json`,
  `provenance.json`, `learning-state.json`, `index.html`, `app.js`
- 3 tools actually executed

## Bottom line on "what's what"
**v0.5 (this package, now fixed) is the current one — use this going
forward, not the v0.2 WIRED zip.** v0.5 already includes everything I was
manually debugging in v0.2 (real channel routing instead of made-up gate
arithmetic, real tool scheduling instead of a resurrection bug, real
artifact materialization instead of a generic template) *plus* a full
closed learning loop (execute → evaluate → learn → bounded self-correction
→ retain/reuse) that v0.2 never had. All verified live, not just claimed:
`learning-loop-smoke.test.ts`, `channel-topology-smoke.test.ts`, and
`artifact-materialization-smoke.test.ts` all pass for real.
