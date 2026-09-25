# Consciousness Realm + Synthia 0.5.7 — Person-Scoped Morph Checkpoint

This checkpoint preserves the additive integration between the uploaded **ConsciousnessRealm** world and the complete uploaded **Synthia v0.5.7 Canonical Morph Integration** runtime.

## Non-negotiable invariant

Synthia is not reduced to a conversational/action loop. The integration keeps the full FederatedSynthia organism and reaches the world through Synthia's existing PracticeWorldPort.

The active path is:

```
person-scoped Consciousness Realm
        ↕
Synthia PracticeWorldPort
        ↕
full FederatedSynthia 0.5.7
  state space + automata + semantic genome
  physiology + relationship context
  canonical resolved state + morph runtime
        ↕
canonical morph packet
        ↕
Synthia resident form + Realm environment
```

## Per-person morph

The server uses a SynthiaResidentRegistry keyed by personId. Every person receives a distinct:

- FederatedSynthia instance
- PracticeWorldPort adapter
- world action queue
- persistence directory
- resolved-state history
- canonical morph history

The browser-local Realm consumes only that person's canonical packet. Person A and Person B can therefore produce different Synthia embodiments and different Realm environmental morphs without sharing one global morph state.

## Verification status

VERIFIED in the build session:

- upstream Synthia canonical morph integration test: 3/3 PASS
- full 13-field canonical address preserved: PASS
- PracticeWorldPort world snapshot/event/action round trip: PASS
- per-person runtime instances separated: PASS
- per-person world ports separated: PASS
- per-person action queues separated: PASS
- canonical morph packets diverged between two test people: PASS
- resolved state IDs diverged between two test people: PASS
- distinct hashed persistence lanes: PASS
- server TypeScript syntax: PASS
- modified client TS/TSX syntax/parse path: PASS

Not browser-VERIFIED in the sandbox: the Vite/React production render could not be run because npm dependency retrieval stalled.

## Observed test divergence

- person-alice → Space / Gate 57
- person-bob → Movement / Gate 44

These were test outcomes, not hard-coded destinations.

## Uploaded baseline hashes

```
c3590351f7b1831ec131ce00d7890d75a3fac5c99a4ee6a2afed38d3a9adfea9  Synthia-v0.5.7-CANONICAL-MORPH-INTEGRATION-FINAL-CHECKPOINT.zip
a66c5cff5ad3557ff1fa67e12965a96d7ce1efa749ecbd2e4defa5b4ec7575c6  ConsciousnessRealm.zip
cfffdbec75d85d8c213f89a0a36ebd71ca85ea12f45ed87a727336d46b9b6e6e  ConsciousnessRealm-Synthia-v0.5.7-RUNNABLE.zip
```

The large binary ZIPs are not represented as Git blobs by this connector checkpoint. Their exact SHA-256 values are recorded above; the integration source and verification evidence are preserved here.
