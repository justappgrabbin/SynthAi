
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
