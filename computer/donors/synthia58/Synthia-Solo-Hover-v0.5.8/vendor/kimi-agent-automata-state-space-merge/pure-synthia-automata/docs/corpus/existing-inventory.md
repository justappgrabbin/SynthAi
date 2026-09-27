# Existing Fragment Inventory — what the code already has (baseline for corpus synthesis)

Purpose: Stage B synthesis uses this to separate **new corpus findings** from **already-implemented
fragments**, and to spot conflicts between the books and the code.

## Already implemented (src/state-space/)

| fragment class | module | contents |
|---|---|---|
| phonological features | features.js | 21 FEATURES |
| phonemes | features.js | 41 PHONEMES, PHONEME_BY_ID, bundleSignature |
| letters | letters.js | 26 LETTERS, letterState(char) |
| lexicon | lexicon.js | 16 TOOL_IDS, TOOL_ALIASES, KEYWORDS, 67 SEED_WORDS, posGuess |
| operators | operators.js | 12 OPERATORS (bundle/sequence/project/recurse/transform/automaton/discourse/reverse/inverse/converse/nuclear/change), operatorById; reverse/inverse/converse involutions verified |
| named transitions | transitions.js | 16 NAMED_TRANSITIONS (ignition…automatize) |
| dimensions | constants.js, dimensions.js | 5 DIMENSIONS; DIMENSION_META {Movement:Where/transition/g1/oct2, Evolution:What/transform/g2/oct3, Being:When/instantiate/g6/oct4, Design:Why/structure/g14/oct5, Space:Who/integrate/g20/oct6}; DIMENSION_CHAINS, projectDimension |
| addressing | constants.js, addressing.js | DMS wheel: 1,296,000 arc-sec; gate 20250″, line 3375″, color 562.5″, tone 93.75″, base 18.75″; KING_WEN_TO_FUXI_DECIMAL (64, verified bijective); gateBits/gateFromBits; hamming |
| trigrams | constants.js | TRIGRAMS in Fu Xi order (8; names only — NO attribute matrix yet) |
| sounds | sounds.js | 432Hz base; zodiac→pitch class; line→hexagram scale [0,2,5,7,9,10]; dimension→octave |
| colors | colors.js | hue=arcSec/1296000×360; sat=30+line×10; light=25+tone×7; COLOR_ANCHORS ×6 |
| grammar | grammar/, parser.js | tool-call grammar, chain parsing |
| mesh/engine | engine/, mesh/ | intake Q_t + 5 senses, ledger, derivation, replay, triples, emergent channels (θ=3), klein operator, questions registry, H10 experiment |
| merged | merged/ | ato-analogy, kingwen (Wilhelm/Baynes names ×64), fuxi-encoder, dimension-router, tool-factory (8 levels), scene-grammar, gate-field (64 loci), centers-channels (36/9), lawful-grammar, mesh-memory, artifacts (BMP/GIF/code), media-field |

## Known gaps the corpus should fill

1. **Trigram attribute matrix** — TRIGRAMS currently carry names only; books supply
   nature/family/direction/element/season/color/animal/body/number per trigram.
2. **Line-place semantics** — the 6 places (bottom→top) have no semantic definitions yet.
3. **Nuclear trigrams** (lines 2-3-4 / 3-4-5) — not implemented.
4. **Changing-line numbers** 6/7/8/9 (old/new yin/yang) — transforms exist but not the numeric casting layer.
5. **Formulaic divination morphemes** (元亨利貞 / "it furthers…", 吉/凶/悔/吝/無咎 valence set) — not in lexicon.
6. **King Wen pair structure** (32 pairs: 28 inverted + 4 flipped) — not explicit.
7. **Earlier Heaven vs Later Heaven arrangements** (Fu Xi binary vs King Wen compass) — only Fu Xi order exists.
8. **Wuxing cycles / hetu-luoshu numbers / pitch-pipes (律呂)** — absent; sound map is synthetic (432Hz + hexagram scale), corpus may justify/refine it.
9. **Hexagram texts** — datasets (hatcher/gnostic) may add judgment/line texts to iching-grammar.

## Conflict watch (resolved once already)

- Interrogatives: Movement=Where, Being=When (factory/SynthiaOS majority) — GateLocus disagreed; resolved.
- Gate 57 → Spleen only (not Sacral).
- King Wen gate numbering: 1→FuXi 63, 2→0, 3→17 (verified).
