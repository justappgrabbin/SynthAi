# Verification — v0.4.0

## New integration suite

`npm test`

Result: **24 passed, 0 failed**.

New assertions include:

1. artifact descent reaches actual bit/state primitives;
2. identical artifact + identical first-run outcome resolves deterministically;
3. different runtime outcomes can place the same artifact at different execution-derived coordinates;
4. Synthia automatically assigns a full canonical address after the first attempt when none is supplied;
5. the placement is appended with the failed/successful outcome;
6. an explicit creator-supplied canonical address is preserved while execution-derived placement remains visible.

## Regression

The untouched Pure Synthia Browser v1.3.7 regression suite was rerun after the repair:

- **866 passed, 0 failed**
- merged smoke: **42 passed, 0 failed**
- universal execution bridge: PASS
- mesh rule synthesizer: PASS
- execution loop orchestrator: PASS
- paper runtime sandbox: PASS
- runtime adapter registry: PASS
