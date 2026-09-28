# Pure Synthia Automata — State-Space Mapping Audit

Bias-cleared epistemic audit of every mapping/formula in the state-space layer
(`src/state-space/`), plus `src/merged/gate-field.js`, `src/merged/centers-channels.js`
(exhaustive) and representative engine-layer mappings. No code was changed.

---

## 1. Method

Every mapping or formula is tagged with exactly one **primary tag** (secondary
qualifications go in the notes column):

| tag | meaning |
|---|---|
| `SOURCE_STATEMENT` | A named source defines it (citation in evidence column: corpus brief page, GGM line ref, spec section, or contract). |
| `STRUCTURAL_MATH` | Provable arithmetic/algorithm (e.g. 64 = 2⁶, DMS closure, FNV-1a, HSL→hex, Hamming). Independently re-verified by execution where feasible. |
| `DERIVED_RESULT` | Mechanically follows from defined inputs + an explicit operator (roundtrip-verified where feasible). |
| `IMPLEMENTATION_CHOICE` | Deterministic but arbitrary — no source mandates this value/rule. |
| `PROJECT_HYPOTHESIS` | Ledger-labeled hypothesis (H-*, incl. H-F*). |
| `RENDERER_CONVENTION` | Display/sound mapping; not state-space truth (even if the internal spec states it). |
| `EXPERIMENTAL_RESULT` | Backed by a run experiment with a pre-registered decision rule (e.g. H10). |
| `CONFLICT` | Sources disagree, or code contradicts a source. |

**Operating rule:** the system *may compute with a hypothesis but must always
know it is one*. A mapping passes epistemically iff its hypothesis/choice status
is visible at the point of use — ideally carried in the runtime value
(`{value, status, source, hypothesisId, confidence, evidence}`), minimally in an
adjacent comment. Comment-only labels are flagged in §4.

**Source hierarchy used for verification:** `docs/STATE_SPACE_SPEC.md` (internal
spec, derived from the research proposal) → `docs/FRAGMENT_ALGEBRA_SPEC.md`
(corpus synthesis with per-table citations) → `docs/corpus/*.md` briefs (what
Hatcher/Adler/Govinda/Moore/Wen/Rutt/Reifler/GGM actually say) →
`docs/IMPLEMENTATION_CONTRACT.md` (build contract). Corpus briefs outrank the
internal specs for corpus content; the internal spec is the source for
spec-only constructs (sound map, color map, letter candidate addressing).

---

## 2. Formula-by-formula audit table

### 2.1 `src/state-space/constants.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| constants.js:4 | `WHEEL_ARCSECONDS = 1296000` | 360° in arc-seconds | STRUCTURAL_MATH | 360×3600 = 1,296,000 (re-computed) | DMS definition; STATE_SPACE_SPEC §2 |
| constants.js:5 | `GATE_ARCSECONDS = 20250` | arc-sec per gate | DERIVED_RESULT | 1296000/64 = 20250 (re-computed) | from wheel ÷ 64 gates |
| constants.js:6 | `LINE_ARCSECONDS = 3375` | arc-sec per line | DERIVED_RESULT | 20250/6 (re-computed) | |
| constants.js:7 | `COLOR_ARCSECONDS = 562.5` | arc-sec per color | DERIVED_RESULT | 3375/6 | fractional arc-seconds enter here |
| constants.js:8 | `TONE_ARCSECONDS = 93.75` | arc-sec per tone | DERIVED_RESULT | 562.5/6 | |
| constants.js:9 | `BASE_ARCSECONDS = 18.75` | arc-sec per base | DERIVED_RESULT | 93.75/5 | |
| constants.js:10 | `ZODIAC_ARCSECONDS = 108000` | 30° per sign | DERIVED_RESULT | 1296000/12 | |
| constants.js:11 | `HOUSE_ARCSECONDS = 162000` | 45° per "trigram house" | DERIVED_RESULT | 1296000/8; STATE_SPACE_SPEC §2 | the 8-house division is spec-internal; not a classical corpus construct |
| constants.js:14 | `SCALES` ladder L0→L8+ | scale ladder | SOURCE_STATEMENT | STATE_SPACE_SPEC §1 (proposal §5, H2) | ladder itself is proposal H2-framed |
| constants.js:17 | `DIMENSIONS` five names | dimension vocabulary | SOURCE_STATEMENT | STATE_SPACE_SPEC §3 (proposal §7) | |
| constants.js:18-24 | `DIMENSION_META.interrogative` (Movement=Where, Being=When, …) | 5W-style question per dimension | SOURCE_STATEMENT | conflict resolved to "factory/SynthiaOS majority" (docs/corpus/existing-inventory.md "Conflict watch"; engine/questions.js OQ-3) | resolution is a majority vote over legacy codebases, not corpus adjudication — borderline CONFLICT-resolved |
| constants.js:19-23 | `DIMENSION_META.operation` (transition/transform/instantiate/structure/integrate) | operator verb per dimension | SOURCE_STATEMENT | STATE_SPACE_SPEC §3 | |
| constants.js:19 | `Movement.seedGate = 1` | seed gate for Movement | SOURCE_STATEMENT | GGM [L3016–3017] (corpus/generative-grammar-master.md:264): only Hexagram 1 → Movement is attested | the ONE attested gate→dimension mapping |
| constants.js:20-23 | `seedGate = 2, 6, 14, 20` (Evolution/Being/Design/Space) | seed gates for other dimensions | IMPLEMENTATION_CHOICE | no corpus attestation found (grep over docs/corpus); state-space/generative-grammar.js:315-317 admits gate→dimension is "partially specified (only Hexagram 1 → Movement is attested)" | **load-bearing**: router exposes seedGate per dimension (dimension-router.js:81) |
| constants.js:19-23 | `octave = 2..6` | dimension→octave | RENDERER_CONVENTION | STATE_SPACE_SPEC §5 | sound-renderer parameter; no corpus source |
| constants.js:27-36 | `TRIGRAMS` Fu Xi order, bits, values | 8 trigram identities | SOURCE_STATEMENT | corpus/moore-trigrams-of-han.md; corpus/adler-yijing-guide.md; Fu Xi binary order is standard | bits↔value arithmetic is STRUCTURAL_MATH (value = Σ bit·2ⁱ) |
| constants.js:39-47 | `mulberry32(seed)` | seeded PRNG | STRUCTURAL_MATH | published algorithm (mulberry32); deterministic by construction | |

### 2.2 `src/state-space/addressing.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| addressing.js:13-22 | `KING_WEN_TO_FUXI_DECIMAL` (64 entries) | King Wen gate# → Fu Xi binary decimal | SOURCE_STATEMENT | anchors in comment :12 (1→63, 2→0, 3→17); standard line-pattern derivation; corpus briefs confirm received sequence | **bijectivity re-verified by execution** (64 unique values); anchors checked: gate 3 ䷂ bits [1,0,0,0,1,0] = 17 ✓ |
| addressing.js:31-52 | `addressForArcSec(arcSec)` | arc-sec → canonical 11-field address | DERIVED_RESULT | pure division ladder over constants.js | roundtrip vs `arcSecForAddress` verified for sampled gate/line/color grid |
| addressing.js:55-65 | `arcSecForAddress(addr)` | address → arc-sec (inverse) | DERIVED_RESULT | exact inverse; verified | |
| addressing.js:68-74 | `gateBits(gate)` | gate → 6 bits (line 1 = bit 0) | DERIVED_RESULT | via verified table | bit-order convention consistent with fragments.js:15 |
| addressing.js:77-83 | `gateFromBits(bits)` | bits → King Wen gate | DERIVED_RESULT | roundtrip gate→bits→gate verified for all 64 | |
| addressing.js:86-89 | `hamming(a,b)` | Hamming distance | STRUCTURAL_MATH | definition | |
| addressing.js:92-94 | `addrKey(addr)` | compact key `G.L.C.T.B` | IMPLEMENTATION_CHOICE | format string | |

### 2.3 `src/state-space/letters.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| letters.js:8 | `VOWELS = {a,e,i,o,u}` | vowel set | IMPLEMENTATION_CHOICE | standard English; spec §8 says vowels = open states | y treated as consonant |
| letters.js:11-38 | `LETTER_PHONEMES` | grapheme → common English phoneme ids | IMPLEMENTATION_CHOICE | "common English phoneme classes" (comment :10); no corpus citation | feeds the H-F4 attribution chain (primitive-dimensions R-L1) |
| letters.js:43-53 | `candidateAddressFor(index)`: `gate=(i%64)+1, line=(i%6)+1, color=((i+1)%6)+1, tone=((i+2)%6)+1, base=(i%5)+1` | per-letter candidate DMS address | PROJECT_HYPOTHESIS | STATE_SPACE_SPEC §8:120-122 — "hypothesis-labeled, H3-controlled"; comment :40 "Candidate address … (hypothesis-labeled, H3-controlled)" | **label is comment-only**; runtime `candidateAddress` object carries no status field. FRAGMENT_ALGEBRA_SPEC C7 records conflict with the T11 phonetic rule. Verified at runtime: a→G1.L1.C2.T3.B1, z→G26.L2.C3.T4.B1 |
| letters.js:52 | `planetaryDimension = DIMENSIONS[index % 5]` | cyclic dimension per letter | PROJECT_HYPOTHESIS | same H3 comment; FRAGMENT_ALGEBRA_SPEC:432 "Legacy note … (H3 candidate addressing)" and C7 (:1153) | supersedable by LETTERS_DIMENSIONS (H-F4); both coexist |
| letters.js:51 | `addressForArcSec(arcSecForAddress(partial))` roundtrip | normalize candidate to full address | DERIVED_RESULT | addressing.js | note: `gate` here is a wheel *slot* number, not a Fu Xi bit pattern |
| letters.js:62 | `kind: vowel/consonant` | open vs gated state | SOURCE_STATEMENT | spec §8 "vowels = open states; consonants = gated states" | semantics ("open/gated") are spec-level |
| letters.js:65-66 | `sound: soundFor(addr)`, `color: colorFor(addr)` | attach renderer state | RENDERER_CONVENTION | via sounds.js/colors.js | every letter ships a bare sound+color with no provenance |

### 2.4 `src/state-space/sounds.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| sounds.js:6 | `BASE_FREQUENCY = 432` // "A4 = 432 Hz" | tuning base | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:69 "Base A4 = 432 Hz"; corpus existing-inventory.md:35: "sound map is synthetic (432Hz + hexagram scale)" | **comment/anchor mismatch**: under the :24 formula, 432 Hz lands on MIDI 57 = **A3**, not A4 (see §3f) |
| sounds.js:7 | `SCALEGRAM = [0,2,5,7,9,10]` | line→scale degree | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:73-74 ("hexagram scale"); semantics gong/shang/jue/zhi/yu labeled H-F2 in primitive-dimensions.js:147 | degree 10 (line 6) is outside the classical pentatonic five — admitted in spec |
| sounds.js:8 | `TIMBRES` (6 waveforms, color 1-6) | color→timbre | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:75 | no corpus source |
| sounds.js:9 | `DURATIONS = [0.25…4]` beats, tone 1-6 | tone→duration | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:76 ("1 staccato(1/16) … 6 legato(whole)") | beats ≠ note values; loose rendering of the spec's articulation ladder |
| sounds.js:10 | `VELOCITIES = [0.4,0.55,0.7,0.85,1.0]`, base 1-5 | base→velocity | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:77 | |
| sounds.js:19 | `pitchClass = (zodiac||1) - 1` (A♭=0…G=11) | zodiac→pitch class | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:69 | no corpus source for sign→semitone |
| sounds.js:21-22 | `cents = arcSecWithinSign/108000*100` | micro-detune | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:70-71 | |
| sounds.js:24 | `f = 432·2^((octave·12 + pitchClass + scaleDegree + cents/100 − 57)/12)` | frequency formula | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:79 (verbatim, incl. the −57) | −57 anchor defect inherited from spec; see §3f |
| sounds.js:17-18 | `octave = DIMENSION_META[dim].octave` (default Being) | dimension→octave | RENDERER_CONVENTION | spec §5:72 | default dim = 'Being' is an IMPLEMENTATION_CHOICE fallback |
| sounds.js:34 | `rhythmicSlot = (house||1) − 1` | house→8-beat slot | RENDERER_CONVENTION | STATE_SPACE_SPEC §5:78 | |
| sounds.js:42-69 | `transitionSound` (gliss/transpose/octaveShift/velocityScale/rest) | transition sound modifiers | DERIVED_RESULT | mechanical over transitions.js soundEffect table | the effect *values* are RENDERER_CONVENTION (transitions.js) |

### 2.5 `src/state-space/colors.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| colors.js:8-15 | `COLOR_ANCHORS` 6 named hexes | HD 6-color palette anchors | RENDERER_CONVENTION | STATE_SPACE_SPEC §6:88-91; dimension bridge labeled H-F5 (primitive-dimensions.js:217-223); corpus: Wen C5 senses agree only partially | hex values themselves have no source anywhere |
| colors.js:18-20 | `DIMENSION_LAYERS` (stroke/fill/glow/frame/ground) | dimension→render layer | RENDERER_CONVENTION | STATE_SPACE_SPEC §6:92 | |
| colors.js:28 | `hue = (arcSec mod 1296000)/1296000·360` | wheel position → hue | RENDERER_CONVENTION | STATE_SPACE_SPEC §6:84 "the wheel IS the spectrum"; note code uses *total* arcSec while spec §6:84 says `gateArcSeconds` | no corpus source; spec/code wording drift (total vs gate arcSec — numerically identical since hue is mod-360) |
| colors.js:29 | `sat = 30 + line·10` | line→saturation | RENDERER_CONVENTION | STATE_SPACE_SPEC §6:85 | |
| colors.js:30 | `light = 25 + tone·7` | tone→lightness | RENDERER_CONVENTION | STATE_SPACE_SPEC §6:86 | |
| colors.js:31 | default `dim = 'Being'` | fallback layer | IMPLEMENTATION_CHOICE | — | silent default |
| colors.js:65-82 | `hslToHex(h,s,l)` | standard HSL→#RRGGBB | STRUCTURAL_MATH | standard algorithm | |
| colors.js:44-62 | `transitionColor` | transition color modifiers | DERIVED_RESULT | mechanical over transitions.js colorEffect | effect values are RENDERER_CONVENTION |

### 2.6 `src/state-space/transitions.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| transitions.js:7-24 | `NAMED_TRANSITIONS` (16 ids, symbols, effects) | transition lexicon | SOURCE_STATEMENT | STATE_SPACE_SPEC §7 table (all 16 rows match) | |
| transitions.js:8-23 | `soundEffect`/`colorEffect` values per transition | renderer modifiers | RENDERER_CONVENTION | STATE_SPACE_SPEC §7 sound/color columns (qualitative there; numeric values e.g. hueShift:+40 match §7 "hue flash +40°") | |
| transitions.js:8-23 | `operatorId` per transition | transition→operator binding | SOURCE_STATEMENT | spec §7 + §4; comment :5-6 (activation-dynamic edges ride o_transform) | |

### 2.7 `src/state-space/features.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| features.js:8-30 | `FEATURES` (21 distinctive features) | L0 feature inventory | SOURCE_STATEMENT | STATE_SPACE_SPEC §8 (proposal App. A): [±voice], place 6, manner 6, vowel marks | |
| features.js:38-83 | `PHONEMES` (24 C + 12 V + 5 diphthongs) as feature bundles | L1 phoneme inventory | SOURCE_STATEMENT | proposal App. A per spec §8 header :1 | ASCII-folded ids are IMPLEMENTATION_CHOICE (admitted :37); standard English IPA inventory |
| features.js:89-92 | `bundleSignature` | canonical bundle string | IMPLEMENTATION_CHOICE | sorted "axis:value" join | deterministic, total (admitted fallback :88) |

### 2.8 `src/state-space/dimensions.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| dimensions.js:7-13 | `DIMENSION_CHAINS` (4-step ladders; Design 5 steps) | per-dimension behavioral micro-programs | SOURCE_STATEMENT | docs/IMPLEMENTATION_CONTRACT.md:101 (verbatim); comment :5-6 "(contract)" | **corpus attestation not found** — contract-internal; treat as unsupported for corpus-truth purposes |
| dimensions.js:18-40 | `projectDimension(state, from, to)` | T_{i→j} re-representation | PROJECT_HYPOTHESIS | comment :16-17: "hypothesis H4 — measured, never asserted"; STATE_SPACE_SPEC §3 | well-labeled |

### 2.9 `src/state-space/operators.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| operators.js:17-20 | `promoteScale` | next rung up SCALES | DERIVED_RESULT | over constants.js:14 ladder | |
| operators.js:28-38 | `o_bundle` transform | unordered composition | DERIVED_RESULT | rule per STATE_SPACE_SPEC §4 | identity-preserving slots mechanical |
| operators.js:40-53 | `o_sequence` transform | ordered composition, scale promotion | DERIVED_RESULT | spec §4 | |
| operators.js:55-66 | `o_project` transform | delegates to projectDimension | PROJECT_HYPOTHESIS | H4 (dimensions.js) | invariant field itself records "representation-not-preserved (H4, measured)" :58 — good labeling |
| operators.js:68-83 | `o_recurse` (depth default 1, maxDepth 8) | bounded recursion | DERIVED_RESULT | spec §4 | maxDepth=8 is IMPLEMENTATION_CHOICE |
| operators.js:85-100 | `o_transform` | named transition / pure rule application | DERIVED_RESULT | spec §4 | |
| operators.js:102-117 | `o_automaton` | state set → machine descriptor | DERIVED_RESULT | spec §4 | q0/finals conventions IMPLEMENTATION_CHOICE |
| operators.js:119-130 | `o_discourse` (`coherencePressure = 1/n`) | L5→L6 weave | DERIVED_RESULT | spec §4 | 1/n pressure formula is IMPLEMENTATION_CHOICE |
| operators.js:132-138 | `o_reverse` | bit-order reversal | STRUCTURAL_MATH | involution verified (spec §4; contract) | Fu Xi variation per corpus |
| operators.js:140-146 | `o_inverse` | yin↔yang flip (pang tong) | STRUCTURAL_MATH | involution; fragments.js T7 SOURCE (Hatcher vol.2) | |
| operators.js:148-157 | `o_converse = reverse ∘ inverse` | 180° antipode | CONFLICT | comment :149 admits CHOICE; fragments.js:233-235 + PAIR_STRUCTURES.jiaoGua (:264-269) records that trigram-swap (jiao gua) is a DISTINCT operator (Conflicts C4) — spec §4's "trigram swap" wording ≠ code semantics except on special gates | code comment is honest; the spec table wording conflicts with code |
| operators.js:159-171 | `o_nuclear` (lines 2-3-4 / 3-4-5) | nuclear hexagram extraction | SOURCE_STATEMENT | classical hu ti/hu gua; fragments.js T5 (Hatcher vol.2 pp.18-19) | extraction itself DERIVED once convention fixed |
| operators.js:173-188 | `o_change` (xor mask) | moving-line target state | DERIVED_RESULT | xor-exact; classical zhi-gua | mask-of-zero identity ✓ |

### 2.10 `src/state-space/lexicon.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| lexicon.js:4-21 | `TOOL_IDS` (16) | canonical tool registry | SOURCE_STATEMENT | spec §11; contract | |
| lexicon.js:23-35 | `TOOL_ALIASES` | alias map | IMPLEMENTATION_CHOICE | — | |
| lexicon.js:37-41 | `KEYWORDS` (then/at/--) | grammar keywords | SOURCE_STATEMENT | IMPLEMENTATION_CONTRACT.md:83 | |
| lexicon.js:45-75 | `SEED_WORDS` (67) | POS seed lexicon | IMPLEMENTATION_CHOICE | "common seeds" (:44) | closed classes claimed exhaustive for chosen sets |
| lexicon.js:80-89 | `posGuess` suffix heuristics | fallback POS tagger | IMPLEMENTATION_CHOICE | ing/ed/ly/tion… rules | default NOUN |

### 2.11 `src/state-space/fragments.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| fragments.js:22-31 | `LINES` T2 (6/7/8/9 old/young yin/yang) | casting line values | SOURCE_STATEMENT | T2 (Hatcher v1 p.43; Adler pp.30-31; Rutt p.156) per :23 | bit/moving derivations are mechanical |
| fragments.js:35-56 | `SI_XIANG` T3 (four bigrams, seasons/directions/elements) | bigram attributes | SOURCE_STATEMENT | T3 (Hatcher v1 pp.455-461; Wen T5-4; Adler T1.4) per :36 | `primaryDimension` rides hypothesis H-F6→H-F3 (:42 etc.) — labeled in `dimensionRule` field ✓ |
| fragments.js:62-147 | `TRIGRAM_MATRIX` T4 (8 trigrams × ~20 attributes) | trigram attribute matrix | SOURCE_STATEMENT | per-row `sources` lists (Hatcher/Govinda/Adler/Moore/Wen) | Reifler color rows explicitly marked "conflict C1" (:81,101,111,121,131,141) — CONFLICT handled in-band ✓; animal emendation C2 not adopted ✓; `dimension.secondary` rides H-F3, labeled in `rule` field ✓ |
| fragments.js:157-171 | `nuclearTrigrams` / `nuclearHexagramBits` / `nuclearHexagram` | nuclear extraction | DERIVED_RESULT | over verified bit codec; T5 convention (Hatcher) | |
| fragments.js:181-191 | `NUCLEAR_CLOSURE` (16 nuclei × 4 members; second-order {1,2,63,64}) | T5 closure table | SOURCE_STATEMENT | T5 (Hatcher v2 pp.18-19) **with two transcription corrections verified against the computed operator** (:175-180) | corrections are DERIVED_RESULT-verified; exemplary practice |
| fragments.js:201-216 | `HEXAGRAMS` T6 special sets | hexagram-level classes | SOURCE_STATEMENT | T6 (Adler/Hatcher/Moore) per :202 | set membership is STRUCTURAL_MATH-checkable |
| fragments.js:228-244 | `complementBits`/`reverseBits`/`swapTrigrams` + gate partners | bit involutions | STRUCTURAL_MATH | pang tong / qian gua / jiao gua (Hatcher v2 pp.13-18) | jiao gua correctly distinguished from antipode (:233-235) |
| fragments.js:246-283 | `PAIR_STRUCTURES` T7 | pair tables | SOURCE_STATEMENT | T7 (Hatcher v2 pp.13-18) per :247 | R-H9 rule labeled (:249) |
| fragments.js:299-331 | `ARRANGEMENTS` T8 (xiantian/houtian/mawangdui/eight-palaces/12 sovereign) | arrangement rules | SOURCE_STATEMENT | T8 (Hatcher v2; Adler; Moore) per :300 | |
| fragments.js:335 | `xiantianIndex` | gate → Fu Xi decimal | DERIVED_RESULT | delegates to verified bijection | |
| fragments.js:339-353 | `ZHU_XI_EVALUATION` T17 (8-case table) | reading decision rules | SOURCE_STATEMENT | T17 (Adler pp.70-71; Hatcher v2 pp.33-34; Rutt) per :340 | R-H10 overlay "recorded, not part of deterministic core" ✓ |
| fragments.js:357-390 | `evaluateReading(cast)` | deterministic case dispatch | DERIVED_RESULT | mechanical over T17 | |
| fragments.js:394-407 | `FOUR_SLOT_STATEMENT` T18 | output grammar slots | SOURCE_STATEMENT | T18 (Rutt pp.123,131-4,205-6,221) per :395 | slot `dimension` fields are the spec's own attributions (secondary layer, not corpus-explicit) |
| fragments.js:410-425 | `VALUATION` T10 (ji/wujiu/li/xiong/ta + frequencies) | valence lexicon | SOURCE_STATEMENT | T10 (Rutt pp.133-4) per :411 | "folds into Being.valence" is the spec's resolution decision |
| fragments.js:431-439 | `CASTING` T19 distributions | coin/yarrow line odds | SOURCE_STATEMENT | T19/T16-P5 (Rutt pp.156,166-9; Adler pp.29-30; Moore p.85) | coin distribution also STRUCTURAL_MATH (2³ sums); yarrow empirical numbers transcribed from Rutt |
| fragments.js:450-474 | `castLine`/`castHexagram` | seeded casting | DERIVED_RESULT | over CASTING + verified codec | rng injected ✓ |

### 2.12 `src/state-space/primitive-dimensions.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| primitive-dimensions.js:17-21 | `WUXING_DIMENSION` (Wood→Movement, Fire→Evolution, Earth→Being, Metal→Design, Water→Space) | wuxing→dimension bridge | PROJECT_HYPOTHESIS | `hypothesis: 'H-F3'` field (:19); spec §3d R-C2 (Adler T1.3/T1.4 anchored balance→Being) | **the load-bearing bridge** — properly labeled ✓ |
| primitive-dimensions.js:26-30 | `MANNER_DIMENSION` (stop→Movement, fricative→Evolution, vowel→Being, nasal→Space, liquid/glide/affricate→Design) | manner→dimension | PROJECT_HYPOTHESIS | `hypothesis: 'H-F4'` (:28); spec §3a T11; spec:430 admits "class→dimension map is synthesis = H-F4" | labeled ✓ |
| primitive-dimensions.js:34-43 | `mannerOfPhoneme` | manner from bundle (R-L2) | DERIVED_RESULT | spec:430 "R-L1/R-L2/R-L4 are mechanical" | two manner features → affricate ✓ |
| primitive-dimensions.js:49-58 | `voiceSecondaryOfPhoneme` (voiced→Evolution, voiceless→Space) | R-L4 voice axis | SOURCE_STATEMENT | Hatcher E1 v1 pp.449-452 (:45-48); spec:439 | rule has corpus warrant; inherently-voiced extension is a documented patch (:47-49); can return `null` (:57) |
| primitive-dimensions.js:74 | `voice: secondary === 'Evolution' ? '+' : '-'` | voice sign for letter table | DERIVED_RESULT | spec T11 emits only '+/'-' for all 26 letters (FRAGMENT_ALGEBRA_SPEC:442-467) | matches spec's binary table; latent defect: would print '-' for a null secondary (currently unreachable — verified: 0/41 phonemes return null). See §3e |
| primitive-dimensions.js:86-104 | `LETTERS_DIMENSIONS` (materialized 26-letter table) | semantic letter attribution | PROJECT_HYPOTHESIS | `hypothesis: 'H-F4'` (:88) | `distributionNote` honestly reports thin Space (:103) ✓ |
| primitive-dimensions.js:112-138 | `UNIFIED_SYNTAX_FIELD` (19 marks, `dimension: null` + separate `hF1b`) | punctuation/syntax marks | SOURCE_STATEMENT | canon GGM §3a [L135-178] (:113-115); `dimension: null` is canonical, `hF1b` hypothesis segregated | **the good pattern** (§3i); verified at runtime via dimensionOf('mark','•') → {primary:null, basis:'canon', hypothesisId:'H-F1b', tentative:{primary:'Being'}} |
| primitive-dimensions.js:142-183 | `SOUND_DIMENSIONS` T13 | sound parameter semantics | PROJECT_HYPOTHESIS | mixed: R-S1 rule (:145); five-tone rows carry `hypothesis:'H-F2'` (:150-158,166-170) | per-row hypothesis fields ✓; base_frequency attribution labeled H-F2 (:150) |
| primitive-dimensions.js:187-225 | `COLOR_DIMENSIONS` T14 | color channel semantics | PROJECT_HYPOTHESIS | R-C1 channels `hypothesis:'H-F5'` (:194-196); R-C2 wuxing `hypothesis:'H-F3'` (:200-204); Shuogua-attested trigram colors vs "H-F5 extension" flagged (:212-214) | attested vs extended colors are distinguished ✓ |
| primitive-dimensions.js:229-253 | `FRAGMENT_DIMENSIONS` T15 (20 rows) | fragment-class dimension rules | IMPLEMENTATION_CHOICE | class-level "rules" are the spec author's synthesis (spec §3e); per-row `rule` strings cite warrants | labeled `basis:'rule'` in dimensionOf; these are argued syntheses, not source statements — the spec itself is the "source" |
| primitive-dimensions.js:261-272 | `SENSE_DIMENSIONS` (see→Movement, taste→Evolution, touch→Being, smell→Design, hear→Space) | sense↔dimension canon | SOURCE_STATEMENT | GGM §1a/§2 [L636-674] chain evidence per row (:265-269); "matches src/engine/intake.js one-for-one" (:262) | **verified against intake.js: see ✓ taste ✓ touch ✓ smell ✓ hear ✓**; C15 tone-level inconsistency disclosed (:271) |
| primitive-dimensions.js:279-326 | `dimensionOf(kind, id)` | unified lookup returning `{primary, secondary, basis, hypothesisId?}` | DERIVED_RESULT | dispatch over the tables above | **the provenance-carrying access pattern the rest of the codebase lacks** |

### 2.13 `src/state-space/generative-grammar.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| generative-grammar.js:26-29 | `SLOT_ORDER` (12 slots) | sentence slot order | SOURCE_STATEMENT | GGM §6a-6b [L2698-2711] (:22-24) | |
| generative-grammar.js:31-68 | `SLOT_GRAMMAR` T23 | slot definitions + roles | SOURCE_STATEMENT | per-slot `sources` (GGM line refs) | |
| generative-grammar.js:70-75 | `EMERGENT_CLOSURE` | interference closure, off by default | SOURCE_STATEMENT | GGM §6b [L1900-1903, L2399-2404] | default-OFF is IMPLEMENTATION_CHOICE honored from PL2 step 6 |
| generative-grammar.js:81-131 | `PRODUCTIONS` P9–P14 | rewrite rules with `codeStatus` | SOURCE_STATEMENT | per-rule `sources` (GGM §6g etc.) | `codeStatus` fields disclose fixture gaps (e.g. P11 :103) ✓ |
| generative-grammar.js:135-139 | `VERB_FIELD_TRIAD` (= – →) | verbs of being | SOURCE_STATEMENT | GGM §4 [L181-206] (:133-134) | |
| generative-grammar.js:151-159 | `DIMENSION_KEYNOTES` / `CRYSTAL_KEYNOTES` / `KEYNOTE_FUNCTIONS` | 'I ___' keynotes | SOURCE_STATEMENT | GGM §1a [L20…], §6f [L922-933]; C13/C14 alternates disclosed (:154) | |
| generative-grammar.js:162-175 | `ZODIAC_SIGNS` / `SIGN_MODALITY` / `MODALITY_VERBS` | sign→modality→verb flavor | SOURCE_STATEMENT | GGM §6c [L2218-2246] (:161); modality assignments are standard astrology | verb word lists are the author's |
| generative-grammar.js:199-263 | `parseRewrite` / `formatRewrite` | rewrite-notation parser | DERIVED_RESULT | GGM §6g [L1089-1091] format | roundtrip property claimed in comment :213 |
| generative-grammar.js:272-287 | `composeAddress` (O = B∘T∘M∘L∘G) | address composition operator | DERIVED_RESULT | GGM §6g [L5786-5790]; addressing.js | |
| generative-grammar.js:295-309 | `LINE_NAMES`, `COLOR_MOTIVES`, `TONE_WORDS`, `BASE_SEEDS`, `PLANET_KEYWORDS`, `CENTER_VOICES` fixtures | default slot lexicons | IMPLEMENTATION_CHOICE | comment :290-293: "stand-in fixtures, overridable"; P11 codeStatus admits 384-name lexicon is not in corpus | honestly disclosed ✓ |
| generative-grammar.js:317 | `DEFAULT_DIMENSION = 'Being'` | fallback dimension | IMPLEMENTATION_CHOICE | comment :314-316: only Hexagram 1→Movement attested [L3016-3017] | silent fallback everywhere `address.dimension` absent |
| generative-grammar.js:321-338 | `deepStructure(address)` | T25 waveform substrate | DERIVED_RESULT | addressing.js math | |
| generative-grammar.js:355 | `planet = PLANETS[(gate + line − 2) % 7]` | deterministic planet pick | IMPLEMENTATION_CHOICE | no source; real planetary activation tables not in corpus | **bare arbitrary mapping** inside otherwise canon-driven builder |
| generative-grammar.js:362 | `center = centerForGate(gate) || 'G'` | center from gate | DERIVED_RESULT | centers-channels.js CENTERS (contract) | 'G' fallback is IMPLEMENTATION_CHOICE |
| generative-grammar.js:366 | `axisGate = complement` | polarity axis | DERIVED_RESULT | spec §6b [L2709] (Axis = opposite polarity) | |
| generative-grammar.js:374 | `beat = (gate·line·color·tone·base mod 100)/100`, threshold 0.9 | interference score | IMPLEMENTATION_CHOICE | PL2 step 6; "interference arithmetic unspecified" (PIPELINES PL3 :509) | arbitrary hash-like product; disclosed threshold |
| generative-grammar.js:391-424 | `TEMPLATES` (4 canonical forms) | surface templates | SOURCE_STATEMENT | GGM §6d [L1912-1914, L2411-2414, L3470-3473, L3614-3617] (:389-424 headers) | template *wording* is code-side rendering of canon forms |
| generative-grammar.js:447-461 | `BINARY_OVERLAY` / `SENTENCE_FORMS` | line-state→sentence-form map | SOURCE_STATEMENT | GGM §6h [L1745-1777] (:443-445) | |
| generative-grammar.js:465-476 | `sentenceFormFor` | form selection | DERIVED_RESULT | over overlay table | |
| generative-grammar.js:479-492 | `overlaySentence` | surface-string transforms | IMPLEMENTATION_CHOICE | the *mechanics* of mirror/nest/echo on comma-joined clauses is code-invented | the forms are canon; the string surgery is not |
| generative-grammar.js:499-531 | `PIPELINES` PL1–PL9 classification | mechanism vs needs-definition registry | SOURCE_STATEMENT | GGM §6f per-row sourceRef | needs-definition items "named, never faked" (:496) ✓ |
| generative-grammar.js:544-547 | `pressureScores = slot/max` | normalized slot intensities | IMPLEMENTATION_CHOICE | PL1 [L903-917] process is canon; this numeric recipe is not | |
| generative-grammar.js:574-575 | `CRYSTALLINE_PRIORITY`, `PLANETARY_RULERSHIP` | authority tie-breaks | SOURCE_STATEMENT | GGM [L958-972] (:570-573) | sort-stable encoding is DERIVED |
| generative-grammar.js:654-666 | `dmsToSentenceForm` | PL4 conversion | DERIVED_RESULT | [L1735-1794]; CI formula explicitly NEEDS-DEFINITION (:664) | |

### 2.14 `src/merged/gate-field.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| gate-field.js:14-20 | `DIMENSION_LADDERS` | per-dimension rung ladders | SOURCE_STATEMENT | duplicates DIMENSION_CHAINS (dimensions.js:7-13; contract :101) | same corpus-attestation gap as DIMENSION_CHAINS |
| gate-field.js:22 | `HISTORY_LIMIT = 24` | history ring size | IMPLEMENTATION_CHOICE | — | |
| gate-field.js:23 | `pickRung = ladder[min(len−1, floor(clamp(α)·len))]` | activation→rung | IMPLEMENTATION_CHOICE | — | **zero-state defect**: α=0 → rung 0 ('wait', …) not a dormant state; verified (§3d) |
| gate-field.js:24 | `signature = Σ bit·2ⁱ` | structural signature | STRUCTURAL_MATH | Fu Xi decimal of the vector | |
| gate-field.js:51-85 | `observe(ctx)` | per-tick per-dimension evaluation | IMPLEMENTATION_CHOICE | merged from synth-ai-integrated-v2.3 (MERGE_NOTES.md:17); no spec formula | composite; components below |
| gate-field.js:54 | `changed = lastInputKey ≠ inputKey` | change detection | IMPLEMENTATION_CHOICE | — | **`ctx.changed` documented (:49, :167) but never read** — recomputed locally; verified: passing `changed:true` with same inputKey has no effect (§3c) |
| gate-field.js:61 | `changedBonus = 0.1` only for Evolution/Movement | polarity/impulse dimensions get change bonus | IMPLEMENTATION_CHOICE | — | asymmetric; no source |
| gate-field.js:62 | `α = clamp(0.4·S + 0.4·R + 0.2·A + 0.1·C)` | activation formula | IMPLEMENTATION_CHOICE | no doc anywhere (grep of docs/ finds no 0.4/0.2 weights); legacy merge | **weights sum to 1.1** (for Movement/Evolution; 1.0 for others); clamp [0,1] hides it; verified: gate 1 + full context → 1.0 (§3c) |
| gate-field.js:133-137 | `#structure()`: `chunks[i] = mean(bits where j%5 === i)` | 6-bit → 5-dimension projection | IMPLEMENTATION_CHOICE | comment :134 "chunk the 6-bit vector across the 5 dimensions (bit j feeds dimension j%5)" | **asymmetric**: Movement gets bits {0,5} → values {0, 0.5, 1}; all others 1 bit → {0,1}; verified with gate 23 (§3b) |
| gate-field.js:92-110 | `meet(other)` | Hamming-derived relation | DERIVED_RESULT | overlap=(6−d)/6, tension=d/6; MERGE_NOTES:17 "meet() is Hamming-derived per contract" | |
| gate-field.js:174 | top-8 active gates | field view | IMPLEMENTATION_CHOICE | — | |
| gate-field.js:188-193 | relations cap 128 | memory bound | IMPLEMENTATION_CHOICE | — | |
| gate-field.js:222 | engaged threshold `activation > 0.45` | voice engagement | IMPLEMENTATION_CHOICE | — | arbitrary cut |
| gate-field.js:129-131 | `#empty()` → `choice: 'quiet'` | pre-observation dormant state | IMPLEMENTATION_CHOICE | — | the *right* dormant pattern — but it is overwritten by pickRung on the first observe() (§3d) |
| gate-field.js:36 | `vector = gatePattern(gate)` | 6-bit vector from kingwen.js | DERIVED_RESULT | kingwen.js table = same verified KING_WEN table | |

### 2.15 `src/merged/centers-channels.js`

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| centers-channels.js:9-16 | `CANONICAL_CHANNELS` (36 pairs) | HD bodygraph channels | SOURCE_STATEMENT | "exactly per contract" (:4-8); standard Human Design bodygraph wiring; source's [20,10]/[60,3]/[61,24]/[63,4] duplicates replaced by contract list — disclosed | CONFLICT-resolved, documented in-band ✓ |
| centers-channels.js:23-33 | `CENTERS` (9 centers, gate sets) | center→gates | SOURCE_STATEMENT | contract; standard HD; gate-57 Sacral/Spleen duplication fixed and disclosed (:18-22) | CONFLICT-resolved ✓ |
| centers-channels.js:42-59 | `channelsForGate` / `centerForGate` / `channelPartners` | lookups | DERIVED_RESULT | over the tables | |

### 2.16 `src/engine/` (representative)

| file:line | name / expression | what it does | tag | evidence / citation | notes |
|---|---|---|---|---|---|
| intake.js:118-120 | `arcSec = fnv1a32(stableStringify(normalized)) mod 1296000` | input→address | PROJECT_HYPOTHESIS | `addressBasis:'hash-candidate'` carried at runtime (:182) + derivation evaluation `hypothesis:'H3'` (:166) | **runtime-carried label — the pattern §4 asks for**; collisions possible (32-bit hash mod 1296000) |
| intake.js:29-33 + 317/331/342/391/420 | sense→dimension (see→Movement, taste→Evolution, touch→Being, smell→Design, hear→Space) | five mechanical senses | SOURCE_STATEMENT | GGM canon (primitive-dimensions.js:261-272, verified one-for-one) | |
| intake.js:322-324 | `angle = h mod 360`, dx/dy from hash halves | see(X) direction vector | IMPLEMENTATION_CHOICE | hash-derived; comment :316 | |
| intake.js:326 | `momentum = tokens/64` | normalizer | IMPLEMENTATION_CHOICE | comment :326 admits the 64-word rationale | |
| intake.js:331-339 | `familiarity = seen/total` | taste(X) | DERIVED_RESULT | over token memory | |
| intake.js:342-374 | touch: nesting depth, Shannon entropy, unique-token pressure | texture metrics | STRUCTURAL_MATH | entropy is standard Shannon; nesting counter mechanical | choice of *which* texture metrics = IMPLEMENTATION_CHOICE |
| intake.js:391-417 | smell: 6-component scent vector (structure/rhythm/density/polarity/recursion/warmth formulas) | scent signature | IMPLEMENTATION_CHOICE | comment :377-390 discloses each recipe | |
| intake.js:398-403 | `yangLines` from bits of `(gate−1)` | polarity charge | IMPLEMENTATION_CHOICE | comment :399-402 **admits** "is NOT the gate pattern … use (gate−1)" | honest in-band disclosure ✓ (but the value is still arbitrary) |
| intake.js:298-312 | `ρ = (5·gate + 3·line + 2·color + 2·tone + 1·base)/15` | history resonance | IMPLEMENTATION_CHOICE | comment :19 | **normalizer defect**: weights sum to 13, divisor is 15 → identical re-intake yields ρ = 13/15 ≈ 0.867, never 1 (verified, §3-checklist notes) |
| intake.js:252-281 | regime defaults: code→Design, data→Evolution, opaque→Being, ambiguous→first, unresolved→Being | Φ_t routing fallbacks | IMPLEMENTATION_CHOICE | — | `status` field records which fallback fired ✓ (good) |
| klein.js:9 | `K_i(C_t) = (relation, intensity, direction)` | Klein contextual operator | SOURCE_STATEMENT | "source document's formal definition" (:6-9) | |
| klein.js:46 | `ENVELOPE_TRANSITIONS = {ignition, automatize}` | envelope exclusion set | IMPLEMENTATION_CHOICE | rationale :18-20 | |
| klein.js (intensity) | `s/(s+|states|)`, 50/50 blend with ctx activation | intensity formula | IMPLEMENTATION_CHOICE | comment :21-24 | |
| klein.js (direction) | toward/away/neutral rule | direction rule | IMPLEMENTATION_CHOICE | comment :25-28 | |
| ledger.js:19-30 | 7-tuple (Np,Ns,Ne,No,Dr,Ac,Tc); Dr/Ac high-water | complexity ledger | SOURCE_STATEMENT | spec §12 (:1-5) | max-vs-sum merge semantics IMPLEMENTATION_CHOICE (documented :16, :29-30) |
| derivation.js:24-75 | `stableStringify` + `fnv1a32` | canonical serialization + hash | STRUCTURAL_MATH | FNV-1a 0x811c9dc5/16777619 standard | |
| derivation.js:83 | hash excludes `timestamp` | no-wall-clock rule | IMPLEMENTATION_CHOICE | documented :14-16 | engine rule, consistently applied (synthia.js header) |
| learning.js:44 | `ROUTE_THRESHOLD = 0.2` | capability routing cut | IMPLEMENTATION_CHOICE | — | |
| learning.js:47 | `CHANNEL_BOOST = 1.25` | composite-channel score boost | IMPLEMENTATION_CHOICE | comment :46 | |
| learning.js:50+ | `CAPABILITY_HINTS` word lists | routing vocabulary | IMPLEMENTATION_CHOICE | "curated" (:49) | |
| questions.js:14-36 | OPEN_QUESTIONS OQ-1..OQ-3 with candidateTests/linkedHypothesis | unresolved-question registry | SOURCE_STATEMENT | records known gaps (incl. H3/OQ-2, H4/OQ-3) | **exemplary provenance practice** — resolution requires an evidence id (:8-10) |
| prediction.js:63-68 | `PREDICTION_DISCLAIMER` (H-F7) | mechanism-not-oracle banner | PROJECT_HYPOTHESIS | FRAGMENT_ALGEBRA_SPEC §5 T19 quoted verbatim; H-F7 named | runtime string ✓ |
| prediction.js:26-32 | `FRAGMENTS` feature-detection + swap probe | defensive cross-module integration | DERIVED_RESULT | probe verifies fragments `swapTrigrams` against local reference before use | careful pattern ✓ |
| triples.js:29 | `confidence = 1` default | triple confidence | IMPLEMENTATION_CHOICE | — | **bare confidence**: every triple defaults to 1.0 regardless of epistemic status of its content |
| synthia.js (ring wiring) | default ring: registry order output→input | mesh topology default | IMPLEMENTATION_CHOICE | header comment | |
| experiments/relational-capability.js:261-273 | H10 pre-registered decision rule (chain=1, all baselines 0 → supported) | decisive experiment | EXPERIMENTAL_RESULT | registration block :4-46; decision rule pre-registered (:259 "pre-registered decision rule") | result object carries hypothesis:'H10', artifacts, interpretation, reason (:277-302) ✓ |

---

## 3. Known-issue verification checklist

External-audit claims checked against the **actual code** (line numbers current as of
this audit; dynamic claims re-verified by executing the code under Node).

**a. letters.js index-modulo address assignment — TRUE.**
`letters.js:45-49` has exactly `gate=(index%64)+1`, `line=(index%6)+1`,
`color=((index+1)%6)+1`, `tone=((index+2)%6)+1`, `base=(index%5)+1`;
`letters.js:52` has `full.planetaryDimension = DIMENSIONS[index % 5]`.
Labeled: comment :40 calls it "Candidate address … (hypothesis-labeled,
H3-controlled)" and STATE_SPACE_SPEC §8:121 says "hypothesis-labeled,
H3-controlled". **Caveat the external audit may have missed:** the label is
*comment-only* — the runtime `candidateAddress` object is a bare address with no
status/basis field. Verified values: a→G1.L1.C2.T3.B1/Movement,
z→G26.L2.C3.T4.B1/Movement (index 25 mod 5 = 0).

**b. 6 line bits → 5 dimensions via j%5, Movement asymmetric — TRUE.**
Exact code: `merged/gate-field.js:133-137` (`#structure()`,
`chunks[i] = mean(this.vector.filter((_, j) => j % 5 === i))`, mapped
Movement:0 … Space:4). For j ∈ {0..5}, j%5 = 0,1,2,3,4,0 → **Movement receives
bits 0 and 5 (2 bits, mean ∈ {0, 0.5, 1}); Evolution/Being/Design/Space receive
1 bit each (mean ∈ {0, 1})**. Verified by execution: gate 23 (vector
[0,0,0,0,0,1]) → Movement structure 0.5, Being 0; zero vector → all 0; gate 1 →
all 1. Movement carries double structural weight and is the only dimension that
can express a half-activated structure.

**c. activation α=0.4S+0.4R+0.2A+0.1C, weights sum 1.1, clamp [0,1]; ctx.changed ignored — TRUE (both parts).**
Exact code: `merged/gate-field.js:62`
(`clamp(structure[d]*0.4 + r*0.4 + (isAddressed?0.2:0) + changedBonus)`) with
`changedBonus = 0.1` for Evolution/Movement only (:61) and `clamp` to [0,1] (:6).
Weights sum: 0.4+0.4+0.2+0.1 = **1.1** for Movement/Evolution, 1.0 for the other
three (re-computed; the clamp silently absorbs the overflow — verified: gate 1
with full context clamps to 1.0). **ctx.changed:** the JSDoc at :49 and :167
documents a `changed` ctx field, but `observe()` never reads it — `changed` is
recomputed from `lastInputKey !== inputKey` at :54. Verified: passing
`{changed:true}` with an unchanged inputKey yields `evidence.changed:false` and
no bonus; changing inputKey without the flag yields the bonus. So the claim is
TRUE, with the refinement that "ignored/recomputed" = **ignored AND recomputed**.

**d. zero-state maps to first active rung instead of quiet/dormant — TRUE.**
`pickRung` (gate-field.js:23): `ladder[Math.min(len-1, Math.floor(clamp(α)·len))]`
→ α=0 selects `ladder[0]` = 'wait'/'retain'/'remain-self'/'sense'/'witness'.
Verified by execution: zero-vector locus observed with resonance 0 reports
`activation:0, choice:'wait'`. **Refinement:** a dormant state *does* exist —
`#empty()` (:129-131) sets `choice:'quiet'` — but only pre-observation; the first
`observe()` overwrites it even at zero activation. So the dormant vocabulary is
present but unreachable in steady state.

**e. primitive-dimensions.js voice forced binary instead of three-valued {+,-,∅} — PARTIAL.**
The ternary exists: `primitive-dimensions.js:74`
`voice: secondary === 'Evolution' ? '+' : '-'` — but note the external audit's
parenthetical has the polarity inverted (it guessed `'-' : '+'`; the actual code
maps Evolution→'+'). The "instead of three-valued {+,-,∅}" framing is **FALSE
against the spec**: FRAGMENT_ALGEBRA_SPEC T11 (:442-467) emits only '+'/'-' for
all 26 letters, so binary voice is spec-conformant. The genuine latent defect is
narrower: `voiceSecondaryOfPhoneme` can return `null` (:57), which the ternary
would silently print as '-'. Verified currently unreachable: 0 of 41 PHONEMES
yield a null secondary (every bundle carries f.voice/f.voiceless or an
inherently-voiced manner).

**f. sounds.js BASE_FREQUENCY=432 "A4=432Hz" but offset 57 (MIDI A4=69) — TRUE.**
`sounds.js:6` (`BASE_FREQUENCY = 432; // A4 = 432 Hz`) and :24
(`… - 57)/12`). Under the formula, frequency 432 Hz occurs at exponent 0, i.e.
MIDI-equivalent **57 = A3** — so the formula anchors *A3*=432 Hz, not A4.
Computed: MIDI 69 (true A4) renders at 432·2^((69−57)/12) = **864 Hz** under
this formula; anchoring A4=432 Hz correctly requires offset **69** (or a
+12-semitone retune). The −57 is verbatim from STATE_SPACE_SPEC §5:79, so the
defect is inherited from the internal spec, not introduced by the code.
(Being/octave-4/pc-0/line-1 lands at ≈256.87 Hz, i.e. near scientific-pitch C4 —
consistent with an A3=432 anchor.)

**g. sounds.js zodiac→pitchClass, line→scaleDegree, color→timbre, tone→duration, base→velocity are renderer mappings with no source citation — TRUE with one refinement.**
All five mappings present at `sounds.js:19` (pitchClass), :23 (scaleDegree),
:31 (timbre), :32 (duration), :33 (velocity). The claim "no source citation in
code" is imprecise: the header (:1) cites "spec §5", and STATE_SPACE_SPEC §5:69-78
does state each mapping. But no *corpus* source exists —
docs/corpus/existing-inventory.md:35 states "sound map is synthetic (432Hz +
hexagram scale)". Verdict: TRUE in substance — these are RENDERER_CONVENTIONs
backed only by the internal spec.

**h. colors.js hue/sat/light formulas — renderer convention, no source — TRUE with the same refinement.**
Exact code: `colors.js:28` (`hue = arcSec/1296000×360`, on *total* arcSec), :29
(`sat = 30 + line·10`), :30 (`light = 25 + tone·7`). Header cites "spec §6"
(:1); STATE_SPACE_SPEC §6:84-86 states all three (minor wording drift: spec says
`gateArcSeconds`, code uses total arcSec — numerically identical mod 360). No
corpus source. TRUE in substance.

**i. GOOD EXAMPLE: UNIFIED_SYNTAX_FIELD stores dimension:null + separate hF1b — TRUE.**
`primitive-dimensions.js:112-138`: every one of the 19 marks carries
`dimension: null` (canon — the source does not attribute) plus a segregated
`hF1b` hypothesis field; the header (:108-111) documents the canon/hypothesis
separation. Verified working at runtime:
`dimensionOf('mark','•')` → `{primary:null, secondary:null, basis:'canon',
hypothesisId:'H-F1b', tentative:{primary:'Being', basis:'hypothesis'}}` —
canon and hypothesis stay in distinct fields end-to-end.

**j. Hypothesis labels: phonetic H-F4, wuxing H-F3, five-tone H-F2, punctuation H-F1b — TRUE (all four).**
H-F4: `primitive-dimensions.js:28` (MANNER_DIMENSION.hypothesis) and :88
(LETTERS_DIMENSIONS.hypothesis). H-F3: :19 (WUXING_DIMENSION.hypothesis).
H-F2: five-tone rows at :146-147 (R-S2/R-S3 rules), per-parameter `hypothesis:
'H-F2'` at :150,:153-158, and fiveTones table :166-170. H-F1b: marks'
`dimension:null` + `hF1b` at :117-135 and surfaced by dimensionOf at :287.
All labels exist in code and are mechanically reachable via `dimensionOf`.

**Checklist verdict summary:** a TRUE · b TRUE · c TRUE · d TRUE · e PARTIAL ·
f TRUE · g TRUE · h TRUE · i TRUE · j TRUE.

Additional defect found during verification (not in the external list):
**intake.js:298-312 resonance normalizer** — weights 5+3+2+2+1 = 13 but the
divisor is 15 (doc comment :19 repeats the /15 formula), so an identical
re-intake tops out at ρ = 13/15 ≈ 0.8667 (verified by executing two identical
intakes). Also **colors.js:28 vs spec §6:84** wording drift (total vs gate
arcSec; harmless numerically).

---

## 4. Provenance gaps — bare values that should carry provenance

The provenance-carrying pattern exists and works
(`primitive-dimensions.js` `dimensionOf` returns `{primary, secondary, basis,
hypothesisId}`; `intake.js` carries `addressBasis:'hash-candidate'` into the
runtime object and `hypothesis:'H3'` into the derivation). These places carry
**bare values** instead:

| location | bare value | what it should carry |
|---|---|---|
| letters.js:56-69 (`LETTERS` entries) | `candidateAddress`, `sound`, `color`, `planetaryDimension` | `{…, status:'hypothesis', hypothesisId:'H3'}` on the candidate address (label exists only in the :40 comment); renderer-derived sound/color flagged RENDERER_CONVENTION |
| constants.js:19-23 (`DIMENSION_META.seedGate`) | bare integers 1,2,6,14,20 | gate 1 → SOURCE_STATEMENT (GGM L3016-3017); gates 2/6/14/20 → status:'unattested' (exposed via dimension-router.js:81) |
| constants.js:19-23 (`octave`) | bare 2-6 | RENDERER_CONVENTION marker |
| gate-field.js:61-62 | weights 0.4/0.4/0.2/0.1 as bare numeric literals | named, documented, status:'implementation-choice' constants; clamp overflow (sum 1.1) disclosed |
| gate-field.js:133-137 | `j%5` chunking with no status | disclosed asymmetric projection + status field |
| gate-field.js:23 | `pickRung` zero-activation semantics | documented dormant-state policy (cf. `#empty` 'quiet' at :130) |
| gate-field.js:222 | engagement threshold 0.45 literal | named constant + rationale |
| dimensions.js:7-13 / gate-field.js:14-20 | chains/ladders bare strings | contract citation exists, but corpus-attestation status unknown → status field needed |
| sounds.js:6-10, 31-34 | 432, SCALEGRAM, TIMBRES/DURATIONS/VELOCITIES | RENDERER_CONVENTION markers + the A3/A4 anchor fact |
| colors.js:8-20, 28-30 | anchors, layers, HSL formulas | RENDERER_CONVENTION markers |
| generative-grammar.js:317, 355, 374 | DEFAULT_DIMENSION 'Being'; planet pick `(gate+line-2)%7`; beat product formula | explicit IMPLEMENTATION_CHOICE status (comments partially present; runtime values bare) |
| intake.js:252-281, 298-312 | regime fallbacks; ρ weights/divisor | status fields exist for regime (`status` ✓) but ρ's arbitrary weights + defective /15 divisor are bare literals |
| klein.js:46, intensity/direction rules | envelope set, s/(s+|S|), 50/50 blend, direction rule | rationale in comments only; results carry no status |
| learning.js:44, 47, 50+ | 0.2 threshold, 1.25 boost, capability word lists | bare numerics |
| triples.js:29 | `confidence = 1` default | **worst offender by semantics**: every triple claims confidence 1.0 regardless of whether its object is canon, rule, or hypothesis; confidence should be inherited from the fact's provenance |
| transitions.js:8-23 | effect values (hueShift:+40, gliss:+1, …) | RENDERER_CONVENTION marker per effect |
| fragments.js:400-404 (FOUR_SLOT_STATEMENT slot dimensions) | slot `dimension` fields | these are spec-level attributions layered on Rutt — need basis:'spec-synthesis' rather than appearing corpus-derived |

---

## 5. Summary

### 5.1 Tag histogram (primary tag per audited row)

| tag | count |
|---|---|
| SOURCE_STATEMENT | 48 |
| IMPLEMENTATION_CHOICE | 41 |
| DERIVED_RESULT | 40 |
| RENDERER_CONVENTION | 16 |
| PROJECT_HYPOTHESIS | 11 |
| STRUCTURAL_MATH | 10 |
| CONFLICT | 1 |
| EXPERIMENTAL_RESULT | 1 |

Total rows audited: **168** (primary tag per row; computed mechanically from the §2 tables).

### 5.2 The 10 most load-bearing unsupported mappings

Ranked by how much downstream behavior depends on their truth:

1. **letters.js:43-53 candidate address formulas (H3)** — every letter's gate, sound, color and cyclic dimension derive from this; comment-labeled only, runtime value bare; conflicts with the H-F4 phonetic rule (spec C7) and both coexist.
2. **intake.js:118-120 fnv1a32 → arcSec address (H3)** — every input to the entire engine gets its address from a 32-bit hash mod 1,296,000; labeled at runtime (good) but the mapping itself is unvalidated (OQ-2 open).
3. **gate-field.js:133-137 `j%5` bit→dimension projection** — drives all 64 loci's per-dimension structure scores; asymmetric (Movement double-weight, half-activation exclusive) and arbitrary.
4. **gate-field.js:62 activation weights 0.4/0.4/0.2/0.1** — drives every choice, voice, active-gate ranking and relation formation; sums to 1.1 with clamp absorbing the overflow; no source or rationale anywhere.
5. **primitive-dimensions.js:17-21 WUXING_DIMENSION (H-F3)** — the bridge under trigram/color/sound secondary dimensions and SI_XIANG (H-F6); labeled, but much of T3/T4/T13/T14 semantics ride on it.
6. **primitive-dimensions.js:26-30 MANNER_DIMENSION (H-F4)** — the semantic letter→dimension table (LETTERS_DIMENSIONS) depends entirely on this synthesis.
7. **constants.js:20-23 seedGates 2/6/14/20** — only gate 1→Movement is corpus-attested (GGM L3016-3017); the rest are unattested yet surface through the DimensionRouter.
8. **sounds.js:6+24 432 Hz base with −57 offset** — anchors A3 while the comment (and spec §5) say A4; every rendered frequency in the system inherits the one-octave naming error (values are internally consistent; the *anchor label* is wrong).
9. **dimensions.js:7-13 / gate-field.js:14-20 DIMENSION_CHAINS/LADDERS** — the rung vocabulary for all five dimensions; contract-internal, corpus attestation unverified; combined with pickRung they decide what a "state" *says* at every tick.
10. **gate-field.js:23 pickRung zero-state + :222 engagement threshold 0.45** — zero activation speaks 'wait'/'sense'/… rather than 'quiet', and 0.45 decides which gates "have a voice"; both arbitrary, both shape all field-level output.

### 5.3 Recommended fix order (recommendations only — no code changed)

1. **Provenance wrapper first**: extend the `dimensionOf`-style record
   (`{value, status, source, hypothesisId, confidence, evidence}`) to
   `LETTERS[].candidateAddress` and intake addresses — the two H3 carriers
   everything else consumes. (Patterns already exist; this is adoption, not invention.)
2. **Resolve the 432/−57 anchor**: decide whether the intended anchor is A3=432
   (current behavior) or A4=432 (comment/spec); fix label or offset accordingly.
   Pure documentation/constant decision, one line each.
3. **Disclose or fix the activation formula**: name the weights, record
   status IMPLEMENTATION_CHOICE, and either normalize (sum 1.0) or document that
   the clamp is load-bearing; decide whether `ctx.changed` is API or dead field.
4. **Disclose the `j%5` asymmetry** (or rebalance to a symmetric 6→5 projection);
   Movement's exclusive half-activation state should be a deliberate, labeled choice.
5. **Zero-state policy**: either route activation 0 to 'quiet' (the existing
   dormant vocabulary in `#empty`) or document that rung-0 *is* the dormant state.
6. **Tag unattested seedGates** (2/6/14/20) as `status:'unattested'`; propagate through dimension-router output.
7. **Fix the ρ normalizer** (intake.js: /15 → /13, or pad the weight set) and record the weights' arbitrariness.
8. **Guard the voice ternary** against a null secondary (print '∅'/null instead of '-') even though it's currently unreachable — it is a silent-corruption trap if the phoneme inventory changes.
9. **Mark the renderer layer wholesale**: sounds.js/colors.js/transitions.js effect values should carry a RENDERER_CONVENTION marker so renderer truth is never read as state-space truth.
10. **Fix triple confidence inheritance**: `confidence:1` default in triples.js should derive from the wrapped fact's provenance instead of asserting certainty by default.

---

*Audit produced verification-only; no source files were modified. Dynamic claims
verified under Node against the live modules (see §3 evidence lines).*
