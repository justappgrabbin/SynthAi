# Change record — 2026-09-21
Before: C# Core/HumanDesign/GeneKeys/YiJing projects plus a static public demo; no shared Computer runtime connected artifact intake, mutation execution, mounting, persistence, automata/processes and cultivation.

Preserved: all existing repository files. Added: modular Computer runtime, event/state fabric, persistence, registries, VFS/intake, real mutation dispatcher, mounting, automata, process fabric, backend broker, capability graph, morph engine, cultivation engine, policy boundary, macro adapters, independent micro registry, tests and a diagnostic shell.

Connected and tested: boot; artifact → VFS → mutation → dispatcher → actual mount → persisted restore; surfaced/persisted mutation failure; automata real input → persisted state; process fabric real input → persisted result; cultivation cycle; XynthAI 18+ boundary. Local result: 6/6 PASS.

Still disconnected: full SynthAI2 browser app, final SynthAI hovering UI/chat/hands/selective apps, Synthia game worlds, XynthAI app content, production backend adapters, and macro-to-micro assignments. These remain PRESENT or PARTIALLY WIRED, not VERIFIED.

# Change record — Stage 4a (addressing + state-space mount, integration/ecosystem-convergence)

WHAT EXISTED BEFORE: Computer runtime (EventBus/StateStore/MemoryPersistence/Registry, automata/processes/cultivation/projects) with no addressing, no state-space resolution, no event grammar persistence, no capability registry file. Back-up- donor (pinned 1c45318) present as submodule with execution-spine-v0.4.0 canonical-address schema and kimi state-space merge (DMS addressing.js, five-level mesh-state-space.js, human-design.js, living-loop.js) UNUSED by the Computer.

PRESERVED: all existing runtime/kernel/adapters/micros behavior; donor sources untouched (wrap-only); the 8 pre-existing runtime tests still pass.

CHANGED:
- computer/ComputerRuntime.mjs: boot() now mounts event-emitter, address-service, state-resolver, capability-registry into a new `services` Registry; adds contract methods queryCapability/route/resolveAddress/compareAddresses/resolveRelationship/resolveState/emitEvent; constructor accepts optional eventLogPath (tests use tmp logs).
- computer/runtime/projects.mjs and computer/adapters/GitHubWorkspaceAdapter.mjs: FIXED pre-existing syntax errors committed in HEAD (over-escaped backslash regexes broke ANY import of the runtime, Node "Invalid regular expression flags"). Minimal faithful repair only.

ADDED:
- computer/services/address-service.mjs — resolveAddress/compareAddresses/resolveRelationship/traceAddressHistory wrapping donor canonical-address.mjs + DMS addressing.js + human-design.js via lazy dynamic import; provider failures surface as 'service:provider-failure' bus events.
- computer/services/state-resolver.mjs — resolveState(entity,event,context) returning {identity,address,current_state,context,relationships,active_structures,trajectory,confidence,source_provider}; backed by donor mesh-state-space.js + human-design.js; missing data -> null/unknown.
- computer/registry/capability-registry.mjs + capability-registry.json — capability-registry-v1 seed; queryCapability/route; WIRED/VERIFIED promotions require evidence, demotion refused (append-only).
- computer/events/event-emitter.mjs — grammar-v1 emitEvent, append-only persistence to computer/runtime/data/events.jsonl, readAll/history/forEntity.
- computer/tests/address-state-mount.test.mjs — 4 real node --test tests.

MOUNTED: back-up-:kimi-dms-codec (resolve_address), back-up-:kimi-human-design (hd_chart), back-up-:kimi-mesh-state-space (resolve_state) behind Computer contracts.

CONNECTED: ComputerRuntime -> services -> donor vendors (lazy import); events -> runtime/data/events.jsonl; address history -> shared event log; routing_decision via capability registry.

DISCONNECTED / NOT MOUNTED: back-up-:execution-spine-canonical-address (PRESENT, schema/metadata only — its field 11 'arcAxis' differs from contract 'arc'; mapping documented), back-up-:kimi-living-loop (PRESENT, needs automata engine surface), donor 51-mesh swarm, automata activation pipeline beyond resolveAddress/resolveState.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 12, pass 12, fail 0 (8 pre-existing + 4 new). Evidence: ../../evidence/stage4a-address-state-mount.txt.
  (a) resolveAddress({birthDate:'1990-01-01',birthTime:'12:00'}) -> exactly 13 fields; Sun gate 64 line 5, zodiac Capricorn, degree 11 minute 19 second 15, arc from DMS codec; dimension null (unknown stays unknown). Provider: back-up-:kimi-human-design.
  (b) resolveState -> five-level active_structures (Being gate 64 + 4 other dimensions), HD type "Manifesting Generator", source_provider names kimi-mesh-state-space + kimi-human-design; no-datum entity -> confidence 'unknown', active_structures null.
  (c) emitEvent persisted grammar-v1 event; new ComputerRuntime instance over same logPath read it back (event_id match, actor_address.gate 64); traceAddressHistory returned the event.
  (d) queryCapability('resolve_address') listed both donor providers; route() selected back-up-:kimi-dms-codec; evidence-less WIRED promotion correctly threw.

PROVIDER STATUSES: VERIFIED — kimi-dms-codec, kimi-human-design, kimi-mesh-state-space, computer:events/event-emitter, computer:registry/capability-registry (evidence refs in capability-registry.json). PRESENT — execution-spine-canonical-address, kimi-living-loop, computer execute/route/observe/remember.

FAILED (then fixed): two pre-existing committed syntax errors (projects.mjs, GitHubWorkspaceAdapter.mjs) — see CHANGED.

BLOCKED: none for stage 4a. House convention note: kimi codec uses 1-8 trigram houses; recorded in registry known_limitations.

# Change record — Stage 4a+Amendment C + one-real-event milestone (integration/ecosystem-convergence)

WHAT EXISTED BEFORE: Stage-4a mount (addressing + state-space + event grammar + capability registry) wired and verified; donor pure-synthia v0.4.0 swarm (47 baseline processes) PRESENT but NOT mounted; no automata activation behind Computer contracts; no event had ever traversed the full canonical pipeline.

PRESERVED: all Stage-4a services/tests (12/12 still pass); donor sources untouched (gateway wraps, never reimplements); append-only registry conclusions preserve previous classifications.

CHANGED:
- computer/registry/capability-registry.json (Amendment C): execution-spine-canonical-address DESIGNATED canonical-address AUTHORITY (role canonical_address_authority; conclusion record preserves previous undesignated classification + reason); kimi-dms-codec RECLASSIFIED specialized_constructor (conclusion record preserves previous implicit-canonical classification); selection_hint: completed addresses should be validated against execution-spine; notes added for Synthia Server (justappgrabbin/Synthia-server, branch computer-github-bridge-2026-09-22, open questions) and Android/Capacitor truth record (NOT FOUND in current assembly; PRESENT / REQUIRES PROVIDER INVENTORY in wider ecosystem — never "absent everywhere").
- computer/contracts/README.md (Amendment C): verification semantics — federation transfer != interaction; CONSUMPTION RECEIPT = actually reached/consumed downstream; route VERIFIED only with consumption receipt + observable state change.
- computer/ComputerRuntime.mjs: mounts services/automata-engine.mjs gateway in boot(); adds executeOnSwarm(capability, input, ctx).

ADDED:
- computer/services/automata-engine.mjs — GATEWAY/ROUTER into donor pure-synthia v0.4.0 swarm (lazy bootstrapCurrentSynthiaSwarm + MemoryCheckpointStore; execute/findCapability/snapshot; failures surface as events).
- computer/tests/milestone-one-real-event.test.mjs — the milestone.
- capability-registry.json: new capability automata_activation with providers back-up-:pure-synthia-v0.4.0-swarm and computer:services/automata-engine.

MOUNTED: donor pure-synthia v0.4.0 baseline swarm (47 processes observed at runtime) behind the Computer execute/route contracts via the gateway.

CONNECTED: user event -> resolveAddress (donor HD+DMS) -> resolveState (donor 5-level mesh) -> gateway -> REAL donor process deg-grammar-learner (grammar.learn: 15 rules from 3 real utterances; grammar.generate: 4-node graph, 3 production applications) -> consumption receipt (StateStore milestone.consumption + downstream resolveState reference) -> grammar-v1 event persisted (trajectory traj-milestone-one-real-event) -> fresh-runtime replay.

DISCONNECTED / NOT MOUNTED: living_loop (still needs engine surface decision), donor meshes beyond swarm bootstrap, the four state-space dirs under concurrent excavation (engine/v2, emergent-state-space, five-substrate, trainable-assembly/core/state-space) — flagged as reconciliation dependency, untouched.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 13, pass 13, fail 0. Evidence: ../../evidence/milestone-one-real-event.txt.
  Milestone diagnostics: ADDRESS gate 64 line 5 Capricorn 11°19'15" arc 1012756; SWARM processCount=47; LEARN worker=deg-grammar-learner rules=15; GENERATE nodes=4 applications=3; EVENT persisted; REPLAY recovered event with consumption receipt intact.

PROVIDER STATUSES: VERIFIED (new) — back-up-:pure-synthia-v0.4.0-swarm, computer:services/automata-engine (evidence: milestone test; consumption receipt + observable state change + restart replay per Amendment C). All Stage-4a VERIFIED statuses unchanged.

FAILED: none in this stage. (Pre-existing syntax-error fixes from Stage 4a remain the only repairs.)

BLOCKED: none. Dependency noted: state-space excavation dirs under concurrent agent read — do not touch until reconciliation.
