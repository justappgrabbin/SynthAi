# Person-scoped Synthia + Realm morph

The integration is intentionally person-scoped.

For every `personId`, the server creates a separate complete Synthia v0.5.7 organism rather than sharing one global resident.

Each person gets:

- a distinct `FederatedSynthia` runtime;
- a distinct `PracticeWorldPort` adapter;
- an isolated world action queue;
- an isolated persistence directory derived from a SHA-256 lane ID;
- separate resolved-state and canonical morph history.

The Realm snapshot carries the current viewer identity and context into that person's Synthia lane. The returned canonical morph packet is then applied to both the visible Synthia resident form and the Realm environment.

Therefore Person A and Person B do not share one global Synthia morph state.

## Verification

The dedicated verification boots two complete Synthia 0.5.7 organisms with different person/world inputs and asserts:

1. separate runtime instances;
2. separate world ports;
3. separate action queues;
4. different canonical morph packet IDs;
5. different resolved state IDs.

Build-session observation:
- person-alice → Space / Gate 57
- person-bob → Movement / Gate 44

These are test results, not hard-coded production destinations.

## Birth mirror

The current Realm create-person form captures birthday but not exact birth time and birthplace. The demo therefore uses `requireBirthConfiguration: false`. No missing birth time or location is invented. Person-scoped state, routing, world-port state, persistence, and canonical morph history remain isolated.
