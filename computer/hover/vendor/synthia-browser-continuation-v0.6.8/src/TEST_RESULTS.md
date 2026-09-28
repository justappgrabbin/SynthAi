# v0.6 verification

## New anticipatory-memory tests

### Base privacy / offline preload test — PASS

Fixture: public channel pattern `24-61` with intentionally populated local Degree / Minute / Second / Arc / Zodiac / House coordinates.

Verified:

1. Mesh query receives only Gate / Line / Color / Tone / Base.
2. One relevant precedent preloads while the mesh is reachable.
3. Mesh is then fully marked unreachable.
4. A local fine-state trigger still recalls the preloaded precedent.
5. No below-Base field appears in the anticipatory cache snapshot.
6. Raw session id, intent text, tool id, and tool output do not appear in a published precedent.
7. Expired horizon precedents are evicted.
8. A lesson learned while disconnected queues only a sanitized public precedent.
9. Repeated identical offline lessons aggregate evidence instead of duplicating or overwriting it.
10. On reconnection, the queued sanitized precedent flushes to the mesh.

Representative result:

`{"pass":true,"boundary":"Gate.Line.Color.Tone.Base","offlineRecallAfterPreload":true,"privateBelowBaseLeak":false,"exampleChannel":"24-61"}`

### GraphRuntime integration test — PASS

Verified:

1. GraphRuntime preloads one public precedent.
2. Mesh is disconnected before the local trigger.
3. `activatePreloadedPrecedents()` recalls the precedent without mesh access.
4. The cached precedent enters the live runtime message flow.
5. Materialization contains `synthia/anticipatory-memory.json`.
6. The artifact contains the public precedent but none of the private fine-coordinate fixture values/keys.

Representative result:

`{"pass":true,"preload":1,"recallWithMeshDisconnected":1,"runtimeMessagesProcessed":1,"artifactCarriesSanitizedCache":true}`

## Regression verification

- Active v0.6 runtime TypeScript spine: **PASS**.
- ATO core: **79 pass / 0 fail**.
- Shared 16-function Boolean bank: **4 pass / 0 fail**.
- Integrated Tool Factory core + standalone export: **8 pass / 0 fail**.
- Integrated Tool Factory full suite: **8 pass / 1 known external-fixture load failure** (`ato-core-native-test` remains absent, same limitation as v0.5).
- DeepStructureLearner original integration test: **PASS**.
- InteractiveLearner original integration test: **PASS**.
- Enhanced AutoLing / DISEMINER adapter smoke: **PASS** directly against the packaged compiled donor paths.
- Channel topology smoke: **36 rows / 36 unique**, Integration metadata preserved.
- Artifact materialization unit: **PASS**.
- Autonomous generation smoke: **PASS** — 3 generated tools retained/reused; `34-57` remains mounted.
- Artifact materialization smoke: **PASS** — real generated tool source is materialized and `synthia/anticipatory-memory.json` is included.
- Closed v0.5 learning/correction regression: **PASS** — 8 distinct observations, 14 deep rules in representative run, one retained `34-57` correction, no duplicate correction generation.

## Preservation

The preserved v0.5 copies of:

- `runtime/foundations.ts`
- `runtime/GraphRuntime.ts`
- `runtime/ArtifactAssembler.ts`
- `UPGRADES/tsconfig.v0_5.json`
- `UPGRADES/tsconfig.learning-loop-test.json`
- `VERSION.md`
- `UPGRADE_MAP.md`
- `TEST_RESULTS.md`

were byte-compared to the source files from `Synthia_Progressive_Upgrade_v0_5.zip`: **all matched**.
