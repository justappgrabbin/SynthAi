import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CoupledStateEvolutionRuntime,
  SovereignStateSpaceRuntime,
  propagateCoupledState,
} from '../src/index.mjs';

test('coupled state evolution transfers weight through an explicit coupling without replacing canonical state space', () => {
  const steps = 400;
  const totalTime = Math.PI / 2;
  const result = propagateCoupledState({
    basis: ['A', 'B'],
    state: [1, 0],
    operator: [
      [0, 1],
      [1, 0],
    ],
    dt: totalTime / steps,
    steps,
  });

  assert.ok(result.probabilities.B > 0.999999);
  assert.ok(result.probabilities.A < 0.000001);
  assert.equal(result.dominantState, 'B');
  assert.equal(result.canonicalStateSpaceReplaced, false);
});

test('field operator changes the trajectory while preserving supplied address and context', () => {
  const base = {
    basis: ['A', 'B'],
    state: [1, 0],
    operator: [[0, 0], [0, 0]],
    fieldOperator: [[0, 1], [1, 0]],
    dt: 0.01,
    steps: 100,
    address: { gate: 25, line: 2, dimension: 'Being' },
    context: { source: 'test' },
  };
  const quiet = propagateCoupledState({ ...base, fieldStrength: 0 });
  const coupled = propagateCoupledState({ ...base, fieldStrength: 1 });

  assert.ok(quiet.probabilities.A > 0.999999);
  assert.ok(coupled.probabilities.B > 0.5);
  assert.deepEqual(coupled.address, base.address);
  assert.deepEqual(coupled.context, base.context);
});

test('Synthia sovereign state-space exposes five-dimensional coupled evolution as an additive instrument', async () => {
  const runtime = new SovereignStateSpaceRuntime();
  const instrument = runtime.instrument('coupled-state-evolution');
  assert.ok(instrument);
  assert.ok(instrument.capabilities.includes('propagate-coupled-state'));

  const run = await runtime.execute({
    operation: 'state-evolution',
    state: { Movement: 1 },
    operator: [
      [0, 1, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    dt: 0.01,
    steps: 100,
    address: { gate: 1, line: 1, dimension: 'Movement' },
  });

  assert.equal(run.operation, 'state-evolution');
  assert.equal(run.output.result.canonicalStateSpaceReplaced, false);
  assert.deepEqual(run.output.result.basis, ['Movement', 'Evolution', 'Being', 'Design', 'Space']);
  assert.equal(run.output.result.address.gate, 1);
  assert.ok(run.output.result.probabilities.Evolution > 0.5);
  assert.equal(runtime.manifest().coupledStateEvolution.replacesCanonicalStateSpace, false);
});

test('standalone runtime keeps append-only calculation history', () => {
  const runtime = new CoupledStateEvolutionRuntime({ basis: ['A', 'B'] });
  runtime.evolve({ state: [1, 0], operator: [[0, 1], [1, 0]], dt: 0.1, steps: 1 });
  runtime.evolve({ state: [0, 1], operator: [[0, 1], [1, 0]], dt: 0.1, steps: 1 });
  assert.equal(runtime.history.length, 2);
  assert.equal(runtime.history[0].sequence, 1);
  assert.equal(runtime.history[1].sequence, 2);
});
