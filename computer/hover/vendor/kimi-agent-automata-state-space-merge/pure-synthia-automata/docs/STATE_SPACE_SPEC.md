# Pure Synthia Automata — Unified State Space Specification
### v1.0 — derived from `pure-synthia-research-proposal.md` (all hypotheses remain labeled per its Appendix B)

This document defines the complete state space that the modern re-interpretations of the
16 Synthia tools run on. Every tool is an **automaton form**; all automata share one
**mesh**; a **grammar** parses tool calls. Everything below is deterministic and
browser-native JavaScript (proposal §18).

---

## 1. Scale Ladder (proposal §5, H.2)

```
L0 features   → L1 phonemes/graphemes → L2 morphemes → L3 words → L4 phrases/clauses
→ L5 sentences → L6 discourse → L7 automata → L8 multi-automata mesh
```

Every level is `whole(X_{n-1})` and `part(X_{n+1})`. The 16 tools live at L7; their
shared mesh is L8; their *inputs* climb L0→L6.

## 2. Canonical Address (proposal §6, DMS-precise)

`Planetary-Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc-Second → Zodiac → House`

Precision constants (user's DMS system):
- Wheel = 360° = 1,296,000 arc-seconds.
- 64 gates: 1 gate = 5°37'30" = **20250 arc-sec**.
- 6 lines/gate: 1 line = 0°56'15" = **3375 arc-sec**.
- 6 colors/line = 562.5 arc-sec; 6 tones/color = 93.75 arc-sec; 5 bases/tone = 18.75 arc-sec.
- 12 zodiac signs = 30° each; 8 houses (trigram houses) = 45° each; 12↔8 connect at the
  12-12 fold (ternary folding: 12→8 via ÷1.5, 8→4 via −4, 4→12 via +8).
- Fu Xi binary sequence is the canonical gate ordering; its 4 variations
  (reverse, inverse, converse) are named transition operators; the 5th perspective
  emerges from their interaction (4 primitives, 5th emergent).

## 3. Five Dimensional Perspectives (proposal §7)

`D1 Movement (impulse) · D2 Evolution (polarity) · D3 Being (witness/observer-node — the hinge)
· D4 Design (context) · D5 Space (meaning)`

`Representation(X|Di) ≠ Representation(X|Dj)`; perspective change is a named transition
`T_{i→j}` (operator `o_project`). Hypothesis H4 — never asserted, always measured.

## 4. Operator Set O (cross-scale; proposal §3, App. C.4)

| id | arity | name | rule |
|---|---|---|---|
| `o_bundle` | n | Fusion | simultaneous composition under shared slot; unordered |
| `o_sequence` | n | Chain | ordered composition; `E(A,B) ≠ E(B,A)`; positional indexes are state |
| `o_project` | 1 | Perspective | dimensional re-representation `T_{i→j}` |
| `o_recurse` | 1 | Recursion | output re-enters as operand; depth logged in ledger |
| `o_transform` | 2 | Mutation | applies a named transition rule to a state |
| `o_automaton` | n | Automatization | wraps states+transitions into an executable automaton |
| `o_discourse` | n | Weave | composes L5 units into L6 with coherence pressure |
| `o_reverse` | 1 | Mirror | Fu Xi reverse variation |
| `o_inverse` | 1 | Shadow | yin↔yang line inversion |
| `o_converse` | 1 | Rotation | 180° wheel rotation / trigram swap |
| `o_nuclear` | 1 | Core | extract nuclear trigram (lines 2-3-4 / 3-4-5) |
| `o_change` | 2 | Becoming | moving lines → target state (hexagram → hexagram) |

Each operator record: `(id, arity, accepts, positionalRule, transform, invariants,
inverseId, scalesObserved, evidence)`. `o_reverse`/`o_inverse`/`o_converse` are their own
inverses (involutions) — the first mathematically guaranteed `T_{j→i}∘T_{i→j}=id` cases.

## 5. Sound Map (Harmonic Syntax)

Deterministic, structure-derived, no randomness:

- **Zodiac → pitch class**: 12 signs = 12 semitones; A♭=0 … G=11. Base A4 = 432 Hz.
- **Gate → micro-position**: gate's arc-second offset within its sign detunes by cents:
  `cents = (arcSecWithinSign / 108000) * 100`.
- **Line (1–6) → scale degree** of the hexatonic Synthia scale `[0,2,4,7,9,11]`-derived
  hexagram scale `[0,2,5,7,9,10]`; degree selects note within octave.
- **Dimension → octave**: D1=octave 2, D2=3, D3=4, D4=5, D5=6. The witness (D3) is middle.
- **Color (1–6) → timbre**: 1 sine · 2 triangle · 3 square · 4 sawtooth · 5 pulse · 6 noise-blend.
- **Tone (1–6) → articulation/duration**: 1 staccato(1/16) … 6 legato(whole).
- **Base (1–5) → velocity**: 0.4, 0.55, 0.7, 0.85, 1.0.
- **House (trigram, 1–8) → rhythmic slot** in an 8-beat cycle.
- Formula: `f(state) = 432 * 2^((octave*12 + degree + cents/100 - 57)/12)`.

## 6. Color Map (Visual Syntax)

- **64 gates → hue**: `hue = gateArcSeconds / 1296000 * 360` (the wheel IS the spectrum).
- **Line → saturation**: `sat = 30% + line*10%` (line 6 = 90%).
- **Tone → lightness**: `light = 25% + tone*7%`.
- **6 HD Colors → named palette anchors**: 1 Appetite `#8C4A2F` (earth-red) ·
  2 Taste `#C28E3C` (ochre) · 3 Thirst `#3C6E8C` (water-blue) · 4 Touch `#6E8C3C` (moss)
  · 5 Sound `#7A5A8C` (violet-ash) · 6 Light `#D9C98C` (pale gold).
  Low-saturation warm palette per house style.
- **Dimension → rendering layer**: D1 stroke · D2 fill · D3 glow · D4 frame · D5 ground.
- **8 trigram houses → background wash rotation** at 45° hue steps.

## 7. Named State Transitions (the transition lexicon)

Every transition is a named, typed, sound+color-carrying edge. Grammar-visible names:

| transition | symbol | effect | sound | color |
|---|---|---|---|---|
| IGNITION | `→*` | dormant → active (α: 0→σ(input)) | rising gliss | hue flash +40° |
| FLOW | `→` | active → active (α propagates w/ weight) | sustained tone | hue holds |
| WEAKENING | `⇢` | active → weakening (α decays by λ) | diminuendo | sat −10% |
| DORMANCY | `⇝` | weakening → dormant (α<θ; topology kept) | rest | desaturate to 20% |
| REACTIVATION | `↬` | dormant → active via resonance | recalled motif | sat restored |
| FUSION | `⊕` | n states → bundle (o_bundle) | chord | hues averaged |
| CHAIN | `▸` | ordered append (o_sequence) | sequential notes | hue walk |
| MIRROR | `≍` | o_reverse | retrograde | hue +180° |
| SHADOW | `◐` | o_inverse | pitch inversion | value inverted |
| ROTATION | `⟳` | o_converse | transposition +6 semitones | hue +90° |
| CORE | `⊙` | o_nuclear | inner voices only | sat +15%, light −15% |
| BECOMING | `⇒` | o_change (moving line) | resolving cadence | hue lerps to target |
| PERSPECTIVE | `◇` | o_project T_{i→j} | octave shift | layer change |
| RECURSION | `↺` | o_recurse | loop w/ decay | spiral darker |
| WEAVE | `⋈` | o_discourse | polyphony | gradient blend |
| AUTOMATIZE | `⚙` | o_automaton (state set → machine) | rhythmic cycle | frame appears |

## 8. Letters (L1) — Grapheme States

All 26 letters are registered primitives `p = (i,c,x,o,d,s,D,A,e)` with:
- identity = letter; contrast = its distinctive-feature bundle;
- position = alphabet index (a=0…z=25) — also its Fu Xi gate candidate:
  `candidateGate = (index mod 64) + 1` (hypothesis-labeled, H3-controlled);
- sound/color derived from §5/§6 via that candidate address;
- vowels {a,e,i,o,u} = open states (sonorant, sustained timbre); consonants = gated states.

Sub-letter features (L0, proposal App. A): `[±voice]`, `place ∈ {labial, alveolar, velar,
dental, palatal, glottal}`, `manner ∈ {stop, fricative, nasal, liquid, glide, vowel}`,
`[±high]`, `[±low]`, `[±front]`, `[±back]`, `[±round]`, `[±tense]`.
`o_bundle` composes features → phoneme → grapheme (worked example: /p/ vs /b/ per App. A.2).

## 9. Words & Morphemes (L2–L3)

Morphemes = `o_sequence` of grapheme-states with morpheme boundary markers.
Word classes as state **types** (POS = phase class in G_P): `entity(noun)`, `action(verb)`,
`quality(adj)`, `relation(prep/conj)`, `modifier(adv)`, `anchor(pron/det)`, `operator-word
(neg/modal)`. Compound formation = FUSION; derivation = CHAIN with affix transitions.
The lexicon ships seed words for the tool-call grammar (§10) plus the 16 tool names.

## 10. Syntax (L4–L5) — the Tool-Call Grammar

The mesh parses **tool calls** with a deterministic phrase-structure grammar
(tool calls = sentences at L5; chained calls = discourse at L6):

```
call        → tool-name (ARG)* ("then" call)?        // two-call chain: A then B
tool-name   → one of the 16 registered tool ids (or aliases)
ARG         → quoted-string | bare-word+ | address | number | flag
address     → "at" gate ["." line ["." color ["." tone ["." base]]]]
flag        → "--" word ("=" value)?
```

Two-call form `A then B` = `o_sequence(A_call, B_call)` at L6 — the second call receives
the first's derivation packet. Longer chains compose associatively.
Parser = recursive descent over the state space itself: tokens are L1 states,
lexemes L2/L3, the parse tree an L4/L5 composite with full derivation Δ (App. D).

## 11. The 16 Automata (L7) on the Shared Mesh (L8)

Each tool = an automaton `A = (Q, Σ, δ, q0, F, ω)` where Q = its registered states,
Σ = state-space alphabet (tokens/packets), δ = named transitions from §7, ω = output
transducer. All 16 mount on one `AutomataMesh` with typed ports; they exchange
**qualified state packets** (proposal §10), never memory copies.

| # | tool | automaton form | core states |
|---|---|---|---|
| 1 | autoling-lite | rule-induction FSM | listen→abstract→coin-rule→test |
| 2 | diseminer-lite | narrative-sim FSM | receive→simulate→narrate |
| 3 | klein-analogy | analogy transducer | source→map→target→check |
| 4 | iching-grammar | hexagram pushdown automaton | cast→read-lines→transform→resolve |
| 5 | language-contact | dual-tape transducer | borrow→adapt→nativize |
| 6 | historical-monte-carlo | sampling automaton | hypothesize→sample→tally→conclude |
| 7 | autonovel | generative stack machine | premise→weave→chapter→bind |
| 8 | messy | probabilistic FSM | scatter→tolerate→express |
| 9 | success | reward hill-climber | attempt→score→reinforce |
| 10 | conversation | turn-taking transducer | open→turn→repair→close |
| 11 | browser-form | DOM-walker FSM | see→fill→submit→confirm |
| 12 | research-browser | crawl automaton | query→fetch→extract→cite |
| 13 | computational-grammar-coder | compiler PDA | parse→lower→emit→verify |
| 14 | autoling (canonical) | enhanced rule-induction + pipeline | +distribute→induce→grammar |
| 15 | diseminer (canonical) | distributional narrative engine | +space→claims→influence |
| 16 | morph-mir | memory-graph automaton | ingest→analyze→remember→regenerate |

(Final contracts refined from source audit — see docs/TOOLS_AUDIT.md.)

## 12. Mesh (L8), Activation, Ledger, Derivation

- 5 graph projections per §9 of proposal: knowledge, causal, phase, temporal, dependency —
  separate neighbor sets per state.
- Activation α ∈ [0,1], `α(t+1)=σ(wI·I + wR·R + wD·D + wH·H − λ)`; transitions named per §7.
- Complexity ledger per call: `(Np, Ns, Ne, No, Dr, Ac, Tc)` + tool-call parse depth.
- Every execution returns Δ = (input, decomposition, primitives, operators, relations,
  context, transforms, output, evaluation). `DI = 1` required.
- Deterministic replay: same (state, input, context, grammarVersion, operatorVersion)
  → identical derivation hash.

## 13. Hypothesis Labels (unchanged from proposal)

H1 recursive generativity · H2 cross-scale operator invariance · H3 address utility ·
H4 dimensional correspondence · H5 compression · H6 candidate numerical laws (incl. g^l).
Nothing here asserts them; the machinery measures them. Falsification criteria per §19.
