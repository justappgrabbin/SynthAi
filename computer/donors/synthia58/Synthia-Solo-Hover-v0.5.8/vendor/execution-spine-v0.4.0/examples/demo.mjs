import {
  UniversalRuntime,
  evaluateWithTrace,
} from '../src/index.mjs';

const runtime = new UniversalRuntime();

const predicate = {
  op: 'and',
  args: [
    { op: 'gte', left: { op: 'ref', path: 'state.x' }, right: 3 },
    { op: 'xnor', args: [
      { op: 'eq', left: { op: 'mod', left: { op: 'ref', path: 'state.x' }, right: 2 }, right: 0 },
      { op: 'literal', value: true },
    ] },
  ],
};

console.log('Predicate trace:', evaluateWithTrace(predicate, { state: { x: 4 } }));
console.log('Search:', await runtime.execute({
  realizer: 'predicate-search',
  stateSpace: { kind: 'cartesian', fields: { x: { kind: 'range', min: 0, max: 10 } } },
  predicate,
}));

runtime.registerEffect('remember', async ({ data, event }) => {
  data.lastArtifact = event.name;
  return { stored: event.name };
});

const machine = runtime.createMachine({
  id: 'artifact-lifecycle',
  initial: 'idle',
  data: { lastArtifact: null },
  transitions: [
    { id: 'receive', from: 'idle', event: 'ARTIFACT_RECEIVED', to: 'recognized', effects: ['remember'] },
    { id: 'plan', from: 'recognized', event: 'PLAN', to: 'planned' },
    { id: 'execute', from: 'planned', event: 'EXECUTE', to: 'executed' },
  ],
});

await machine.send({ type: 'ARTIFACT_RECEIVED', name: 'example.js' });
await machine.send('PLAN');
runtime.persistMachine(machine);
console.log('Machine snapshot:', machine.snapshot());
