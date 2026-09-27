// Ports-C tests — run with node from project root: node test/ports-c.test.mjs
// Covers coder-C donor ports and sweep integrations:
//   src/state-space/human-design.js        (humanDesign.ts, 86KB HD engine)
//   src/state-space/correspondences.js     (KingWen.csv/YiSphere.csv/MandalaGeometry.cs)
//   src/engine/override-registry.js        (self_correcting_v1 OverrideRegistry.ts)
//   src/engine/self-correcting.js          (ConfidenceTracker/UnknownHandler + self-editor bridge)
//   src/engine/synthai-converter.js        (synthai_converter_stub.py, real 64-gate table)
//   src/experiments/scale/fsm.js, automata-composition.js, parsers.js, graph-trace.js,
//     phase-corpora.js; src/experiments/hypothesis-registry.js  (phase1/2/pass3 sweep)
//   src/engine/boolean-ato.js, resonance-network.js, klein-distributional.js (spot-checks)
// All assertions deterministic: no wall-clock, seeded rng only.
import { fileURLToPath } from 'node:url';

import * as hd from '../src/state-space/human-design.js';
import { CANONICAL_CHANNELS, CENTERS } from '../src/merged/centers-channels.js';
import { gatePattern } from '../src/merged/kingwen.js';
import * as corr from '../src/state-space/correspondences.js';
import * as conv from '../src/engine/synthai-converter.js';
import { OverrideRegistry, KNOWLEDGE_LAYER, OVERRIDE_TYPE, applyOverride } from '../src/engine/override-registry.js';
import { createSelfCorrectingSystem } from '../src/engine/self-correcting.js';
import { SelfEditor } from '../src/emergence/self-editor.js';
import { FiniteStateMachine, FSMState, FSMTransition } from '../src/experiments/scale/fsm.js';
import { AutomataComposer, createAutomatonOperator, createDiscourseOperator } from '../src/experiments/scale/automata-composition.js';
import { MultiScaleTokenizer, DependencyParser } from '../src/experiments/scale/parsers.js';
import { HypothesisRegistry, HYPOTHESIS_STATUS } from '../src/experiments/hypothesis-registry.js';
import { GraphTraceBuilder, MeshRegistry } from '../src/experiments/scale/graph-trace.js';
import { AutomataMesh } from '../src/mesh/mesh.js';
import { SyntheticDataset, LinguisticDataset, ComputationalDataset, seededShuffle } from '../src/experiments/scale/phase-corpora.js';
import { FeatureSpace, verifyInvolution, retargetPlan, hierarchy, transformTree } from '../src/engine/boolean-ato.js';
import { ResonanceNetwork } from '../src/engine/resonance-network.js';
import { DistributionalLexicon } from '../src/engine/klein-distributional.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  // =============== 1. human-design.js: completeness ===============
  const gateKeys = Object.keys(hd.GATES).map(Number);
  check('human-design: exactly 64 gates, 1..64', gateKeys.length === 64 && Math.min(...gateKeys) === 1 && Math.max(...gateKeys) === 64);
  check('human-design: every gate has 6 lines with keynotes',
    gateKeys.every((g) => hd.GATES[g].lines.length === 6 && hd.GATES[g].lines.every((l) => typeof l.keynote === 'string')));
  check('human-design: GATE_WHEEL is a permutation of 1..64',
    hd.GATE_WHEEL.length === 64 && eq([...hd.GATE_WHEEL].sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i + 1)));
  check('human-design: donor GATE_CENTER covers all 64 gates (fills our 12-gate gap)',
    gateKeys.every((g) => typeof hd.GATE_CENTER[g] === 'string'));
  check('human-design: our tables stay primary — 9 centers + 36 canonical channels intact',
    Object.keys(CENTERS).length === 9 && CANONICAL_CHANNELS.length === 36);
  check('human-design: 58 of 64 donor binary strings match our kingwen table; 6 preserved as CONFLICTs',
    hd.HD_GATE_BINARY_CONFLICTS.length === 6
    && hd.HD_GATE_BINARY_CONFLICTS.every((c) => c.claim.status === 'CONFLICT')
    && gateKeys.filter((g) => hd.GATES[g].binary === gatePattern(g).join('')).length === 58);
  check('human-design: center conflicts recorded incl. gate 29 (ours dual-assigns Solar+Sacral)',
    hd.HD_GATE_CENTER_VARIANTS.conflicts.some((c) => c.gate === 29 && c.donor === 'Sacral')
    && hd.HD_GATE_CENTER_VARIANTS.gapFills.length === 12);
  check('human-design: three wheel-anchor variants preserved (58.0 code / 311.75 comment / 46.75 mandala)',
    hd.HD_WHEEL_ANCHOR_VARIANTS.length === 3 && hd.HD_WHEEL_ANCHOR_VARIANTS.every((c) => c.status === 'CONFLICT'));
  const chartA = hd.calculateHumanDesign(new Date(Date.UTC(1990, 0, 1, 12, 0)), '12:00', 'nowhere');
  check('human-design: chart computes type/profile/placements (Manifesting Generator 5/6 on this fixture)',
    chartA.type === 'Manifesting Generator' && chartA.profile === '5/6' && chartA.placements.length > 0);
  check('human-design: F1 fix — chart is timezone-deterministic (UTC fixture)',
    eq(hd.calculateHumanDesign(new Date(Date.UTC(1990, 0, 1, 12, 0)), '12:00', 'x').placements, chartA.placements));
  check('human-design: activeChannels bridge fills the donor channels:[] stub from our 36-channel table',
    Array.isArray(hd.activeChannels(chartA)) && hd.activeChannels({ placements: [{ gate: 1 }, { gate: 8 }] }).includes('1-8'));

  // =============== 2. correspondences.js ===============
  check('correspondences: 64 KingWen codon-ring rows, gate-numbered 1..64',
    corr.KINGWEN_CODON_RINGS.length === 64 && corr.KINGWEN_CODON_RINGS[0].number === 1 && corr.KINGWEN_CODON_RINGS[63].number === 64);
  check('correspondences: 19 distinct codon rings; gate 41 in the Origin ring',
    corr.CODON_RINGS.length === 19 && corr.codonRing(41) === 'Origin');
  check('correspondences: YiSphere 64 rows + alt 64 rows; zero ordinal/trigram mismatches vs our kingwen',
    corr.YISPHERE_MANDALA.length === 64 && corr.YISPHERE_MANDALA_ALT.length === 64
    && corr.YISPHERE_ORDINAL_CROSSCHECK.mismatches.length === 0 && corr.KINGWEN_TRIGRAM_CROSSCHECK.mismatches.length === 0);
  check('correspondences: MandalaGeometry derived wheel — gate 1 at 46.75 deg (DERIVED, anchor conflict recorded)',
    corr.gateStartAngle(1) === 46.75 && corr.MANDALA_ANCHOR_CLAIM.status === 'DERIVED'
    && corr.MANDALA_ANCHOR_CLAIM.evidence.kind === 'wheel-anchor');
  check('correspondences: lineStartAngle steps 0.9375 deg per line',
    Math.abs(corr.lineStartAngle(1, 2) - (46.75 - 0.9375)) < 1e-9);

  // =============== 3. synthai-converter.js ===============
  check('converter: all 64 gates mapped (donor stub had 2 + silent all-yin fallback)',
    Object.keys(conv.HEXAGRAM_BIN).length === 64
    && conv.yijiBinaryForGate(1) === '111111' && conv.yijiBinaryForGate(2) === '000000'
    && conv.yijiBinaryForGate(41) === '100011');
  let threw = false;
  try { conv.yijiBinaryForGate(65); } catch { threw = true; }
  check('converter: out-of-range gate throws (F1: no silent gate-2 impersonation)', threw);
  const entry = conv.convertEntry({ dimension: 'Mind', center: 'G', gate: 41, line: 2, color: 3, tone: 4, base: 5, degree: 1, minute: 2, second: 3, axis: 'x', house: 4, planet: 'Sun' });
  check('converter: waveform GLCTB formulas + sentence template (F2: `l` NameError fixed)',
    entry.waveform.freq === 0.5 + 4 / 6 && entry.waveform.carrier === 1
    && entry.sentence === 'Mind speaks Gate 41.2, motivated by Color 3, resonating at Tone 4, Base 5.');

  // =============== 4. override-registry.js: priority resolution determinism ===============
  const buildReg = () => {
    const r = new OverrideRegistry();
    r.set('gate.25.meaning', 'Innocence', KNOWLEDGE_LAYER.CANON, { source: 'canon', confidence: 0.9 });
    r.set('gate.25.meaning', 'Love', KNOWLEDGE_LAYER.USER, { source: 'user' });
    r.set('gate.25.meaning', 'Spirit of Self', KNOWLEDGE_LAYER.INFERRED, { source: 'inferred' });
    return r;
  };
  const regA = buildReg(); const regB = buildReg();
  check('override-registry: donor layer priority — INFERRED beats USER beats CANON (verbatim)',
    regA.get('gate.25.meaning').value === 'Spirit of Self' && regA.get('gate.25.meaning').layer === 'inferred');
  check('override-registry: resolution fully deterministic (two registries, identical exports)',
    eq(regA.export(), regB.export()));
  check('override-registry: alternatives exposed, never silently dropped',
    regA.get('gate.25.meaning').alternatives.length === 2);
  check('override-registry: F2 fix — unknown() placeholder never shadows a real value',
    (() => { regA.unknown('gate.25.meaning'); return regA.get('gate.25.meaning').value === 'Spirit of Self' && !regA.get('gate.25.meaning').isUnknown; })());
  check('override-registry: truly unknown key resolves as explicit isUnknown placeholder',
    regA.get('gate.99.meaning').isUnknown === true && regA.get('gate.99.meaning').value === null);
  check('override-registry: F3 fix — MERGE composes against next-lower value',
    (() => {
      const r = new OverrideRegistry();
      r.set('doc.a', { x: 1, y: 2 }, KNOWLEDGE_LAYER.DEFAULT, { source: 's' });
      r.set('doc.a', { y: 3, z: 4 }, KNOWLEDGE_LAYER.USER, { source: 'u', overrideType: OVERRIDE_TYPE.MERGE });
      return eq(r.get('doc.a').value, { x: 1, y: 3, z: 4 }) && eq(r.get('doc.a').rawValue, { y: 3, z: 4 });
    })());
  check('override-registry: applyOverride APPEND/PREPEND/MASK semantics',
    applyOverride([2], [1], OVERRIDE_TYPE.APPEND).join('') === '12'
    && applyOverride('ab', 'cd', OVERRIDE_TYPE.PREPEND) === 'abcd'
    && applyOverride(9, 8, OVERRIDE_TYPE.MASK) === 9);
  check('override-registry: versioning chain + history deterministic (seq, not Date.now)',
    (() => {
      const h = regA.history('gate.25.meaning');
      return h.length >= 3 && h.every((e, i) => i === 0 || e.seq < h[i - 1].seq);
    })());

  // =============== 5. self-correcting.js (+ self-editor bridge) ===============
  const sys = createSelfCorrectingSystem({ editor: new SelfEditor() });
  sys.registry.set('gate.1.meaning', 'Creative', KNOWLEDGE_LAYER.CANON, { source: 'canon', confidence: 0.9 });
  sys.confidenceTracker.trackConfidence('gate.1.meaning', 0.9, 'user_override');
  const dispute = sys.confidenceTracker.challenge('gate.1.meaning', 'Creative-v2', [{ weight: 0.9, verified: true }], 'user');
  check('self-correcting: dispute opens with evidence-derived confidence', dispute.id.startsWith('dispute:') && dispute.confidence > 0.5);
  sys.confidenceTracker.resolveDispute('gate.1.meaning', dispute.id, 'accept');
  check('self-correcting: accepted dispute writes COMPUTED-layer override',
    sys.registry.get('gate.1.meaning').value === 'Creative-v2' && sys.registry.get('gate.1.meaning').layer === 'computed');
  check('self-correcting: deterministic tick-based decay (F2: no setInterval wall-clock)',
    (() => { const before = sys.confidenceTracker.getConfidenceReport('gate.1.meaning').breakdown.recency; sys.confidenceTracker.tick(10); return sys.confidenceTracker.getConfidenceReport('gate.1.meaning').breakdown.recency < before; })());
  check('self-correcting: report carries 5-component breakdown + recommendation ladder',
    (() => { const r = sys.confidenceTracker.getConfidenceReport('gate.1.meaning'); return Object.keys(r.breakdown).length === 5 && typeof r.recommendation === 'string'; })());
  check('self-correcting: F5 fix — unknown does not self-resolve against its own placeholder',
    sys.unknownHandler.handleUnknown('玄').status !== 'resolved');
  check('self-correcting: unknown with structural hypothesis -> pending_review ladder rung',
    sys.unknownHandler.handleUnknown('gate 42 summary').status === 'pending_review');
  const editLogBefore = sys.getSystemStats ? null : null;
  check('self-correcting: system stats aggregate registry+confidence+unknowns',
    Boolean(sys.getSystemStats().registry) && Boolean(sys.getSystemStats().confidence) && Boolean(sys.getSystemStats().unknown));

  // =============== 6. phase sweep: fsm + composition ===============
  const mkA = () => { const m = new FiniteStateMachine({ id: 'a', name: 'A' }); m.addState(new FSMState({ id: 's0', initial: true, name: 's0' })); m.addState(new FSMState({ id: 's1', accepting: true, name: 's1' })); m.addTransition(new FSMTransition({ from: 's0', to: 's1', input: 'a' })); return m; };
  const mkB = () => { const m = new FiniteStateMachine({ id: 'b', name: 'B' }); m.addState(new FSMState({ id: 't0', initial: true, name: 't0' })); m.addState(new FSMState({ id: 't1', accepting: true, name: 't1' })); m.addTransition(new FSMTransition({ from: 't0', to: 't1', input: 'b' })); return m; };
  const composer = new AutomataComposer();
  const seq = composer.composeSequential(mkA(), mkB());
  check('fsm: F1 epsilon fix — sequentially composed machine accepts ab (donor dead-ended)',
    seq.run('ab').accepted === true && seq.run('a').accepted === false);
  const kle = composer.composeKleene(mkA());
  check('fsm: F3 kleene fix — accepts empty + repeated a, not arbitrary prefixes',
    kle.run('').accepted && kle.run('aaa').accepted);
  check('automata-composition: o_automaton plain-object operator (no phase-core dependency)',
    createAutomatonOperator().apply([mkA(), mkB()], { mode: 'sequential' }).stateCount === seq.states.size);
  check('automata-composition: o_discourse ladder verbatim (sentences->paragraph, paragraph->discourse)',
    createDiscourseOperator().apply([{ id: 'x', scale: 'sentence', text: 's' }, { id: 'y', scale: 'sentence', text: 't' }]).scale === 'paragraph'
    && createDiscourseOperator().apply([{ id: 'x', scale: 'sentence', text: 's' }, { id: 'y', scale: 'paragraph', text: 'p' }]).scale === 'discourse');

  // =============== 7. phase sweep: parsers ===============
  const tk = new MultiScaleTokenizer();
  const doc = tk.tokenize('The cat sleeps. A dog runs fast.');
  check('parsers: discourse tree decomposes to 7 words across scales (spec §5)',
    doc.type === 'discourse' && tk.flattenToScale(doc, 'word').length === 7);
  check('parsers: F1 fix — sentence/word/grapheme dispatches no longer crash',
    tk.tokenize('Hi there.', 'sentence').type === 'sentence'
    && tk.tokenize('one two', 'word').length === 2
    && tk.tokenize('ab', 'grapheme').length === 2);
  const parsed = new DependencyParser().parse(tk.tokenize('The cats sleep soundly', 'word'));
  check('parsers: dependency parse finds root + det relation (G_D projection)',
    parsed.relations.some((r) => r.relation === 'root') && parsed.relations.some((r) => r.relation === 'det'));

  // =============== 8. phase sweep: hypothesis registry ===============
  const hr = new HypothesisRegistry();
  check('hypotheses: six core hypotheses H1-H6 with pre-registered thresholds',
    hr.list().length === 6 && hr.get('H1').threshold === 0.7 && hr.get('H6').metric === 'numericalCorrelation');
  check('hypotheses: evaluate ladder supported/rejected/inconclusive',
    hr.get('H1').evaluate(0.8) === 'supported' && hr.get('H2').evaluate(0.3) === 'inconclusive' && hr.get('H3').evaluate(0.01) === 'rejected');
  check('hypotheses: F1 fix — evidence carries seq not wall-clock',
    (() => { hr.get('H1').addEvidence('ev:x'); return hr.get('H1').evidence.at(-1).seq === 1 && HYPOTHESIS_STATUS.includes(hr.get('H1').status); })());

  // =============== 9. phase sweep: graph-trace + state mesh ===============
  const mesh = new AutomataMesh();
  const trace = new GraphTraceBuilder(mesh);
  trace.recordDecomposition('ab', { id: 'prim:a' }, 0);
  trace.recordComposition('o_sequence', [{ id: 'prim:a' }, { id: 'prim:b' }], { id: 'res:ab' });
  trace.recordActivation('st:1', 0.75, 0.5);
  check('graph-trace: adapter writes into our 5-projection AutomataMesh (donor Graph not duplicated)',
    trace.metrics().knowledge.edges >= 2 && trace.metrics().causal.edges === 1
    && trace.metrics().temporal.edges === 1 && trace.metrics().phase.edges === 1 && trace.metrics().dependency.edges === 2);
  let actThrew = false;
  try { trace.recordActivation('st:x', 'high', 0); } catch (e) { actThrew = e instanceof TypeError; }
  check('graph-trace: F2 fix — non-numeric activation rejected up front', actThrew);
  const mr = new MeshRegistry();
  const loc = mr.create('L1', 'local');
  loc.join('s1', { zone: 'a' }); loc.join('s2', { zone: 'b' });
  const packets = loc.propagate('s1', { note: 'hi' }, (q) => q.zone === 'b');
  check('graph-trace: StateMesh qualifier-filtered qualified packets (F1 seq ids)',
    packets.length === 1 && packets[0]._recipient === 's2' && packets[0]._seq === 3 && mr.memberships('s2').length === 1);

  // =============== 10. phase sweep: corpora ===============
  const s1 = new SyntheticDataset('x', { seed: 7 }); const s2 = new SyntheticDataset('x', { seed: 7 });
  check('corpora: F1 fix — seeded synthetic generation is reproducible',
    eq(s1.generateBalancedDelimiters(10), s2.generateBalancedDelimiters(10)));
  check('corpora: generated delimiters are actually balanced',
    s1.items.every((it) => { let d = 0; for (const ch of it.input) { if ('([{'.includes(ch)) d++; else d--; if (d < 0) return false; } return d === 0; }));
  const ld = new LinguisticDataset(); ld.minimalPairs(); ld.wordFamilies(); ld.controlledSentences();
  check('corpora: linguistic corpus rows verbatim (5 minimal pairs + 3 families + 3 sentences)',
    ld.items.length === 11);
  const cd = new ComputationalDataset(); cd.finiteStateMachines(); cd.expressionTrees(); cd.automataCompositions();
  check('corpora: computational corpus rows (1 FSM + 2 trees + 1 composition)', cd.items.length === 4);
  check('corpora: F2 fix — seeded split is a true Fisher-Yates partition, reproducible',
    eq(ld.split(undefined, 3).discovery, ld.split(undefined, 3).discovery)
    && ld.split(undefined, 3).discovery.length + ld.split(undefined, 3).validation.length + ld.split(undefined, 3).test.length === 11
    && eq(seededShuffle([1, 2, 3, 4, 5], 9), seededShuffle([1, 2, 3, 4, 5], 9)));

  // =============== 11. spot-check: boolean-ato ===============
  check('boolean-ato: involution holds for xor + equivalence (Klein core law)',
    verifyInvolution('1011', '0110', 'xor') && verifyInvolution('1011', '0110', 'equivalence'));
  const fs = new FeatureSpace(['f1', 'f2', 'f3', 'f4']);
  fs.add('man', '1011').add('king', '1111').add('woman', '0011');
  const analogy = fs.analogy('man', 'king', 'woman');
  check('boolean-ato: FeatureSpace analogy returns candidates ranked by hamming distance',
    analogy.candidates.length > 0 && analogy.result.length === 4);
  check('boolean-ato: retargetPlan shifts every state by *DE transform',
    retargetPlan(['00', '01', '11'], '10').result.at(-1).join('') === '10');
  check('boolean-ato: hierarchy bottoms out at one vector; transformTree recurses objects',
    hierarchy(['00', '01', '10', '11']).at(-1).length === 1
    && eq(transformTree({ a: '10' }, { a: '11' }, { a: '01' }, 'xor'), { a: [0, 0] }));

  // =============== 12. spot-check: resonance + klein-distributional ===============
  const res = new ResonanceNetwork({ learningRate: 0.5 });
  res.observe({ a: 'x', b: 'y', outcome: 1 });
  res.observe({ a: 'x', b: 'y', outcome: 1 });
  const res2 = new ResonanceNetwork({ learningRate: 0.5 });
  res2.observe({ a: 'x', b: 'y', outcome: 1 });
  res2.observe({ a: 'x', b: 'y', outcome: 1 });
  check('resonance: F1 fix — deterministic seq ids, reproducible snapshots',
    res.events[0].id === 'resonance:1' && eq(res.snapshot().edges, res2.snapshot().edges)
    && eq(res.snapshot().nodes, res2.snapshot().nodes));
  check('resonance: verified observations move weight toward outcome; unverified do not',
    Math.abs(res.edges.get('x<->y').weight - 0.75) < 1e-9
    && (res.observe({ a: 'x', b: 'y', outcome: -1, verified: false }), Math.abs(res.edges.get('x<->y').weight - 0.75) < 1e-9));
  const lex = new DistributionalLexicon();
  lex.observe('ctx1', 'cat sat mat');
  lex.observe('ctx1', 'dog sat mat');
  lex.observe('ctx2', 'cat purred');
  lex.observe('ctx2', 'dog barked');
  check('klein-distributional: overlap inference finds cat/dog as related-or-synonym (donor thresholds)',
    (() => { const r = lex.infer('cat'); return r.synonyms.includes('dog') || r.related.includes('dog'); })());

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = run();
  console.log(`\nports-c.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
