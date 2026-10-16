import test from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../src/state-machine.mjs';

test('machine transitions, guards, effects, snapshot and restore', async () => {
  const machine = new StateMachine({
    id: 'm', initial: 'idle', data: { count: 0 },
    transitions: [{
      id: 'go', from: 'idle', event: 'GO', to: 'done',
      guard: { op: 'eq', left: { op: 'ref', path: 'event.allowed' }, right: true },
      assign: { count: { op: 'add', args: [{ op: 'ref', path: 'data.count' }, 1] } },
      effects: ['emitNext'],
    }, { from: 'done', event: 'NEXT', to: 'complete' }],
  }, {
    emitNext: async () => ({ emit: [{ type: 'NEXT' }] }),
  });
  await machine.send({ type: 'GO', allowed: true });
  assert.equal(machine.state, 'complete');
  assert.equal(machine.data.count, 1);
  const snap = machine.snapshot();
  const restored = new StateMachine(machine.definition).restore(snap);
  assert.equal(restored.state, 'complete');
  assert.equal(restored.data.count, 1);
});
