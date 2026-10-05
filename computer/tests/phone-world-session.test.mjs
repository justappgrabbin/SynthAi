import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, MemoryPersistence, StateStore } from '../core/kernel.mjs';
import { PhoneWorldSession, placementAddress } from '../backend/phone-world-session.mjs';
import { expressAddress, ONTOLOGICAL_FIELDS } from '../runtime/address-expression.mjs';

test('all swarm encodings derive from the exact source address and retain unknown coordinates', () => {
  const address = placementAddress({ body: 'Sun', longitude: 123.4567, gate: 7, line: 2, color: 3, tone: 4, base: 5 });
  const expression = expressAddress(address);
  assert.deepEqual(Object.keys(expression.address), ONTOLOGICAL_FIELDS);
  const bytes = expression.binary.split(' ').map(value => parseInt(value, 2));
  assert.equal(new TextDecoder().decode(new Uint8Array(bytes)), expression.source);
  assert.equal(expression.address.house, null);
  assert.equal(expression.address.dimension, null);
  assert.equal(expressAddress({ gate: null }), null);
  assert.match(expressAddress({ zodiac: '星' }).ascii, /\\u\{661f\}/);
});

test('entering a host world preserves photo and chart identity, while neural relationships survive restart', async () => {
  const persistence = new MemoryPersistence();
  const state = new StateStore({ persistence, bus: new EventBus() });
  const fetchImpl = async () => ({ ok: true, json: async () => ({ display_name: 'Player', natal_report: { charts: { tropical: [
    { body: 'Sun', stream: 'body', longitude: 123.4567, gate: 7, line: 2, color: 3, tone: 4, base: 5 },
    { body: 'Earth', stream: 'design', longitude: 220.1, gate: 47, line: 4, color: 3, tone: 2, base: 1 },
  ] } } }) });
  const session = await new PhoneWorldSession({ state, fetchImpl }).boot();
  await session.bindProfile('person');
  const own = await session.preferences({ color: '#123456', photo: 'data:image/png;base64,eA==' });
  const host = await session.enterWorld('reality:consciousness-realm');
  assert.equal(own.world.contract.hostExpression.color, '#123456');
  assert.equal(host.world.contract.hostExpression.color, '#0a0a0f');
  assert.deepEqual(host.world.contract.identityInvariant, own.world.contract.identityInvariant);
  assert.equal(host.avatar.photo, own.avatar.photo);
  await session.enterWorld('indiverse:person');
  const custom = await session.preferences({ theme: 'My copper ocean', appearance: { background: '#042535', accent: '#cd8752', ground: '#164759', material: 'glass', fog: .012 } });
  assert.equal(custom.world.contract.hostExpression.atmosphere.theme, 'My copper ocean');
  assert.equal(custom.world.contract.hostExpression.atmosphere.background, '#042535');
  assert.equal(custom.world.contract.hostExpression.color, '#cd8752');
  assert.deepEqual(custom.world.contract.identityInvariant, own.world.contract.identityInvariant);
  assert.equal(custom.avatar.photo, own.avatar.photo);
  await assert.rejects(session.preferences({ theme: 'An unresolved request' }), /needs a local morph definition/);
  assert.equal(session.snapshot().world.contract.hostExpression.atmosphere.theme, 'My copper ocean');
  const observation = await session.observe({ type: 'interaction', target: 'npc:one' });
  assert.equal(observation.accepted, true);
  assert.ok(observation.episode.neural.top.length);
  const restored = new StateStore({ persistence, bus: new EventBus() });
  await restored.restore();
  const reboot = await new PhoneWorldSession({ state: restored, fetchImpl }).boot();
  assert.equal(reboot.snapshot().memory.episodes, 1);
  assert.deepEqual(reboot.connections.model, session.connections.model);
  assert.equal(reboot.snapshot().profile.neural.provenance?.model ?? reboot.gnn.metadata.model, 'GraphSAGE-3-layer');
});
