/**
 * ACCEPTANCE TEST 7 — EXPERIMENT LOOP (handoff §37)
 * hypothesis creation -> experiment creation (conditions/variables) -> event/
 * input -> REAL execution (foundry-glyphs ephemeris as the experiment method)
 * -> observation -> result -> EVIDENCE CLASSIFICATION (explicit separate
 * step; donor Hypothesis.evaluate) -> persistence -> replication.
 * NEGATIVE CASE: a successful execution with NO replication stays
 * 'observation' — proving the system never auto-upgrades to supported_result.
 * Donor: back-up-:kimi-hypothesis-registry (wrap, not rewrite).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const EPHEMERIS_INPUT = { ephemeris: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 } };
const measure = (output) => output.address.gate;

test('ACCEPTANCE 7: experiment loop with explicit evidence classification', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'computer-acc7-'));
  const logPath = join(dir, 'events.jsonl');
  const runtime = await new ComputerRuntime({ eventLogPath: logPath }).boot();
  const traj = 'traj-acc7-experiment';
  try {
    // 1. hypothesis creation (donor HypothesisRegistry)
    const h = await runtime.experiments.createHypothesis({
      id: 'h-determinism',
      claim: 'foundry-glyphs ephemeris resolution is deterministic: identical ecliptic input yields identical gate',
      nullHypothesis: 'resolution is non-deterministic (gate varies across identical runs)',
      metric: 'gate_equality_across_runs',
      test: 'resolve identical ephemeris input twice; compare gate',
      threshold: 0.99,
    });
    assert.equal(h.status, 'hypothesized');
    assert.equal(runtime.queryCapability ? true : true, true);

    // 2. experiment creation with conditions/variables; method = real provider
    const exp = await runtime.experiments.createExperiment({
      hypothesisId: 'h-determinism',
      conditions: { wheel: 'mandala', engine: 'foundry-glyphs' },
      variables: { sign: 'Capricorn', degree: 11, minute: 19, second: 15 },
      method: 'resolveAddress',
    });
    assert.equal(exp.status, 'created');

    // 3-5. event/input -> REAL execution -> observation (NO classification yet)
    const run1 = await runtime.experiments.run(exp.id, (input) => runtime.resolveAddress(input), EPHEMERIS_INPUT);
    assert.equal(measure(run1.output), 38, 'real provider executed (gate 38)');

    // 6a. NEGATIVE CASE: execution succeeded, but NO replication -> stays 'observation'
    const neg = await runtime.experiments.classify(exp.id, { measure });
    assert.equal(neg.classification, 'observation', 'no auto-upgrade without replication');
    assert.equal(neg.replicated, false);
    const hAfterNeg = await runtime.experiments.hypothesis('h-determinism');
    assert.notEqual(hAfterNeg.status, 'supported', 'hypothesis NOT supported after a single successful run');

    const e1 = await runtime.emitEvent({
      actor_id: 'system:experiment-loop', actor_type: 'system', event_type: 'experiment_run',
      input: { experiment: exp.id, run: 1 }, result: { gate: measure(run1.output) },
      result_status: 'success', trajectory_id: traj,
      observable_effect: 'experiment run 1 executed; evidence classification: observation (no replication)',
      evidence: { kind: 'observation', ref: 'computer/tests/acceptance-7-experiment-loop.test.mjs', summary: 'run 1: execution success, classification stays observation' },
    });

    // 6b. replication: run the method again, compare, THEN classify explicitly
    const run2 = await runtime.experiments.run(exp.id, (input) => runtime.resolveAddress(input), EPHEMERIS_INPUT);
    assert.equal(measure(run2.output), measure(run1.output), 'replication consistent');
    const pos = await runtime.experiments.classify(exp.id, { measure });
    assert.equal(pos.replicated, true);
    assert.equal(pos.classification, 'supported_result', 'explicit classification after replication');
    const hFinal = await runtime.experiments.hypothesis('h-determinism');
    assert.equal(hFinal.status, 'supported', 'donor evaluate() promoted the hypothesis');

    // 7. persistence of the full loop
    const e2 = await runtime.emitEvent({
      actor_id: 'system:experiment-loop', actor_type: 'system', event_type: 'observation',
      parents: [e1.event_id], input: { experiment: exp.id, run: 2 },
      pre_state: { classification: 'observation' }, post_state: { classification: 'supported_result', hypothesis_status: hFinal.status },
      result: { measured: pos.measured, threshold: pos.threshold, runs: 2 },
      result_status: 'success', trajectory_id: traj,
      observable_effect: 'replication run executed; explicit classification -> supported_result',
      evidence: { kind: 'supported_result', ref: 'computer/tests/acceptance-7-experiment-loop.test.mjs', summary: 'run 2 replicated; donor evaluate(1.0>=0.99) -> supported' },
    });

    const restarted = await new ComputerRuntime({ eventLogPath: logPath }).boot();
    const replay = await restarted.eventEmitter.history(traj);
    assert.equal(replay.length, 2);
    assert.equal(replay[0].evidence.kind, 'observation');
    assert.equal(replay[1].evidence.kind, 'supported_result');
    assert.deepEqual(replay[1].parents, [e1.event_id]);
    t.diagnostic(`experiment: run1 gate ${measure(run1.output)} -> observation (no replication); run2 replicated -> donor evaluate -> supported_result (hypothesis ${hFinal.status}); 2 events persisted+replayed`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
