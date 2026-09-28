# Merge Notes — src/merged/ (Pure Synthia Automata)

The "merged best parts" layer: strongest components harvested from prior Synthia
codebases into clean, dependency-free ES modules. Each module imports only from
`../state-space/constants.js` and/or its sibling merged modules.

## Merge table

| merged module | ← source file(s) | ← why it's the best part |
|---|---|---|
| `ato-analogy.js` | `ato-drawing-engine.html` (strong-equivalence-ato operators) + `synthia-recursive-media-field-v1.9/src/vendor/boolean-operator-bank.mjs` | The string-form `strongEquivalence`/`solveAnalogy` are byte-identical to the module verified 10/10 against Klein's published Table 4; the operator bank contributes the full XNOR/XOR bit-vector calculus. Unified into one numeric + string analogy calculus with an exported `selfTest()` reproducing "boy loves light : girl hates light :: woman hates dark : man loves dark" (`10011001`). |
| `kingwen.js` | `synthia-recursive-media-field-v1.9/src/srmf-structural-growth-v16.mjs` (`KING_WEN_DECIMAL`, itself ported from the user's FuxiEncoder.ts) | The only authoritative, verified King Wen gate# ↔ Fu Xi decimal table in the sources (gate 1=63, gate 2=0, gate 3=17 checked against the ䷂ line pattern, line 1 bottom = bit 0). Fills the contract's `KING_WEN_TO_FUXI_DECIMAL` placeholder and adds the standard Wilhelm/Baynes English name table. |
| `fuxi-encoder.js` | `isohuman-complete-v5-repaired/isohuman-merged/src/topology/FuxiEncoder.ts` | Cleanest 6-bit/64-state encoder in the corpus: `encodeIndex`/`decodePattern`/`flipLine`/`hammingDistance`/`getNeighbors`/`getOpposite`/`getInverse` are exact involutions over the hypercube. Ported dependency-free (no `../models`, no timestamps — `createNode`/`initializeAllNodes` are deterministic). |
| `dimension-router.js` | `integrated-tool-factory-v1_5_0/src/integrated-tool-factory.mjs` (`DimensionRouter`) | The factory's dimension spaces + tie-aware `route()` (`resolved`/`unresolved`/`ambiguous`) are the most disciplined text→dimension routing in the sources. Contract core vocabularies kept; each extended with ~10 apt terms from the factory's seed vocab. |
| `tool-factory.js` | `integrated-tool-factory-v1_5_0/src/integrated-tool-factory.mjs` (`TOOL_LEVELS`, `stableId`, `PurposePlanner`, `GeneratedTool` runtimes) | Fully deterministic tool generation: dual-accumulator `stableId` hash, address rule `targetGate=((gate+level*7-1)%64)+1`, eight level runtimes (echo / yin-yang / filter / Jaccard / analyzer / rule accumulator / addressed event packets / seeded ≤15-step Markov). Same request twice → same id. |
| `scene-grammar.js` | `synthia-recursive-media-field-v1.9/src/srmf-media-grammar-recorder.mjs` (`SceneGrammarRule`/`SceneGrammar`) | The media field's rule grammar has the cleanest condition model (`minEntities`/`maxEntities`/`minTension`/`maxTension`/`tickModulo`) plus exponential success tracking with weight hard-clamped to `[0.05, 8]`. Address-registry dependency removed; selection is deterministic (effective weight, insertion-order ties). |
| `gate-field.js` | `synth-ai-integrated-v2.3/src/organism/organism/GateLocus.mjs` + `GateProcessField.mjs` | The 64 enduring gate processes with per-dimension evaluation ladders and a 24-entry history ring are the richest gate-field model available. Kernel dependency replaced by `kingwen.js` bit patterns; `meet()` is Hamming-derived per contract; the NO-GLOBAL-BOSS invariant is kept and documented (the field aggregates views, never commands loci). |
| `centers-channels.js` | `Synthia_Progressive_Upgrade_v0_6/runtime/SynthiaSubstrate.ts` (channel + center tables) | The substrate's Human Design wiring (36 channels, 9 centers) — adopted with the contract's corrected pair list and the Sacral/Spleen fix below. |
| `lawful-grammar.js` | `synth-ai-integrated-v2.3/src/organism/organism/LawfulGrammarConstructor.mjs` | The only source that emits *declarative* BNF automaton specs gated by lawfulness invariants. Made deterministic (counter ids; no `Date.now()`/`Math.random()`); `automatonSpec()` validates every part against the BNF and always attaches the four invariants. |
| `mesh-memory.js` | `Synthia_Progressive_Upgrade_v0_6/runtime/AnticipatoryMeshMemory.ts` | The public/private address split is the corpus's clearest privacy boundary: only Gate/Line/Color/Tone/Base cross the mesh; degree/minute/second/arcSecond/zodiac/house (and raw content, user/session ids) are stripped by `publicAddress()` and recursive sanitization. Transport provider dropped — local, deterministic, replay-safe. |

## Conflicts resolved

1. **Interrogative mapping — Movement=Where, Being=When.**
   `GateLocus.mjs` used `Being:'Where', Movement:'When'`; the integrated tool
   factory and the contract's `DIMENSION_META` (SynthiaOS majority) use
   `Movement:'Where', Being:'When'`. Resolved in favor of the factory/SynthiaOS
   majority everywhere in `src/merged/` (dimension-router and gate-field both
   take interrogatives from `state-space/constants.js` `DIMENSION_META`).

2. **Sacral/Spleen gate-57 duplication.**
   `SynthiaSubstrate.ts` listed Sacral as `[5,14,29,34,57,59]` while Spleen also
   held 57. Per contract, gate 57 belongs to the **Spleen only**; Sacral is
   `[5,14,29,34,59]` in `centers-channels.js`. The substrate's channel list also
   carried reversed duplicates (`[20,10]`,`[60,3]`,`[61,24]`,`[63,4]`) in place
   of `[10,34]`,`[10,57]`,`[20,34]`,`[20,57]`; the contract's exact 36-pair list
   is used verbatim.

3. **King Wen placeholder filled.**
   The contract's `KING_WEN_TO_FUXI_DECIMAL = {1:63, ...}` placeholder is now the
   full 64-entry table extracted intact from `srmf-structural-growth-v16.mjs`
   (verified bijective, all 64 round-trips pass).

4. **Determinism hardening.**
   Sources used `Date.now()`, `Math.random()` and `structuredClone` timestamps in
   ids/nodes; merged modules use counter ids, seeded PRNGs (`stableId`-derived),
   and tick counters so replay is bit-identical.

## Smoke test

`node test/merged.smoke.mjs` — 34 checks covering: ato-analogy `selfTest()`
(Klein Table 4) true; kingwen round-trip for all 64; fuxi-encoder
flip/inverse/opposite involutions; tool-factory determinism (same request twice
→ same id), address rule, level selection, L1/L6/L7 runtimes; dimension-router
resolving sample sentences; scene-grammar reinforce clamping to `[0.05, 8]`;
gate-field meet/tick/meetAll/voices; centers-channels integrity; lawful-grammar
invariants; mesh-memory sanitization. **34 passed, 0 failed.**

## Emergence layer — src/emergence/ (port of pure-synthia-pass4-step41-REPAIRED/src/emergence/)

Four modules ported into a new top-level layer, adapted to our engine
interfaces and wired as `engine.intent` / `engine.editor` / `engine.detector` /
`engine.coordinator` (append-only observers; derivation hashes and replay are
unaffected). Frame-reset provenance: every ported formula/parameter carries a
header-comment tag plus a runtime `provenance` field where behavioral
(`INTENT_PROVENANCE` / `EDITOR_PROVENANCE` / `DETECTOR_PROVENANCE` /
`COORDINATION_PROVENANCE`).

| emergence module | ← source file | what was ported |
|---|---|---|
| `intent-engine.js` | `intent.js` | Intent inference table (SOURCE_STATEMENT), satisfaction check adapted to our `Derivation.output`/`evaluation.accepted`, explicit gap records (`operator_failure` / `no_composition` / `computation_failure` SOURCE_STATEMENT; `unrouted` for our grown-mode — IMPLEMENTATION_CHOICE adaptation), confidence-weighted proposals `{id, kind, spec, confidence, evidenceDerivationIds, provenance}` (confidences 0.5/0.6/0.7 and threshold 0.7 tagged IMPLEMENTATION_CHOICE). `applyProposal` delegates primitive creation to the wired SelfEditor instead of the source's non-existent `engine.registerPrimitive`. |
| `self-editor.js` | `self-editor.js` | Versioned edit log with the source's edit types and id forms (`primitive:evolved:N`, `rule:evolved:N`, `edit:N`, one shared counter — SOURCE_STATEMENT). Every edit is a full engine Derivation (operator `o_transform`, transition `becoming`, hash-chained via `context.previousEditHash` — IMPLEMENTATION_CHOICE), so self-modification is replayable. `revert()` restores the exact prior frozen JSON snapshot and appends a revert-audit edit (log stays append-only). Evolved-primitive provenance is asserted into the engine triple store. |
| `detector.js` | `detector.js` | The §15 three-criteria emergence test (novelty / generation / evaluation — SOURCE_STATEMENT), `batchTest`, `testCrossScaleEmergence` (transfer threshold 0.5 — IMPLEMENTATION_CHOICE; adapted to our `operatorById` + `transform` table), plus `testChannelEmergence` feeding OUR mesh/channel stats: a crossing is emergent when novel, both endpoints are mesh-registered, and it has PROMOTED (persistence = our channels.js promotion rule). |
| `coordination.js` | `multi-automata.js` (partial) | The one piece our mesh lacked: a synchronized broadcast run of the whole automaton population over one input, with per-automaton traces and packet propagation along mesh connections. Adapted so packets go through `mesh.route()` (deliveries record EmergentChannels crossings) and one throwing automaton fails only its own trace entry instead of aborting the run. |

### Skipped as redundant (multi-automata.js)

- `AutomataMeshRegistry` (name → mesh map): our engine owns exactly one
  `AutomataMesh`, which already is the automaton registry.
- `collapse()` (product-machine composition via `AutomataComposer`): no
  composer substrate exists in this codebase, and our channel promotion
  (`mesh/channels.js`) is already the mechanism by which repeated composition
  becomes a first-class, routable capability.

### Source defects found and NOT propagated

1. **Wall-clock nondeterminism everywhere**: `Date.now()` in intent/gap/edit/
   emergence records and in generated ids (`primitive:auto:${Date.now()}`).
   Replaced with counter-derived ids and `seq` fields.
2. **detector.js `_hashSolution`**: `JSON.stringify(solution, Object.keys(solution).sort())`
   passes a replacer ARRAY, silently dropping every nested key not present at
   the top level — solutions differing only in nested fields hash identically
   (false novelty verdicts). Replaced by `hashObject` (recursive canonical
   `stableStringify` + FNV-1a); regression-checked in test/emergence.test.mjs.
3. **self-editor.js `evolveOperatorAcceptance`**: built a wrapper that ACCEPTS
   previously-failed operand patterns ("be more lenient" toward failures —
   semantically backwards) and stored it without ever installing it on the
   operator (dead code). Our port stores the learned exception set
   declaratively and only via `acceptsWithLearned()`; repeated FAILURE patterns
   narrow (reject), never widen acceptance.
4. **self-editor.js `rollbackTo` / intent.js `applyProposal`**: assumed engine
   shapes that don't exist (`engine.primitives.delete`, `engine.derivations`
   as a Map, `engine.registerPrimitive`). Our ports use the editor's own
   frozen-snapshot state and the wired `engine.editor`/`engine.tripleStore`.
5. **multi-automata.js `run()`**: propagated packets were never consumed by
   their target automata (log-only), an unused `const step = 0`, and one
   automaton's throw aborted the entire mesh run. Our coordinator routes real
   StatePackets and contains per-automaton failures.
6. **detector.js `_groupByOperator`** grouped every record under the literal
   key `"unknown"`. Dropped (our `summary()` reports totals only).

### Emergence test

`node test/emergence.test.mjs` — 53 checks: intent gap/proposal records with
evidence ids and provenance tags; engine wiring + two-fresh-engines determinism
(identical proposal ids, gap records, detector verdicts); self-editor versioned
edits with derivation hashes, hash-chaining, exact revert (deep-equal);
detector §15 criteria + cross-scale transfer + channel-stat emergence;
coordinator broadcast/packet/crossing behavior + determinism + error
containment; the intent→editor proposal-application loop. **53 passed, 0 failed.**


---

## Turn 10 — verbatim chains/colors + full unique-pieces integration ("no curtains")

**New corpus doc:** `docs/corpus/black-book-chains-colors.md` — zoom-verified verbatim
transcription of 6 uploaded pages (BB-p126..p130 = Black Book macro/micro chart, ordinal
list, Four Dimension chart, Three Conditions, Crystals & Monopole; BOC-chart = Book of
Colors last page COLOR/TONE/BASE tables). Author directives applied: sentences stored
EXACTLY as printed (printed spellings preserved: "Smelt", "UNCERTENTY", "MEDITION",
"ACCEPTENCE"; `Matter is` blank cell = C17, never filled); chains/orderings are
PER-DIMENSION PERSPECTIVES (One.–Five. = Being's view of the whole; unattested
perspectives = null). C13/C14 keynote conflicts now double-attested and kept as CONFLICT.

**New/ported modules (all fix-then-integrate, all provenance-tagged):**
- `src/state-space/chains.js` — DIMENSION_CHAINS, ORDINAL_PERSPECTIVES, THREE_CONDITIONS
  (Ǝ⟶M / Ǝ=ME◆ / Ǝ=M<² verbatim; 2→4→5 dimensional counts; Space post-Big-Bang-only noted
  as SOURCE_STATEMENT for SpaceModel.B, Model A still represented), CRYSTALS_AND_MONOPOLE,
  COLOR_TABLE (motivation), TONE_TABLE (sound), BASE_TABLE, KEYNOTE_CONFLICTS,
  CHAINS_COLORS_REGISTRY (31 entries, BB:/BOC:-namespaced).
- `src/state-space/mesh-state-space.js` — COHERENT mesh072 5-dim × 64-node StateSpace +
  sourced Mawangdui trigram-family sequence (gate table derived from our addressing.js,
  not re-typed; unsourced rows tagged hypothesis).
- `src/engine/rule-council.js` — FiveDimensionalRuleCouncil (wall-clock → seq; fail-closed
  provider defaults).
- `src/state-space/wen-wang-gua.js` — Najia/Wen Wang Gua: 12 branches, six-relation stars,
  O/X moving lines, second-hexagram flip; tables cross-checked vs docs/corpus/super-iching.md.
- `src/engine/v2/{layer5_ssm,phase_space_engine,coordinate_engine}.js` — CJS→ESM; SSM
  predict() memory leak fixed; phase-space state-vector drop fixed; coordinate engine
  BigInt addressing (>2^53 round-trip; donor header arithmetic corrected via TOTALS).
- `src/state-space/human-design.js` — 86KB TS→JS; setHours→setUTCHours (timezone
  determinism); 6 gate-binary + 4 center + 3 wheel-anchor donor conflicts kept as
  CONFLICT claims (ours primary); donor's empty channels stub bridged to our 36-channel table.
- `src/engine/override-registry.js` + `self-correcting.js` — UNKNOWN-layer shadowing fixed,
  OVERRIDE_TYPE actually applied, wall-clock/uuid → seq; bridged to emergence SelfEditor.
- `src/state-space/correspondences.js` — KingWen.csv CodonRing (Gene Keys) 64 rows +
  YiSphere mandala angles + MandalaGeometry wheel derivation; zero-mismatch crosscheck
  vs our kingwen table.
- `src/engine/synthai-converter.js` — py→JS; stub 2-entry map → real 64-gate table;
  donor NameError fixed.
- Sweep: `src/experiments/scale/{fsm,automata-composition,parsers,graph-trace,phase-corpora}.js`,
  `src/experiments/hypothesis-registry.js`, `src/engine/{boolean-ato,resonance-network,
  klein-distributional}.js` — phase1/2/pass3 originals' broken pieces repaired (epsilon
  closure, undefined-tokenizer dispatch, Kleene all-accepting, seeded rng, seq ids) and
  integrated. Quarantine appendix: docs/HANDOFF_INTEGRATION.md §6 (150 collisions bucketed,
  17 overlap zones assigned owners, CONFLICTS.md rules executable in CanonRegistry).

**Tests:** tests/run.mjs now wires 9 suites: 349 core + 69 fragments + 70 generative +
53 emergence + 41 scale + 43 canon + 55 chains-colors + 96 ports-b + 59 ports-c =
**835 passed, 0 failed**.

**Sovereign build:** rebundled (938,896 B bundle; 960,261 B single-file HTML at
/mnt/agents/output/{sovereign.html, synthia-sovereign/index.html, app/index.html}).
Smoke: full API surface (25 groups) boots under node; call+replay REPRODUCED;
0 external http refs / 0 src=/href= attrs.


---

## Turn 11 — endogenous living loop + packaging de-duplication

- NEW `src/organism/vitals.js` + `src/organism/living-loop.js`: the organism
  initiates its own cycles (sense → need → initiative → consequence → learn →
  hash-chained episode log). Endogenous calls carry origin:'endogenous'
  through the existing derivation context field — zero edits to engine core.
  Determinism preserved (logical ticks; wall-clock only in the browser UI
  heartbeat). `test/living-loop.test.mjs`: 31 checks.
- Orchestrator fix: LOOP_EPSILON dust-guard (ulp-level threshold crossings no
  longer raise zero-intensity needs); 31/31 still green.
- Wiring: `api.organism` (tick/getState/replay/recent/vitals/loop);
  organism panel + 1 Hz heartbeat in the Sovereign Light UI; suite now
  **866 passed, 0 failed** (10 suites).
- Packaging: all four sovereign HTML copies are byte-identical again
  (997,163 chars) — the divergent repo copy is synced. Bundle rebuild:
  esbuild iife/es2020, re-inlined at the first <script> boundary; UI block
  untouched by re-inlining. Smoke: 50 heartbeat ticks → 11 self-initiated
  episodes; 0 external refs.
