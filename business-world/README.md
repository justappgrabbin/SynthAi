# Business World Automation

This directory is the preserved bootstrap for the executable business world discussed on 2026-09-21.

## Runtime truth

The business is the runtime. The factory/world is a manipulable projection of the same state.

A world action may REQUEST a state transition, but a real-world operation is not marked successful until external evidence is recorded and verified.

## Current component states

- Supabase `business_world` schema: WIRED to database, not yet wired to a commerce provider.
- Entity / connection model: PRESENT.
- Job queue and idempotency: PRESENT.
- Event ledger: PRESENT.
- Evidence ledger: PRESENT.
- Resource ledger: PRESENT.
- Factory projection objects: PRESENT.
- External commerce adapter: NOT YET PRESENT.
- Visual factory client: NOT YET PRESENT.
- Full design → publish → sell → fulfill → settle loop: NOT YET WIRED.

## Preservation rule

This branch does not replace or delete existing SynthAi/Synthia architecture. It adds an isolated business-world namespace so existing systems can be inventoried and connected deliberately.

## First acceptance test

A job is not VERIFIED merely because it exists. Verification requires:

1. a runtime job;
2. execution by an actual provider/worker;
3. provider evidence;
4. evidence persisted;
5. final job state updated to `verified`;
6. world state updated from that verified result.
