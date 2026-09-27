// Ports-B tests — run with node from project root: node test/ports-b.test.mjs
// Covers coder-B donor ports:
//   src/state-space/mesh-state-space.js  (COHERENT state_space_core.mjs)
//   src/engine/rule-council.js           (COHERENT FiveDimensionalRuleCouncil.mjs)
//   src/state-space/wen-wang-gua.js      (COHERENT SuperIChingSymbols.mjs)
//   src/engine/v2/{layer5_ssm,phase_space_engine,coordinate_engine}.js
//     (handoff 02_safe_namespaced_additions/complete_v2_engine/)
// All assertions deterministic: no wall-clock, seeded rng only.
import { fileURLToPath } from 'node:url';
import {
  StateSpace, DimensionLayer, DIMENSIONS, DIMENSION_CLAIMS,
  MAWANGDUI_TRIGRAM_FAMILY, MAWANGDUI_INTRA_OCTET_CLAIM, buildGateTable,
} from '../src/state-space/mesh-state-space.js';
import { CLAIM_STATUS, isClaim } from '../src/state-space/claim-status.js';
import { KING_WEN_TO_FUXI_DECIMAL, gateBits, gateFromBits } from '../src/state-space/addressing.js';
import {
  FiveDimensionalRuleCouncil, RULE_SOURCES,
} from '../src/engine/rule-council.js';
import {
  BRANCHES, BRANCH_BY_ABBR, BRANCH_BY_PINYIN, BRANCH_ORDER, PROVENANCE,
  Star, STAR_META, Role, LineStatus, LineCell, AnnotatedHexagram,
  branchesBound, branchesStrike, coinToStatus, statusToBit, statusAfterMove,
  isMoving, fromCoinTosses, alphabetExport,
} from '../src/state-space/wen-wang-gua.js';
import { StateSpaceModel } from '../src/engine/v2/layer5_ssm.js';
import { PhaseSpaceEngine } from '../src/engine/v2/phase_space_engine.js';
import { CoordinateEngine, TOTALS } from '../src/engine/v2/coordinate_engine.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  // =============== 1. mesh-state-space: gate table ===============
  const table = buildGateTable();
  check('buildGateTable: 64 gates, frozen', table.length === 64 && Object.isFrozen(table));
  check('buildGateTable: binary matches canonical KING_WEN_TO_FUXI_DECIMAL for all 64',
    table.every((g) => g.binary.reduce((acc, b, i) => acc | (b << i), 0) === KING_WEN_TO_FUXI_DECIMAL[g.gate]));
  check('buildGateTable: gate 1 = 111111 Kian/Kian', eq(table[0].binary, [1, 1, 1, 1, 1, 1])
    && table[0].trigrams.upper === 'Kian' && table[0].trigrams.lower === 'Kian');
  check('buildGateTable: gate 2 = 000000 Kun/Kun', eq(table[1].binary, [0, 0, 0, 0, 0, 0])
    && table[1].trigrams.upper === 'Kun' && table[1].trigrams.lower === 'Kun');
  check('buildGateTable: gate 11 (泰) = lower Kian / upper Kun (heaven below earth)',
    table[10].trigrams.lower === 'Kian' && table[10].trigrams.upper === 'Kun');
  check('buildGateTable: every gate has 6 binary bits + named trigrams',
    table.every((g) => g.binary.length === 6 && g.binary.every((b) => b === 0 || b === 1)
      && MAWANGDUI_TRIGRAM_FAMILY.includes(g.trigrams.upper)
      && MAWANGDUI_TRIGRAM_FAMILY.includes(g.trigrams.lower)));

  // =============== 2. mesh-state-space: 5-dim x 64-node invariants ===============
  const space = new StateSpace();
  check('StateSpace: exactly the 5 dimensions', eq(Object.keys(space.dimensions),
    ['Movement', 'Evolution', 'Being', 'Design', 'Space']));
  for (const name of Object.keys(space.dimensions)) {
    const layer = space.dimensions[name];
    check(`${name}: 64 nodes, each King Wen gate exactly once`,
      layer.nodes.length === 64 && eq([...layer.nodes.map((n) => n.gate)].sort((a, b) => a - b),
        Array.from({ length: 64 }, (_, i) => i + 1)));
  }
  check('StateSpace: layer roles per donor spec', DIMENSIONS.Movement.layerRole === 'knowledge'
    && DIMENSIONS.Evolution.layerRole === 'causal' && DIMENSIONS.Being.layerRole === 'state'
    && DIMENSIONS.Design.layerRole === 'temporal' && DIMENSIONS.Space.layerRole === 'dependency');
  check('Being layer is Fu Xi order (fuxi decimals 0..63 in order)',
    eq(space.dimensions.Being.nodes.map((n) => KING_WEN_TO_FUXI_DECIMAL[n.gate]),
      Array.from({ length: 64 }, (_, i) => i)));
  check('Design layer is King Wen order (gate === position+1)',
    space.dimensions.Design.nodes.every((n, i) => n.gate === i + 1));
  check('address(41) returns the gate node in all 5 dimensions at once',
    eq(Object.keys(space.address(41)).sort(), ['Being', 'Design', 'Evolution', 'Movement', 'Space'])
    && Object.values(space.address(41)).every((n) => n.gate === 41));
  check('node() returns null for a missing gate, throws for an unknown dimension',
    space.node('Being', 99) === null
    && (() => { try { space.node('Nope', 1); return false; } catch { return true; } })());
  check('contentSummary: honest zeros before any real book content is added',
    eq(space.contentSummary(), {
      Movement: { words: 0, letters: 0 }, Evolution: { words: 0, letters: 0 },
      Being: { words: 0, letters: 0 }, Design: { words: 0, letters: 0 }, Space: { words: 0, letters: 0 },
    }));

  // =============== 3. mesh-state-space: Mawangdui exact sequence ===============
  check('MAWANGDUI_TRIGRAM_FAMILY is the sourced order (Kian, Gen, Kan, Jen, Kun, Dui, Li, Sun)',
    eq([...MAWANGDUI_TRIGRAM_FAMILY], ['Kian', 'Gen', 'Kan', 'Jen', 'Kun', 'Dui', 'Li', 'Sun']));
  // Exact 64-gate Mawangdui family order as computed from the sourced upper-
  // octet grouping + the documented intra-octet principle, frozen here so any
  // gate-table regression (the historical gates-7/8 transposition class of
  // bug) fails loudly.
  const MAWANGDUI_GATE_ORDER = [1, 33, 6, 25, 12, 10, 13, 44, 26, 52, 4, 27, 23, 41, 22, 18,
    5, 39, 29, 3, 8, 60, 63, 48, 34, 62, 40, 51, 16, 54, 55, 32, 11, 15, 7, 24, 2, 19, 36, 46,
    43, 31, 47, 17, 45, 58, 49, 28, 14, 56, 64, 21, 35, 38, 30, 50, 9, 53, 59, 42, 20, 61, 37, 57];
  check('Evolution layer IS the exact Mawangdui sequence (64 gates, frozen expectation)',
    eq(space.dimensions.Evolution.nodes.map((n) => n.gate), MAWANGDUI_GATE_ORDER));
  check('Mawangdui first octet is the upper-Kian (Qian) family: gates 1,33,6,25,12,10,13,44',
    eq(space.dimensions.Evolution.nodes.slice(0, 8).map((n) => n.gate), [1, 33, 6, 25, 12, 10, 13, 44])
    && space.dimensions.Evolution.nodes.slice(0, 8).every((n) => n.trigrams.upper === 'Kian'));
  check('Mawangdui last octet is the upper-Sun (Xun) family',
    space.dimensions.Evolution.nodes.slice(56).every((n) => n.trigrams.upper === 'Sun'));

  // =============== 4. mesh-state-space: transforms + claim tags ===============
  check('Movement layer: reverse is a real involution (reverse∘reverse = identity)',
    space.dimensions.Movement.nodes.every((n) => {
      const twice = [...n.binary].reverse().reverse();
      return eq(twice, n.binary);
    })
    && eq(space.dimensions.Movement.nodes[0].binary, [...gateBits(1)].reverse()));
  check('Space layer: complement = fuxi ^ 63 (every line flipped)',
    space.dimensions.Space.nodes.every((n) => eq(n.binary, gateBits(n.gate).map((b) => b ^ 1))));
  check('dimension claims: Evolution + Design are SOURCE_STATEMENT with citations',
    DIMENSION_CLAIMS.Evolution.status === CLAIM_STATUS.SOURCE_STATEMENT
    && typeof DIMENSION_CLAIMS.Evolution.source === 'string' && DIMENSION_CLAIMS.Evolution.source.length > 0
    && DIMENSION_CLAIMS.Design.status === CLAIM_STATUS.SOURCE_STATEMENT
    && typeof DIMENSION_CLAIMS.Design.source === 'string');
  check('dimension claims: Movement/Space/Being stay PROJECT_HYPOTHESIS (unconfirmed donor flags preserved)',
    DIMENSION_CLAIMS.Movement.status === CLAIM_STATUS.PROJECT_HYPOTHESIS
    && DIMENSION_CLAIMS.Space.status === CLAIM_STATUS.PROJECT_HYPOTHESIS
    && DIMENSION_CLAIMS.Being.status === CLAIM_STATUS.PROJECT_HYPOTHESIS
    && DIMENSION_CLAIMS.Movement.evidence.donorFlag === 'confirmed: false');
  check('intra-octet ordering is tagged hypothesis, never asserted as sourced',
    isClaim(MAWANGDUI_INTRA_OCTET_CLAIM) && MAWANGDUI_INTRA_OCTET_CLAIM.status === CLAIM_STATUS.PROJECT_HYPOTHESIS);
  check('layers carry their claim (layer.claim is the dimension claim)',
    space.dimensions.Evolution.claim === DIMENSION_CLAIMS.Evolution);

  // =============== 5. mesh-state-space: word/dependency graph ===============
  const layer = new DimensionLayer('Being', DIMENSIONS.Being, table);
  const w1 = layer.addWord(41, { id: 'w-a', text: 'release' });
  const w2 = layer.addWord(24, { id: 'w-b', text: 'return', dependsOn: ['w-a'], relation: 'requires' });
  check('addWord registers cross-gate dependencies (w-b@24 depends on w-a@41)',
    eq(w2.dependsOn, ['w-a']) && layer.wordCount(41) === 1 && layer.wordCount(24) === 1);
  check('dependentsOf answers the reverse direction',
    eq(layer.dependentsOf('w-a').map((w) => w.id), ['w-b']) && layer.dependentsOf('w-b').length === 0);
  check('addWord rejects a dependency that does not exist yet (no silent dangling edges)',
    (() => { try { layer.addWord(1, { id: 'w-c', text: 'x', dependsOn: ['w-ghost'] }); return false; } catch { return true; } })());
  check('addWord rejects duplicate ids', (() => {
    try { layer.addWord(1, { id: 'w-a', text: 'y' }); return false; } catch { return true; }
  })());
  check('letterCount counts real letters only', layer.letterCount(41) === 7 && layer.totalWordCount() === 2
    && w1.gate === 41);
  check('loadBookContent appends coarse rule tags without touching the word graph',
    layer.loadBookContent(41, { rules: ['r1'] }).content.rules.length === 1 && layer.wordCount(41) === 1);
  check('constructor rejects a table that disagrees with the canonical map (transposition guard)',
    (() => {
      const bad = table.map((g) => (g.gate === 7 ? { ...g, binary: gateBits(8) } : g));
      try { new StateSpace(bad); return false; } catch { return true; }
    })());

  // =============== 6. rule-council: verdict determinism ===============
  const tools = [{ id: 'tool-a', provides: ['speak'] }, { id: 'tool-b', provides: ['compute'] }];
  const metabolism = { adaptationBudget: 0.5, totalReplenished: 0.5, repairPressure: 0.4 };
  const address = { gate: 41, line: 2, color: 3, tone: 4, base: 5 };
  const need = { id: 'need-1', kind: 'capability-gap', actionable: true, pressure: 0.7, reason: 'unresolved function', subject: 'user' };
  const context = { inputValues: { canonicalAddress: address }, expression: { constraints: ['bounded-growth'] } };
  const mkCouncil = () => new FiveDimensionalRuleCouncil({
    selfId: 'engine', getTools: () => tools, getMetabolism: () => metabolism,
  });
  const r1 = mkCouncil().evaluateGrowth({ need, capabilities: ['sing'], context });
  const r2 = mkCouncil().evaluateGrowth({ need, capabilities: ['sing'], context });
  check('council: identical inputs -> identical resolution incl. ruleHash (deterministic)',
    eq(r1, r2) && /^[0-9a-f]{8}$/.test(r1.ruleHash));
  check('council: full pass scenario permits growth (all 5 dimensions pass)',
    r1.permit === true && Object.values(r1.dimensions).every((d) => d.pass === true));
  check('council: no wall-clock — records carry counter seq, no Date.now fields',
    Number.isInteger(r1.seq) && !('at' in r1) && JSON.stringify(r1).indexOf('Date') === -1);
  check('council: sources are the five corpus books', Object.keys(RULE_SOURCES).length === 5
    && RULE_SOURCES.Movement.source.includes('Hatcher') && RULE_SOURCES.Space.source.includes('Govinda'));
  const bareCouncil = new FiveDimensionalRuleCouncil();
  const rb = bareCouncil.evaluateGrowth({ need, capabilities: ['sing'], context });
  check('council: honest empty metabolism fails the Evolution gate (no manufactured pressure)',
    rb.dimensions.Evolution.pass === false && rb.permit === false);
  check('council: no tools attached fails the Being gate (currentToolCount 0)',
    rb.dimensions.Being.pass === false);
  const rc = mkCouncil().evaluateGrowth({ need, capabilities: ['speak'], context });
  check('council: existing capability fails Being (no duplicate anatomy)',
    rc.dimensions.Being.pass === false && rc.permit === false);
  const m1 = mkCouncil().evaluateMorph({ intent: 'grow a branch', address, form: 'branch', route: ['a', 'b'], parentId: 'tool-a' });
  check('council: morph resolution deterministic and permitted for a complete morph',
    m1.permit === true && eq(m1, mkCouncil().evaluateMorph({ intent: 'grow a branch', address, form: 'branch', route: ['a', 'b'], parentId: 'tool-a' })));
  check('council: morph without parentId fails Being + Space', (() => {
    const m = mkCouncil().evaluateMorph({ intent: 'orphan', address, form: 'x', route: ['a'] });
    return m.dimensions.Being.pass === false && m.dimensions.Space.pass === false && m.permit === false;
  })());
  const council = mkCouncil();
  const res = council.evaluateGrowth({ need, capabilities: ['sing'], context });
  const goodCandidate = { toolId: 'tool-sing', provides: ['sing'], execute: () => 1, materialize: () => 1 };
  const badCandidate = { toolId: 'tool-x', provides: [], execute: () => 1 };
  check('validateCandidate: complete candidate passes, incomplete fails',
    council.validateCandidate({ candidate: goodCandidate, capabilities: ['sing'], resolution: res }).pass === true
    && council.validateCandidate({ candidate: badCandidate, capabilities: ['sing'], resolution: res }).pass === false);
  check('council snapshot: last 64 events, cloned (mutating it does not touch the log)',
    (() => {
      const snap = council.snapshot();
      snap.events[0].permit = 'tampered';
      return council.events[0].permit === true;
    })());
  check('council: donor-shaped unit still works via defensive probe', (() => {
    const unit = {
      runtimeHandle: '@unit',
      runtime: { getRegisteredTools: () => tools },
      metabolism: { snapshot: () => metabolism },
    };
    const res2 = new FiveDimensionalRuleCouncil({ unit })
      .evaluateGrowth({ need, capabilities: ['sing'], context });
    return res2.permit === true;
  })());

  // =============== 7. wen-wang-gua: branch/star tables ===============
  check('12 Earthly Branches complete, ordered, unique (t c y m cn e w wa s yo sh h)',
    BRANCHES.length === 12 && eq([...BRANCH_ORDER], ['t', 'c', 'y', 'm', 'cn', 'e', 'w', 'wa', 's', 'yo', 'sh', 'h'])
    && new Set(BRANCH_ORDER).size === 12);
  check('branch elements match super-iching.md §1.4 (water/earth/wood/fire/metal counts 2/4/2/2/2)',
    eq(BRANCHES.map(([, , , el]) => el).reduce((m, el) => ({ ...m, [el]: (m[el] || 0) + 1 }), {}),
      { water: 2, earth: 4, wood: 2, fire: 2, metal: 2 }));
  check('branch lookups by abbr and pinyin agree', BRANCH_BY_ABBR.t.pinyin === 'zi'
    && BRANCH_BY_PINYIN.hai.abbr === 'h' && BRANCH_BY_ABBR.sh.index === 10);
  check('bounding pairs are exactly the 6 六合 of super-iching.md §1.6',
    [['t', 'c'], ['y', 'h'], ['m', 'sh'], ['cn', 'yo'], ['e', 's'], ['w', 'wa']]
      .every(([a, b]) => branchesBound(a, b) && branchesBound(b, a))
    && !branchesBound('t', 'w'));
  check('strike pairs are exactly the 6 六沖 of super-iching.md §1.6',
    [['t', 'w'], ['c', 'wa'], ['y', 's'], ['m', 'yo'], ['cn', 'sh'], ['e', 'h']]
      .every(([a, b]) => branchesStrike(a, b) && branchesStrike(b, a))
    && !branchesStrike('t', 'c'));
  check('5 stars P/B/K/G/R with Alex + Jack glosses (super-iching.md §1.3)',
    eq(Object.values(Star).sort(), ['B', 'G', 'K', 'P', 'R'])
    && STAR_META.G.jack === 'Asset' && STAR_META.R.alex === 'Officer/Judge');
  check('provenance tags: attested tables are SUP, donor mechanics IMPLEMENTATION_CHOICE',
    PROVENANCE.branches.tag === 'SUP' && PROVENANCE.stars.tag === 'SUP'
    && PROVENANCE.coinToStatus.tag === 'SUP' && PROVENANCE.lineCellShape.tag === 'IMPLEMENTATION_CHOICE');

  // =============== 8. wen-wang-gua: casting + moving lines ===============
  check('coinToStatus: the full 3-coin grammar (SUP §1.1)',
    coinToStatus(3, 0) === LineStatus.MOVE_O && coinToStatus(0, 3) === LineStatus.MOVE_X
    && coinToStatus(1, 2) === LineStatus.QUIET_YANG && coinToStatus(2, 1) === LineStatus.QUIET_YIN
    && (() => { try { coinToStatus(2, 2); return false; } catch { return true; } })());
  check('moving-line marks: O is moving yang (-> yin), X is moving yin (-> yang)',
    statusToBit('O') === 1 && statusToBit('X') === 0 && statusAfterMove('O') === 0
    && statusAfterMove('X') === 1 && statusAfterMove('solid') === 1 && statusAfterMove('broken') === 0
    && isMoving('O') && isMoving('X') && !isMoving('solid') && !isMoving('broken'));
  check('LineCell validates line/star/branch/role vocabularies',
    (() => {
      try { new LineCell({ line: 7, status: 'solid' }); return false; } catch { /* expected */ }
      try { new LineCell({ line: 1, status: 'solid', star: 'Z' }); return false; } catch { /* expected */ }
      try { new LineCell({ line: 1, status: 'solid', branch: 'zz' }); return false; } catch { /* expected */ }
      return new LineCell({ line: 3, status: 'O', star: 'G', branch: 'w', role: 'J' }).moving === true;
    })());
  // Cast: 6 tosses bottom-first. yang,yang,yang,yin,yin,yin = bits
  // [1,1,1,0,0,0] = gate 11 (泰) via our canonical gateFromBits.
  const cast = fromCoinTosses(
    [[1, 2], [1, 2], [3, 0], [2, 1], [0, 3], [2, 1]],
    { selfLine: 3, opponentLine: 6, month: 'w', date: 'cn', question: 'probe' },
  );
  check('fromCoinTosses derives the King Wen gate via canonical gateFromBits (gate 11)',
    cast.gate === 11 && eq(cast.bits(), [1, 1, 1, 0, 0, 0])
    && cast.gate === gateFromBits(cast.bits()));
  check('moving lines are lines 3 (O) and 5 (X); second hexagram flips exactly those',
    eq(cast.movingLines(), [3, 5]) && cast.needsSecondHexagram() === true
    && eq(cast.secondHexagramBits(), [1, 1, 0, 0, 1, 0]));
  check('secondGate() is the King Wen gate of the changed hexagram',
    cast.secondGate() === gateFromBits([1, 1, 0, 0, 1, 0]));
  check('J/U roles locate self (line 3) and opponent (line 6) exactly once',
    cast.selfLine().line === 3 && cast.opponentLine().line === 6);
  const flagged = fromCoinTosses(
    [[1, 2], [1, 2], [1, 2], [2, 1], [2, 1], [2, 1]],
    { branches: ['t', 'c', 'w', 'm', 'cn', 'yo'], month: 'c', date: 'wa', empty: ['yo'] },
  );
  const tf = flagged.temporalFlags();
  check('temporal flags: bound/strike/empty computed per line (SUP §1.6 mechanics)',
    tf.lineFlags.some((f) => f.line === 1 && f.boundMonth === true)
    && tf.lineFlags.some((f) => f.line === 2 && f.strikeDate === true)
    && tf.lineFlags.some((f) => f.line === 3 && f.boundDate === true)
    && tf.lineFlags.some((f) => f.line === 6 && f.empty === true));
  check('quiet cast needs no second hexagram; toJSON is plain + complete',
    flagged.needsSecondHexagram() === false && flagged.secondGate() === null
    && eq(flagged.toJSON().secondBits, null) && flagged.toJSON().temporal.lineFlags.length >= 3);
  const abc = alphabetExport();
  check('alphabetExport carries 12 branches, 6 bounding + 6 strike pairs, 5 stars, provenance',
    abc.branches.length === 12 && abc.boundingPairs.length === 6 && abc.strikePairs.length === 6
    && Object.keys(abc.stars).length === 5 && abc.provenance.branches.tag === 'SUP');

  // =============== 9. v2/layer5_ssm: deterministic memory model ===============
  const ssm1 = new StateSpaceModel();
  const ssm2 = new StateSpaceModel();
  check('SSM: two fresh instances have identical B/C projections (seeded, no Math.random)',
    eq(ssm1.B, ssm2.B) && eq(ssm1.C, ssm2.C));
  const seq = [[1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], [0, 0, 0, 0, 0, 1]];
  const out1 = seq.map((x) => ssm1.step(x));
  const out2 = seq.map((x) => ssm2.step(x));
  check('SSM: identical input sequence -> identical outputs + identical state (double-run equality)',
    eq(out1, out2) && eq(ssm1.h, ssm2.h) && ssm1.time === 4);
  check('SSM: outputs are 6-dim tanh-bounded vectors',
    out1.every((y) => y.length === 6 && y.every((v) => Math.abs(v) <= 1)));
  check('SSM: A matrix is hexagram-coupled (A[0][63] weakest, A[0][1] strongest off-diagonal)',
    ssm1.A[0][1] > ssm1.A[0][63] && Math.abs(ssm1.A[0][0] - 0.99) < 1e-12);
  const memBefore = ssm1.memory.length;
  const pred = ssm1.predict([1, 1, 1, 1, 1, 1]);
  check('SSM: predict() does not commit — state, time, history AND memory unchanged',
    pred.length === 6 && ssm1.memory.length === memBefore && ssm1.time === 4
    && ssm1.history.length === 4 && eq(ssm1.h, ssm2.h));
  check('SSM: recall returns topK most similar memories, deterministic tie order',
    ssm1.recall([1, 0, 0, 0, 0, 0], 2).length === 2
    && ssm1.recall([1, 0, 0, 0, 0, 0], 2)[0].similarity >= ssm1.recall([1, 0, 0, 0, 0, 0], 2)[1].similarity);
  check('SSM: processMeshEvent records vertexId on the last history entry', (() => {
    const s = new StateSpaceModel(64, 6, 6, 7);
    const r = s.processMeshEvent({ id: 'v1', vector: [1, 0, 1, 0, 1, 0] });
    return r.time === 0 && s.history[0].vertexId === 'v1';
  })());
  check('SSM: getMood is deterministic and safe for tiny stateDim',
    eq(ssm1.getMood(), ssm2.getMood())
    && new StateSpaceModel(1, 6, 6).getMood().secondary === null);
  check('SSM: different seed -> different projections (seed actually matters)',
    !eq(new StateSpaceModel(64, 6, 6, 1).B, new StateSpaceModel(64, 6, 6, 2).B));

  // =============== 10. v2/phase_space_engine: 5-stage composition ===============
  const mesh = { vertices: new Map([['v1', { vector: [1, 1, 1, 0, 1, 0] }], ['v2', { vector: [1, 1, 0, 0, 1, 1] }]]) };
  const history = [{ vector: [0.2, -0.1, 0.3, 0, 0.1, -0.2] }, { vector: [0.3, -0.2, 0.4, 0, 0.2, -0.1] }];
  // Large all-positive input vector: signs stay positive through the
  // Movement rotation + Evolution pull, so Being/Space mesh relations are
  // exercised deterministically (bits [1,1,1,1,1,1]).
  const runCompose = () => new PhaseSpaceEngine().compose(
    { vector: [10, 10, 10, 10, 10, 10] },
    { mesh, history },
  );
  const c1 = runCompose();
  const c2 = runCompose();
  check('phase-space: compose double-run equality (JSON-identical final state + trace)',
    eq(c1, c2) && c1.complete === true && c1.errors.length === 0);
  check('phase-space: trace records all 5 stages in order',
    eq(c1.trace.map((t) => t.stage), ['Movement', 'Evolution', 'Being', 'Design', 'Space']));
  check('phase-space: the vector SURVIVES the Movement stage (donor lost it)',
    Array.isArray(c1.trace[0].output.vector) && c1.trace[0].output.vector.length === 6);
  check('phase-space: each stage stamps counter tick, no wall-clock fields',
    c1.trace.every((t) => JSON.stringify(t.output).indexOf('Date.now') === -1)
    && c1.finalState._space.tick === 1 && c1.finalState._movement.tick === 1
    && /^being_t1$/.test(c1.finalState._being.identity.id));
  check('phase-space: Being computes relations against mesh vertices (hamming < 3)',
    eq(c1.finalState._being.relations.map((r) => r.target).sort(), ['v1', 'v2'])
    && c1.finalState._being.relations.every((r) => r.distance === 2 && r.type === 'near'));
  check('phase-space: Space embeds address, identity, edges, portals, channels',
    typeof c1.finalState._space.address === 'string'
    && c1.finalState._space.identity.address === c1.finalState._space.address
    && c1.finalState._space.edges.length === 2
    && c1.finalState._space.portals.length === c1.finalState._space.edges.length
    && c1.finalState._space.edges.every((e) => e.transform.length === 6));
  check('phase-space: interrogative projection is read-only (Who->Space ... Why->Design)',
    (() => {
      const p = new PhaseSpaceEngine().project(c1.trace);
      return p.Who.stage === 'Space' && p.What.stage === 'Movement' && p.Where.stage === 'Being'
        && p.When.stage === 'Evolution' && p.Why.stage === 'Design';
    })());
  check('phase-space: empty-vector input never divides by zero (surface 0, no NaN)',
    (() => {
      const r = new PhaseSpaceEngine().compose({ label: 'no-vector' });
      const surf = r.trace.find((t) => t.stage === 'Being').output.surface;
      return r.complete && surf === 0 && Number.isNaN(surf) === false;
    })());
  check('phase-space: missing operator produces a recorded error, not a crash',
    (() => {
      const e = new PhaseSpaceEngine();
      e.registerOperator('Design', null);
      const r = e.compose({ vector: [1, 0, 0, 0, 0, 0] });
      return r.complete === false && r.errors[0].error === 'MISSING_OPERATOR' && r.trace.length === 4;
    })());
  check('phase-space: mesh shape adapted — plain object + Map + automata all work',
    (() => {
      const probe = (m) => new PhaseSpaceEngine().compose({ vector: [1, 1, 0, 0, 1, 0] }, { mesh: m })
        .finalState._being.relations.length;
      return probe({ vertices: { a: { vector: [1, 1, 0, 0, 1, 0] } } }) >= 1
        && probe(new Map([['a', { vector: [1, 1, 0, 0, 1, 0] }]])) >= 1
        && probe(null) === 0;
    })());

  // =============== 11. v2/coordinate_engine: exact 13-layer addressing ===============
  const ce = new CoordinateEngine();
  const ce2 = new CoordinateEngine();
  check('coordinate: 13 layers with the donor ranges',
    ce.layers.length === 13 && eq(ce.layers.map((l) => l.range), [13, 64, 6, 6, 6, 5, 360, 60, 60, 360, 12, 12, 4]));
  check('coordinate: TOTALS are the honest computed sizes (donor header numbers were wrong)',
    TOTALS.full === 241477720473600000n && TOTALS.sideA === 60369430118400000n && TOTALS.sideB === 43130880n);
  check('coordinate: full-space and Side A exceed 2^53 — BigInt is required (the donor overflowed)',
    TOTALS.full > BigInt(Number.MAX_SAFE_INTEGER) && TOTALS.sideA > BigInt(Number.MAX_SAFE_INTEGER));
  const coords = { planet: 12, gate: 41, line: 5, color: 3, tone: 2, base: 4, degree: 359, minute: 59, second: 58, arc: 300, zodiac: 11, house: 10, season: 3 };
  const addr = ce.toAddress(coords);
  check('coordinate: toAddress returns an exact BigInt',
    typeof addr === 'bigint');
  check('coordinate: fromAddress(toAddress(x)) round-trips EXACTLY at >2^53 scale (donor lost precision)',
    eq(ce.fromAddress(addr), coords));
  check('coordinate: max coordinates round-trip exactly', eq(ce.fromAddress(ce.toAddress(ce._maxCoords())), ce._maxCoords()));
  check('coordinate: out-of-range coordinate values are rejected',
    (() => { try { ce.toAddress({ gate: 64 }); return false; } catch { return true; } })()
    && (() => { try { ce.fromAddress(-1n); return false; } catch { return true; } })());
  check('coordinate: Side A / Side B addresses are exact BigInts and round-trip-consistent',
    typeof ce.toSideA(coords) === 'bigint' && typeof ce.toSideB(coords) === 'bigint'
    && ce.toSideA(coords) < TOTALS.sideA && ce.toSideB(coords) < TOTALS.sideB);
  check('coordinate: getStats reports decimal strings (JSON-safe at full scale)',
    ce.getStats().totalAddressSpace === '241477720473600000'
    && ce.getStats().sideASpace === ce.toSideA(ce._maxCoords()).toString());
  check('coordinate: labels resolve per layer', ce.getLabel('planet', 0) === 'Sun'
    && ce.getLabel('gate', 40) === 'Gate 41' && ce.getLabel('degree', 123) === '123');
  check('coordinate: resonance is 1 for identical coords, symmetric, gate-weighted',
    ce.computeResonance(coords, coords) === 1
    && ce.computeResonance(coords, { ...coords, gate: 1 }) === ce.computeResonance({ ...coords, gate: 1 }, coords)
    && ce.computeResonance(coords, { ...coords, gate: 1 }) < 1);
  check('coordinate: emergent degree/minute/second/arc are derived modulo math',
    eq(ce.computeEmergent(coords), {
      degree: (41 * 6 + 5) % 360, minute: (3 * 6 + 2) % 60,
      second: (4 * 13 + 12) % 60, arc: ((11 * 12 + 10) * 30) % 360,
    }));
  check('coordinate: two engines agree exactly (deterministic double-run)',
    ce.toAddress(coords) === ce2.toAddress(coords) && eq(ce.getStats(), ce2.getStats()));

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = run();
  console.log(`\nports-b.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
