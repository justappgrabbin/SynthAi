# Synthia Universal Execution Spine v0.4.0 — Post-Execution Address Resolution

## What was repaired

The full canonical address existed in v0.3.0, but execution did not compute placement from the first runtime attempt. v0.4.0 closes that gap.

Execution now follows:

`artifact -> descend to bit/state primitives -> execute/probe/synthesize -> observe first-run outcome -> resolve complete canonical address -> append placement record -> share/learn`

## Canonical spine preserved

`Planetary -> Dimension -> Gate -> Line -> Color -> Tone -> Base -> Degree -> Minute -> Second -> Arc/Axis -> Zodiac -> House`

The resolver uses the complete structure. It does not reduce the address to Gate/Line/Color/Tone/Base.

Degree placement is emitted as a 5-of-29 structure while the earlier 5°37′30″ gate-span descriptor is preserved as historical metadata in `ADDRESS_STRUCTURE.degree.gateSpan` rather than deleted.

## Lowest-denominator descent

Before execution, `ExecutionAddressResolver.descend()` decomposes the artifact into deterministic low-level evidence:

- byte length / bit length
- ones / zeros / parity
- byte XOR / byte sum
- ordered 6-bit state chunks
- deterministic primitive hash

Those primitive states are carried into execution context.

## First-run ascent / placement

After the first attempt, the resolver combines the original primitive decomposition with observed execution facts including:

- success/failure
- execution path
- detected kind
- actual runtime adapter/engine when present
- stdout / return shape
- error evidence
- whether the original artifact really executed

The resulting deterministic state is projected through the complete mixed-radix address and validated by the canonical address validator.

This placement is labeled `first-execution-derived` and `computational-coordinate`. It does not silently claim astronomical or Human-Design truth.

A creator-supplied canonical address remains authoritative and is never replaced; the execution-derived coordinate is still retained beside it for evidence/comparison.

## Append-only placement

Every attempt creates an `execution-address-N` placement record containing the full address, derivation, and outcome. Failure is still meaningful execution evidence and therefore still receives a placement.

## Verification

- Spine v0.4.0 tests: 24 passed, 0 failed.
- Original Pure Synthia Browser v1.3.7 regression suite: 866 passed, 0 failed.
- Original merged smoke suite: 42 passed, 0 failed.
