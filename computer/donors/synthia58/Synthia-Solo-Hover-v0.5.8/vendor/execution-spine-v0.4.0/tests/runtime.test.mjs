import test from 'node:test';
import assert from 'node:assert/strict';
import { UniversalRuntime } from '../src/universal-runtime.mjs';

test('bounded predicate search + semantic verification', async () => {
  const runtime = new UniversalRuntime();
  const stateSpace = { kind: 'cartesian', fields: { x: { kind: 'range', min: 0, max: 10 } } };
  const reference = { op: 'eq', left: { op: 'mod', left: { op: 'ref', path: 'state.x' }, right: 2 }, right: 0 };
  const result = await runtime.execute({ realizer: 'predicate-search', stateSpace, predicate: reference });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.matches.map((x) => x.x), [0,2,4,6,8,10]);
  const verification = await runtime.verify({ stateSpace, reference, candidate: reference });
  assert.equal(verification.faithful, true);
  assert.equal(verification.checked, 11);
});

test('DAG runs dependencies and exposes dependency results', async () => {
  const runtime = new UniversalRuntime();
  runtime.registerFunction('seed', async () => 3);
  runtime.registerFunction('doubleDep', async (_input, context) => context.dag.dependencies.a.value * 2);
  const graph = await runtime.runGraph([
    { id: 'a', realization: { realizer: 'capability', name: 'seed' } },
    { id: 'b', dependsOn: ['a'], realization: { realizer: 'capability', name: 'doubleDep' } },
  ]);
  assert.equal(graph.ok, true);
  assert.equal(graph.results.b.value, 6);
});
