# Handoff Integration — Synthia OS Canonical Integration Handoff × Pure Synthia Automata

Reconciliation of the handoff package (`Synthia_OS_Canonical_Integration_Handoff/`,
authoritative process guidance) with our own `docs/MAPPING_AUDIT.md` +
`docs/SOURCE_MATRIX.md`. The contract layer is now executable code:

| handoff artifact | code/doc home in this repo |
|---|---|
| `05_STATE_SPACE_REPAIR_CONTRACT.md` (9 claim types, resolution order, promotion gate) | `src/state-space/claim-status.js` |
| `06_DIMENSION_CANON.json` (dimension canon, anchors, H-F4, controls, promotion rule) | `src/state-space/dimension-canon.js` (verbatim port, claim-wrapped) |
| contract §17-equivalent source-canon registry | `src/engine/canon-registry.js` (`CanonRegistry`, seeded `CANON_REGISTRY`) |
| `04_conflicts_quarantine/*` | ingestion warnings below (§3); runtime conflict preservation in `CanonRegistry` |
| `08_TEST_AND_ACCEPTANCE_GATES.md` | gates checklist below (§4) + `test/canon.test.mjs` |

Nothing in `src/state-space/constants.js`, `dimensions.js`, or any existing module
was overwritten — canon/codebase disagreements are recorded as CONFLICT claims
(`CANON_CONFLICTS`, `CANON_REGISTRY`), never resolved silently.

---

## 1. Contract clause → audit row mapping (05_STATE_SPACE_REPAIR_CONTRACT.md §1–§10)

**10 of 10 contract clauses map to verified MAPPING_AUDIT rows:**

| contract clause | requirement | MAPPING_AUDIT row(s) | status here |
|---|---|---|---|
| §1 Alphabet modulo mapping | `gate = index % 64`, `dimension = DIMENSIONS[index % 5]` etc. must be CONTROL_ONLY, never canonical ontology | §2.3 `letters.js:43-53` + §3a (TRUE: exact modulo formulas; labeled H3 comment-only, runtime value bare) | CONTROL_ONLY tag adopted in `CLAIM_STATUS`; conflict recorded (`CANON-CONFLICT-letter-addressing`); code unchanged (stricter handoff tag noted as ingestion warning) |
| §2 Primitive→dimension matching | no array-position assignment; resolution order 1–6 ending in null | §4 provenance-gap table; `dimensionOf` (`primitive-dimensions.js:279-326`) named "the provenance-carrying access pattern the rest of the codebase lacks" | `RESOLUTION_ORDER` + `resolveDimension(candidates)` in claim-status.js; returns null when nothing clears the bar |
| §3 Phoneme→dimension | stop→Movement, fricative→Evolution, vowel→Being, nasal→Space, liquid/glide/affricate→Design remain PROJECT_HYPOTHESIS | §2.12 `MANNER_DIMENSION` (H-F4, labeled ✓) + §3j (hypothesis labels TRUE) | canon H-F4 hypothesis claim-wrapped; matches our map exactly (agreement, not upgrade) |
| §4 6 line bits → 5 dimensions | no modulo wraparound as canonical physics; keep line state orthogonal | §2.14 `gate-field.js:133-137` + §3b (TRUE: `j%5` chunking, Movement asymmetric double-weight) | recorded; no canonical projection adopted; CONFLICTS.md zone "6 line states → 5 dimensions projections" carried |
| §5 Space | preserve both models A (first-class fifth) and B (emergent condition); neither silently canonized | SOURCE_MATRIX.md E3 / C-M1 (CONFLICT by design) + MAPPING_AUDIT questions OQ-3 | `SPACE_ROLE_MODELS` A/B verbatim; Space claim status CONFLICT; `CanonRegistry` keeps both role models |
| §6 Sound / color | renderers distinct from intrinsic state; tag RENDERER_CONVENTION | §2.4/§2.5 + §3g/§3h (TRUE: all renderer mappings, internal-spec backed only) + §5.3 #9 | `RENDERER_CONVENTION` in CLAIM_STATUS; tier 3 in resolution order |
| §7 Unknowns | unknown is a valid state; no false binary from missing evidence | §3e (PARTIAL: voice ternary latent null defect, currently unreachable) + UNIFIED_SYNTAX_FIELD `dimension: null` as "the good pattern" §3i | `resolveDimension` returns `null`; canon `Z -> Progress` anchor held at PROJECT_HYPOTHESIS pending source-location capture |
| §8 Direct vs indirect relation | derived A~>C keeps path=[A,B,C], depth=2, provenance; not an observed edge | §2.16 derivation.js (stableStringify/fnv1a32, hash excludes timestamp) — relation provenance carried in derivations | claim `evidence` field carries path/depth; registry conflicts keep full positions |
| §9 State persistence across scale | completed state recoverable while operand at next scale | §2.9 `operators.js` promoteScale/o_sequence (DERIVED over SCALES ladder); exportState/hydrate round-trip tests | unchanged (already conformant) |
| §10 Promotion gate | EMPIRICALLY_SUPPORTED only after beating pre-registered controls (random/shuffled/modulo/ablated) on held-out metrics | §2.16 H10 pre-registered decision rule = the one EXPERIMENTAL_RESULT row; §5.1 histogram | `PROMOTION_GATE` + `passesPromotionGate` derive required controls from `controlMappings` (`src/experiments/scale/controls.js`) — gate cannot drift from the battery |

## 2. What the handoff has that we lacked

1. **CONTROL_ONLY as a first-class tag** — audit §3a filed modulo mappings under
   PROJECT_HYPOTHESIS (H3); the handoff's CONTROL_ONLY is stricter (control
   conditions exist to be beaten, not believed). Adopted in `CLAIM_STATUS` and
   excluded from `resolveDimension` outcomes.
2. **Formal promotion gate** — we had one pre-registered experiment (H10) but no
   general predicate; `PROMOTION_GATE`/`passesPromotionGate` now encode
   contract §10 + `06_DIMENSION_CANON.json promotion_rule` against the actual
   control battery.
3. **Dimension canon as data** — the five GGM chains, sense bindings, anchors,
   and the Space role conflict are now a frozen, claim-wrapped module
   (`dimension-canon.js`) rather than prose citations.
4. **Test/acceptance gates as a merge precondition checklist** (`08`), incl.
   "no modulo alphabet mapping is canonical", "Space conflict remains explicit",
   "unknown values may remain null" — see §4.
5. **Conflicts quarantine lists** (`04`) as machine-generated ingestion warnings
   for future donor ports — see §3.

## 3. Conflicts quarantine — ingestion warnings for future ports

From `04_conflicts_quarantine/` (recorded, not imported):

- **basename_collisions.json**: 150 colliding basenames / 329 archived paths
  across donors (e.g. `app.mjs`, `MCPBus.mjs`, `OrganRegistry.mjs`,
  `LivingLoop.mjs`, `autoling.js` ×5 copies). Rule (CONFLICTS.md): no donor
  file overwrites the chassis for sharing a filename; donor code stays under
  its donor namespace, adapters get provenance.
- **semantic_overlap_index.json**: 17 overlap zones; heaviest: `ato` (170
  paths), `automata` (116), `state` (58), `organism` (47), `browser` (41),
  `mesh` (35), `address` (26), `dimension` (14), `memory` (13). Our
  `src/state-space/*`, `src/merged/dimension-router.js`, `src/merged/mesh-memory.js`
  are listed inside the `state`/`dimension`/`memory` zones — future donor
  engines claiming the same responsibilities must come through namespaced
  adapters with adapter-level provenance (07_MERGE_PLAN phases 3–8).
- **CONFLICTS.md rules 1–6** are implemented behaviorally in
  `CanonRegistry.register` (re-registration never overwrites; challenger
  preserved as a first-class conflict; status CONFLICT).

## 4. Acceptance gates (08_TEST_AND_ACCEPTANCE_GATES.md) — state-space subset now executable

| gate (08) | status |
|---|---|
| No modulo alphabet mapping is canonical | enforced: CONTROL_ONLY excluded from `resolveDimension` (canon.test.mjs) |
| All mappings carry status/provenance | `claim()` requires a CLAIM_STATUS; SOURCE_STATEMENT requires a citation |
| Unknown values may remain null | `resolveDimension([]) === null`; canon anchor held at hypothesis |
| Space conflict remains explicit until resolved | `SPACE_ROLE_MODELS` A/B + CONFLICT status; registry preserves both |
| Candidate mappings compared against random/shuffled/control conditions | `PROMOTION_GATE.requiredControls` derived from `controlMappings` |
| Failures and rejected mappings are retained | `CanonRegistry` conflicts + `CANON_CONFLICTS` preserved first-class |

The remaining gate sections (chassis integrity / architecture / automata /
learning / privacy / cultivation) apply to the COHERENT chassis merge
(07_MERGE_PLAN), not to this repo; they are recorded here as pending for the
future port of `02_safe_namespaced_additions/`.

## 5. Canon reconciliation summary (dimension-canon.js)

- **Agreements (4):** dimension vocabulary = `DIMENSIONS`; sense↔dimension map =
  `SENSE_DIMENSIONS` = intake.js; H-F4 mapping = `MANNER_DIMENSION.map`; Space
  role conflict = SOURCE_MATRIX C-M1 = OQ-3.
- **Conflicts recorded (3), constants untouched:**
  - `CANON-CONFLICT-chains` — canon crystal chains (Energy=Creation=Seeing=…)
    vs our `DIMENSION_CHAINS` behavioral micro-programs (wait/prepare/move/…;
    contract-internal, corpus attestation not found, audit §2.8).
  - `CANON-CONFLICT-seedGates` — canon silent; our `DIMENSION_META.seedGate`
    2/6/14/20 remain unattested (only gate 1→Movement attested, GGM L3016-3017;
    audit §5.2 #7).
  - `CANON-CONFLICT-letter-addressing` — handoff tags letters.js modulo
    addressing CONTROL_ONLY where we labeled it H3 PROJECT_HYPOTHESIS.

*Integration is additive only: three new source modules, one new doc, one new
standalone test (`node test/canon.test.mjs`). `tests/run.mjs` untouched.*

---

## 6. Quarantine resolution appendix (04_conflicts_quarantine — every item decided)

The quarantine package contains three artifacts; all three are resolved here
(rules + two machine-generated indexes). Nothing remains in a quarantine corner.

### 6a. CONFLICTS.md (rules 1-6) — ADOPTED as executable behavior

The six mandatory-handling rules are implemented, not restated:
`CanonRegistry.register` (src/engine/canon-registry.js) preserves
re-registrations as first-class conflicts (rule 4), `claim()` enforces status +
citation (rules 3/6), the seeded CANON_REGISTRY keeps both Space role models
(rule 4/6), and the acceptance gates of section 4 above stand as the promotion
gate (rule 5). Donor code enters only under donor-attributed port modules with
provenance headers (rules 1-3) — see human-design.js, correspondences.js,
override-registry.js, self-correcting.js, synthai-converter.js (this sweep).

### 6b. basename_collisions.json (150 colliding basenames / 329 archived paths)

**Decision rule applied to every item:** a collision is only dangerous if a
donor file could overwrite our chassis. Verification: basename index of the
current tree vs all 150 keys — only 3 basenames exist in our tree at all, and
for each the in-tree file is primary (below). The remaining 147 never entered
the tree; their archived copies are all inside the three Adaya-lineage
archives (COHERENT / Full-Integration / Adaya-r16), which the survey diff-
verified as nested supersets of each other (unique-pieces-survey-2 section
4/5), so each collision is a donor-internal duplicate, not a conflict with us.

- **R1 — in-tree primary stands (3):**
  - `demo.mjs` — our own root demo.mjs stands; donor demo.mjs files are
    ato-core/tool-factory demos, never copied over.
  - `index.js` — our src/merged/index.js stands; donor index.js is
    morph-mir-system module glue.
  - `phase_space_engine.js` — deliberately integrated as
    src/engine/v2/phase_space_engine.js (complete_v2_engine port);
    the Full-Integration vendor copy is superseded.
- **R2 — on the survey ranked PORT list; integrate namespaced with provenance,
  never by overwriting (11):** `boolean-ato.mjs`, `state-space-kernel.mjs`,
  `address-space.mjs`, `gate-data.mjs`, `fivedimensionalrulecouncil.mjs`,
  `deepstructurelearner.js`, `sacralanalogyengine.js`,
  `surfacetransformengine.js`, `needfield.mjs`, `successmetabolism.mjs`
  (survey section 1 ranked list, assigned across workstreams),
  `layer4_diseminer.js` (already integrated as automata tools 02/15).
- **R3 — donor-internal duplicates, SKIP-REDUNDANT (136):** copies exist only
  across the nested Adaya-lineage archives; canonical copy = the COHERENT
  build per the survey. Full itemized table:

| basename | copies | resolution |
|---|---|---|
| `5d-autoling-engine.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `activation.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `active-wiring.json` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `address-adapter.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `adviceorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `agent-council-protocols-v1.2.pdf` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `anomata.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `anticipatorymeshmemory.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `app.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `apprenticeshipbridge.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `arcruntime.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `artifactassembler.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `artifactvalidator.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `aspirationcore.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `association.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `astroqualities.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `ato-native-bridge.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `autoling.js` | 5 | SKIP-REDUNDANT (donor-internal duplicate) |
| `autoling_morph_engine.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `autolingorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `automatic-novel-writer.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `automaton.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `autonomy.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `autonovelexpressionplanner.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `bootstrap.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browser-form.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browserfieldexpressioncomposer.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browseroutcomeverifier.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browserperceptionnavigator.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browserplanningorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `browsertaskplanner.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `builderorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `canonical-recovery.json` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `capabilityregistry.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `causalgraph.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `changinglineengine.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `channelregistry.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `channelresolver.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `chnops.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `codonmatrix.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `collapseresolver.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `companion.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `complementarygapmodel.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `computational-grammar-coder.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `contactactionrouter.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `cultivationorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `dependencygraph.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `dimension-terms.json` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `dimensionrouter.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `diseminer.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `disseminer.js` | 4 | SKIP-REDUNDANT (donor-internal duplicate) |
| `disseminerorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `economyorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `emergence.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `eventmesh.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `expression.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `expressionplanner.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `families.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `formorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `foundations.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `gate-address.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `generative-emergence.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `grammarorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `graphruntime.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `hexagramnode.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `hexagrams.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `host.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `humanoutcomeledger.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `iching.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `index.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `index.ts` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `integrated-tool-factory.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `interactivelearner.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `interpretations.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `king-wen.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `klein-iching.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `klein-tools.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `kleinlinguisticlayer.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `knowledgegraph.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `languagecontactmodel.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `livingloop.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `localmemory.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `mcpbus.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `mcphub.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `media-renderers.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `mediaorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `messagebus.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `messyexpressionrouter.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `metalearningcontroller.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `monte-carlo-grammar-engine.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `morphbodyview.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `morphoanalyzer.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `morphphenotyperesolver.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `ontologicaladdress.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `organism.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `organism_invariants.md` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `organismcoordinator.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `organregistry.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `process_worker.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `processfabric.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `promotion.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `quality-transfer.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `reconciliation-2026-08-12.json` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `research-browser.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `researchorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `resolutionpipeline.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `resonanceorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `runtimelearningcoordinator.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `sacralcreationorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `sciencemode.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `semanticartifactcompiler.js` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `semanticcapabilities.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `semnet.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `sequences.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `shell-bridge.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `source-closure.json` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `statespace.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `statespacelayer.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `statespacemodel.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `stylecontrolengine.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `success.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `successledger.donor.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `supabaseresolutionposter.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `surfacecoordinator.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `synthiasubstrate.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `synthiaunit.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `temporalgraph.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `toolbase.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `toolfactory.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `toolregistry.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `toolscheduler.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `traceablevariation.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `tray.mjs` | 3 | SKIP-REDUNDANT (donor-internal duplicate) |
| `versionlineageregistry.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `workspace.mjs` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |
| `worldorgan.js` | 2 | SKIP-REDUNDANT (donor-internal duplicate) |

### 6c. semantic_overlap_index.json (17 zones) — zone owners designated

Each zone now names the in-tree primary that owns the responsibility; any
future donor engine in the zone enters as a namespaced, provenance-tagged
adapter (CONFLICTS.md rules 1-4) and is registered in CANON_REGISTRY on
conflict:

| zone | paths | in-tree primary / decision |
|---|---|---|
| state | 58 | src/state-space/* (+ human-design.js, correspondences.js this sweep) |
| automata | 116 | src/automata/* (16-tool registry) |
| memory | 13 | src/merged/mesh-memory.js |
| dimension | 14 | src/state-space/dimensions.js + dimension-canon.js |
| ato | 170 | src/merged/ato-analogy.js (+ src/engine/v2/ ato core port) |
| toolfactory | 6 | src/merged/tool-factory.js |
| organism | 47 | src/emergence/* (NeedField/SuccessMetabolism pending survey-ranked port) |
| browser | 41 | src/engine/intake.js + automata tools 11/12 |
| mesh | 35 | src/mesh/* |
| world | 11 | src/merged/scene-grammar.js + media-field.js (synthworld-core pending) |
| address | 26 | src/state-space/addressing.js (+ correspondences.js mandala/YiSphere) |
| emergence | 11 | src/emergence/* |
| automaton | 3 | src/automata/automaton.js |
| selfcorrect | 1 | RESOLVED: donor SelfCorrectingEngine.ts integrated as src/engine/override-registry.js + self-correcting.js (this sweep) |
| ingest | 1 | donor IngestionPanel.tsx is React UI — SKIP-BACKEND/UI; book-mesh ingestion pipeline remains on the survey ranked list |
| intent | 1 | src/emergence/intent-engine.js (the indexed path IS our own file) |
| self-editor | 1 | src/emergence/self-editor.js (the indexed path IS our own file) |
