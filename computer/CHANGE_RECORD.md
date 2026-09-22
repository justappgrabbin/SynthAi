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
