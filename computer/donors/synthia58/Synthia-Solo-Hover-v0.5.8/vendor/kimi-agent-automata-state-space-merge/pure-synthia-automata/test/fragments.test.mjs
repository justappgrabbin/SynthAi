// Fragment algebra tests — run with node from project root: node test/fragments.test.mjs
import { fileURLToPath } from 'node:url';
import { mulberry32, DIMENSIONS } from '../src/state-space/constants.js';
import { gateBits, gateFromBits, hamming } from '../src/state-space/addressing.js';
import {
  LINES, SI_XIANG, TRIGRAM_MATRIX, TRIGRAM_BY_ID,
  nuclearTrigrams, nuclearHexagramBits, nuclearHexagram, NUCLEAR_CLOSURE, NUCLEUS_GATES, isNucleus,
  HEXAGRAMS, lowerTrigram, upperTrigram, isPureHexagram, isSelfInverse,
  complementBits, reverseBits, swapTrigrams,
  complementOf, reverseOf, swapOf, kingWenPartnerOf, PAIR_STRUCTURES,
  ARRANGEMENTS, xiantianIndex,
  ZHU_XI_EVALUATION, evaluateReading,
  FOUR_SLOT_STATEMENT, VALUATION,
  CASTING, castingDistribution, castLine, castHexagram,
} from '../src/state-space/fragments.js';
import {
  WUXING_DIMENSION, MANNER_DIMENSION,
  mannerOfPhoneme, voiceSecondaryOfPhoneme, letterAttribution, LETTERS_DIMENSIONS,
  UNIFIED_SYNTAX_FIELD, SOUND_DIMENSIONS, COLOR_DIMENSIONS, FRAGMENT_DIMENSIONS,
  SENSE_DIMENSIONS, dimensionOf,
} from '../src/state-space/primitive-dimensions.js';

const ALL_GATES = Array.from({ length: 64 }, (_, i) => i + 1);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function run() {
  let passed = 0; let failed = 0;
  const check = (name, cond) => { if (cond) { passed++; console.log(`ok   ${name}`); } else { failed++; console.log(`FAIL ${name}`); } };

  // ---------- T2 lines ----------
  check('T2: LINES has exactly the 4 casting variants 6/7/8/9', eq(Object.keys(LINES.byValue).map(Number).sort(), [6, 7, 8, 9]));
  check('T2: 6=old yin moving->yang, 9=old yang moving->yin, 7/8 stable',
    LINES.byValue[6].moving && LINES.byValue[6].parity === 'yin' && LINES.byValue[6].changesTo === 'yang'
    && LINES.byValue[9].moving && LINES.byValue[9].parity === 'yang' && LINES.byValue[9].changesTo === 'yin'
    && !LINES.byValue[7].moving && !LINES.byValue[8].moving);
  check('T2: bits match parity (yin=0, yang=1)',
    LINES.byValue[6].bit === 0 && LINES.byValue[8].bit === 0 && LINES.byValue[7].bit === 1 && LINES.byValue[9].bit === 1);

  // ---------- T3 si xiang ----------
  check('T3: SI_XIANG has 4 bigrams with unique 2-bit patterns and casting numbers 6/7/8/9',
    SI_XIANG.rows.length === 4
    && new Set(SI_XIANG.rows.map((r) => r.bits.join(','))).size === 4
    && eq(SI_XIANG.rows.map((r) => r.castingNumber).sort(), [6, 7, 8, 9]));
  check('T3: emblem dimensions are Space/Movement/Design/Evolution (Being is the unrepresented pivot)',
    eq(SI_XIANG.rows.map((r) => r.primaryDimension), ['Space', 'Movement', 'Design', 'Evolution'])
    && SI_XIANG.note.includes('NOT represented'));

  // ---------- T4 trigram matrix ----------
  const T = TRIGRAM_MATRIX.trigrams;
  check('T4: 8 trigrams, ids unique, one per 3-bit value 0-7',
    T.length === 8 && new Set(T.map((t) => t.id)).size === 8
    && eq(T.map((t) => t.valueCode).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]));
  check('T4: bits are consistent with valueCode (bottom line = LSB)',
    T.every((t) => t.bits.reduce((acc, b, i) => acc | (b << i), 0) === t.valueCode));
  check('T4: fuxiOrdinal is a permutation of 1..8; luoshu spans 1-9 with center 5 unassigned',
    eq(T.map((t) => t.fuxiOrdinal).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8])
    && eq(T.map((t) => t.luoshu).sort((a, b) => a - b), [1, 2, 3, 4, 6, 7, 8, 9]));
  check('T4: every trigram carries the full attribute set (name/pinyin/nature/quality/family/directions/wuxing/season/color/animal/body)',
    T.every((t) => t.zh && t.pinyin && t.names.hatcher && t.names.wilhelm && t.natureImage && t.quality && t.family
      && t.direction.xiantian && t.direction.houtian && t.wuxing && t.seasonHoutian
      && t.color.shuogua && t.animal && t.body && t.soundWen && t.toneWuxing));
  check('T4: secondary dimension == WUXING_DIMENSION[wuxing] for all 8 (H-F3 chain)',
    T.every((t) => t.dimension.secondary === WUXING_DIMENSION.map[t.wuxing])
    && T.every((t) => t.dimension.primary === 'Being'));
  check('T4: TRIGRAM_BY_ID lookup works', TRIGRAM_BY_ID.qian.valueCode === 7 && TRIGRAM_BY_ID.kun.valueCode === 0);

  // ---------- T5 nuclear trigrams ----------
  let nuclearOK = true;
  for (const g of ALL_GATES) {
    const b = gateBits(g);
    const { lower, upper } = nuclearTrigrams(b);
    if (!eq(lower, [b[1], b[2], b[3]]) || !eq(upper, [b[2], b[3], b[4]])) nuclearOK = false;
    if (!eq(nuclearHexagramBits(b), [...lower, ...upper])) nuclearOK = false;
    if (nuclearHexagram(b) !== gateFromBits([b[1], b[2], b[3], b[2], b[3], b[4]])) nuclearOK = false;
  }
  check('T5: nuclearTrigrams == brute-force lines 2-3-4 / 3-4-5 for all 64 gates', nuclearOK);
  const computedNuclei = new Set(ALL_GATES.map((g) => nuclearHexagram(gateBits(g))));
  check('T5: exactly 16 hexagrams can be nuclei, matching NUCLEUS_GATES',
    computedNuclei.size === 16 && NUCLEUS_GATES.length === 16 && NUCLEUS_GATES.every((g) => computedNuclei.has(g)));
  check('T5: NUCLEAR_CLOSURE map verified — every listed member has the key as its nucleus, 4 members each',
    Object.entries(NUCLEAR_CLOSURE.nuclei).every(([k, members]) =>
      members.length === 4 && members.every((m) => nuclearHexagram(gateBits(m)) === Number(k))));
  check('T5: gates 1 and 2 are their own nuclei; second-order nuclei == {1,2,63,64} (computed fixed points)',
    nuclearHexagram(gateBits(1)) === 1 && nuclearHexagram(gateBits(2)) === 2
    && ALL_GATES.every((g) => NUCLEAR_CLOSURE.secondOrderNuclei.includes(nuclearHexagram(nuclearHexagramBits(gateBits(g))))));
  check('T5: isNucleus membership', isNucleus(1) && isNucleus(2) && isNucleus(43) && !isNucleus(3) && !isNucleus(5));

  // ---------- T6 hexagram level ----------
  check('T6: special sets — chong gua = pure = palace heads; 63 dang / 64 bu dang',
    eq(HEXAGRAMS.specialSets.chongGuaDoubled, HEXAGRAMS.specialSets.pureHexagramsEightPalaceHeads)
    && eq(HEXAGRAMS.specialSets.fullyDangCorrect, [63]) && eq(HEXAGRAMS.specialSets.fullyBuDang, [64]));
  check('T6: lower/upper trigram split (zhen inner bits[0..2], hui outer bits[3..5])',
    eq(lowerTrigram(gateBits(11)), [1, 1, 1]) && eq(upperTrigram(gateBits(11)), [0, 0, 0]) // 11 Tai = qian below kun
    && isPureHexagram(1) && !isPureHexagram(3) && isSelfInverse(27) && !isSelfInverse(3));

  // ---------- T7 pair structures ----------
  let involutions = true; let complementHamming = true;
  for (const g of ALL_GATES) {
    if (complementOf(complementOf(g)) !== g) involutions = false;
    if (reverseOf(reverseOf(g)) !== g) involutions = false;
    if (swapOf(swapOf(g)) !== g) involutions = false;
    if (kingWenPartnerOf(kingWenPartnerOf(g)) !== g) involutions = false;
    if (hamming(gateBits(g), gateBits(complementOf(g))) !== 6) complementHamming = false;
    if (!eq(swapTrigrams(gateBits(g)), [...gateBits(g).slice(3), ...gateBits(g).slice(0, 3)])) involutions = false;
  }
  check('T7: complementOf/reverseOf/swapOf/kingWenPartnerOf are involutions over all 64', involutions);
  check('T7: flipped/opposite pairs all have hamming === 6', complementHamming);
  check('T7: self-inverse gates == T7 list {1,2,27,28,29,30,61,62}',
    eq(ALL_GATES.filter((g) => reverseOf(g) === g), PAIR_STRUCTURES.qianGua.selfInverse));
  check('T7: self-swap gates == 8 chong gua {1,2,29,30,51,52,57,58}',
    eq(ALL_GATES.filter((g) => swapOf(g) === g), PAIR_STRUCTURES.jiaoGua.selfSwap));
  check('T7: all 28 qian gua fixture pairs verify against computed o_reverse',
    PAIR_STRUCTURES.qianGua.pairs.length === 28
    && PAIR_STRUCTURES.qianGua.pairs.every(([a, b]) => reverseOf(a) === b && reverseOf(b) === a));
  check('T7: all 32 pang tong fixture pairs verify against computed o_inverse',
    PAIR_STRUCTURES.pangTongGua.pairs.length === 32
    && PAIR_STRUCTURES.pangTongGua.pairs.every(([a, b]) => complementOf(a) === b && complementOf(b) === a));
  check('T7: all 28 jiao gua fixture pairs (Hatcher vol.2 p.18) verify against computed o_swap',
    PAIR_STRUCTURES.jiaoGua.pairs.length === 28
    && PAIR_STRUCTURES.jiaoGua.pairs.every(([a, b]) => swapOf(a) === b && swapOf(b) === a));
  // Hatcher fixture spot-check, spec C4 worked example: swap(3 Zhun) = 40 (Meng/Youthful Folly? -> 40 Deliverance per list [40,3])
  check('T7/C4: swapOf(3) === 40 (spec worked example), and swap != antipode for gate 3',
    swapOf(3) === 40 && reverseOf(complementOf(3)) !== swapOf(3));
  check('T7: King Wen sequence rule — 32 pairs; 4 pair by complement, rest by inversion (R-H9)',
    PAIR_STRUCTURES.kingWenPairs.pairSequence.length === 32
    && PAIR_STRUCTURES.kingWenPairs.complementPairs.every(([a, b]) => complementOf(a) === b)
    && PAIR_STRUCTURES.kingWenPairs.pairSequence.filter(([a, b]) => a !== b && reverseOf(a) === b).length
       === PAIR_STRUCTURES.kingWenPairs.inversionPairsCount
    && PAIR_STRUCTURES.kingWenPairs.bothInverseAndComplement.every(([a, b]) => reverseOf(a) === b && complementOf(a) === b));
  check('T7: 28 inversion + 4 complement = 32 King Wen pairs, covering all 64 gates',
    new Set(PAIR_STRUCTURES.kingWenPairs.pairSequence.flat()).size === 64);

  // ---------- T8 arrangements ----------
  check('T8: xiantian trigram positions — 8 unique compass points',
    new Set(Object.values(ARRANGEMENTS.xiantian.trigramPositions)).size === 8
    && ARRANGEMENTS.xiantian.trigramPositions.qian === 'S' && ARRANGEMENTS.xiantian.trigramPositions.kun === 'N');
  check('T8: houtian circulation = Zhen E -> Xun SE -> Li S -> Kun SW -> Dui W -> Qian NW -> Kan N -> Gen NE',
    eq(ARRANGEMENTS.houtian.circulation.map((c) => c.trigram), ['zhen', 'xun', 'li', 'kun', 'dui', 'qian', 'kan', 'gen']));
  check('T8: mawangdui upper family order + lower cycle given; sovereign cycle = 24,19,11,34,43,1,44,33,12,20,23,2',
    eq(ARRANGEMENTS.mawangdui.upperOrder, ['qian', 'gen', 'kan', 'zhen', 'kun', 'dui', 'li', 'xun'])
    && ARRANGEMENTS.mawangdui.lowerCycle.length === 8
    && eq(ARRANGEMENTS.twelveSovereignGua.cycle, [24, 19, 11, 34, 43, 1, 44, 33, 12, 20, 23, 2]));
  check('T8: xiantianIndex(1) === 63 and xiantianIndex(2) === 0 (binary index delegates to verified bijection)',
    xiantianIndex(1) === 63 && xiantianIndex(2) === 0);

  // ---------- T17 Zhu Xi evaluation ----------
  check('T17: table has 8 cases (k=0..6 + special)',
    ZHU_XI_EVALUATION.cases.length === 8 && eq(ZHU_XI_EVALUATION.cases.slice(0, 7).map((c) => c.k), [0, 1, 2, 3, 4, 5, 6]));
  check('T17 k=0: judgement of the original hexagram',
    evaluateReading({ changingLines: [] }).layer === 'judgement');
  check('T17 k=1: the changing line\u2019s own statement',
    eq(evaluateReading({ benGua: 3, changingLines: [4] }), evaluateReading({ benGua: 3, changingLines: [4] }))
    && evaluateReading({ benGua: 3, changingLines: [4] }).layer === 'line'
    && evaluateReading({ benGua: 3, changingLines: [4] }).ruling === 4);
  check('T17 k=2: both changing lines of the original, UPPER rules',
    (() => { const r = evaluateReading({ changingLines: [2, 5] }); return r.layer === 'lines-upper-rules' && r.ruling === 5 && eq(r.lines, [2, 5]); })());
  check('T17 k=3: Tuan of both hexagrams',
    evaluateReading({ benGua: 1, zhiGua: 2, changingLines: [1, 3, 5] }).layer === 'judgement-both');
  check('T17 k=4: two UNCHANGED lines of the RESULTING hexagram, LOWER rules',
    (() => { const r = evaluateReading({ changingLines: [1, 2, 3, 5] }); return r.layer === 'lines-resulting-lower-rules' && eq(r.lines, [4, 6]) && r.ruling === 4; })());
  check('T17 k=5: the one unchanged line of the RESULTING hexagram',
    (() => { const r = evaluateReading({ changingLines: [1, 2, 3, 4, 5] }); return r.layer === 'line-resulting' && eq(r.lines, [6]) && r.ruling === 6; })());
  check('T17 k=6: Qian/Kun read yong; others read Tuan of the resulting hexagram',
    evaluateReading({ benGua: 1, changingLines: [1, 2, 3, 4, 5, 6] }).layer === 'yong'
    && evaluateReading({ benGua: 2, changingLines: [1, 2, 3, 4, 5, 6] }).layer === 'yong'
    && evaluateReading({ benGua: 9, changingLines: [1, 2, 3, 4, 5, 6] }).layer === 'judgement-resulting');

  // ---------- T18 + T10 output grammar / valuation ----------
  check('T18: 4 slots in canonical order oracle -> indication -> prognostic -> observation',
    eq(FOUR_SLOT_STATEMENT.canonicalOrder, ['oracle', 'indication', 'prognostic', 'observation'])
    && FOUR_SLOT_STATEMENT.slots.oracle.dimension === 'Being'
    && FOUR_SLOT_STATEMENT.slots.indication.dimension === 'Movement'
    && FOUR_SLOT_STATEMENT.slots.prognostic.dimension === 'Being.valence'
    && FOUR_SLOT_STATEMENT.slots.observation.dimension === 'Evolution');
  check('T10: valuation scale ji/wujiu/li/xiong/ta with valences; hui/lin excluded to observation (Evolution)',
    VALUATION.terms.ji.valence === '+' && VALUATION.terms.wujiu.valence === '0+'
    && VALUATION.terms.xiong.valence === '--' && VALUATION.terms.ta.valence === '-'
    && VALUATION.observationTerms.hui.dimension === 'Evolution' && VALUATION.observationTerms.lin.dimension === 'Evolution');

  // ---------- T19 casting ----------
  const sum = (d) => Object.values(d).reduce((s, p) => s + p, 0);
  check('T19: coin distribution = {6:1/8,7:3/8,8:3/8,9:1/8}, sums to 1',
    Math.abs(sum(castingDistribution('coin')) - 1) < 1e-12
    && castingDistribution('coin')[6] === 0.125 && castingDistribution('coin')[7] === 0.375);
  check('T19: yarrow distribution = {6:1/16,7:5/16,8:7/16,9:3/16}, sums to 1',
    Math.abs(sum(castingDistribution('yarrow')) - 1) < 1e-12
    && castingDistribution('yarrow')[6] === 0.0625 && castingDistribution('yarrow')[9] === 0.1875);
  check('T19: coin flattens moving-line odds vs yarrow (P(moving) 1/4 vs 1/4 line-level; moving 9 odds differ)',
    castingDistribution('coin')[9] !== castingDistribution('yarrow')[9]);
  const seqA = [1, 2, 3, 4, 5, 6].map(() => castLine('coin', mulberry32(42)));
  const rng1 = mulberry32(42); const s1 = [1, 2, 3, 4, 5, 6].map(() => castLine('coin', rng1));
  const rng2 = mulberry32(42); const s2 = [1, 2, 3, 4, 5, 6].map(() => castLine('coin', rng2));
  check('T19: castLine is deterministic under the same seed and yields only 6/7/8/9',
    eq(s1, s2) && s1.every((v) => [6, 7, 8, 9].includes(v)));
  void seqA;
  const cast = castHexagram('yarrow', mulberry32(7));
  check('T19: castHexagram records the method and zhiGua = benGua with exactly the moving lines flipped',
    cast.method === 'yarrow' && cast.lines.length === 6
    && eq(cast.bits, gateBits(cast.benGua))
    && hamming(gateBits(cast.benGua), gateBits(cast.zhiGua)) === cast.movingLines.length
    && cast.movingLines.every((p) => [6, 9].includes(cast.lines[p - 1])));
  check('T19: yarrow empirical hexagram distribution recorded (Rutt Table 18: 36/66/18/17)',
    CASTING.yarrowEmpiricalHexagramDistribution.exactlyOneMoving === 0.36
    && CASTING.yarrowEmpiricalHexagramDistribution.oneOrTwoMoving === 0.66
    && CASTING.yarrowEmpiricalHexagramDistribution.noMovingLines === 0.18
    && CASTING.yarrowEmpiricalHexagramDistribution.threeOrMoreMoving === 0.17);

  // ---------- T11 letter rule ----------
  const letterEntries = Object.values(LETTERS_DIMENSIONS.letters);
  check('T11: all 26 letters attributed, exactly one primary dimension each, all valid',
    letterEntries.length === 26
    && letterEntries.every((a) => DIMENSIONS.includes(a.primary) && DIMENSIONS.includes(a.secondary)));
  check('T11: materialized table === rule reapplied (letterAttribution) for all 26',
    Object.keys(LETTERS_DIMENSIONS.letters).every((ch) => eq(LETTERS_DIMENSIONS.letters[ch], letterAttribution(ch))));
  check('T11: distribution matches spec (Movement 9, Evolution 5, Being 5, Design 5, Space 2)',
    eq(LETTERS_DIMENSIONS.distribution.Movement, ['b', 'c', 'd', 'g', 'k', 'p', 'q', 't', 'x'])
    && eq(LETTERS_DIMENSIONS.distribution.Space, ['m', 'n'])
    && Object.entries(LETTERS_DIMENSIONS.distribution).every(([dim, chars]) =>
      chars.every((c) => LETTERS_DIMENSIONS.letters[c].primary === dim)));
  check('T11: R-L2 affricate detection (p.dzh = stop+fricative composite -> affricate -> Design)',
    mannerOfPhoneme('p.dzh') === 'affricate' && letterAttribution('j').primary === 'Design'
    && mannerOfPhoneme('p.m') === 'nasal' && voiceSecondaryOfPhoneme('p.k') === 'Space');
  check('T11: spot checks a->Being/Evolution, v->Evolution/Evolution, x->Movement/Space',
    eq([letterAttribution('a').primary, letterAttribution('a').secondary], ['Being', 'Evolution'])
    && eq([letterAttribution('v').primary, letterAttribution('v').secondary], ['Evolution', 'Evolution'])
    && eq([letterAttribution('x').primary, letterAttribution('x').secondary], ['Movement', 'Space']));

  // ---------- T12 Unified Syntax Field ----------
  const marks = UNIFIED_SYNTAX_FIELD.marks;
  check('T12: exactly 19 canonical marks, unique glyphs',
    marks.length === 19 && new Set(marks.map((m) => m.mark)).size === 19);
  check('T12: every mark has mark/name/metaphysicalRole/linguisticEquivalent/ontologicalAction',
    marks.every((m) => m.mark && m.name && m.metaphysicalRole && m.linguisticEquivalent && m.ontologicalAction));
  check('T12: canon keeps dimension null; H-F1b tentative attribution is separate and dimension-valid',
    marks.every((m) => m.dimension === null && DIMENSIONS.includes(m.hF1b)));
  check('T12: DMS marks carry coordinate roles (., °, ′, ″) and Verb-Field Triad (=, –, →)',
    ['.', '°', '′', '″'].every((g) => marks.find((m) => m.mark === g).coordinateRole)
    && ['=', '–', '→'].every((g) => marks.find((m) => m.mark === g).verbField));

  // ---------- §2.1 senses ----------
  check('§2.1: SENSE_DIMENSIONS = see->Movement, taste->Evolution, touch->Being, smell->Design, hear->Space (canon)',
    SENSE_DIMENSIONS.senses.see.dimension === 'Movement' && SENSE_DIMENSIONS.senses.taste.dimension === 'Evolution'
    && SENSE_DIMENSIONS.senses.touch.dimension === 'Being' && SENSE_DIMENSIONS.senses.smell.dimension === 'Design'
    && SENSE_DIMENSIONS.senses.hear.dimension === 'Space' && SENSE_DIMENSIONS.status.startsWith('MECHANISM'));

  // ---------- T13/T14/T15 structure ----------
  check('T13: 14 sound parameters + 5 tones; scale degrees map gong/shang/jue/zhi/yu -> Being/Design/Movement/Evolution/Space',
    SOUND_DIMENSIONS.parameters.length === 14 && SOUND_DIMENSIONS.fiveTones.length === 5
    && eq(SOUND_DIMENSIONS.fiveTones.map((t) => t.dimension), ['Being', 'Design', 'Movement', 'Evolution', 'Space'])
    && SOUND_DIMENSIONS.trigramSoundsWen.length === 8);
  check('T14: 4 color channels + 5 wuxing colors + 8 trigram colors + 6 HD anchors',
    COLOR_DIMENSIONS.channels.length === 4 && COLOR_DIMENSIONS.wuxingColors.length === 5
    && COLOR_DIMENSIONS.trigramColors.length === 8 && COLOR_DIMENSIONS.anchorsHd6.length === 6);
  check('T14: wuxing color bridge == H-F3 map (Wood->Movement … Water->Space)',
    COLOR_DIMENSIONS.wuxingColors.every((w) => w.primary === WUXING_DIMENSION.map[w.wuxing]));
  check('T15: 20 fragment class rows; spot: line->Being, bigram->Evolution, nuclear->Design+Space, hexagram->Being+Movement, pairs->Design',
    FRAGMENT_DIMENSIONS.rows.length === 20
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'line').primary === 'Being'
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'bigram').primary === 'Evolution'
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'nuclear').primary === 'Design'
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'nuclear').secondary === 'Space'
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'hexagram').secondary === 'Movement'
    && FRAGMENT_DIMENSIONS.rows.find((r) => r.id === 'pairs').primary === 'Design');

  // ---------- dimensionOf unified lookup ----------
  check('dimensionOf: letter -> rule basis + H-F4', (() => {
    const d = dimensionOf('letter', 'm');
    return d.primary === 'Space' && d.secondary === 'Evolution' && d.basis === 'rule' && d.hypothesisId === 'H-F4';
  })());
  check('dimensionOf: mark -> canon null primary + H-F1b tentative',
    (() => { const d = dimensionOf('mark', '→'); return d.primary === null && d.basis === 'canon' && d.hypothesisId === 'H-F1b' && d.tentative.primary === 'Movement'; })());
  check('dimensionOf: sense -> canon (MECHANISM)',
    (() => { const d = dimensionOf('sense', 'hear'); return d.primary === 'Space' && d.basis === 'canon'; })());
  check('dimensionOf: sound/tone/color/wuxing/trigram/bigram/fragment lookups with basis flags',
    dimensionOf('sound', 'scale_degree_3').primary === 'Movement' && dimensionOf('sound', 'scale_degree_3').basis === 'hypothesis'
    && dimensionOf('sound', 'pitch_class').basis === 'rule'
    && dimensionOf('tone', 'gong').primary === 'Being' && dimensionOf('tone', 'gong').hypothesisId === 'H-F2'
    && dimensionOf('color', 'hue').primary === 'Movement' && dimensionOf('color', 'hue').hypothesisId === 'H-F5'
    && dimensionOf('color', 'layer').primary === 'self' && dimensionOf('color', 'layer').basis === 'rule'
    && dimensionOf('wuxing', 'Metal').primary === 'Design' && dimensionOf('wuxing', 'Metal').hypothesisId === 'H-F3'
    && dimensionOf('trigram', 'kan').secondary === 'Space' && dimensionOf('trigram', 'kan').hypothesisId === 'H-F3'
    && dimensionOf('bigram', 'tai yin').primary === 'Space' && dimensionOf('bigram', 'tai yin').hypothesisId === 'H-F6'
    && dimensionOf('fragment', 'nuclear').primary === 'Design' && dimensionOf('fragment', 'nuclear').basis === 'rule');
  check('dimensionOf: unknown kind or id -> null',
    dimensionOf('nope', 'x') === null && dimensionOf('letter', '1') === null && dimensionOf('mark', '?') === null);

  // ---------- purity / freezing ----------
  check('all constant tables are deeply frozen',
    Object.isFrozen(LINES) && Object.isFrozen(SI_XIANG) && Object.isFrozen(TRIGRAM_MATRIX)
    && Object.isFrozen(TRIGRAM_MATRIX.trigrams[0].dimension) && Object.isFrozen(PAIR_STRUCTURES)
    && Object.isFrozen(NUCLEAR_CLOSURE) && Object.isFrozen(ARRANGEMENTS) && Object.isFrozen(ZHU_XI_EVALUATION)
    && Object.isFrozen(FOUR_SLOT_STATEMENT) && Object.isFrozen(VALUATION) && Object.isFrozen(CASTING)
    && Object.isFrozen(LETTERS_DIMENSIONS) && Object.isFrozen(UNIFIED_SYNTAX_FIELD)
    && Object.isFrozen(UNIFIED_SYNTAX_FIELD.marks[0]) && Object.isFrozen(SOUND_DIMENSIONS)
    && Object.isFrozen(COLOR_DIMENSIONS) && Object.isFrozen(FRAGMENT_DIMENSIONS) && Object.isFrozen(SENSE_DIMENSIONS));
  check('every constant table carries a source field citing the spec',
    [LINES, SI_XIANG, TRIGRAM_MATRIX, NUCLEAR_CLOSURE, HEXAGRAMS, PAIR_STRUCTURES, ARRANGEMENTS,
      ZHU_XI_EVALUATION, FOUR_SLOT_STATEMENT, VALUATION, CASTING, WUXING_DIMENSION, MANNER_DIMENSION,
      LETTERS_DIMENSIONS, UNIFIED_SYNTAX_FIELD, SOUND_DIMENSIONS, COLOR_DIMENSIONS, FRAGMENT_DIMENSIONS, SENSE_DIMENSIONS]
      .every((t) => typeof t.source === 'string' && t.source.includes('FRAGMENT_ALGEBRA_SPEC')));

  return { passed, failed };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = run();
  console.log(`\nfragments.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
