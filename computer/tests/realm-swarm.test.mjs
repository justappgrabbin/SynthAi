import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRealmSwarm } from '../runtime/realm-swarm.mjs';
import { expressAddress } from '../runtime/address-expression.mjs';

test('swarm cycles preserved dimensions and relates distinct owners without rewriting their addresses', () => {
  const actors = [1, 32].map((gate, i) => ({ id: `owner${i}`, addresses: [{ id: 'Sun', expression: expressAddress({ planetary: 'Sun', gate, line: 2, color: 3, tone: 4, base: 5 }) }] }));
  const movement = resolveRealmSwarm(actors, 0);
  const being = resolveRealmSwarm(actors, 8);
  assert.equal(movement.pieces[0].dimension, 'Movement');
  assert.equal(being.pieces[0].dimension, 'Being');
  assert.deepEqual(being.pieces[0].address, actors[0].addresses[0].expression.address);
  assert.ok(being.edges.some(edge => edge.from.startsWith('owner0:') && edge.to.startsWith('owner1:')));
  assert.equal(being.pieces[0].expression.structure.hexagram, '䷀');
  assert.deepEqual(being.pieces[0].expression.structure.trigrams, [[1,1,1],[1,1,1]]);
  assert.equal(being.mode, 'local-mesh');
});
