import test from 'node:test';
import assert from 'node:assert/strict';
import { RealmRoom } from '../backend/realm-room.mjs';
import { expressAddress } from '../runtime/address-expression.mjs';

const participant = id => ({ id, name: id, position: [0,1,0], addresses: [{ id: 'Sun', expression: expressAddress({ gate: 1, line: 2, color: 3, tone: 4, base: 5 }) }] });

test('two computers share owned addresses, movements and host grammar with scoped room credentials', async () => {
  let now = Date.now();
  const host = new RealmRoom({ host: '127.0.0.1', port: 0, clock: () => now });
  const guest = new RealmRoom();
  try {
    await host.hostWorld({ world: { ownerId: 'host', grammar: { colors: { world: '#123456' } } }, participant: participant('host') });
    const invite = new URL(host.invite); invite.hostname = '127.0.0.1';
    const wrong = new URL(invite); wrong.hash = '#wrong';
    await assert.rejects(guest.join(wrong.href, participant('guest')), /Invalid world invitation/);
    const joined = await guest.join(invite.href, participant('guest'));
    assert.equal(joined.participants.length, 2);
    const moved = { ...participant('guest'), position: [2,1,3] };
    const synced = await guest.sync(moved);
    assert.deepEqual(synced.world.grammar, { colors: { world: '#123456' } });
    assert.deepEqual(host.snapshot().participants.find(p => p.id === 'guest').position, [2,1,3]);
    assert.deepEqual(synced.participants[0].addresses[0].expression.address, participant('host').addresses[0].expression.address);
    await assert.rejects(guest.sync(participant('impostor')), /identity cannot change/);
    const priorPeerId = guest.peerId;
    now += 31000; assert.equal(host.snapshot().participants.length, 1);
    const resumed = await guest.sync(moved);
    assert.equal(resumed.participants.length, 2); assert.notEqual(guest.peerId, priorPeerId);
    await assert.rejects(guest.join(wrong.href, moved), /Invalid world invitation/);
    assert.equal(guest.mode, 'guest');
    await guest.leave(); assert.equal(host.snapshot().participants.length, 1);
  } finally { await guest.leave(); await host.leave(); }
});
