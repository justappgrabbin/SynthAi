# Pure Synthia Automata

Deterministic, browser-native JavaScript (ES modules, zero dependencies, zero
network): the 16 Synthia tools re-interpreted as **automaton forms** sharing one
**state space**, one **mesh**, and one **tool-call grammar**. Node 18+ and
modern browsers.

## Architecture

```
src/state-space/   The unified state space (spec: docs/STATE_SPACE_SPEC.md)
                   constants & DMS addressing (64 gates × 6 lines × 6 colors ×
                   6 tones × 5 bases over a 1,296,000 arc-second wheel), the
                   King Wen ↔ Fu Xi tables, 12 cross-scale operators, 16 named
                   transitions, harmonic sound map, wheel-spectrum color map,
                   distinctive features, letters, seed lexicon, dimensions.
        ↓
src/grammar/       tokens → phrase-structure grammar → recursive-descent parser.
                   Tool calls are sentences (L5); `A then B` chains are
                   discourse (L6, o_sequence). Unknown tools raise ParseError
                   listing all 16 ids.
        ↓
src/mesh/          StatePacket (the only thing automata exchange),
                   AutomataMesh (typed-port connections plus 5 graph
                   projections: knowledge, causal, phase, temporal,
                   dependency), and EmergentChannels: every packet delivery is
                   a crossing; a crossing used ≥ 3 times promotes to a
                   persistent channel — a composite capability neither member
                   tool contains independently.
        ↓
src/automata/      Automaton base (states, δ over named transitions, trace with
                   per-step sound+color, 7-tuple complexity ledger, persistent
                   ownedState, ato.automaton.v1 manifest) + registry of the 16
                   tools (tools/tool-01 … tool-16).
        ↓
src/engine/        ComplexityLedger, Derivation (canonical stableStringify →
                   FNV-1a hash; wall-clock excluded), and SynthiaAutomata — the
                   L8 façade: call() parses, runs each call, forwards
                   StatePackets along chains, merges ledgers, and replay()
                   re-runs the input history on a fresh engine to verify
                   hash-identical reproduction (spec §12, DI = 1).
                   Plus the living layers (below): intake.js — the Sensory
                   Adapter that addresses every input BEFORE anything runs —
                   learning.js — the Learning Orchestrator that routes known
                   requests and GROWS tools for unknown ones — triples.js —
                   the semantic-triple store: each tool is made of triples, and
                   every run asserts provenance triples (input hash processedBy
                   tool, tool produced output hash, trace steps as transitions)
                   — klein.js — the Klein contextual operator K_i(C_t) =
                   (relation, intensity, direction), first-class and
                   self-testing — and questions.js — the Open Questions
                   Registry (unresolved questions preserved, not papered over).
        ↓
src/experiments/ Pre-registered experiments: relational-capability.js is H10,
                   the decisive experiment — a relationship R creates a
                   capability neither automaton possesses alone, with ablation,
                   shuffled control, and transfer. engine.runRelationalExperiment().
        ↓
src/merged/        The "best parts" layer harvested from prior Synthia
                   codebases (see docs/MERGE_NOTES.md): ato-analogy, kingwen,
                   fuxi-encoder, dimension-router, tool-factory, scene-grammar,
                   gate-field, centers-channels, lawful-grammar, mesh-memory,
                   media-field (the pure-JS media & code core), artifacts
                   (real file bytes: BMP pictures, GIF89a video, code).
```

## How to run

```sh
node demo.mjs          # narrative end-to-end demo (chains, ledger, sounds, colors,
                       # replay, intake senses, learning loop, media frames/code,
                       # semantic triples, emergent channels, experiential return)
node tests/run.mjs     # assertion suite (349 checks)
node test/merged.smoke.mjs   # merged-layer smoke test (42 checks)
node scripts/write-sample-artifacts.mjs   # writes /tmp/picture.bmp, /tmp/morph.gif,
                       # /tmp/counter.js — real files made by the artifact layer
open index.html        # browser demo — Firefox/Safari open it directly (file://);
                       # Chromium blocks file:// ES modules, so serve statically:
                       #   python3 -m http.server  →  http://localhost:8000/index.html
```

The tool-call language:

```
call      → tool-name (ARG)* ("then" call)?     // chains: B receives A's packet
ARG       → "quoted string" | bare words | number | at gate[.line[.color[.tone[.base]]]] | --flag[=value]
examples  → coder "the dogs bark" at 41.2.3 --mode=exact
            success '{"operation":"define","personId":"ada","purpose":{"statement":"practice"}}' then conversation "summarize"
            autoling "the dogs bark" then diseminer "the dogs bark" then conversation "summarize"
```

## The 16 automata (L7)

| # | id | gate | dimension | automaton form | role |
|---|---|---|---|---|---|
| 1 | `autoling-lite` | 17 | Design | rule-induction FSM | induces token-pattern grammar rules with $variables; recognizes/generates utterances |
| 2 | `diseminer-lite` | 48 | Evolution | narrative-sim FSM | persistent co-occurrence vectors; cosine neighbors + two-hop distributional inference |
| 3 | `klein-analogy` | 4 | Design | analogy transducer | Boolean A:B::C:? via XOR/XNOR membership bit vectors (involutive relations) |
| 4 | `iching-grammar` | 61 | Being | hexagram pushdown automaton | 6-line casts → trigrams; mirror/shadow/rotation/core/becoming transforms |
| 5 | `language-contact` | 12 | Movement | dual-tape transducer | seeded per-generation grammar-borrowing simulation |
| 6 | `historical-monte-carlo` | 32 | Evolution | sampling automaton | seeded multiplicative weight drift; dominant-variant conclusion |
| 7 | `autonovel` | 56 | Design | generative stack machine | persistent combinator domains; grows structures by first unused combinator |
| 8 | `messy` | 3 | Movement | probabilistic FSM | first-matching-rule agent ticks with full history |
| 9 | `success` | 14 | Being | reward hill-climber | direction-not-destination purposes, least-squares progress, replayable event log |
| 10 | `conversation` | 12 | Space | turn-taking transducer | opens turns, weaves chained packets into utterances, repairs, closes |
| 11 | `browser-form` | 20 | Being | DOM-walker FSM | consent-gated form filling with provenance and two-step confirmed submit |
| 12 | `research-browser` | 11 | Space | crawl automaton | sources→claims→notes→hypotheses→experiments→drafts with citations |
| 13 | `computational-grammar-coder` | 62 | Evolution | compiler PDA | Klein & Simmons 1963 per-word syntactic codes + context-frame disambiguation |
| 14 | `autoling` | 17 | Design | enhanced rule-induction pipeline | canonical AUTOLING 1968: morphology, phrase heuristics, semantic graph |
| 15 | `diseminer` | 48 | Evolution | distributional narrative engine | canonical DISEMINER 1968: window-5 space, claim extraction, Monte Carlo narrative |
| 16 | `morph-mir` | 24 | Space | memory-graph automaton | GNN-style memory graph: ingest → analyze → remember → regenerate |

Aliases resolve through the lexicon (`coder` → `computational-grammar-coder`,
`iching` → `iching-grammar`, `analogy` → `klein-analogy`, …).

The tool count is now **16 canonical + grown tools**: the 17th automaton,
`media-field` (gate 25, Space, capabilities `image/video/morph/animation/
frames`), is not registered — it is **grown at boot** through the learning
orchestrator's grow path, and every unknown request can grow further tools
(`engine.grownTools()` lists them with lineage).

## The Sensory Adapter (address-first intake)

`engine.intake(X)` — and, implicitly, the first line of every `engine.call()`
— produces **Q_t = (P_t, A_t, N_t, Φ_t, H_t)** before any tool runs:

| component | what it is |
|---|---|
| **P_t** decomposition | tokens (grammar) + letters (state-space) + L0 features; code/objects get a morph-mir-style structural sniff (imports/exports/functions/keywords); anything else is wrapped as an opaque payload |
| **A_t** address | `fnv1a32(stableStringify(normalized)) mod 1,296,000` → arcSec → `addressForArcSec` → canonical address, with `soundFor`/`colorFor` attached. Labeled `addressBasis:'hash-candidate'` — H3 stays a hypothesis |
| **N_t** neighborhood | mesh neighbors of related states + resonance ρ against intake history: `ρ = (gate·5 + line·3 + color·2 + tone·2 + base·1)/15`, top-3 |
| **Φ_t** regime | dimension-router route for text; code → Design; data → Evolution |
| **H_t** derivation | the intake gets its own Derivation (`intake-N`); `engine.call()` records its id into the main Derivation as `intakeId` |

The five mechanical senses (deterministic signatures, one per dimension):

| sense | dimension | signature |
|---|---|---|
| `see(X)` | Movement | `{transitionVector: hash-derived heading (angle, dx, dy), momentum: tokenCount/64}` |
| `taste(X)` | Evolution | `{familiarity: fraction of tokens seen in intake history before, novelty: 1 − familiarity}` |
| `touch(X)` | Being | `{texture: {length, nestingDepth (brackets/quotes), entropy: Shannon bits/char}, pressure: uniqueTokens/totalTokens}` |
| `smell(X)` | Design | `{scent: [structure, rhythm, density, polarity, recursion, warmth]}` — each 0–1, derived from content shape (derivations documented in `src/engine/intake.js`) |
| `hear(X)` | Space | `{channels: channelsForGate(address.gate), resonantAddresses: top-3 from N_t}` |

Plus `analysis`: `{purpose (first verb phrase), behavior (routed operation +
POS profile), relationships (co-occurring tool ids / gate references),
concepts (top content words)}`. History persists in the gate;
`engine.intake.exportHistory()`.

## The Learning Loop

`await engine.request(text)` — the front door for natural-language requests:

```
intake(text)                         // address-first, always
  → parses as a tool call?           → engine.call          (mode: known-call)
  → seen this exact request before?  → answer from the log  (mode: learned-recall)
  → both members of a promoted       → run the channel as a composed
    emergent channel match?            two-call chain A → B   (mode: emergent-channel)
  → capability match ≥ 0.2?          → run the best tool    (mode: routed)
  → otherwise GROW                   → factory.generate → wrap as Automaton
                                       → mesh.register → lineage
                                       {parents:[], learnedFrom: intakeId,
                                        hypothesis:'H1-grown-tool',
                                        evidence:'observed'}   (mode: grown)
```

Capability matching is weighted keyword overlap between the request tokens and
each tool's id/aliases/capabilities (weight 2) and description (weight 1):
`video/animate/morph` → media-field, `code/write/module` → media-field
(CodeWeaver), `learn/grammar/rule` → autoling(-lite), `research/cite` →
research-browser, `story/novel` → autonovel, `simulate/agents` → messy, …

Every outcome appends to the learning log — timestamp-free, counter-sequenced —
with computational-reduction metrics `C(X) = {operations, visitedStates,
materialized, peakStates, steps}` mapped from the merged 7-tuple ledger.
`engine.learning.exportLog()` and `engine.learning.crReport()` summarize it.

## Semantic Triples (src/engine/triples.js)

The client tools are **made of semantic triples**. `Triple` (frozen, keyed by
subject+predicate+object) and `TripleStore` (dedupe by key, wildcard `query`
with `null` = match-all, `export`/`import`) hold two kinds of facts:

- **Ontology** — at boot (and at the moment any tool is grown), each of the 17
  mesh automata asserts its decomposition via `toolOntology(automaton)`:
  `(id, isA, 'Automaton')`, `(id, hasGate, gate)`, `(id, hasDimension, dim)`,
  `(id, hasForm, automatonForm)`, one `hasCapability` per capability, one
  `hasChannel` per channel, one `hasState` per internal state, one
  `usesTransition` per named transition in its δ table, one `hasPort` per port.
  Every tool contributes ≥ 8 triples; query with `engine.toolTriples(id)`.
- **Run provenance** — after every `engine.call` (and every request-path run),
  `runTriples(...)` asserts `(inputHash, processedBy, toolId)`,
  `(toolId, produced, outputHash)`, and one `(stateFrom, transition, stateTo)`
  triple per trace step, each carrying the derivation id. Query with
  `engine.triples({ subject?, predicate?, object? })`.

Hashes are FNV-1a over canonical `stableStringify` — no clocks — so a fresh
engine replaying the same input history rebuilds the same store.

## Emergent Channels (src/mesh/channels.js)

Self-cultivation: channels are not only declared, they **emerge**. Every packet
delivery in `mesh.route()` records a **crossing** (`CrossingRecord {a, b, uses,
packetKeys, promoted, createdSeq, promotedSeq}` — counter-sequenced, no
wall-clock). The rule is *temporary crossing → repeated useful interaction →
persistent channel*: at **3 uses** the crossing promotes, and
`EmergentChannels.emergentCapability(a, b)` then returns a composite capability
`{id: 'channel:a~b', kind: 'emergent-channel', compose: 'sequential',
tools: [a, b]}` — functionality neither automaton contains independently.

`engine.emergentChannels()` lists promoted channels. The Learning Orchestrator
treats them as composite capabilities: when **both** member tools match a
request, the channel's boosted score (mean × 1.25) competes with single-tool
routing, and a winning channel executes as a composed two-call chain — A runs,
its output crosses to B as a StatePacket, B runs with the packet — logged as
`mode: 'emergent-channel'`.

**Channel ≠ neural network.** A channel here is a native computational
behavior of the mesh — a repeated crossing promoted to a persistent composite
capability. No weights, no training, no neurons. Any neural architecture is
only an analogue: the ARCHITECTURES table in ato-core is an analogy map, not
an identity. (Recorded in code at `src/engine/klein.js` and in
`docs/PROCESSING_HIERARCHY.md`.)

## The Klein Contextual Operator (src/engine/klein.js)

Every tool is a contextual operator **K_i(C_t) = (relation, intensity,
direction)**. `kleinOperator(automaton)` returns `K(context)` — a pure probe:
the tool is run on `context.input` with its state snapshotted and restored, so
K is side-effect free and deterministic.

- **relation** — the tool's dominant named transition for that input class
  (most frequent non-envelope trace transition; fallback: automatonForm);
- **intensity** ∈ [0,1] — ledger `statesGenerated` normalized (blended with
  `context.meshState.activation` when provided);
- **direction** ∈ `{'toward','away','neutral'}` — whether the run ended
  accepting, non-accepting, or did no internal work.

`kleinInvariants(K, context, samples, {composeWith})` self-tests the operator:
`deterministic` (K(C) === K(C) run twice), `contextDependent` (distinct
contexts → distinct triples), and `compositionalEmergence`: composing two
operators via the emergent-channel compose (`kleinCompose`) yields
`relation = 'channel:a~b'`, `intensity = √(I_i·I_j)` (geometric mean),
`direction =` downstream tool's — explicitly **not** the sum K_i(C)+K_j(C).

## Open Questions Registry (src/engine/questions.js)

Unresolved questions are preserved, not papered over. `engine.questions` is a
`QuestionRegistry` seeded with the three source-document questions:

- **OQ-1** orb/Delta/axon assignment (with candidate tests);
- **OQ-2** DMS assignment — whether the arc-second addressing carries
  predictive structure beyond the hash-candidate baseline (linked **H3**);
- **OQ-3** Space discrepancy — Being/Movement interrogative conflict resolved
  to majority mapping; whether Space participates in transformation formulae
  remains open (linked **H4**).

`resolve(id, evidenceId)` requires an evidence id — a question is never closed
by declaration. `list()`, `export()`.

## H10 — the decisive relational-capability experiment (src/experiments/relational-capability.js)

Pre-registered (the registration is frozen in the module header, predicate
included). **Hypothesis: a relationship R creates a capability neither
automaton possesses alone** — A(Q)=0 ∧ B(Q)=0 but F(A,B,R,C,H)(Q)=1, with
ablation F(A,B,∅)(Q)=0, control F(A,B,R_shuffled)(Q)=0, and transfer
F(C,D,R)(Q′).

Task Q: *"Given six binary lines and a transform, produce a spoken-English
description of the resulting hexagram."* A = `iching-grammar` (computes
hexagrams, cannot speak), B = `conversation` (speaks, cannot compute). R = the
sequential packet channel (two-call mesh chaining). The capability predicate
is an explicit pure function: a formatted utterance (woven/numbered structure)
containing the transformed hexagram's gate number AND both trigram names. It
is honest by construction discipline — if the chain fails, the plumbing gets
fixed, never the predicate.

```sh
node -e "import('./src/engine/synthia.js').then(({SynthiaAutomata}) =>
  console.log(JSON.stringify(new SynthiaAutomata().runRelationalExperiment(), null, 2)))"
```

Observed result: `{A:0, B:0, noRelation:0, shuffled:0, chain:1}` →
**interpretation 'supported'**; transfer (klein-analogy → conversation on the
analogy task Q′) = 1. The full report carries derivationIds and a merged
ledger; re-running reproduces the identical verdict.

## Fragment algebra (docs/FRAGMENT_ALGEBRA_SPEC.md)

The refined smallest-fragment foundation, synthesized from 13 corpus briefs
(`docs/corpus/`: Govinda, Adler, Moore, Hatcher, Reifler, Moog, Wen, D'Aoust,
Rutt's bronze-age Zhouyi, Wen Wang Gua, the HD Black Book, two hexagram
datasets, and the author's generative-grammar master document):

- `src/state-space/fragments.js` — lines (6/7/8/9), Si Xiang bigrams, the full
  8-trigram attribute matrix (family/directions/wuxing/season/color/animal/
  body/Lo Shu + Fu Xi numbers), nuclear trigrams with 16-nucleus closure,
  pair operators (complement/reverse/**swap** — jiao gua is the new 13th
  operator, `swapTrigrams`), arrangements (xiantian/houtian/Mawangdui),
  Zhu Xi's 8-case evaluation grammar, the bronze-age 4-slot statement
  grammar, casting distributions.
- `src/state-space/primitive-dimensions.js` — the primitive × dimension
  attribution: all 26 letters (rule-derived from phoneme features), the
  canonical 19-mark Unified Syntax Field (`• . ° : ; , – ′ ″ " " ( ) [ ]
  { } / \ * … = →` — author's canon, superseding hypothesis H-F1), sound
  primitives (incl. the gong/shang/jue/zhi/yu five tones, H-F2), color
  primitives (incl. wuxing colors, H-F3), and every I Ching fragment class.
  `dimensionOf(kind, id)` → `{primary, secondary, basis: canon|rule|
  hypothesis}` — canon and hypothesis never mix silently.
- `src/state-space/generative-grammar.js` — the author's generative grammar:
  12-slot part-of-speech grammar (Sign=subject, Gate=verb, Color=why,
  Tone=how, Base=root…), production rules, the rewrite notation parser
  (`F:Body → Gate:Innocence° → …`), `composeAddress` (O_{k,l,c,t,b}),
  deterministic `generateSentence` (deep structure = waveform substrate,
  surface = collapsed sentence), Verb-Field Triad (=, –, →).
- `src/engine/prediction.js` — lawful next-state enumeration: change
  lattices (2^k), operator images, pair partners, Zhu Xi reading paths.
  Mechanism, not oracle — outcome correlation remains hypothesis H-F7.

Tests: `node tests/run.mjs` → **866 passed, 0 failed** (349 core +
`test/fragments.test.mjs` 69 + `test/generative.test.mjs` 70 +
`test/emergence.test.mjs` 53 + `test/scale-experiments.test.mjs` 41 +
`test/canon.test.mjs` 43 + `test/chains-colors.test.mjs` 55 +
`test/ports-b.test.mjs` 96 + `test/ports-c.test.mjs` 59 +
`test/living-loop.test.mjs` 31).

## The living loop (src/organism/) — Turn 11: endogenous, self-initiating

The gap named by external audit is closed: the organism no longer waits for
`engine.call()` or an external `tick()`. `LivingLoop` runs the cycle
**sense → need → initiative → consequence → learn → record**:

- `vitals.js` — five endogenous vitals (coherence, curiosity, energy,
  sociality, tension) computed deterministically per logical tick from real
  engine observables (derivation history, intent gaps, open questions,
  channel crossings, detector novelty). Rates/thresholds are tagged
  IMPLEMENTATION_CHOICE; floating-point dust never raises a need
  (LOOP_EPSILON).
- `living-loop.js` — needs rise on threshold+hysteresis; initiatives are
  ENDOGENOUS `engine.call()`s (origin threads through the derivation hash
  via the existing context field): address an intent gap, attempt an open
  question, run a prediction-lattice self-experiment, or exercise the
  least-used tool. Consequence scoring ([-1,1]) updates per-vital policy
  weights; every episode is a hash-chained, replayable record. Quiescence
  is a valid state — a healthy organism rests.
- Determinism: same seed + same exogenous inputs + same tick count ⇒
  byte-identical state and log (double-run tested). The browser's heartbeat
  (a 1 Hz `setInterval` in the UI layer) supplies time; under node the loop
  advances only when ticked, so every test stays byte-exact.
- The Sovereign Light page shows the organism live: vitals bars, active
  need, and the self-initiated episode feed.

## Turn 9/10 additions — canon contract, verbatim chains, donor capability ports

- `src/state-space/claim-status.js` + `dimension-canon.js` +
  `src/engine/canon-registry.js` — 9 claim statuses (incl. CONTROL_ONLY),
  provenance wrapper factory, resolution order, promotion gate
  (EMPIRICALLY_SUPPORTED only after beating pre-registered controls),
  conflict-first CanonRegistry (conflicts are never silently resolved).
- `src/state-space/chains.js` — verbatim Black Book dimension chains
  (perspectival: each chain = how that dimension sees the whole; the
  One.–Five. ordinal = Being's perspective; unattested = null), Three
  Conditions (Ǝ⟶M / Ǝ=ME◆ / Ǝ=M<², 2→4→5 dimensions), Crystals & Monopole,
  and the Book of Colors COLOR (motivation) / TONE (sound) / BASE tables.
  Keynote conflicts C13/C14 double-attested, kept open; blank cell C17
  never filled. Source: docs/corpus/black-book-chains-colors.md.
- Ported donor capabilities (fix-then-integrate; defects repaired before
  entry, all provenance-tagged): `mesh-state-space.js` (5-dim × 64-node
  StateSpace + sourced Mawangdui sequence), `rule-council.js`,
  `wen-wang-gua.js` (Najia: 12 branches, six-relation stars, O/X moving
  lines), `engine/v2/` (SSM, phase-space, BigInt coordinate engine),
  `human-design.js` (TS→JS, timezone-deterministic; donor conflicts kept
  as CONFLICT claims), `override-registry.js` + `self-correcting.js`,
  `correspondences.js` (Gene Keys CodonRing, YiSphere mandala angles),
  `synthai-converter.js` (py→JS, real 64-gate table), plus the phase-sweep
  set (`boolean-ato`, `resonance-network`, `klein-distributional`,
  `hypothesis-registry`, `graph-trace`, `phase-corpora`, scale-layer
  `fsm`/`automata-composition`/`parsers`). Quarantine resolved as
  first-class CONFLICT/variant records — see docs/HANDOFF_INTEGRATION.md §6.

## Emergence layer (src/emergence/) — ported from pass4-step41-REPAIRED

- `intent-engine.js` — observes every derivation/learning result, records
  capability gaps (operator_failure / no_composition / unrouted…), proposes
  new primitives/operators/rules with confidence + evidence derivation ids.
- `self-editor.js` — versioned, **reversible** self-modification; every edit
  is a hash-chained Derivation (self-modification is replayable), `revert()`
  restores the exact prior snapshot.
- `detector.js` — §15 three-criteria emergence tests (incl. channel-emergence
  fed by mesh crossing stats).
- `coordination.js` — synchronized multi-automata broadcast with real
  packet routing and per-automaton error containment.
Source defects were repaired during porting (timestamp ids → counter ids,
hash replacer bug, dead acceptance-evolution, assumed engine shapes).
All parameters carry runtime provenance tags.

## Scale benchmarks (src/experiments/scale/) — ported from phase1-d1-d2-d3 + phase2-REPAIRED

D1 (feature scale) / D2 (phoneme scale) / D3 (word scale) benchmark engines
with their sealed ASSUMPTIONS verbatim, the phase2 CrossScaleExperiment, the
controls harness (`controlMappings(mapping,{seed})` → source / **modulo** /
shuffled / random / ablated over any mapping), and the address/dimensional
evaluators (H3/H4 condition batteries). **Reproduction gate: all 291 sealed
leaf fields match byte-exactly** (D1 94/94, D2, D3 — zero mismatches).
This is the scaffold for the primitive→scale experiment (repair plan §18).

## Processing hierarchy

`docs/PROCESSING_HIERARCHY.md` maps the source document's hierarchy onto the
actual pipeline: field tensor → `IntakeGate` decomposition; circuit family →
`DimensionRouter` regime Φ; channel mode → parser / `LearningOrchestrator`
routing; crossing hybridization → two-call chains / `EmergentChannels`;
changing-line metastability → `iching-grammar` transforms / `MediaField`;
encoding/routing → `StatePacket` + arc-second addressing; output → artifact
layer + experiential return.

## Experiential Return

Results feed back into the network's experiential state. After each run the
engine calls `automaton.absorbExperience({derivationId, intakeId, outputHash,
seq})`, which appends the record to `ownedState.experiences` (initialized `[]`;
stateless tools whose `ownedState` was `null` gain an `{experiences: []}` log;
Map-rooted state keeps it under the `'experiences'` key). Records are
timestamp-free and counter-sequenced, so `exportState`/`hydrate` round-trips
them losslessly and deterministic replay reproduces them identically.

## Media & Code capability (src/merged/media-field.js)

A pure-JS port of SRMF's computational heart — no DOM, no canvas, no clocks:

- `MediaField` — 64 RecursiveAutomatonNode-like loci on the Fu Xi hypercube
  with recurrent weights (self 0.15 · Hamming-1 0.08 · Hamming-2 0.025),
  `injectFuXi(v, strength)`, `tick(externalState)`, and deterministic
  `frameRGBA() → Uint8ClampedArray(width·height·4)`: each locus contributes
  the state-space color of its gate address, modulated by activation, energy
  and tension. `morphFrames(fromGate, toGate, steps)` interpolates between two
  gates — the changing lines (set bits of the XOR of the two Fu Xi patterns)
  drive the morph — and is field-state-pure (same instance, byte-identical
  reruns).
- `VideoTimeline` — `addFrame(rgba, durationTicks)` → `exportFrames()` hands
  `{rgba, width, height, delay}` records to the browser layer, which encodes
  (canvas `putImageData`, MediaRecorder) there and only there.
- `CodeWeaver` — `analyze(source)` → functions/imports/exports/keywords +
  FNV signature; `weave({name, gates, purpose})` → a deterministic template
  module **string** (an artifact, never evaluated: no `eval`, no
  `new Function`); `weaveArtifact(spec, writer)` → same module registered as
  a real code artifact; `diffSummary(a, b)`.

## Artifact layer (src/merged/artifacts.js)

The modern-day interpretations make **actual files** — real byte sequences
encoded in pure JavaScript: no DOM, no canvas, no codecs, no network, no
dependencies, no clocks. Every encoder is a pure function of its arguments
(same input → identical bytes), and every artifact carries an
**fnv1a32 byte hash** so reproduction is verifiable.

- **Pictures: BMP.** `encodeBMP(width, height, rgba)` → a real 24-bit BMP
  (BITMAPFILEHEADER + BITMAPINFOHEADER, pixel offset 54, bottom-up BGR rows,
  4-byte row padding). Chosen because it needs no compression at all.
- **Video: GIF89a.** `encodeGIF(width, height, frames, {loop})` → a real
  animated GIF: a deterministic 216-color palette (the 6×6×6 web-safe cube,
  no median cut — quantization is fixed rounding), NETSCAPE2.0 infinite
  looping, per-frame delays in centiseconds, and a **from-scratch GIF LZW
  compressor** (clear/EOI codes, code-table growth 9→12 bits, deferred clear
  at 4096, LSB-first bit packing, data sub-blocks ≤ 255 bytes). Verified
  pixel-exact against reference decoders.
- **No PNG, deliberately.** PNG pixel data is zlib/DEFLATE (LZ77 + Huffman +
  Adler-32 framing) — a large, fussy format surface. BMP proves real
  decodable pictures and GIF proves real decodable animated video; that is
  the whole artifact contract.
- **`ArtifactWriter`** — deterministic registry: `write(kind, {fileName,
  bytes|text, mime})` stamps counter-derived ids (`art-1`, `art-2`, …),
  records `size` + `hash`, and keeps the bytes; `list()` returns metadata
  without payloads.
- The grown `media-field` tool exposes three artifact operations:
  `picture({gate})` → one 64×64 render of the gate's field state as BMP;
  `video({from, to, steps=8, delayCs=8})` → `morphFrames` encoded as GIF;
  `code({name, gates, purpose})` → a CodeWeaver module. Requests like
  *"make a picture of gate 24"*, *"make a video of gate 24 morphing into
  gate 41"*, *"write code for a gate resonance counter"* route straight to
  them. Op outputs are `{ok, …, artifact}` where `artifact.bytes` is a
  **plain array** of byte values (not a `Uint8Array`) so the whole result is
  JSON-safe in the learning log; `encodeBMP`/`encodeGIF` themselves return
  `Uint8Array`.
- Every generated file opens with a `// Pure Synthia Automata — <role>`
  header where the format allows comments (code files, and this module).

## The 16 named transitions (spec §7)

Every trace step is a named, typed edge carrying a deterministic sound and
color rendering:

| transition | symbol | effect | sound | color |
|---|---|---|---|---|
| ignition | `→*` | dormant → active | rising gliss | hue flash +40° |
| flow | `→` | active → active | sustained tone | hue holds |
| weakening | `⇢` | active → weakening | diminuendo | sat −10% |
| dormancy | `⇝` | weakening → dormant | rest | desaturate to 20% |
| reactivation | `↬` | dormant → active via resonance | recalled motif | sat restored |
| fusion | `⊕` | n states → bundle (o_bundle) | chord | hues averaged |
| chain | `▸` | ordered append (o_sequence) | sequential notes | hue walk |
| mirror | `≍` | o_reverse (Fu Xi reverse) | retrograde | hue +180° |
| shadow | `◐` | o_inverse (yin↔yang) | pitch inversion | value inverted |
| rotation | `⟳` | o_converse (180° rotation) | transposition +6 | hue +90° |
| core | `⊙` | o_nuclear (nuclear trigram) | inner voices | sat +15%, light −15% |
| becoming | `⇒` | o_change (moving lines) | resolving cadence | hue lerps to target |
| perspective | `◇` | o_project T_{i→j} | octave shift | layer change |
| recursion | `↺` | o_recurse | loop with decay | spiral darker |
| weave | `⋈` | o_discourse | polyphony | gradient blend |
| automatize | `⚙` | o_automaton | rhythmic cycle | frame appears |

## Source lineages

- **Sheldon Klein's tools** — AUTOLING, DISEMINER, the computational grammar
  coder (Klein & Simmons **1963**), the historical Monte Carlo method, MESSY,
  AutoNovel, the I Ching grammar, and the Boolean analogy calculus (Klein's
  ATO, Table 4 verified), **1963/1968** lineage.
- **ato-core** (`UPGRADES/vendor/ato-core`) — success ledger,
  computational-grammar-coder, browser-form consent flow, research workspace.
- **integrated-tool-factory v1.5.0** — dimension router, deterministic tool
  factory (levels 0–7).
- **SRMF** (`synthia-recursive-media-field-v1.9`) — King Wen table, scene
  grammar, Boolean operator bank.
- **isohuman** (`isohuman-complete-v5-repaired`) — FuXi encoder hypercube
  involutions.
- **ato-drawing-engine** — strong-equivalence string-form analogy operators.
- **synth-ai-integrated v2.3** — gate locus/process field, lawful grammar
  constructor (Hatcher/Gnostic-derived gate datasets).
- **Synthia Progressive Upgrade v0.6** — substrate wiring (36 channels, 9
  centers) and anticipatory mesh memory with the public/private address split.

## Hypothesis discipline

Per the research proposal's Appendix B, everything here is measurement
machinery, not assertion. The hypotheses stay labeled:

- **H1** recursive generativity · **H2** cross-scale operator invariance ·
  **H3** address utility · **H4** dimensional correspondence ·
  **H5** compression · **H6** candidate numerical laws (incl. g^l).

Nothing in this repository asserts them; the state space, ledger, and
derivation hashes exist to measure them. Falsification criteria live in the
proposal (§19) and the labels are preserved in `docs/STATE_SPACE_SPEC.md`.

## Sovereign Light

`sovereign.html` is the **single-file, fully sovereign** build of the whole
system: the engine, grammar, mesh, all 16 automata, the state-space modules,
and the merged layer are bundled and **inlined** into one HTML document
together with a dark, warm, low-saturation UI (palette anchored on the six
`COLOR_ANCHORS` from `src/state-space/colors.js`).

Why single-file: the project's ethos is inspectable, dependency-free,
browser-native software. `index.html` uses ES modules, which Chromium refuses
to load over `file://`. Sovereign Light removes even that requirement — there
is no server, no network, no CDN, and no runtime module import. Opening the
file directly (`file://…/sovereign.html`) in any modern browser boots the full
mesh: run tool calls and chains, inspect the parse tree, execution trace (with
per-step sound Hz and color swatch), the 7-tuple ledger and derivation hash,
verify deterministic replay (`REPRODUCED`), play the trace through WebAudio,
explore the 26 letter states / 16 named transitions / 16-automata registry,
and watch the five mesh-projection metrics update live. Everything is rendered
from the real bundled modules; the bundle is unminified so it stays readable
(View Source is the documentation).

Regenerate the bundle and rebuild the file (entry: `src/sovereign-entry.js`,
which exposes the single global `window.SYNTHIA_SOVEREIGN`):

```sh
esbuild src/sovereign-entry.js --bundle --format=iife \
  --global-name=__SYNTHIA_BUNDLE__ --target=es2020 --minify=false \
  --outfile=/tmp/sovereign-bundle.js
# then inline /tmp/sovereign-bundle.js into the first <script> block of
# sovereign.html (the UI controller sits in the second <script> block).
```

The HTML contains no `http(s)` references, no external `src=`/`href=`, no
dynamic `import()`, and no `fetch`/XHR/WebSocket — verified by audit and by a
headless-browser run that logs any external request.
