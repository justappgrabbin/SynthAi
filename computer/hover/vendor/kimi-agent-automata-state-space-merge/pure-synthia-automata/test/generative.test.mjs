// Standalone test for the generative sentence grammar (T23/T24/T25/T26) and
// the prediction mechanism (T17/T19/PL9) — run with node from project root.
// Style follows test/merged.smoke.mjs; exports run() -> {passed, failed}.

import { pathToFileURL } from 'node:url';

import {
  SLOT_GRAMMAR, SLOT_ORDER, EMERGENT_CLOSURE,
  PRODUCTIONS, VERB_FIELD_TRIAD, VERBS_OF_BEING_NOTE,
  DIMENSION_KEYNOTES, KEYNOTE_FUNCTIONS, SIGN_MODALITY, MODALITY_VERBS, signModality,
  parseRewrite, formatRewrite, composeAddress,
  TEMPLATES, TEMPLATE_NAMES, generateSentence, generateSentences, deepStructure,
  BINARY_OVERLAY, SENTENCE_FORMS, sentenceFormFor, overlaySentence,
  PIPELINES, fieldParse, crystallineTranslate, authorityResolve, pipelineRoute,
  GENERATOR_STEPS, yijingPhases, dmsToSentenceForm,
} from '../src/state-space/generative-grammar.js';
import {
  PREDICTION_DISCLAIMER, SUCCESSOR_RULES, FRAGMENTS, SWAP_SOURCE,
  normalizeState, movingLinesOf, successors, enumerateLattice, readingPath,
  pairPartner, banXiangGrid, Predictor,
} from '../src/engine/prediction.js';
import { arcSecForAddress, addressForArcSec, gateBits, gateFromBits } from '../src/state-space/addressing.js';

export function run() {
  let passed = 0; let failed = 0;
  const check = (name, cond) => {
    if (cond) { passed++; console.log(`ok   ${name}`); } else { failed++; console.log(`FAIL ${name}`); }
  };

  // ------------------------------------------------------------ T23 slots
  check('T23: SLOT_GRAMMAR has exactly 12 slots', SLOT_GRAMMAR.length === 12);
  check('T23: canon order Dimension..YijingWrapper',
    SLOT_GRAMMAR.map((s) => s.name).join(',')
    === 'Dimension,Sign,Gate,Line,Planet,Color,Tone,Base,Center+Biology,House,Axis,YijingWrapper');
  check('T23: SLOT_ORDER matches slot names', SLOT_ORDER.join(',') === SLOT_GRAMMAR.map((s) => s.name).join(','));
  check('T23: emergent closure is separate (no single layer dictates it)',
    EMERGENT_CLOSURE.name === 'EmergentClosure' && !SLOT_GRAMMAR.some((s) => s.name === 'EmergentClosure'));
  check('T23: every slot carries grammaticalRole + definition + sources',
    SLOT_GRAMMAR.every((s) => s.grammaticalRole && s.definition && Array.isArray(s.sources)));

  // ------------------------------------------------------------ T24 rules
  check('T24: PRODUCTIONS are P9..P14 in {lhs, rhs, conditions} form',
    PRODUCTIONS.map((p) => p.id).join(',') === 'P9,P10,P11,P12,P13,P14'
    && PRODUCTIONS.every((p) => typeof p.lhs === 'string' && typeof p.rhs === 'string' && Array.isArray(p.conditions)));
  check('T24: P9 keynotes Movement/Evolution/Being/Design/Space',
    DIMENSION_KEYNOTES.Movement === 'I Define' && DIMENSION_KEYNOTES.Evolution === 'I Remember'
    && DIMENSION_KEYNOTES.Being === 'I Am' && DIMENSION_KEYNOTES.Design === 'I Design'
    && DIMENSION_KEYNOTES.Space === 'I Think');
  check('T24: keynote grammatical functions [L922-933]',
    KEYNOTE_FUNCTIONS['I Define'] === 'subject initiator' && KEYNOTE_FUNCTIONS['I Am'] === 'embodiment/action');

  // P10 modality
  check('P10: Cardinal/Fixed/Mutable verb flavors verbatim',
    MODALITY_VERBS.Cardinal.join(',') === 'begin,initiate,push'
    && MODALITY_VERBS.Fixed.join(',') === 'hold,maintain,embody'
    && MODALITY_VERBS.Mutable.join(',') === 'shift,adapt,blend');
  check('P10: signModality Virgo=Mutable, Aries=Cardinal, Leo=Fixed',
    signModality('Virgo') === 'Mutable' && signModality('Aries') === 'Cardinal' && signModality('Leo') === 'Fixed'
    && SIGN_MODALITY.Sagittarius === 'Mutable');

  // ------------------------------------------------------------ rewrite parser
  const AUTHOR_EXAMPLE = "F:Body → Gate:Innocence° → Line:'Survival → Color:'Innocence → Tone:\"Taste → Base:\"Geometry → G:{Identity → Virgo → 5th}";
  const parsed = parseRewrite(AUTHOR_EXAMPLE);
  check('rewrite parser: 7 steps from the author example', parsed.steps.length === 7);
  check('rewrite parser: assignments dimension/gate/line/color/tone/base',
    parsed.assignments.dimension === 'Body' && parsed.assignments.gate === 'Innocence'
    && parsed.assignments.line === 'Survival' && parsed.assignments.color === 'Innocence'
    && parsed.assignments.tone === 'Taste' && parsed.assignments.base === 'Geometry');
  check('rewrite parser: G group -> axis/sign/house (Identity/Virgo/5th)',
    parsed.assignments.axis === 'Identity' && parsed.assignments.sign === 'Virgo' && parsed.assignments.house === '5th');
  check('rewrite parser: marks — Gate carries ° Collapse, Line carries \' Pulse, Tone carries " Container',
    parsed.steps[1].marks.suffix === '°' && parsed.steps[2].marks.prefix === "'" && parsed.steps[4].marks.prefix === '"');
  check('rewrite parser: round-trip formatRewrite(parseRewrite(s)) === s',
    formatRewrite(parsed) === AUTHOR_EXAMPLE);
  check('rewrite parser: second parse of round-trip is stable',
    formatRewrite(parseRewrite(formatRewrite(parsed))) === AUTHOR_EXAMPLE);

  // ------------------------------------------------------------ composed operator
  const composed = composeAddress({ gate: 25, line: 4, color: 3, tone: 5, base: 2 });
  check('composeAddress: O_{k,l,c,t,b} = B_b∘T_t∘M_c∘L_l∘G_k composition string',
    composed.composition === 'B_2∘T_5∘M_3∘L_4∘G_25' && composed.operator === 'O_{25,4,3,5,2}'
    && composed.applicationOrder.join(',') === 'G,L,M,T,B');
  check('composeAddress: produces a valid DMS address (gate/line/color/tone/base preserved)',
    composed.address.gate === 25 && composed.address.line === 4 && composed.address.color === 3
    && composed.address.tone === 5 && composed.address.base === 2);
  check('composeAddress: arcSec round-trip via addressing.js',
    arcSecForAddress(composed.address) === composed.arcSecond
    && addressForArcSec(composed.arcSecond).gate === 25
    && composed.arcSecond === arcSecForAddress({ gate: 25, line: 4, color: 3, tone: 5, base: 2 }));

  // ------------------------------------------------------------ P14 triad
  check('P14: Verb-Field Triad = Recognition / – Continuity / → Transformation',
    VERB_FIELD_TRIAD['='] === 'Recognition' && VERB_FIELD_TRIAD['–'] === 'Continuity'
    && VERB_FIELD_TRIAD['→'] === 'Transformation' && Object.keys(VERB_FIELD_TRIAD).length === 3);
  check('P14: verbs-of-being note quotes the operators', VERBS_OF_BEING_NOTE.includes('verbs of being'));

  // ------------------------------------------------------------ generateSentence
  const addr254 = { gate: 25, line: 4, color: 3, tone: 5, base: 2, zodiac: 6, house: 5 }; // Gate 25.4, Virgo, 5th House
  const s1 = generateSentence(addr254);
  const s2 = generateSentence(addr254);
  check('generateSentence: deterministic — same address twice -> identical string', s1 === s2 && s1.length > 0);
  const s26 = generateSentence({ ...addr254, gate: 26 });
  check('generateSentence: different gate -> different sentence', s26 !== s1);
  check('generateSentence: Gate 25 archetype verb "Innocence" present; Gate 26 differs',
    s1.includes('Innocence') && !s26.includes('Innocence') && s26.includes('The Taming Power of the Great'));
  check('generateSentence: Virgo (mutable) verb flavor shift/adapt/blend',
    /(shift|adapt|blend)s/.test(s1));
  check('generateSentence: all 4 canonical templates produce non-empty strings',
    TEMPLATE_NAMES.length === 4
    && TEMPLATE_NAMES.every((t) => generateSentence(addr254, { template: t }).length > 0));
  const all = generateSentences(addr254);
  check('generateSentences: 4 distinct renderings of one deep structure',
    Object.keys(all).length === 4 && new Set(Object.values(all)).size === 4);
  check('generateSentence: templates are the canon four (minimal/final/consciousness/dimensional)',
    TEMPLATE_NAMES.join(',') === 'minimal,final,consciousness,dimensional');
  check('generateSentence: changing lines -> "Not yet complete" wrapper; static -> "Already complete"',
    generateSentence({ ...addr254, changingLines: [4] }).startsWith('Not yet complete')
    && generateSentence(addr254).startsWith('Already complete'));
  check('generateSentence: consciousness template carries the axis polarity clause (complement Gate 46)',
    generateSentence(addr254, { template: 'consciousness' }).includes('Gate 46'));
  check('deepStructure: address decomposition carries bits + arcSecond + waveform note',
    (() => { const d = deepStructure(addr254); return d.kind === 'waveform-substrate'
      && d.bits.join(',') === gateBits(25).join(',') && d.arcSecond === arcSecForAddress(addr254); })());
  check('generateSentence: lexicon override swaps the gate archetype deterministically',
    generateSentence(addr254, { lexicon: { gateArchetype: () => 'Custom' } }).includes('Custom'));

  // ------------------------------------------------------------ T25 overlay
  check('T25: BINARY_OVERLAY has 5 line-state entries incl. mirror + echo',
    BINARY_OVERLAY.length === 5
    && BINARY_OVERLAY.some((e) => e.sentenceStructure.includes('mirror'))
    && BINARY_OVERLAY.some((e) => e.sentenceStructure.includes('echo')));
  check('T25: yin broken = subject/object split; yang solid = subject–verb unity',
    BINARY_OVERLAY[0].lineState === 'yin (broken)' && BINARY_OVERLAY[0].sentenceStructure === 'subject/object split'
    && BINARY_OVERLAY[1].sentenceStructure === 'subject–verb unity');
  check('T25: sentenceFormFor — gate 25 line 4 (yang) changing -> binary split; 2 movers -> echo',
    sentenceFormFor({ gate: 25, line: 4, changingLines: [4] }).id === 'yang-changing'
    && sentenceFormFor({ gate: 25, changingLines: [2, 4] }).id === 'multiple-movers'
    && sentenceFormFor({ gate: 25, line: 2 }).id === 'yin-stable');
  check('T25: overlaySentence mirror reverses clause order deterministically',
    overlaySentence('a, b, c.', 'yin-changing') === 'c, b, a.'
    && overlaySentence('a, b.', 'multiple-movers') === 'a, b — a.');

  // ------------------------------------------------------------ T26 pipelines
  check('T26: 9 pipelines; mechanism-implementable = PL1,PL2,PL3,PL4,PL9',
    PIPELINES.length === 9
    && PIPELINES.filter((p) => p.classification.startsWith('MECHANISM-IMPLEMENTABLE')).map((p) => p.id).join(',')
      === 'PL1,PL2,PL3,PL4,PL9');
  check('T26/PL1: fieldParse -> fields + pressure scores + P/D/M tags',
    (() => { const f = fieldParse(addr254); return f.fields.gate === 25 && f.tags.Design === true && f.tags.Personality === true; })());
  check('T26/PL1: crystallineTranslate Being -> "I Am" embodiment/action',
    (() => { const t = crystallineTranslate('Being'); return t.keynote === 'I Am' && t.grammaticalFunction === 'embodiment/action'; })());
  check('T26/PL1: authorityResolve — Monopole > Design > Personality; yang tiebreak',
    (() => {
      const r = authorityResolve([
        { agent: 'Adaya', layer: 'Personality', line: 6, planet: 'Sun', polarity: 'yang' },
        { agent: 'Joe', layer: 'Monopole', line: 2, planet: 'Venus', polarity: 'yin' },
      ]);
      const tie = authorityResolve([
        { agent: 'yinAgent', layer: 'Design', line: 3, planet: 'Moon', polarity: 'yin' },
        { agent: 'yangAgent', layer: 'Design', line: 3, planet: 'Moon', polarity: 'yang' },
      ]);
      return r.initiator.agent === 'Joe' && r.modifiers[0].agent === 'Adaya' && tie.initiator.agent === 'yangAgent';
    })());
  check('T26/PL1: pipelineRoute L1->L2->L4->L5 with L3 needs-definition',
    (() => { const r = pipelineRoute(addr254); return typeof r.L5 === 'string' && r.L5.length > 0 && /NEEDS-DEFINITION/.test(r.L3); })());
  check('T26/PL2: GENERATOR_STEPS has 7 steps; interference off by default (no closure)',
    GENERATOR_STEPS.length === 7 && !generateSentence(addr254).includes('unexpected echo'));
  check('T26/PL2: interference enabled above threshold -> deterministic emergent closure',
    generateSentence(addr254, { interference: { enabled: true, threshold: 0 } }).includes('unexpected echo remains'));
  check('T26/PL3: yijingPhases phases 1-4, phase 5 needs-definition',
    (() => { const p = yijingPhases(25); return p.phase1.keynote === 'I Am' && p.phase2.lower.bits.join(',') === '1,0,0'
      && p.phase4.inversePair.gate === 46 && /NEEDS-DEFINITION/.test(p.phase5); })());
  check('T26/PL4: dmsToSentenceForm DMS -> binary -> form; CI params needs-definition',
    (() => { const r = dmsToSentenceForm(arcSecForAddress(addr254), { changingLines: [4] });
      return r.address.gate === 25 && r.formId === 'yang-changing' && r.binary.join(',') === '-,--,--,-,-,-'
        && /NEEDS-DEFINITION/.test(r.collapseTrigger); })());

  // ------------------------------------------------------------ T19 successors
  // Gate 25, line 4 moving (9): k=1 -> lattice {25, 42}; operator images add
  // reverse 26, inverse 46, swap 34, converse 45, nuclear 53, single-line zhi
  // {12, 10, 13, (42 dup), 21, 17}; pair partner 26 (dup). Set = 12.
  const state254 = { ben: 25, lines: [7, 8, 8, 9, 7, 7] };
  const succ = successors(state254);
  check('T19: successors(gate 25, line 4 moving) -> exactly 12 lawful successors (2^1 lattice + 10 distinct images)',
    succ.length === 12);
  check('T19: successor entries are frozen {state, via, rule} over rules E1/E2/E6',
    succ.every((x) => Object.isFrozen(x) && Object.isFrozen(x.state) && x.via && SUCCESSOR_RULES.includes(x.rule)));
  check('T19: lattice includes Ben Gua (no flip) and Zhi Gua (all flips)',
    succ.some((x) => x.state.ben === 25 && x.rule === 'E1') && succ.some((x) => x.state.ben === 42 && x.rule === 'E1'));
  check('T19: dedup quotient — reverse (26) absorbs the King Wen pair partner',
    succ.filter((x) => x.state.ben === 26).length === 1
    && succ.find((x) => x.state.ben === 26).rule === 'E2');
  check('T19: successor states are re-feedable (static 7/8 lines)',
    succ.every((x) => x.state.lines.every((v) => v === 7 || v === 8)));
  check('T19: static gate (k=0) -> 1 lattice node (itself) + operator images',
    successors(25).length === successors(25).filter((x) => x.rule !== 'E1').length + 1
    && successors(25).find((x) => x.rule === 'E1').state.ben === 25);
  check('T19: rules filter — E1 only yields exactly the 2^k lattice',
    successors(state254, { rules: ['E1'] }).length === 2);
  check('T19: normalizeState accepts a bare gate number; movingLinesOf reads 6/9',
    normalizeState(25).lines.join(',') === '7,8,8,7,7,7' && movingLinesOf(state254).join(',') === '4');

  // ------------------------------------------------------------ lattice
  const lat1 = enumerateLattice(gateBits(25), 1);
  check('E1: enumerateLattice k=1 -> 2 nodes; count form walks lowest-line-first (line 1 -> gate 12)',
    lat1.nodes.length === 2 && lat1.bottom === 25 && lat1.top === 12 && lat1.edges.length === 1);
  check('E1: explicit moving line [4] -> top = zhi gua 42',
    enumerateLattice(gateBits(25), [4]).top === 42);
  const lat3 = enumerateLattice(gateBits(25), 3);
  check('E1: enumerateLattice k=3 -> 8 nodes, 12 edges (Boolean lattice B3)',
    lat3.nodes.length === 8 && lat3.edges.length === 12);
  const latDepth = enumerateLattice(gateBits(25), 3, { maxDepth: 1 });
  check('E1: depth control — k=3 maxDepth=1 -> 1 + 3 = 4 nodes, 3 edges',
    latDepth.nodes.length === 4 && latDepth.edges.length === 3 && latDepth.top === latDepth.bottom);
  check('E1: explicit changing-line set {2,5} -> 4 nodes over those lines',
    (() => { const l = enumerateLattice(gateBits(25), [2, 5]); return l.nodes.length === 4
      && l.nodes.every((n) => n.mask[0] === 0 && n.mask[2] === 0 && n.mask[3] === 0 && n.mask[5] === 0); })());

  // ------------------------------------------------------------ T17 reading path
  const rp1 = readingPath([4]);
  check('T17: readingPath([4]) -> k=1 case K1 (the changing line statement)',
    rp1.k === 1 && rp1.case === 'K1');
  const rp6qian = readingPath([1, 2, 3, 4, 5, 6], { ben: 1 });
  check('T17: Qian all-nines special case -> yong text', /yong/.test(rp6qian.answer));
  const rp0 = readingPath([]);
  check('T17: k=0 -> Tuan of the original hexagram', rp0.k === 0 && /Tuan/.test(rp0.answer));
  check('T17: readingPath via is fragments.evaluateReading when available, local table otherwise',
    ['fragments.evaluateReading', 'local T17 table'].includes(readingPath([4]).via)
    && typeof FRAGMENTS.hasEvaluateReading === 'boolean'
    && ['fragments.js', 'local (P4c reference)'].includes(SWAP_SOURCE));

  // ------------------------------------------------------------ E6 pairs
  check('E6: pairPartner 25<->26, 63<->64', pairPartner(25) === 26 && pairPartner(64) === 63);

  // ------------------------------------------------------------ PL9 grid
  const grid = banXiangGrid(25);
  check('PL9: banXiangGrid(25) — subject zhen/Arousing, object qian/Creative',
    grid.subject.trigram === 'zhen' && grid.object.trigram === 'qian'
    && grid.subject.role.startsWith('Subject/Agent') && grid.object.role.startsWith('Object/Environment'));
  check('PL9: pairs — inverse 46 (pang tong), swap 34 (jiao gua), nuclear 53 (hu gua)',
    grid.pairs.inverse.gate === 46 && grid.pairs.swap.gate === 34 && grid.pairs.nuclear.gate === 53);
  check('PL9: symmetry flags — gate 1 is self-reverse/self-swap, complement maps to gate 2',
    (() => { const g1 = banXiangGrid(1); return g1.symmetry.selfReverse && g1.symmetry.selfSwap
      && !g1.symmetry.selfInverse && g1.pairs.inverse.gate === 2; })());

  // ------------------------------------------------------------ disclaimer + Predictor
  check('§5: PREDICTION_DISCLAIMER quotes mechanism-not-oracle + H-F7',
    PREDICTION_DISCLAIMER.includes('mechanism, not oracle') && PREDICTION_DISCLAIMER.includes('H-F7'));
  const predictor = new Predictor();
  check('Predictor: works engine-less; next(state) === successors(state)',
    (() => { const a = predictor.next(state254); return a.length === 12
      && a.every((x, i) => x.state.ben === succ[i].state.ben && x.via === succ[i].via); })());
  check('Predictor: lattice + readingPath + grid + disclaimer exposed',
    predictor.lattice(state254).nodes.length === 2 && predictor.readingPath([4]).k === 1
    && predictor.grid(25).gate === 25 && predictor.disclaimer === PREDICTION_DISCLAIMER);
  const engineWrapped = new Predictor({ engine: { id: 'stub' } });
  check('Predictor: optional engine is stored, never required', engineWrapped.engine.id === 'stub' && engineWrapped.next(state254).length === 12);

  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { failed } = run();
  process.exit(failed ? 1 : 0);
}
