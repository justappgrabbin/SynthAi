# Processing Hierarchy

The source document's processing hierarchy, mapped onto the actual intake
pipeline of this repository. Every stage names the module/function that
implements it — nothing here is aspirational.

| # | Source-document stage | Implementation | Where |
|---|---|---|---|
| 1 | **field tensor** (raw input) | Any input X is decomposed BEFORE anything runs: tokens (grammar), letters (state-space), L0 features; code/objects get a structural sniff. This is `P_t` of `Q_t = (P_t, A_t, N_t, Φ_t, H_t)`. | `IntakeGate.intake(X)` — `src/engine/intake.js` (with `src/grammar/tokens.js`, `src/state-space/letters.js`) |
| 2 | **circuit family** (regime Φ / dimension routing) | `Φ_t` regime: the dimension router classifies text into Being/Movement/Design/Evolution/Space; code → Design, data → Evolution. | `DimensionRouter` — `src/merged/dimension-router.js`, invoked from `IntakeGate` |
| 3 | **channel mode** (tool/automaton selection) | Tool-call sentences parse to automata; natural requests route by capability keyword overlap (weight 2 id/alias/capability, weight 1 description), threshold 0.2; unmatched requests GROW a tool. | `parseChain` — `src/grammar/parser.js`; `LearningOrchestrator.request` — `src/engine/learning.js`; `ToolFactory` — `src/merged/tool-factory.js` |
| 4 | **crossing hybridization** (two-call chains / emergent channels) | `A then B` chains: A's output becomes a StatePacket that crosses to B (`mesh.route` records a CrossingRecord); a crossing used ≥ 3 times promotes to a persistent channel — a composite capability neither member contains. | two-call rule in `SynthiaAutomata.call` — `src/engine/synthia.js`; `AutomataMesh.route` — `src/mesh/mesh.js`; `EmergentChannels` — `src/mesh/channels.js` |
| 5 | **changing-line metastability** (iching transforms / activation dynamics) | Named bit transforms (mirror/shadow/rotation/core/becoming, incl. moving-lines XOR masks) over 6-line casts; recurrent field activation and changing-line-driven morphs in the media field. | `IchingGrammarAutomaton` — `src/automata/tools/tool-04-iching-grammar.js` via `src/state-space/operators.js`; `MediaField.tick/morphFrames` — `src/merged/media-field.js` |
| 6 | **encoding/routing** (packets + addressing) | StatePackets (the ONLY thing automata exchange) carrying from/to/kind/payload/address; every input addressed on the 1,296,000 arc-second wheel (`fnv1a32(stableStringify(X)) mod wheel` → `addressForArcSec`). | `StatePacket` — `src/mesh/packet.js`; `addressForArcSec/arcSecForAddress/gateFromBits` — `src/state-space/addressing.js` |
| 7 | **output** (artifact / experience return) | Real file bytes (BMP pictures, GIF89a video, code modules) with fnv1a32 hashes; experiential return feeds each run's summary back into the automaton's owned state (`absorbExperience`). | `encodeBMP/encodeGIF/ArtifactWriter` — `src/merged/artifacts.js`; `Automaton.absorbExperience` — `src/automata/automaton.js` |

## The channel-vs-neural correction

A **channel is not a neural network**. In this system a channel is a native
computational behavior of the mesh: a packet crossing that, used repeatedly
(≥ 3 times), promotes to a persistent composite capability
(`EmergentChannels.emergentCapability`). There are no weights, no training, no
gradients, no simulated neurons. Any neural architecture is only an
**analogue** — the ARCHITECTURES table in ato-core is an analogy map between
channel behaviors and neural motifs, not an identity. The Klein contextual
operator (`src/engine/klein.js`) records this correction at the point where
composition is defined: `J(K_i,K_j,C)` composes via the emergent-channel rule
(relation becomes `channel:a~b`, intensity the geometric mean, direction the
downstream tool's), explicitly **not** as the sum `K_i(C)+K_j(C)` and not as
any neural composition operator.

## Open questions (preserved, not papered over)

Tracked live in `engine.questions` (`src/engine/questions.js`); resolution
requires an evidence id.

- **OQ-1 orb/Delta/axon assignment** — how the source document's
  orb/Delta/axon assignments map onto mesh states, transitions and ports; no
  unique mechanical assignment has been derived. Candidate tests: derive each
  candidate from the state-space constants and compare trace signatures across
  all 16 tools; ablate mesh port keying per candidate and measure derivation
  hash / routing receipt changes.
- **OQ-2 DMS assignment** (linked **H3**) — whether the DMS arc-second
  assignment of addresses carries predictive structure beyond the
  hash-candidate baseline.
- **OQ-3 Space discrepancy** (linked **H4**) — the Being/Movement
  interrogative conflict (GateLocus vs factory/SynthiaOS) resolved to majority
  mapping; whether Space participates in transformation formulae remains open.

## The decisive experiment built on this hierarchy

H10 (`src/experiments/relational-capability.js`, `engine.runRelationalExperiment()`)
sits at stages 4+6+7: the sequential packet relation R (stage 4/6) between
iching-grammar and conversation creates the spoken-hexagram capability
(stage 7) that neither automaton has alone — with ablation (no relation),
control (shuffled payload) and transfer (klein-analogy → conversation on Q').
Pre-registered in the module header; the capability predicate is frozen and
honest.
