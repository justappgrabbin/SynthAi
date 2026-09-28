# Plan — Pure Synthia Automata: State Space + 16-Tool Mesh (Turn 1)

## Goal (this turn)
Per `pure-synthia-research-proposal.md`: build the most accurate, detailed STATE SPACE
(rules, sounds, colors, named state transitions, letters, words, syntax) usable by modern
re-interpretations of the 16 Synthia tools. Tools become aligned AUTOMATA forms sharing one
mesh; a GRAMMAR parses tool calls. Then merge the best parts of all other uploaded pieces
into one automata core. Browser-native JS (per proposal §18). Multi-turn; user continues after.

## The 16 tools (from Synthia v0.6.9 STATUS.md)
1. autoling-lite  2. diseminer-lite  3. klein-analogy  4. iching-grammar
5. language-contact  6. historical-monte-carlo  7. autonovel  8. messy
9. success  10. conversation  11. browser-form  12. research-browser
13. computational-grammar-coder  14. autoling (canonical)  15. diseminer (canonical)
16. morph-mir

## Stage 1 — Exploration (parallel explore subagents, read-only)
Extracted trees live under /tmp/ex/.
- E1: Characterize all 16 tools in `Synthia-browser-artifact-handoff-v0.6.9.zip` —
  per tool: purpose, input/output contract, internal algorithm, state held, I/O types.
  Also read ToolRegistry.ts, SynthiaToolBootstrap.ts, GraphRuntime.ts, automata core (ato-core).
- E2: Characterize Pure Synthia codebase (`pure-synthia-pass4-step41.zip` + phase2 +
  phase1-d1-d2-d3): operators (bundle/sequence/project/recurse/transform/automaton/discourse),
  automata/fsm+composition, emergence/*, parsers/dependency, graph/mesh+topology, datasets.
- E3: Characterize "all other pieces" for merge candidates: synth-ai-integrated-v2.3,
  synthia-recursive-media-field-v1.9, isohuman-complete-v5, ato-drawing-engine.html,
  integrated-tool-factory-v1_5_0, research_tool.mjs, yijing_hatcher_dataset.json,
  gnostic_book_of_changes_dataset.json. Report best parts + reuse value.

## Stage 2 — State Space Design (orchestrator)
Design the unified state space spec from proposal + E1/E2:
- Scale ladder L0–L8 (feature→…→multi-automata mesh) from proposal §5/H.2
- Alphabets: letters, phoneme features (Appendix A), word/morpheme classes, syntax categories
- Named state transitions with sound + color per transition (deterministic maps)
- Rules: operator set O (bundle, sequence, project, recurse, transform, automaton, discourse)
  + production grammar for parsing tool calls
- Canonical addressing (§6), 5 graph projections (§9), activation (§11), ledger (§13)
- 16 automaton forms: each tool → an automaton class (states, alphabet, transition fn,
  acceptance/output), all aligned on shared mesh with typed ports/packets
- Grammar: tokenize → parse tool-call expressions (incl. two-call chains) → route to automata
Write spec to `STATE_SPACE_SPEC.md`.

## Stage 3 — Implementation (coder subagents, parallel by module group, shared contract)
Deliverable root: /mnt/agents/output/pure-synthia-automata/
- C1: `src/state-space/` — data modules: phonology.js, letters.js, lexicon.js, syntax.js,
  transitions.js (named transitions + sound + color maps), dimensions.js, rules.js
- C2: `src/grammar/` — grammar.js (productions), parser.js (tool-call parser), tokens.js
- C3: `src/automata/` — automaton.js (base), mesh.js (shared mesh/ports/packets),
  tools/*.js (16 automata), registry.js
- C4: `src/merged/` — merge best parts from E3 report (ato-core, factory, media field, etc.)
- C5: `demo.mjs` + `index.html` + `tests/` — runnable proof: parse tool calls, run mesh,
  derivation ledger per proposal §13/D.

## Stage 4 — Validate
Run demo + tests with node; derivation integrity, deterministic replay smoke; report ledger.

## Output
/mnt/agents/output/pure-synthia-automata/ (full project) + zip. Merge summary in README.

## Turn 2 additions (user directives)
- Sovereign Light single-file build: DONE (synthia-sovereign/index.html, playwright-validated, file:// OK).
- Turn 3: intake/sensory adapter (address-first: analyze purpose/behavior/relations, semantic color+sound+"smell"),
  learning loop (unknown intent → analyze → grow tool via factory → mount on mesh → run), pure-JS code+video
  capability (SRMF media field core), Q_t runtime mechanism + Klein K_i(C) operator form + CR metrics from
  pasted proposal notes. All pure JS, zero external calls. Rebuild sovereign bundle, re-validate, keep tests green.

---

# Turn 6 — State-Space Refinement from the Source Corpus (books → smallest fragments → dimensions)

## User directives (verbatim decomposition)
1. **Refine the state space from the books**: go through ALL uploaded books, gather rules +
   primitives, find the SMALLEST FRAGMENTS (the "letters" and "syntax" of the I Ching layer)
   and **attribute them to the 5 dimensions**. Establish this FIRST — it is the foundation for:
   (a) a mechanism for possible **prediction**, (b) **running the scope upward** (scale ladder),
   (c) **actual experiments** on the smallest form.
2. **Fully autonomous system**.
3. **Tools work standalone AND on the mesh** (each tool: outside-mesh mode + mesh mode).
4. **Four versions per tool** aligned with "self / mind / transformation / bonding"
   (mind ≈ coding; bonding ≈ relational/social).
5. **Social-semantic**: semantics that are social, visual, and **actable** (actionable — you can act on them).
6. **Modernize the 16 tools** with qualities for making **videos, games, apps** (extend media-field).
7. **Tool factory gets qualitative functionality** (quality-driven generation, not only level-driven).
8. [Cut off]: "everything in this system should be run by the ___" — interpreted as:
   everything runs by the state-space rules/grammar. Flagged to user.

## Stage A — Corpus mining (6 parallel background explore agents; read-only)
Each miner extracts text with pdftotext/pymupdf (several PDFs exceed read_file's 20MB limit),
then writes a structured brief to `docs/corpus/<slug>.md`: smallest units, rules, syntax/grammar,
correspondence tables (elements/directions/seasons/colors/tones/numbers/family), candidate
dimension attribution, page-referenced quotes for every claim.
- A1 Govinda *Inner Structure of the I Ching* (23MB) + Adler *Yijing: A Guide* (9MB)
- A2 Moore *Trigrams of Han* (17MB) + Yijing1-2.pdf (4.4MB)
- A3 Reifler *I Ching: A New Interpretation* (12MB) + Moog *Oracle of the Cosmic Way* (4.5MB)
- A4 Wen *I Ching, The Oracle* (49MB) + D'Aoust *Occult I Ching* (34MB)
- A5 *super-i-ching* (26MB) + *the-black-book-5* (3.9MB) + *zhouyi bronze-age* (13MB)
- A6 JSON datasets: yijing_hatcher (128KB) + gnostic_book_of_changes (30KB) + research_tool.mjs
Deferred to Stage C mining: Video Generation with AI (7.6MB), Neural Networks with Model
Compression (30MB) — they feed tool modernization, not fragments.

## Stage B — Fragment algebra + dimension attribution (synthesis → code)
- B1 (general): synthesize A1–A6 briefs into `docs/FRAGMENT_ALGEBRA_SPEC.md`:
  the smallest fragments (yin/yang line, 6 line-places, 8 trigrams + attribute matrix,
  nuclear trigrams, 64 hexagrams, King Wen pairs/inversions, changing-line numbers 6/7/8/9,
  judgment/image/line-text strata), the syntax rules over them, and a justified
  dimension-attribution table (fragment class × Movement/Evolution/Being/Design/Space).
- B2 (coder): implement `src/state-space/fragments.js` (+ `fragment-syntax.js`) as the new
  L0/L1 foundation; wire dimensions; keep all 349 tests green; add tests for every fragment
  rule that has a mechanical form. Prediction mechanism skeleton: given fragments + rules,
  enumerate lawful next-states (candidate generation, labeled as mechanism not oracle).

## Stage C — Tool modernization (coders, after B)
- C1: four tool versions (self/mind/transformation/bonding) + standalone/mesh duality.
- C2: qualitative tool factory (quality descriptors → generation).
- C3: media qualities (video/game/app) for the 16 tools; mine the 2 deferred PDFs here.
- C4: social-semantic actability layer on top of triples.

## Stage D — Experiments + delivery
Run scope-upward experiments on the fragment foundation; regenerate sovereign bundle;
website_version_manager build_version.

---

# Turn 7 — FRAME RESET: neutral source matrix + mapping audit (bias-cleared epistemology)

## User directives
- Suspend ALL assumptions: Space-as-emergent; any book ranked by default; 5-dim↔phonetic
  mappings; alphabet→gate by position; sound/color formulas as intrinsic; Super I Ching as
  "the rules book"; Govinda as backbone; Kimi's computational interpretation as correct.
  (This suspends Turn 6's "author's master doc > books > hypotheses" precedence rule too —
  the author's documents are sources IN the matrix, not above it.)
- Method: extract before interpreting (done in Stage A corpus briefs); claim types:
  SOURCE_STATEMENT / STRUCTURAL_MATH / IMPLEMENTATION_CHOICE / PROJECT_HYPOTHESIS /
  DERIVED_RESULT / EXPERIMENTAL_RESULT / CONFLICT; no gap-filling (null, not guesses);
  math ≠ meaning; controls for any mapping that matters; field-level provenance.
- Rule: **Represent first. Compare second. Test third. Canonize last.**

## Deliverables (this turn: a + b ONLY — no state-space code changes until approved)
- a. docs/SOURCE_MATRIX.md — neutral source-by-source comparison matrix, no source ranked.
- b. docs/MAPPING_AUDIT.md — audit of every current state-space mapping/formula against
  the matrix + claim-type tagging, with file:line refs and the known-issue checklist
  (letters.js modulo mapping; 6→5 mod-5 asymmetry; activation weights 0.4/0.4/0.2/0.1;
  zero-state→wait bug; voice binary-not-ternary; A4=432 offset-57 anchor mismatch;
  sound/color renderer conventions; USF dimension:null pattern as the good example).

## Stages
- R1 (parallel): matrix builder (general) + mapping auditor (verifier) — both work from
  docs/corpus/*.md briefs; auditor additionally reads the code directly.
- R2 (orchestrator): reconcile matrix vs audit; produce the tagged fix-list; present
  repair contract for user approval BEFORE any code changes (frame-reset gate).
- R3 (next turn, after approval): implement provenance-aware values, source-canon
  registry, control-ify modulo mapping, SpaceModel.A/B, activation/zero-state fixes,
  sound-anchor fix; then the primitive→scale experiment (source vs modulo vs random vs
  shuffled vs ablated; letter→word→sentence→discourse→automaton).

---

# Turn 10 — Verbatim chains/colors + full unique-pieces integration ("no curtains")

## User directives
- Sentences stored EXACTLY as printed; never add words. Chains are PERSPECTIVAL: each
  dimension's chain = how that dimension sees the chain relative to the others; the
  One.–Five. list = Being's perspective on the whole. Unattested perspectives = null.
- 6th image = Book of Colors last page: colors are motivation; recursion Line→Color→Tone→Base.
- Go back through ALL uploaded files; take every unique piece and put it IN the automata —
  fix defects first, then integrate ("fix them before you put them in"). Nothing behind
  curtains / no quarantine corner: conflicts become first-class CONFLICT records, not exile.

## Stages
- T10a (orchestrator, DONE): zoom-verified verbatim transcription →
  docs/corpus/black-book-chains-colors.md (BB-p126..130, BOC-chart; C13/C14 double-attested;
  C17 blank cell confirmed in 2nd source; Space post-Big-Bang-only = SOURCE_STATEMENT for SpaceModel.B).
- T10b (coder A): integrate chains/keynotes/symbols/three-conditions/crystals/color/tone/base
  into src/state-space/ (new module, provenance-wrapped, perspectives with nulls) + tests +
  SOURCE_MATRIX rows.
- T9d-1 (coder B): port mesh072 state_space_core.mjs, FiveDimensionalRuleCouncil.mjs,
  SuperIChingSymbols.mjs, complete_v2_engine trio — fix-then-integrate, own tests.
- T9d-2 (coder C): port humanDesign.ts (TS→JS), OverrideRegistry+SelfCorrectingEngine (TS→JS),
  SynthAi correspondence data, synthai_converter_stub.py→JS; sweep ALL remaining unique pieces
  incl. handoff 04_conflicts_quarantine and phase1/phase2/pass3 pieces not yet in; spot-check
  ato-core/klein-full-toolkit/resonance-engine flags.
- T10e (orchestrator): wire every test into tests/run.mjs (incl. orphaned canon.test.mjs),
  export new modules in sovereign-entry.js, README/MERGE_NOTES, esbuild rebuild, smoke,
  copy to /mnt/agents/output/app, website_version_manager build_version.

## Standing constraints (all agents)
Pure JS ESM, zero deps, NO backend, file://-safe, deterministic (mulberry32 seeds + counter
ids; no Date.now/Math.random in ids/hashes), provenance claim tags (claim-status.js),
each agent owns NEW files only — tests/run.mjs + sovereign-entry.js are orchestrator-wired.

---

# Turn 11 — Endogenous living loop + packaging de-duplication

## External audit verdict (user-pasted): crash-first PASS, 877 checks green, zero deps,
## no backend, no network. Named gap: organism is autonomous-capable but not
## self-initiating — needs: exists → senses internal condition → develops need →
## initiates action → evaluates consequence → continues living.

## Stages
- T11a (coder): src/organism/vitals.js + living-loop.js — deterministic endogenous cycle:
  sense (vitals from engine observables) → need (threshold + hysteresis) → initiative
  (endogenous engine.call: intent proposals / open questions / self-experiments /
  underused-tool exercise) → consequence evaluation → policy learning → hash-chained
  autobiographical episode log (replayable). origin:'endogenous' flag through intake.
  Dormancy when vitals healthy. No wall-clock anywhere. test/living-loop.test.mjs.
- T11b (orchestrator): wire api.organism into sovereign-entry; heartbeat driver +
  vitals panel in sovereign.html UI script block (browser-only, calls tick()
  autonomously; node stays manual); rebuild bundle; smoke; sync ALL copies —
  one canonical HTML, no divergent rabbits; build_version.
