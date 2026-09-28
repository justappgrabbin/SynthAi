# Anticipatory Mesh Memory

## Purpose

Synthia should not have to remain connected to the mesh at the exact moment a situation becomes active.

While the mesh is reachable, the local Synthia can inspect a bounded **forward reachable state horizon**, retrieve collective precedent relevant to that neighborhood, and cache the useful lessons locally. If the mesh later disappears, a fine-grained local trigger can still recall those already-prepared precedents.

## Privacy boundary

### Public / mesh-visible address

- Gate
- Line
- Color
- Tone
- Base

### Local-only, below-Base fingerprint

- Degree
- Minute
- Second
- Arc
- Zodiac
- House

`AnticipatoryMeshMemory` constructs a fresh `PublicMemoryAddress` before every mesh query. The provider interface has no field for the below-Base coordinates.

A public precedent stores only structural information such as:

- the public Gate→Base activation pattern;
- channel/circuit metadata when available;
- capability path;
- success or failure;
- whether the response was an existing, generated, or correction path;
- confidence and aggregate evidence count.

It does **not** contain raw conversation, file/document content, user/session identity, tool output, exact event time, or below-Base coordinates.

## Runtime flow

```text
local persistent state
+ upcoming reachable states
+ local fine coordinates (private)
        ↓
ForwardHorizonRequest
        ↓
AnticipatoryMeshMemory strips query to:
Gate / Line / Color / Tone / Base
        ↓
mesh precedent lookup
        ↓
cache only precedents matching reachable candidates
with horizon expiry
        ↓
mesh may disappear
        ↓
local fine-state/situation trigger fires
        ↓
activatePreloadedPrecedents()
        ↓
NO NETWORK QUERY
        ↓
matching cached precedent becomes a
`collective-precedent` runtime message
        ↓
normal Synthia tool / learning / correction loop
```

## Learning while disconnected

If Synthia learns a useful success/failure while the mesh is not reachable, v0.6 queues **only the already-sanitized public precedent**. The raw local episode is not queued for publication.

Repeated identical offline precedents accumulate an evidence count locally rather than becoming duplicate queue entries. On a later preload while the mesh is reachable, pending public precedents are flushed first, then new forward precedents are fetched.

## Reachability, not Internet

The runtime depends on a `PrecedentMeshProvider`, not an Internet API. A provider can be backed by a peer mesh, LAN host, local hub, or wider network. `InMemoryPrecedentMesh` is included as a deterministic local/test provider and is not presented as the final distributed transport.

## Forward horizon

v0.6 does not hard-code “24 hours.” `ForwardHorizonRequest` contains explicit start/end times and candidate states. A later local state/ephemeris planner can choose the horizon based on known state transitions, storage, and relevance.

The important rule is:

**preload the reachable neighborhood, not the whole public memory.**

## Example used in verification

The verification fixture uses a public 61–24 pattern. It is only a test case for the mechanism; v0.6 does not hard-code 61–24 as a special trigger.
