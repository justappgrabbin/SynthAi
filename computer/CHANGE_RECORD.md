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

# Change record — Excavation registration (state-space dirs, integration/ecosystem-convergence)

WHAT EXISTED BEFORE: one-real-event milestone VERIFIED (13/13 tests); four state-space vendor dirs under excavation (engine/v2, emergent-state-space, five-substrate, trainable-assembly/core/state-space) untouched pending the excavation agent.

PRESERVED: all mounted providers, tests (13/13 still pass), donor sources untouched. Registration-only change — NO new wiring/mounting performed.

ADDED (registry only, status PRESENT with excavation probe evidence unless noted):
- back-up-:kimi-layer5-ssm (resolve_state) — SSM/attractor machinery (step/processMeshEvent/predict/recall/getMood, 64-hex Hamming-coupled state); nearest-attractor candidate; complements mesh-state-space. Probe: step([1,0,1,0,1,0])->out[0]=0.4714, recall self-sim=1.0.
- back-up-:kimi-coordinate-engine (resolve_address) — 13-layer BigInt mixed-radix addressing + resonance; SPECIALIZED/PARALLEL scheme; execution-spine canonical-address.mjs REMAINS authority. Probe: toAddress=12023169149007581n, roundtrip true.
- back-up-:kimi-phase-space-engine (resolve_state) — five-stage deterministic compose with trace + Who/What/Where/When/Why projections. Probe: compose complete=true, double-run deterministic.
- back-up-:pure-synthia-emergent-state-space (new capability state_space_runtime) — v0.6.7 VERSIONED ANCESTOR of mounted kimi mesh-state-space; EmergentMesh 320 nodes/960 edges; runtime/task/recall layer unmounted. Caveat: runtime.mjs needs absent ../canonicalState.mjs — use core/mesh directly, not runtime.mjs.
- back-up-:pure-synthia-grammar-kernel (new capability linguistic_kernel) — five-projection linguistic kernel (resolve/step/replay). Probe: step accepted, eventId ling-fa1db543.
- back-up-:trainable-assembly-state-space (new capability state_space_enumeration) — 20/22 files byte-identical to kimi tree + index.mjs estimator (1920n probe) + govinda-structure.js.

RECORDED NOT FOUND (explicit): penta_group_state (no Penta composite group-state code anywhere); composite_chart (no relationship composite charts; only channel-level composite relations); hopfield_network (only an ARCHITECTURES label for channel 18-58; closest real machinery = layer5_ssm.js + ATORecall).

BLOCKED / UNRESOLVED: authorities/originals/01..06.zip ABSENT — authorities/ contains only SHA256SUMS.txt (6 hashes); recovery blocker, listed in registry notes unresolved-items.

DOCUMENTED (not implemented): excavation-proposed ALTERNATIVE milestone route (address -> mesh-state-space -> SSM.processMeshEvent -> phase-space compose -> causal trace; seed-deterministic bit-for-bit replay) recorded in registry notes alternative-milestone-route. Current swarm-gateway milestone route remains the VERIFIED one.

MOUNTED: nothing new (registration only).
CONNECTED: system-graph-seed.jsonl appended with 6 provider nodes + PROVIDES/DERIVED_FROM/IMPLEMENTS edges + 3 NOT_FOUND gap nodes + 1 archive blocker node (append-only).
TESTED: node --test computer/tests/*.test.mjs -> tests 13, pass 13, fail 0 (registration is data-only; no behavior change).
FAILED: none.

# Change record — Stage 4d wave-1: recovered YNIV + Foundry-Glyphs donors (integration/ecosystem-convergence)

WHAT EXISTED BEFORE: stage-4a/4b mount (13/13 tests); excavation registration complete; archive recovery wave-1 delivered two P0 donors (report: ../../archive-recovery-wave1.md) — the full 13-dim canonical addressing engine (you-n-i-verse-corrected) and the only real ephemeris resolver (Foundry-Glyphs).

PRESERVED: all kimi/Back-up- providers intact (multi-provider, no collapse); execution-spine REMAINS the canonical-address authority; donor originals vendored byte-verbatim (SHA-256 of archives re-verified against the recovery report); 13/13 prior tests still pass (14/14 now).

CHANGED:
- computer/services/address-service.mjs: multi-provider routing in resolveAddress (input-shape router: birthDate->kimi HD, ephemeris->Foundry mandala, micro/macro/emergent->YNIV, arc->kimi DMS) with RECORDED routing_decision (bus event routing:decision, all candidates listed); new providers _resolveViaYNIV (real donor encode/decode, 0-based->1-based conversion documented), _resolveFromEphemeris (real mandala wheel), resolveEdge (EmergentEdgeResolver, 36 channels); resolveRelationship now invokes the edge resolver when both gates known. FIXED latent bug: normalizeAddress/_resolveViaYNIV mutated the frozen emptyAddress() (TypeError on first use) — now spread-copied.
- computer/services/state-resolver.mjs: accepts ephemeris/micro/macro/emergent entity inputs; active_structures.ephemeris records foundry activation+engine when the foundry provider resolved the address.
- computer/ComputerRuntime.mjs: addressService receives capabilityRegistryService for routing-decision candidate lists.
- computer/registry/capability-registry.json: +3 recovered providers (see ADDED), statuses promoted per evidence.

ADDED:
- computer/donors/recovered/you-n-i-verse-corrected/ — vendored donor (5 files) + PROVENANCE.md (source justappgrabbin/Synthia@main, archive sha256 f913997b..., exact shipped-bug-fix diffs: encodeMicro paren; state-space-engine-v2 createNode ReferenceError/dup-key/base-clamp; duplicate re-export). KNOWN UNFIXED donor defect recorded: runPipeline() reassigns const state.
- computer/donors/recovered/you-n-i-verse-corrected/*.ported.mjs — esbuild type-erasure execution copies (repo is Node 20, no TS runtime; NO logic changes; headers document generation + import redirects).
- computer/donors/recovered/foundry-glyphs/ — vendored donor (full tree) + PROVENANCE.md (archive sha256 9d8a894b..., verbatim); server/resonance-engine.ported.mjs (type-erasure) + server/shared-schema-constants.ported.mjs (verbatim constant extraction — shared/schema.ts needs drizzle-orm/zod at value level, not installed; NO new npm deps).
- computer/tests/recovered-donors.test.mjs — (a) YNIV round-trip via contract, (b) AWAKENING edge via resolveRelationship, (c) ephemeris->GLCTB consumed by resolveState, (d) routing_decision with all candidates, (e) grammar-v1 event persisted + restart replay.

MOUNTED: recovered:yniv-addressing-engine (resolve_address, specialized_resolution_engine), recovered:yniv-emergent-edge-resolver (resolve_relationship), recovered:foundry-glyphs-ephemeris (calculate_human_design, real ephemeris provider — kimi approximate-ephemeris retained; different engines, no winner-pick; wheels disagree and both are preserved).

CONNECTED: event -> resolveAddress (YNIV/Foundry routed) -> resolveState (ephemeris activation -> five-level state-space at gate 38) -> grammar-v1 event persisted -> restart replay.

DISCONNECTED / NOT MOUNTED: YNIV state-space-engine-v2 runtime pipeline (ported, probed via createNode only; runPipeline donor defect unfixable in scope), Foundry Overseer/Evolution/Builder/routes (need DB), SynthUniverse/glyph_game_system/cynthia-render-engine (P1 wave-1 candidates), Wave-2 hunts (WorldEngine, Embryo, Key-Gnome, Hopfield, true Penta, Vision Board, Indiverse) still UNRECOVERED.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 14, pass 14, fail 0. Evidence: ../../evidence/stage4d-recovered-donors.txt.
  (a) YNIV micro index=45088 (= recovery probe) -> G42.L5.C3.T6.B4; macro index=2515; sizes 69120/9360.
  (b) resolveRelationship(g10,g20) edge=AWAKENING score=0.7 trace "Awakening: Gates 10 and 20 awaken to 0.800" (matches probe).
  (c) ephemeris Capricorn 11°19'15" -> G38.L2.C6.T4.B5 via foundry mandala; resolveState consumed it (source_provider names both kimi state-space AND foundry ephemeris); human_design null (no fabrication).
  (d) routing_decision candidates=[execution-spine, kimi-dms, kimi-coordinate-engine, yniv] -> selected recovered:yniv-addressing-engine, rationale recorded.
  (e) event persisted + replayed on fresh runtime.

PROVIDER STATUSES: WIRED — recovered:yniv-addressing-engine, recovered:yniv-emergent-edge-resolver (real I/O through contracts). VERIFIED — recovered:foundry-glyphs-ephemeris (consumption receipt into resolveState + observable post_state + restart replay). All previous statuses unchanged.

FAILED (then fixed): frozen emptyAddress() mutation bug in address-service (latent since 4a); recovery probe index 45088 requires donor-native (1-based-passed) input — documented convention.

BLOCKED: none new. authority-ZIP recovery blocker from excavation registration still open.

# Change record — Acceptance tests 1+2 (integration/ecosystem-convergence)

WHAT EXISTED BEFORE: multi-provider resolve_address registry (4 providers) with shape-only routing; execution-spine authority PRESENT (never executed); no application mount contract on the runtime; no Node file-backed StateStore persistence.

PRESERVED: all providers and tests (14/14 prior pass); routing remains multi-provider, no collapse, no duplicate implementations (asserted in test).

CHANGED:
- computer/services/address-service.mjs: resolveAddress(input, {strategy}) — 'auto' (shape routing, default), 'micro-resolution' (YNIV), 'canonical-validation' (NEW: validateCanonical() — resolves YNIV parts, translates to spine form, executes the REAL execution-spine validateCanonicalAddress + canonicalAddressKey; validation failures returned as real results, contract arc<->spine arcAxis still NOT translated — documented).
- computer/ComputerRuntime.mjs: resolveAddress passes options; NEW mountApplication(appId,{artifactId}) — intake -> mutation -> shell-manager pipeline, returns restricted mount contract {emitEvent, resolveAddress, resolveState, getState, setState (namespaced apps.*), readArtifact}.

ADDED:
- computer/runtime/json-file-persistence.mjs — file-backed implementation of the existing kernel persistence interface (load/save); enables Node restart recovery.
- computer/tests/acceptance-1-routing.test.mjs — full §31 chain incl. hint-switch to a DIFFERENT provider (spine authority) with recorded routing_decision and stable provider set.
- computer/tests/acceptance-2-application-mounting.test.mjs — mounts real public/computer.html; app uses shared emitter/addressing/state; restart recovery via JsonFilePersistence + events.jsonl.

MOUNTED: application_mounting capability (computer:runtime/mountApplication). execution-spine canonical-address now actually executes (validation).

CONNECTED: request -> queryCapability (all providers + provenance) -> recorded routing_decision -> real provider execution -> state-resolver consumption receipt -> StateStore change -> grammar-v1 persistence -> restart replay; app -> mount contract -> shared services -> persisted app state.

DISCONNECTED / NOT MOUNTED: spine arcAxis<->contract-arc translation (open reconciliation, documented); browser shells (public/*.mjs) still not wired to a live runtime.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 16, pass 16, fail 0. Evidence: ../../evidence/acceptance-1-2.txt.
  Acc1: auto route -> recovered:yniv-addressing-engine (micro 45088 -> gate 42); hint=canonical-validation -> back-up-:execution-spine-canonical-address valid=true canonical_key planetary=4|dimension=Being|gate=42|...|arcUnit=11|zodiac=6|house=8.
  Acc2: mounted diagnostic-shell from real public/computer.html; app event evt-... persisted; address gate 64 resolved on app's behalf; restart recovered app state + mount record + event.

PROVIDER STATUSES: back-up-:execution-spine-canonical-address PRESENT -> WIRED (real validation executed through contract). computer:runtime/mountApplication -> VERIFIED (consumption receipt + observable state change + restart replay).

FAILED: none.
BLOCKED: none (GitHub MCP push retried separately).

# Change record — Stage 4e: glowing-winner world + Synthai2 penta ephemeris (integration/ecosystem-convergence)

WHAT EXISTED BEFORE: acceptance 1+2 green (16/16); no world simulation mounted; penta_group_state NOT_FOUND.

PRESERVED: all providers/tests (16/16 prior pass, 17/17 now); donors vendored verbatim; no donor logic rewritten.

CHANGED:
- computer/ComputerRuntime.mjs: boot() mounts world-engine gateway + penta-ephemeris service; new contract methods worldEvent/observeWorld/groupPenta.

ADDED:
- computer/donors/recovered/glowing-winner/ — EmbodiedWorldEngine.ts, HumanDesignSimulation.ts, InfluenceManager.ts, SharedSession.ts, SynthiaClient.ts, README.md (verbatim from justappgrabbin/glowing-winner@a9afc57) + PROVENANCE.md; EmbodiedWorldEngine.ported.mjs (esbuild type-erasure+bundle; 'uuid' npm -> documented crypto.randomUUID shim); HumanDesignSimulation/InfluenceManager/SharedSession NOT ported (onnxruntime-node/react/network env unmet — PRESENT).
- computer/donors/recovered/synthai2-ephemeris/ephemeris.py (verbatim 822L from justappgrabbin/Synthai2@cfbe3ee) + PROVENANCE.md; ENV: pyephem 4.2.1 pip-installed locally (documented).
- computer/services/world-engine.mjs — gateway: spawn/intent/move/tick/consolidate -> real donor methods; honest records; failures surfaced.
- computer/services/penta-ephemeris.mjs + penta-runner.py — child_process boundary to the python donor (lazy; provider-failure events if pyephem missing).
- computer/tests/acceptance-3-world-event.test.mjs — handoff §33 world event chain + backward trace + penta bonus.

MOUNTED: recovered:glowing-winner-world-engine (world_simulation), recovered:synthai2-penta-ephemeris (penta_group_state).

CONNECTED: grammar-v1 event -> resolveAddress (gate 64) -> worldEvent -> donor createAgent/processIntent(store)/moveAgent/real ticks (moved 53.3->51.1)/consolidateMemory (longTerm=1) -> observeWorld -> StateStore receipt -> consequence event (parents=[origin]) persisted -> restart replay -> backward trace to origin.

DISCONNECTED / NOT MOUNTED: glowing-winner HumanDesignSimulation/InfluenceManager/SharedSession (env unmet); ephemeris.py calc_wa/calc_nine_fields (need unvendored Synthai2 modules); Placement13 placeholder ephemeris -> future wiring to foundry-glyphs recorded as routing note.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 17, pass 17, fail 0. Evidence: ../../evidence/stage4e-world-penta.txt.
  Acc3: origin evt-... addressed gate 64; agent moved 53.3->51.1 over real ticks; memory consolidated longTerm=1; 5W events=4; backward trace consequence->origin on fresh runtime; penta roles A=Provider(G44) B=Foundation(G42) C=Director(G46) D=Director(G54) E=Foundation(G33), needed=Connector,Transmitter (position formula PLACEHOLDER flagged).

PROVIDER STATUSES: recovered:glowing-winner-world-engine -> VERIFIED (consumption receipt + observable state change + restart replay); recovered:synthai2-penta-ephemeris -> WIRED (real executed I/O; placeholder formula in known_limitations).

FAILED (then fixed): store intent needs quoted target per donor IntentClassifier — test uses 'store "arrival memory"' (donor semantics preserved).

BLOCKED: none new. Prior authority-ZIP blocker still open.

# Change record — Acceptance batch 3 (tests 4,5,6,8,9) (integration/ecosystem-convergence)

WHAT EXISTED BEFORE: acceptance 1-3 green (17/17); morph-expression capability present but unexercised; no consolidated restart-recovery proof; recovered providers proven piecemeal.

PRESERVED: all prior tests (17/17 prior pass, 22/22 now); no architecture changes.

CHANGED:
- computer/registry/capability-registry.mjs: queryCapability now also returns provider lineage (required by acceptance-9 lineage proof).

ADDED:
- computer/tests/acceptance-4-skynthia-effect.test.mjs — real world-engine movement (2.74 units over real ticks) -> MorphEngine.express -> observable morph.targets state + bus event -> persisted + replayed. Renderer honestly labeled NOT FOUND (new registry capability skynthia_rendering with path forward).
- computer/tests/acceptance-5-persistence.test.mjs — consolidated restart recovery: identity records, services registry (7 services), StateStore state, events.jsonl memory, lineage (parents), capability registry + verification history, mounted application + app state, trajectory; operation continued after restart (gate 7 resolution; append-only trajectory extended).
- computer/tests/acceptance-6-resonance-loop.test.mjs — project created -> need identified (calculate_human_design) -> tool discovered (services registry) -> AWAKENING channel recorded via real edge resolver -> REAL work (foundry ephemeris gate 38) -> artifact written/read back -> participant state updated -> trajectory explanation assembled.
- computer/tests/acceptance-8-state-space-e2e.test.mjs — entity -> identity/address/state (kimi HD + mesh-state-space named) -> context attached -> edge resolved (yniv) -> routing decision recorded -> foundry execution (gate 38) -> state recorded -> 2 chained events -> explanation from events on fresh runtime.
- computer/tests/acceptance-9-historical-recovery.test.mjs — formal Amendment-A §14 proof: 4 PROVENANCE.md records with archive SHA-256/commit SHAs, vendored originals on disk, 5 recovered providers registered with lineage + evidence, one real execution each (YNIV 45088, AWAKENING, gate 38, world spawn, penta G44).

MOUNTED: morph_expression capability (computer:runtime/morph-engine). CONNECTED: world movement -> morph-expression -> StateStore + events.

TESTED: node --test computer/tests/*.test.mjs
EXACT TEST RESULT: tests 22, pass 22, fail 0. Evidence: ../../evidence/acceptance-4-5-6-8-9.txt.

PROVIDER STATUSES: computer:runtime/morph-engine -> WIRED (real execution + observable state). skynthia_rendering -> NOT_FOUND (path forward recorded). All other statuses unchanged.

FAILED (then fixed): queryCapability omitted lineage (acc-9 failure); pyephem wiped by environment reset between sessions — reinstalled 4.2.1, volatility noted (penta provider correctly emits provider-failure + stays WIRED-only-with-real-run semantics when env absent).

BLOCKED: none new. pyephem env volatility is an operational note; authority-ZIP blocker still open.
