// Emergence layer tests — run with node from project root: node test/emergence.test.mjs
// Covers the modules ported from pure-synthia-pass4-step41-REPAIRED/src/emergence/:
// intent-engine, self-editor, detector, coordination + their engine wiring.
import { fileURLToPath } from 'node:url';
import { SynthiaAutomata } from '../src/engine/synthia.js';
import { IntentEngine, INTENT_PROVENANCE } from '../src/emergence/intent-engine.js';
import { SelfEditor, EDITOR_PROVENANCE } from '../src/emergence/self-editor.js';
import { EmergenceDetector, DETECTOR_PROVENANCE } from '../src/emergence/detector.js';
import { MeshCoordinator, COORDINATION_PROVENANCE } from '../src/emergence/coordination.js';
import { AutomataMesh } from '../src/mesh/mesh.js';
import { Automaton } from '../src/automata/automaton.js';
import { EmergentChannels, CHANNEL_PROMOTION_THRESHOLD } from '../src/mesh/channels.js';
import { stableStringify } from '../src/engine/derivation.js';

const HEX8 = /^[0-9a-f]{8}$/;
const eq = (a, b) => stableStringify(a) === stableStringify(b);

/** A minimal delta automaton: s0 --flow--> s1 (accepting) on any symbol. */
function makeDeltaAutomaton(id) {
  return new Automaton({
    id,
    address: { gate: 1 },
    states: [{ id: 's0', initial: true }, { id: 's1', accepting: true }],
    alphabet: ['a', 'b'],
    q0: 's0',
    finals: ['s1'],
    delta: () => ({ to: 's1', transition: 'flow' }),
  });
}

export async function run({ quiet } = {}) {
  let passed = 0; let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed++; if (!quiet) console.log(`ok   ${name}`); }
    else { failed++; failures.push(name); console.log(`FAIL ${name}`); }
  };

  // =============== 1. IntentEngine (unit) ===============
  {
    const intent = new IntentEngine({});
    const okDerivation = {
      id: 'drv-ok', operators: ['o_automaton'], primitives: ['klein-analogy'],
      output: { ok: true }, evaluation: { accepted: true },
    };
    const r1 = intent.observe(okDerivation);
    check('intent: satisfied derivation -> satisfied, no gap, no proposal',
      r1.satisfied === true && r1.gap === null && r1.proposal === null && intent.gaps.length === 0);
    check('intent: o_automaton maps to intent type compute (source table)',
      r1.intent.type === 'compute');

    const failDerivation = {
      id: 'drv-fail', operators: ['o_automaton'], primitives: ['iching-grammar'],
      output: { ok: false, reason: 'SIX_BINARY_LINES_REQUIRED' },
      evaluation: { accepted: false },
      chainResults: [{ tool: 'iching-grammar', accepted: false }],
    };
    const r2 = intent.observe(failDerivation);
    check('intent: failing call records a gap (operator_failure) with the failing tool',
      r2.satisfied === false && r2.gap && r2.gap.gapType === 'operator_failure'
      && eq(r2.gap.missing, ['iching-grammar']) && r2.gap.derivationId === 'drv-fail');
    check('intent: gap emits a proposal {kind:operator, confidence, evidenceDerivationIds}',
      r2.proposal && r2.proposal.kind === 'operator'
      && typeof r2.proposal.confidence === 'number'
      && eq(r2.proposal.evidenceDerivationIds, ['drv-fail'])
      && r2.proposal.spec.target === 'iching-grammar');
    check('intent: proposal carries a runtime provenance tag (IMPLEMENTATION_CHOICE + source file)',
      r2.proposal.provenance && r2.proposal.provenance.status === 'IMPLEMENTATION_CHOICE'
      && r2.proposal.provenance.source.endsWith('src/emergence/intent.js'));
    check('intent: ids are counter-derived (intent-1, gap-1, proposal-1), no timestamps',
      r2.intent.id === 'intent-2' && r2.gap.id === 'gap-1' && r2.proposal.id === 'proposal-1'
      && !('timestamp' in r2.intent) && !('timestamp' in r2.gap));

    // unrouted (grown) learning result
    const r3 = intent.observe({ mode: 'grown', toolId: 'tool-abc', intakeId: 'intake-9' }, { request: 'zxqv wobble' });
    check("intent: grown-mode learning result -> 'unrouted' gap + primitive proposal with evidence ids",
      r3.gap && r3.gap.gapType === 'unrouted' && r3.proposal && r3.proposal.kind === 'primitive'
      && eq(r3.proposal.evidenceDerivationIds, ['intake-9']) && r3.proposal.spec.purpose === 'zxqv wobble');

    // known-call skip (already observed through engine.call)
    const r4 = intent.observe({ mode: 'known-call', derivationId: 'drv-ok' });
    check('intent: known-call learning result is skipped (no double observation)',
      r4.skipped === 'already_observed_via_call' && intent.intents.length === 3);

    // confidence gate (threshold 0.7 — IMPLEMENTATION_CHOICE)
    const below = intent.applyProposal('proposal-1'); // confidence 0.5
    check('intent: applyProposal below confidenceThreshold 0.7 -> insufficient_confidence',
      below.applied === false && below.reason === 'insufficient_confidence');
    check('intent: provenance registry tags thresholds as IMPLEMENTATION_CHOICE',
      INTENT_PROVENANCE.confidenceThreshold.status === 'IMPLEMENTATION_CHOICE'
      && INTENT_PROVENANCE.intentInference.status === 'SOURCE_STATEMENT');
  }

  // =============== 2. Engine wiring + determinism ===============
  {
    const engine = new SynthiaAutomata();
    check('engine: intent/editor/detector/coordinator are wired',
      engine.intent instanceof IntentEngine && engine.editor instanceof SelfEditor
      && engine.detector instanceof EmergenceDetector && engine.coordinator instanceof MeshCoordinator);

    const derivation = engine.call('iching-grammar 1 2 3'); // fails: SIX_BINARY_LINES_REQUIRED
    check('engine: failing call() is observed -> gap recorded with the derivation id as evidence',
      engine.intent.gaps.length === 1
      && engine.intent.gaps[0].derivationId === derivation.id
      && eq(engine.intent.proposals[0].evidenceDerivationIds, [derivation.id]));
    check('engine: detector logged the derivation (novel + generated -> emergent)',
      engine.detector.emergenceLog.length === 1
      && engine.detector.emergenceLog[0].derivationId === derivation.id
      && engine.detector.emergenceLog[0].emergent === true);

    const req = await engine.request('zxqv wobble frigate unrouteable');
    check("engine: request() grow path records an 'unrouted' gap via the request path",
      req.mode === 'grown' && engine.intent.gaps.some((g) => g.gapType === 'unrouted'));

    // determinism: two fresh engines, same call sequence -> identical proposals
    const seq = ['klein-analogy "boy is to girl"', 'iching-grammar 1 2 3', 'autoling-lite "x"'];
    const e1 = new SynthiaAutomata();
    const e2 = new SynthiaAutomata();
    for (const input of seq) { e1.call(input); e2.call(input); }
    check('engine: determinism — two fresh engines, same call sequence -> identical proposal ids',
      eq(e1.intent.proposals.map((p) => p.id), e2.intent.proposals.map((p) => p.id))
      && e1.intent.proposals.length > 0);
    check('engine: determinism — identical gap records and summaries across engines',
      eq(e1.intent.gaps, e2.intent.gaps) && eq(e1.intent.summary(), e2.intent.summary()));
    check('engine: determinism — identical detector verdicts across engines',
      eq(e1.detector.emergenceLog, e2.detector.emergenceLog));
  }

  // =============== 3. SelfEditor ===============
  {
    const engine = new SynthiaAutomata();
    const editor = engine.editor;

    const before = editor.exportState();
    const primitive = editor.addPrimitiveFromPattern({ identity: 'tension_release', operations: ['o_transform'] }, 'word');
    check('editor: addPrimitiveFromPattern -> frozen primitive:evolved:1 with counter-derived evidence',
      primitive.id === 'primitive:evolved:1' && Object.isFrozen(primitive)
      && primitive.evidence[0].id === 'evidence:edit:1' && primitive.evidence[0].seq === 1
      && !('timestamp' in primitive.evidence[0]));
    check('editor: edit appears in the versioned log with a derivation hash',
      editor.edits.length === 1 && editor.edits[0].type === 'add_primitive'
      && HEX8.test(editor.edits[0].derivationHash)
      && editor.edits[0].derivation.hash === editor.edits[0].derivationHash
      && editor.edits[0].status === 'applied');
    check('editor: edit provenance triples asserted into the engine triple store',
      engine.triples({ subject: primitive.id, predicate: 'isA', object: 'EvolvedPrimitive' }).length === 1
      && engine.triples({ subject: editor.edits[0].id, predicate: 'hasDerivationHash' }).length === 1);

    const ruleId = editor.addRule({ when: 'repeated-crossing' }, 'promote', [{ derivationId: 'drv-1' }]);
    check('editor: addRule -> rule:evolved:N, stored, logged',
      typeof ruleId === 'string' && editor.rules.has(ruleId) && editor.edits.length === 2);
    check('editor: edit derivations are hash-chained (context.previousEditHash)',
      editor.edits[1].derivation.context.previousEditHash === editor.edits[0].derivationHash
      && editor.edits[0].derivation.context.previousEditHash === null);

    const midState = editor.exportState();
    check('editor: state grew after two edits', !eq(midState, before) && editor.primitives.size === 1 && editor.rules.size === 1);

    const reverted = editor.revert(); // undo the add_rule edit
    check('editor: revert() targets the most recent applied edit and restores its frozen snapshot',
      reverted.reverted === true && reverted.editId === editor.edits[1].id
      && !eq(editor.exportState(), midState));
    check('editor: revert(add_rule) restores exactly the state before that edit',
      eq(editor.exportState(), { primitives: midState.primitives, rules: [] }));
    check('editor: reverted edits are marked, the log stays append-only, audit edit appended',
      editor.edits[1].status === 'reverted' && editor.edits.length === 3
      && editor.edits[2].type === 'revert' && HEX8.test(editor.edits[2].derivationHash));

    const reverted2 = editor.revert(); // undo the add_primitive edit
    check('editor: revert() again restores the exact original state (deep-equal)',
      reverted2.reverted === true && eq(editor.exportState(), before));
    check('editor: revert on nothing-applied -> invalid_edit',
      editor.revert().reverted === false);

    // operator evolution from runtime evidence (a pattern counts when observed >1 time, exact match)
    const failures = [{ operands: ['a', 'b'] }, { operands: ['a', 'b'] }, { operands: ['e'] }];
    const evolved = editor.evolveOperatorAcceptance('o_transform', [{ operands: ['a', 'b'] }], failures);
    check('editor: evolveOperatorAcceptance -> {evolved:true, ruleId o_transform:evolved}',
      evolved.evolved === true && evolved.ruleId === 'o_transform:evolved'
      && editor.rules.get('o_transform:evolved').commonFailures.length === 1);
    check('editor: acceptsWithLearned rejects a repeatedly-failed operand shape',
      editor.acceptsWithLearned('o_transform', ['x', 'y']).accepted === false
      && editor.acceptsWithLearned('o_transform', ['x', 'y']).via === 'learned_failure'
      && editor.acceptsWithLearned('o_transform', ['x']).accepted === true);
    check('editor: evolveOperatorAcceptance on unknown operator -> operator_not_found',
      editor.evolveOperatorAcceptance('o_nope', [], []).evolved === false);

    // determinism across fresh editors
    const ed1 = new SelfEditor({});
    const ed2 = new SelfEditor({});
    const ops = (ed) => {
      ed.addPrimitiveFromPattern({ identity: 'p1' });
      ed.addRule({ k: 1 }, 't', []);
      ed.evolveOperatorAcceptance('o_bundle', [{ operands: ['a'] }], [{ operands: ['a'] }, { operands: ['a'] }]);
    };
    ops(ed1); ops(ed2);
    check('editor: determinism — two fresh editors, same edit sequence -> identical derivation hashes',
      eq(ed1.edits.map((e) => e.derivationHash), ed2.edits.map((e) => e.derivationHash)));
    check('editor: provenance registry tags edit types as SOURCE_STATEMENT',
      EDITOR_PROVENANCE.editTypes.status === 'SOURCE_STATEMENT'
      && EDITOR_PROVENANCE.editDerivationShape.status === 'IMPLEMENTATION_CHOICE');
  }

  // =============== 4. EmergenceDetector (§15 three criteria) ===============
  {
    const detector = new EmergenceDetector({});
    const good = { id: 'd1', operators: ['o_automaton'], primitives: ['t'], output: { ok: true, value: 7 } };

    const r1 = detector.testEmergence(good);
    check('detector: novel + generated + (no criteria) -> emergent, seq-counter record',
      r1.emergent === true && r1.wasStored === false && r1.generated === true
      && r1.satisfiesCriteria === true && r1.seq === 1 && !('timestamp' in r1));

    detector.registerStored(good.output);
    const r2 = detector.testEmergence(good);
    check('detector: criterion 1 novelty — a stored solution is NOT emergent',
      r2.emergent === false && r2.wasStored === true);

    const r3 = detector.testEmergence({ id: 'd2', operators: [], primitives: ['t'], output: { ok: true } });
    check('detector: criterion 2 generation — no operators -> not emergent',
      r3.emergent === false && r3.generated === false);

    const r4 = detector.testEmergence(
      { id: 'd3', operators: ['o_automaton'], primitives: ['t'], output: { ok: true, value: 3 } },
      { bigEnough: (out) => out.value > 5, throws: () => { throw new Error('x'); } },
    );
    check('detector: criterion 3 evaluation — failing/throwing criteria -> not emergent, per-check results',
      r4.emergent === false && r4.satisfiesCriteria === false
      && r4.criteriaResults.checks.bigEnough === false && r4.criteriaResults.checks.throws === false);

    const r5 = detector.testEmergence({ id: 'd4', operators: ['o'], primitives: ['p'], output: null });
    check('detector: no result -> emergent:false reason no_result', r5.emergent === false && r5.reason === 'no_result');

    // defect guard: solutions differing ONLY in nested fields must hash differently
    const h1 = detector.registerStored({ a: 1, nested: { x: 1 } });
    const probe = detector.testEmergence({ id: 'd5', operators: ['o'], primitives: ['p'], output: { a: 1, nested: { x: 2 } } });
    check('detector: nested-field differences are not hash-collapsed (source _hashSolution defect not propagated)',
      probe.wasStored === false && probe.resultHash !== h1);

    // cross-scale transfer (threshold 0.5 — IMPLEMENTATION_CHOICE)
    const cases = [
      { operands: [{ id: 'a', scale: 'word' }, { id: 'b', scale: 'word' }] },
      { operands: [{ id: 'c', scale: 'word' }] },
    ];
    const transfer = detector.testCrossScaleEmergence('o_bundle', 'word', 'phrase', cases);
    check('detector: cross-scale transfer o_bundle word->phrase: rate 1 -> emergent',
      transfer.emergent === true && transfer.transferRate === 1 && transfer.successCount === 2);
    const missing = detector.testCrossScaleEmergence('o_nope', 'word', 'phrase', cases);
    check('detector: unknown operator -> operator_not_found', missing.emergent === false && missing.reason === 'operator_not_found');
    check('detector: provenance tags (three criteria SOURCE_STATEMENT, 0.5 threshold IMPLEMENTATION_CHOICE)',
      DETECTOR_PROVENANCE.threeCriteria.status === 'SOURCE_STATEMENT'
      && DETECTOR_PROVENANCE.transferThreshold.status === 'IMPLEMENTATION_CHOICE');

    // channel emergence fed by real mesh/channel stats
    const mesh = new AutomataMesh();
    mesh.register(makeDeltaAutomaton('alpha'));
    mesh.register(makeDeltaAutomaton('beta'));
    const channels = new EmergentChannels({ mesh });
    let crossing = null;
    for (let k = 0; k < CHANNEL_PROMOTION_THRESHOLD; k++) crossing = channels.recordCrossing('alpha', 'beta', { id: `p${k}` });
    const fed = new EmergenceDetector({ engine: { mesh } });
    const chEmergent = fed.testChannelEmergence(crossing);
    check('detector: channel stats — promoted crossing with both endpoints registered -> emergent (novel+generated+persistent)',
      chEmergent.emergent === true && chEmergent.novel === true && chEmergent.generated === true && chEmergent.persistent === true);
    const temporary = fed.testChannelEmergence(channels.recordCrossing('beta', 'alpha', { id: 'q0' }));
    check('detector: channel stats — unpromoted crossing lacks persistence -> not emergent',
      temporary.emergent === false && temporary.persistent === false);
    const unregistered = fed.testChannelEmergence({ a: 'alpha', b: 'ghost', promoted: true, uses: 9 });
    check('detector: channel with an unregistered endpoint fails the generation criterion',
      unregistered.emergent === false && unregistered.generated === false);
  }

  // =============== 5. MeshCoordinator ===============
  {
    const build = () => {
      const mesh = new AutomataMesh();
      mesh.register(makeDeltaAutomaton('alpha'));
      mesh.register(makeDeltaAutomaton('beta'));
      mesh.connect('alpha', 'beta');
      mesh.channels = new EmergentChannels({ mesh });
      return { mesh, coordinator: new MeshCoordinator({ mesh }) };
    };

    const { mesh, coordinator } = build();
    const result = coordinator.run('ab');
    check('coordination: broadcast run produces one trace per automaton, all accepted',
      result.traces.length === 2 && result.allAccepted === true
      && eq(result.traces.map((t) => t.automatonId), ['alpha', 'beta'])
      && result.traces.every((t) => t.finalState === 's1' && t.steps > 0));
    check('coordination: output propagated as a routed StatePacket along the mesh connection',
      result.packetCount === 1 && result.packets[0].delivered === true && result.packets[0].to === 'beta');
    check('coordination: routed packets record EmergentChannels crossings (feeds channel stats)',
      mesh.channels.crossings().length === 1 && mesh.channels.get('alpha', 'beta').uses === 1);

    // determinism: identical fresh setups -> identical results
    const again = build();
    const result2 = again.coordinator.run('ab');
    check('coordination: determinism — two fresh setups produce identical run records',
      eq(result, result2));

    // error containment: one failing automaton does not abort the run
    const mesh2 = new AutomataMesh();
    mesh2.register(makeDeltaAutomaton('fine'));
    mesh2.register(new Automaton({
      id: 'broken',
      address: { gate: 2 },
      states: [{ id: 's0', initial: true }],
      alphabet: ['a'],
      q0: 's0',
      delta: () => { throw new Error('boom'); },
    }));
    const contained = new MeshCoordinator({ mesh: mesh2 }).run('a');
    check('coordination: a throwing automaton fails only its own trace entry',
      contained.traces.length === 2
      && contained.traces.find((t) => t.automatonId === 'broken').error === 'boom'
      && contained.traces.find((t) => t.automatonId === 'fine').accepted === true
      && contained.allAccepted === false);
    check('coordination: provenance registry present (broadcast/packets SOURCE_STATEMENT, budget IMPLEMENTATION_CHOICE)',
      COORDINATION_PROVENANCE.broadcastRun.status === 'SOURCE_STATEMENT'
      && COORDINATION_PROVENANCE.defaultMaxPackets.status === 'IMPLEMENTATION_CHOICE');
  }

  // =============== 6. Intent -> editor loop ===============
  {
    const engine = new SynthiaAutomata();
    engine.intent.confidenceThreshold = 0.5; // lower the 0.7 gate so the 0.6 primitive proposal clears it
    await engine.request('zxqv wobble frigate unrouteable'); // grows -> unrouted primitive proposal (0.6)
    const proposal = engine.intent.proposals.find((p) => p.kind === 'primitive');
    const applied = engine.intent.applyProposal(proposal.id);
    check('loop: applying a confident primitive proposal goes through the SelfEditor as a versioned edit',
      applied.applied === true && typeof applied.created === 'string'
      && engine.editor.primitives.has(applied.created)
      && engine.editor.edits.some((e) => e.type === 'add_primitive' && HEX8.test(e.derivationHash)));
    check('loop: proposal is marked applied with the created primitive id',
      proposal.applied === applied.created);
  }

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = await run();
  console.log(`\nemergence.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
