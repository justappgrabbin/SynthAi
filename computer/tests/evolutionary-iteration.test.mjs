import test from 'node:test';
import assert from 'node:assert/strict';
import { EvolutionaryIteration } from '../services/evolutionary-iteration.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('real caller callbacks iterate on failed requirements then accept grounded checks', async () => {
  const records = [];
  const store = new Map();
  const engine = new EvolutionaryIteration({
    bus: { emit: (name, payload) => records.push({ name, payload }) },
    state: { set: async (k, v) => store.set(k, v) },
  });
  const result = await engine.optimize({
    id: 'goal-1', goal: 'Make a keyboard-controlled character move',
    requirements: [{ id: 'motion', description: 'Character changes position' },
                   { id: 'control', description: 'Keyboard event controls motion' }],
    propose: ({ iteration, history }) => ({ iteration, fix: history.at(-1)?.checks.control === false }),
    execute: candidate => ({ motion: true, control: candidate.fix }),
    evaluate: ({ output }) => ({ checks: output, notes: 'Observed via test' }),
  });
  assert.equal(result.success, true);
  assert.equal(result.iterations.length, 2);
  assert.equal(result.iterations[0].evidenceClass, 'observation');
  assert.equal(result.status, 'accepted-by-evaluator');
  assert.equal(store.get('computer.evolutionary.goal-1').status, 'accepted-by-evaluator');
  assert.equal(records.filter(x => x.name === 'evolutionary:observed').length, 2);
  assert.deepEqual(engine.get('goal-1').iterations[1].checks, { motion: true, control: true });
});

test('reject incomplete evaluation rather than inventing success', async () => {
  const engine = new EvolutionaryIteration();
  await assert.rejects(engine.optimize({
    id: 'bad-eval', goal: 'test', requirements: [{ id: 'a', description: 'evidence A' }],
    propose: async () => 'candidate', execute: async () => ({}),
    evaluate: async () => ({ checks: {} }),
  }), /omitted a boolean check/);
  assert.equal(engine.get('bad-eval').status, 'failed');
});

test('max iteration bound, strict acceptance, and duplicate safety', async () => {
  const engine = new EvolutionaryIteration();
  const params = { id: 'bounded', goal: 'test', requirements: [{ id: 'a', description: 'evidence A' }],
    propose: async () => 'candidate', execute: async () => ({}),
    evaluate: async () => ({ checks: { a: true }, score: 0.8 }),
    maxIterations: 3, successThreshold: 0.95 };
  const result = await engine.optimize(params);
  assert.equal(result.success, false);
  assert.equal(result.status, 'iteration-limit-reached');
  assert.equal(result.iterations.length, 3);
  await assert.rejects(engine.optimize(params), /already exists/);
  await assert.rejects(engine.optimize({ ...params, id: '../escape' }), /safe run ID/);
});

test('existing Computer boots and registers evolutionary worker without replacing experiment loop', async () => {
  const computer = await new ComputerRuntime().boot();
  assert.equal(computer.services.get('evolutionary-iteration').provider, computer.evolutionary);
  assert.equal(computer.services.get('experiment-loop').provider, computer.experiments);
  assert.equal(computer.capabilityRegistry.has('goal-refinement'), true);
});
