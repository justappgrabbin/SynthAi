# Synthia Progressive Upgrade v0.6 — Upgrade Map

## What v0.6 adds

v0.5 closed the internal autonomous loop:

`execute → evaluate → learn → bounded correction → retain/reuse → materialize`

v0.6 adds **anticipatory collective memory** around that loop:

`forward reachable state → preload public precedent → local trigger → recall without mesh → act/learn → sanitized mesh contribution`

## 1. Hard privacy boundary at Base

New foundational types in `runtime/foundations.ts`:

- `PublicMemoryAddress` = Gate / Line / Color / Tone / Base only.
- `LocalPrivateCoordinate` = Degree / Minute / Second / Arc / Zodiac / House.
- `ForwardStateCandidate` and `ForwardHorizonRequest`.
- `SharedPrecedent`, `CachedPrecedent`, `LocalSituationTrigger`.

The collective provider never receives `LocalPrivateCoordinate`.

## 2. New `AnticipatoryMeshMemory`

`runtime/AnticipatoryMeshMemory.ts` provides:

- `PrecedentMeshProvider` transport interface;
- `preload()` for bounded forward-horizon preparation;
- local cache with candidate-linked expiry;
- `recall()` that makes **zero mesh calls** when the trigger fires;
- `observeSchedule()` that turns real execution outcomes into sanitized public precedent;
- offline pending-publication queue with structural evidence aggregation;
- reconnect flush;
- privacy guard and incoming-precedent sanitizer;
- deterministic `InMemoryPrecedentMesh` for tests/local hosts.

## 3. GraphRuntime integration

`GraphRuntime` now exposes:

- `setPrecedentMesh(provider)`;
- `prepareForwardHorizon(request)`;
- `activatePreloadedPrecedents(sessionId, trigger)`;
- `getAnticipatoryMemorySnapshot()`.

If `RuntimeIntent.forwardHorizon` is supplied, it is preloaded during ingest.

When a cached precedent is activated, the public precedent—not the private trigger—is injected as a `collective-precedent` runtime message. Normal GraphRuntime processing then continues.

After tool scheduling, execution outcomes are offered to `AnticipatoryMeshMemory` for sanitized precedent publication or offline queueing.

## 4. Artifact retention

`ArtifactAssembler` now adds:

- `synthia/anticipatory-memory.json`

This contains the sanitized cache/pending-publication state. Below-Base trigger coordinates are never stored in that file.

`learning-state.json` also includes the anticipatory-memory snapshot through GraphRuntime's combined learning snapshot.

## 5. No exact public event timestamp

Shared precedent does not store the exact time a private episode occurred. Collective memory needs the structural lesson and aggregate evidence, not a timing clue that could increase re-identification risk.

Local cache timestamps (`preloadedAt`, `expiresAt`) remain local operational data.

## 6. Forward planner deliberately remains a separate organ

v0.6 **does not invent an ephemeris or future-state predictor**. It accepts the set of reachable upcoming candidates from the local state/ephemeris layer.

That preserves the architecture described by the user: there are only so many reachable next states, so Synthia prepares for that neighborhood instead of attempting to cache the entire collective memory.


## 7. Enhanced adapter runtime packaging repair

The active enhanced AutoLing and DISEMINER adapters already import `UPGRADES/compiled/runtime/autoling.js` and `diseminer.js`. v0.5 did not include those generated donor files in its ZIP. v0.6 includes compiled copies generated directly from the preserved TypeScript engines, so the source adapters can run without a separate pre-compilation step. The TypeScript engines remain the canonical source.

## 8. Preserved v0.5

Exact pre-edit copies of changed v0.5 files are under:

`UPGRADES/preserved_v0_5/`

The preserved copies were byte-compared against the original v0.5 ZIP during verification.
