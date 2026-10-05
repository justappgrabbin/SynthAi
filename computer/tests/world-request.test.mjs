import test from 'node:test';
import assert from 'node:assert/strict';
import { compileWorldRequest, WORLD_REQUEST_FIELDS } from '../runtime/world-request.mjs';
import { EventBus, MemoryPersistence, StateStore } from '../core/kernel.mjs';
import { PhoneWorldSession } from '../backend/phone-world-session.mjs';
import { RealmRoom } from '../backend/realm-room.mjs';

const fetchImpl = async url => ({ ok: true, json: async () => ({ display_name: url.split('/').at(-1), natal_report: { charts: { tropical: [
  { body: 'Sun', stream: 'body', longitude: 123.4567, gate: 7, line: 2, color: 3, tone: 4, base: 5 },
] } } }) });
async function setup(persistence = new MemoryPersistence()) {
  const state = new StateStore({ persistence, bus: new EventBus() });
  await state.restore();
  return { state, persistence, session: await new PhoneWorldSession({ state, fetchImpl }).boot() };
}

test('local fields compile structural and inhabitant roles independently, rather than selecting a whole theme', () => {
  const a = compileWorldRequest('Rainbows are structures and butterflies are people');
  const b = compileWorldRequest('Pink crystals are structures and flowers are people');
  assert.deepEqual(a.fields.map(stage => stage.field), WORLD_REQUEST_FIELDS);
  assert.equal(a.grammar.architecture.world.kind, 'rainbow');
  assert.equal(a.grammar.embodiment.default.kind, 'butterfly');
  assert.equal(b.grammar.architecture.world.kind, 'crystal');
  assert.equal(b.grammar.embodiment.default.kind, 'flower');
  assert.equal(b.grammar.colors.world, '#ff9ad9');
  assert.throws(() => compileWorldRequest('Butterflies and dragons and rainbows'), /No local resolver/);
});

test('failed generation does not consume the choice, concurrent successful choices commit only once and persist', async () => {
  const { session, persistence } = await setup();
  await session.bindProfile('owner');
  await assert.rejects(session.chooseWorld('A world of dragons'), /No local resolver/);
  assert.equal(session.snapshot().worldChoice, null);
  const results = await Promise.allSettled([
    session.chooseWorld('Butterflies and rainbows'),
    session.chooseWorld('Stars are structures and flowers are people'),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(session.snapshot().world.contract.sceneMorph.kind, 'butterfly');
  await assert.rejects(session.preferences({ theme: 'garden' }), /already been chosen/);
  await assert.rejects(session.worlds.updateGrammar('indiverse:owner', { colors: { world: '#ffffff' } }), /already been chosen/);
  await assert.rejects(session.worlds.createWorld('owner', { id: 'indiverse:owner' }), /already been chosen/);
  await session.preferences({ photo: 'data:image/png;base64,eA==' });
  const reboot = (await setup(persistence)).session;
  assert.equal(reboot.snapshot().worldChoice.request, 'Butterflies and rainbows');
  await assert.rejects(reboot.chooseWorld('Rainbows and butterflies'), /already been chosen/);
});

test('visitors adopt each host and public place form, keeping their identity and their chosen home', async () => {
  const { session } = await setup();
  await session.bindProfile('host');
  await session.chooseWorld('Butterflies and rainbows');
  await session.bindProfile('visitor');
  await session.chooseWorld('Crystals are structures and flowers are people');
  const own = await session.preferences({ photo: 'data:image/png;base64,eA==' });
  const visiting = await session.enterWorld('indiverse:host');
  assert.equal(visiting.world.contract.sceneMorph.kind, 'butterfly');
  assert.equal(visiting.world.contract.hostExpression.architecture.kind, 'rainbow');
  assert.equal(visiting.worldChoice.request, own.worldChoice.request);
  assert.deepEqual(visiting.world.contract.identityInvariant, own.world.contract.identityInvariant);
  assert.equal(visiting.avatar.photo, own.avatar.photo);
  await session.worlds.createWorld('public-place', { id: 'public:plaza', name: 'Crystal plaza', grammar: compileWorldRequest('Stars are structures and crystals are people').grammar });
  const plaza = await session.enterWorld('public:plaza');
  assert.equal(plaza.world.contract.sceneMorph.kind, 'crystal');
  assert.deepEqual(plaza.world.contract.identityInvariant, own.world.contract.identityInvariant);
  const returned = await session.enterWorld('indiverse:visitor');
  assert.equal(returned.world.contract.sceneMorph.kind, 'flower');
  assert.equal(returned.world.contract.hostExpression.architecture.kind, 'crystal');
});

test('two computers inherit a chosen host grammar through the real room protocol and return to their own forms', async () => {
  const host = (await setup()).session;
  const guest = (await setup()).session;
  host.room = new RealmRoom({ host: '127.0.0.1', port: 0 });
  try {
    await host.bindProfile('host'); await host.chooseWorld('Butterflies and rainbows');
    await guest.bindProfile('guest'); await guest.chooseWorld('Stars are structures and crystals are people');
    const own = guest.snapshot();
    const hosted = await host.hostRoom();
    const invite = new URL(hosted.room.invite); invite.hostname = '127.0.0.1';
    const joined = await guest.joinRoom(invite.href);
    assert.equal(joined.world.contract.sceneMorph.kind, 'butterfly');
    assert.equal(joined.world.contract.hostExpression.architecture.kind, 'rainbow');
    assert.deepEqual(joined.world.contract.identityInvariant, own.world.contract.identityInvariant);
    assert.equal(joined.inhabitants.length, 2);
    const synced = await guest.runtime();
    assert.equal(synced.world.contract.sceneMorph.kind, 'butterfly');
    const returned = await guest.leaveRoom();
    assert.equal(returned.world.contract.sceneMorph.kind, 'crystal');
    assert.equal(returned.worldChoice.request, own.worldChoice.request);
  } finally { await guest.room.leave(); await host.room.leave(); }
});
