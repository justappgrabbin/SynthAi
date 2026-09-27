// Pure Synthia Automata — ported scale-experiment tests (D1/D2/D3 benchmarks, cross-scale, controls, evaluators).
// Standalone (merged.smoke.mjs style): node test/scale-experiments.test.mjs
import { fileURLToPath } from 'node:url';

import { stableStringify } from '../src/engine/derivation.js';
import { runD1Benchmark, generateBundle } from '../src/experiments/scale/d1.js';
import { runD2Benchmark } from '../src/experiments/scale/d2.js';
import { runD3Benchmark } from '../src/experiments/scale/d3.js';
import { runCrossScaleAnalysis, CrossScaleExperiment } from '../src/experiments/scale/cross-scale.js';
import {
  controlMappings, randomGrammar, shuffledStructure, flatLookup, frequencyBaseline,
  withoutPrimitive, withoutOperator, runAblation, DEFAULT_CONTROL_SEED,
} from '../src/experiments/scale/controls.js';
import { AddressEvaluator, DimensionalEvaluator } from '../src/experiments/scale/evaluators.js';
import { createBundleOperator, createSequenceOperator } from '../src/experiments/scale/operators.js';
import { createD1PrimitiveRegistry, validateCrosswalk, D1_ITEMS } from '../src/experiments/scale/datasets.js';
import { mulberry32 } from '../src/state-space/constants.js';

export function run({ quiet } = {}) {
  let passed = 0;
  let failed = 0;
  const failures = [];
  const check = (name, cond) => {
    if (cond) { passed += 1; if (!quiet) console.log(`ok   ${name}`); }
    else { failed += 1; failures.push(name); console.log(`FAIL ${name}`); }
  };

  /* ------------------------------------------- D1/D2/D3 ported benchmarks */

  const d1a = runD1Benchmark();
  const d1b = runD1Benchmark();
  check('D1 benchmark deterministic: identical report across two runs',
    stableStringify(d1a) === stableStringify(d1b));

  const d2a = runD2Benchmark();
  const d2b = runD2Benchmark();
  check('D2 benchmark deterministic: identical report across two runs',
    stableStringify(d2a) === stableStringify(d2b));

  const d3a = runD3Benchmark();
  const d3b = runD3Benchmark();
  check('D3 benchmark deterministic: identical report across two runs',
    stableStringify(d3a) === stableStringify(d3b));

  /* ---------------------------------------------------- reproduction gate */

  for (const [name, report] of [['D1', d1a], ['D2', d2a], ['D3', d3a]]) {
    check(`${name} reproduction status object exists`, report.reproduction && typeof report.reproduction.status === 'string');
    check(`${name} reproduction: every sealed field matches the ported report (status 'match')`,
      report.reproduction.status === 'match'
      && report.reproduction.mismatchCount === 0
      && report.reproduction.adaptedCount === 0
      && report.reproduction.matchCount === report.reproduction.comparedFields);
  }
  check('D1 reproduces sealed derivation hashes (held-out g/v/z)',
    d1a.heldout.map((h) => h.derivationHash).join(',') === '64a30c93,689ef19b,64d02ccc');

  /* --------------------------------------------------------- ablations */

  check('D1 ablations reduce held-out accuracy to 0 with impact 1 (removeBundle, removeVoicedPrimitive)',
    d1a.ablations.removeBundle.ablatedAccuracy === 0 && d1a.ablations.removeBundle.impact === 1
    && d1a.ablations.removeVoicedPrimitive.ablatedAccuracy === 0 && d1a.ablations.removeVoicedPrimitive.impact === 1);
  check('D2 ablations: removeSequence/removeBundle -> 0 accuracy, impact 1; destroyOrder -> 4 collisions',
    d2a.ablations.removeSequence.ablatedAccuracy === 0 && d2a.ablations.removeSequence.impact === 1
    && d2a.ablations.removeBundle.ablatedAccuracy === 0 && d2a.ablations.removeBundle.impact === 1
    && d2a.ablations.destroyOrder.collisionCount === 4);
  check('D3 ablations: removeD3Sequence/removeD2MorphemeConstruction -> 0 accuracy, impact 1; destroyOrder -> 3 collisions',
    d3a.ablations.removeD3Sequence.ablatedAccuracy === 0 && d3a.ablations.removeD3Sequence.impact === 1
    && d3a.ablations.removeD2MorphemeConstruction.ablatedAccuracy === 0 && d3a.ablations.removeD2MorphemeConstruction.impact === 1
    && d3a.ablations.destroyOrder.collisionCount === 3);
  check('held-out derivation integrity is 1 at every scale (deterministic replay)',
    d1a.metrics.derivationIntegrity === 1 && d2a.metrics.derivationIntegrity === 1 && d3a.metrics.derivationIntegrity === 1);

  /* --------------------------------------------------------- cross-scale */

  const cross = runCrossScaleAnalysis({ d1Report: d1a, d2Report: d2a, d3Report: d3a });
  check('cross-scale: operator reuse computed (o_bundle at 3 scales, o_sequence at 2)',
    cross.operators.o_bundle.reuse === 3 && cross.operators.o_sequence.reuse === 2);
  check('cross-scale: recursion depth ladder 1 -> 2 -> 3 with unit deltas',
    cross.recursionDepth.D1 === 1 && cross.recursionDepth.D2 === 2 && cross.recursionDepth.D3 === 3
    && cross.recursionDepth.deltas['D2-D1'] === 1 && cross.recursionDepth.deltas['D3-D2'] === 1);
  check('cross-scale: every removal ablation reduces held-out generation to zero',
    cross.allRemovalsReduceToZero === true);
  check('cross-scale: compression gains computed and negative under the frozen encodings (honest negative result)',
    cross.compression.allNegative === true
    && cross.compression.D1.gain === d1a.metrics.compressionGain
    && typeof cross.compression.deltas['D2-D1'] === 'number');

  // CrossScaleExperiment (phase-2 transfer machinery, deterministic port).
  const bundleOp = createBundleOperator();
  const seqOp = createSequenceOperator();
  const transferEngine = { operators: new Map([['o_bundle', bundleOp], ['o_sequence', seqOp]]) };
  const cx = new CrossScaleExperiment(transferEngine);
  const transfer = cx.testTransfer('o_sequence', 'morpheme', 'word', [
    { id: 't1', operands: [{ id: 'm.a' }, { id: 'm.b' }], expected: { operator: 'o_sequence', members: [null, null] } },
    { id: 't2', operands: [{ id: 'm.a' }], expected: { operator: 'o_sequence', members: [null] } },
  ]);
  check('cross-scale transfer: o_sequence transfers morpheme->word at rate 1 (invariant at frozen 0.5 threshold)',
    transfer.transferRate === 1 && transfer.invariant === true && transfer.successCount === 2);
  check('cross-scale transfer: no wall-clock field in records (deterministic port)',
    !Object.prototype.hasOwnProperty.call(transfer, 'timestamp'));
  const missing = cx.testTransfer('o_missing', 'a', 'b', []);
  check('cross-scale transfer: unknown operator reported, not thrown',
    missing.success === false && missing.reason === 'operator_not_found');
  // Source validation is deliberately "loose" (operator match OR member-count
  // match), so a failing case must differ on BOTH.
  const failedTransfer = cx.testTransfer('o_sequence', 'morpheme', 'word', [
    { id: 't3', operands: [{ id: 'm.a' }, { id: 'm.b' }], expected: { operator: 'o_bundle', members: [null, null, null] } },
  ]);
  check('cross-scale transfer: mismatched expectation scores 0 (loose validation differs on operator AND arity)',
    failedTransfer.transferRate === 0 && failedTransfer.invariant === false);
  check('cross-scale summary aggregates transfer results (operator_not_found is not recorded)',
    cx.summary().totalTransfers === 2 && cx.summary().invariantOperators.includes('o_sequence'));

  /* ------------------------------------------------------------ controls */

  // Generic mapping controls (primitive->scale seed): letter -> phoneme id.
  const letterMapping = { a: 'p.ae', b: 'p.b', c: 'p.k', d: 'p.d', e: 'p.eh', f: 'p.f', g: 'p.g', h: 'p.h' };
  const controls = controlMappings(letterMapping, { seed: DEFAULT_CONTROL_SEED });
  const { source, modulo, shuffled, random, ablated } = controls.conditions;
  const ser = (x) => stableStringify(x);
  check('controls: source/modulo/shuffled/random conditions are pairwise distinct',
    new Set([ser(source), ser(modulo), ser(shuffled), ser(random)]).size === 4);
  check('controls: ablated condition drops exactly the ablated key and keeps the rest identical',
    !('h' in ablated) && controls.ablatedKey === 'h'
    && Object.keys(ablated).length === Object.keys(source).length - 1
    && Object.keys(ablated).every((k) => ablated[k] === source[k]));
  check('controls: conditions are deterministic — same seed reproduces identical conditions',
    ser(controlMappings(letterMapping, { seed: DEFAULT_CONTROL_SEED }).conditions) === ser(controls.conditions));
  check('controls: all conditions preserve the source support (keys) except ablated',
    [modulo, shuffled, random].every((c) => ser(Object.keys(c).sort()) === ser(Object.keys(source).sort())));

  // Ported phase-2 control utilities.
  const grammar = { r1: 'a', r2: 'b', r3: 'c', r4: 'd' };
  const rg1 = randomGrammar(grammar, mulberry32(7));
  const rg2 = randomGrammar(grammar, mulberry32(7));
  check('controls: randomGrammar deterministic for a fixed rng seed and preserves entries',
    ser(rg1) === ser(rg2)
    && ser(Object.keys(rg1).sort()) === ser(Object.keys(grammar).sort())
    && ser(Object.values(rg1).sort()) === ser(Object.values(grammar).sort()));
  const composite = { members: [{ position: 0, v: 'a' }, { position: 1, v: 'b' }, { position: 2, v: 'c' }] };
  const sh1 = shuffledStructure(composite, mulberry32(11));
  const sh2 = shuffledStructure(composite, mulberry32(11));
  check('controls: shuffledStructure deterministic, preserves member multiset, leaves input untouched',
    ser(sh1) === ser(sh2)
    && ser(sh1.members.map((m) => m.v).sort()) === ser(['a', 'b', 'c'])
    && composite.members[0].v === 'a');
  const store = new Map([[JSON.stringify({ q: 1 }), 'hit']]);
  check('controls: flatLookup hits stored key, misses unknown',
    flatLookup({ q: 1 }, store) === 'hit' && flatLookup({ q: 2 }, store) === null);
  const freq = frequencyBaseline(['x', 'y', 'z'], new Map([['y', 3], ['x', 1]]));
  check('controls: frequencyBaseline sorts by descending frequency, missing -> 0',
    freq[0].component === 'y' && freq[1].component === 'x' && freq[2].component === 'z' && freq[2].score === 0);

  // Pure ablation helpers (S^{-p_i} / S^{-o_i}).
  const registry = createD1PrimitiveRegistry();
  const ablatedRegistry = withoutPrimitive(registry, 'f.voice.voiced');
  check('controls: withoutPrimitive returns a new registry minus the primitive (source registry untouched)',
    !ablatedRegistry.has('f.voice.voiced') && registry.has('f.voice.voiced'));
  const generatedAblated = generateBundle({
    featureIds: ['f.place.velar', 'f.manner.stop', 'f.voice.voiced'],
    primitiveRegistry: ablatedRegistry,
    bundleOperator: bundleOp,
  });
  check('controls: ablated registry breaks the dependent generation path (missing-primitive)',
    generatedAblated.ok === false && generatedAblated.reason === 'missing-primitive:f.voice.voiced');
  const opReg = withoutOperator(new Map([['o_bundle', bundleOp], ['o_sequence', seqOp]]), 'o_bundle');
  check('controls: withoutOperator removes exactly the operator',
    !opReg.has('o_bundle') && opReg.has('o_sequence'));
  const abl = runAblation('operator:o_bundle', {
    baselineConfig: { op: bundleOp }, modifiedConfig: { op: null },
    testFn: ({ op }) => (op ? 1 : 0), metricFn: (x) => x,
  });
  check('controls: runAblation reports baseline/ablated/impact',
    abl.baseline === 1 && abl.ablated === 0 && abl.impact === 1);

  /* ----------------------------------------------------- arity discipline */
  // The repair-log defect class (strict-equality arity) must stay fixed:
  // variadic o_bundle accepts 3 distinct-axis operands; integer arity is a minimum.
  const reg2 = createD1PrimitiveRegistry();
  const three = ['f.place.velar', 'f.manner.stop', 'f.voice.voiced'].map((id) => reg2.get(id));
  let bundle3ok = true;
  try { bundleOp.apply(three); } catch { bundle3ok = false; }
  check('arity: o_bundle (variadic) accepts 3 operands (phase-1 repair-log defect class stays fixed)', bundle3ok);

  /* ---------------------------------------------------- dataset crosswalk */

  check('dataset crosswalk into src/state-space/features.js is complete (all 12 D1 phonemes + 8 features)',
    validateCrosswalk().ok === true && D1_ITEMS.length === 12);

  /* ----------------------------------------------------------- evaluators */

  const lettersAsPrimitives = 'abcdefgh'.split('').map((ch, i) => ({
    id: `letter.${ch}`,
    candidateAddress: { planetaryDimension: ['Movement', 'Evolution', 'Being', 'Design'][i % 4], gate: i + 1, line: (i % 6) + 1 },
  }));
  const addrFn = (p) => p.candidateAddress;
  const queries = [
    { candidateAddress: lettersAsPrimitives[0].candidateAddress, expected: ['letter.a', 'letter.e'] },
    { candidateAddress: lettersAsPrimitives[1].candidateAddress, expected: ['letter.b', 'letter.f'] },
  ];
  const compositions = [{ inputs: [lettersAsPrimitives[0], lettersAsPrimitives[4]], expected: true, threshold: 0 }];
  const h3a = new AddressEvaluator({ seed: 99 }).evaluateH3(lettersAsPrimitives, addrFn, queries, compositions);
  const h3b = new AddressEvaluator({ seed: 99 }).evaluateH3(lettersAsPrimitives, addrFn, queries, compositions);
  check('evaluators: H3 deterministic for a fixed seed (candidate + 4 controls + deltas)',
    ser(h3a) === ser(h3b)
    && typeof h3a.candidate.retrieval === 'number'
    && ['random', 'shuffled', 'flat', 'reduced'].every((c) => h3a.controls[c] && typeof h3a.deltas.retrieval[c] === 'number'));
  check('evaluators: empty test queries -> 0, not NaN (phase-2 repair 4 preserved; pass3 regression not reproduced)',
    new AddressEvaluator().evaluateRetrieval(lettersAsPrimitives, addrFn, []) === 0);

  const dims = new DimensionalEvaluator({ seed: 5 });
  dims.registerCandidate({ id: 'Movement', macroName: 'M' }).registerCandidate({ id: 'Evolution', macroName: 'E' });
  const h4a = dims.evaluateH4(
    [{ index: 0, expectedDimension: 'Movement' }, { index: 1, expectedDimension: 'Evolution' }],
    [{ inputs: [0, 0], threshold: 0.5 }],
    [{ from: 0, to: 0, expectedRelation: 'identity' }],
  );
  const dims2 = new DimensionalEvaluator({ seed: 5 });
  dims2.registerCandidate({ id: 'Movement', macroName: 'M' }).registerCandidate({ id: 'Evolution', macroName: 'E' });
  const h4b = dims2.evaluateH4(
    [{ index: 0, expectedDimension: 'Movement' }, { index: 1, expectedDimension: 'Evolution' }],
    [{ inputs: [0, 0], threshold: 0.5 }],
    [{ from: 0, to: 0, expectedRelation: 'identity' }],
  );
  check('evaluators: H4 deterministic, candidate vs random/single/permuted alternatives with deltas',
    ser(h4a) === ser(h4b)
    && h4a.candidate.predictive === 1
    && ['random', 'single', 'permuted'].every((a) => h4a.alternatives[a] && typeof h4a.deltas.predictive[a] === 'number'));
  check('evaluators: H4 empty datasets -> 0 guards',
    dims.evaluatePredictive(() => dims.candidateDimensions.get('Movement'), []) === 0
    && dims.evaluateGenerative(() => null, []) === 0
    && dims.evaluateTransformConsistency(() => null, []) === 0);

  return { passed, failed, failures };
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const { passed, failed } = run({});
  console.log(`\nscale-experiments.test.mjs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
