import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressApps } from '../backend/address-apps.mjs';
import { StateStore, MemoryPersistence } from '../core/kernel.mjs';
import { VirtualFileSystem } from '../runtime/storage.mjs';

async function fixture(fetchImpl) {
  let time = 1700000000000;
  const persistence = new MemoryPersistence();
  const state = new StateStore({ persistence }); await state.restore();
  const vfs = new VirtualFileSystem({ state });
  const privateStore = new MemoryPersistence();
  const apps = await new AddressApps({ state, vfs, privateStore, now: () => time, fetchImpl }).boot();
  return { apps, state, vfs, privateStore, advance: ms => { time += ms; } };
}

test('binary file survives routing and restart; unknown addresses and path names are rejected', async () => {
  const { apps, state, vfs, privateStore } = await fixture();
  const base64 = Buffer.from([0, 255, 12, 39]).toString('base64');
  const file = await apps.importFile({ name: 'avatar.png', type: 'image/png', base64 });
  await apps.routeFile(file.id, 'app://computer/realm');
  const restored = await new AddressApps({ state, vfs, privateStore }).boot();
  assert.equal(restored.readFile(file.id).base64, base64);
  assert.equal(restored.readFile(file.id).address, 'app://computer/realm');
  await assert.rejects(apps.routeFile(file.id, 'app://unknown/app'));
  await assert.rejects(apps.importFile({ name: '../escape', base64 }));
  await assert.rejects(apps.importFile({ name: 'bad', base64: '***' }));
  assert.equal(apps.suggestions({ type: 'image/png' })[0].view, 'world');
});

test('owner session guards settings; disable preserves files and admin remains accessible', async () => {
  const { apps, advance } = await fixture();
  await assert.rejects(apps.configure('fake', { enabled: false }), /Unlock/);
  const owner = await apps.setup('123456');
  await assert.rejects(apps.setup('654321'), /already/);
  assert.throws(() => apps.login('654321'), /Incorrect/);
  const file = await apps.importFile({ name: 'test.txt', base64: 'eA==' });
  await apps.configure(owner.session, { enabled: false });
  assert.equal(apps.readFile(file.id).base64, 'eA==');
  assert.deepEqual(apps.suggestions({ type: 'image/png' }), []);
  assert.throws(() => apps.resolve('app://computer/files'), /disabled/);
  await apps.configure(owner.session, { enabled: true });
  advance(16 * 60000);
  await assert.rejects(apps.configure(owner.session, {}), /Unlock/);
});

test('timely suggestions explain schedules and do not execute scheduled actions', async () => {
  const { apps, advance } = await fixture();
  const owner = await apps.setup('123456');
  const item = await apps.schedule(owner.session, { address: 'app://computer/synthworld', at: 1700000000000 + 20 * 60000, label: 'Play in my world' });
  assert.equal(apps.suggestions().length, 0);
  advance(6 * 60000);
  const suggestion = apps.suggestions()[0];
  assert.match(suggestion.reason, /Play in my world/);
  assert.equal(suggestion.automaticExecution, false);
  await apps.cancel(owner.session, item.id);
  assert.equal(apps.suggestions().length, 0);
});

test('GPT private key is omitted from snapshots; provider receives only explicit message', async () => {
  let request;
  const { apps, state } = await fixture(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Hello owner' }] }] }) };
  });
  const owner = await apps.setup('123456');
  await apps.configureGPT(owner.session, { key: 'private-test-key' });
  assert.equal(JSON.stringify(apps.snapshot()).includes('private-test-key'), false);
  assert.equal(JSON.stringify(state.snapshot()).includes('private-test-key'), false);
  const reply = await apps.chat(owner.session, 'Help explain app addresses');
  assert.equal(reply.text, 'Hello owner');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(JSON.parse(request.options.body).input, 'Help explain app addresses');
  assert.equal(JSON.parse(request.options.body).store, false);
  await apps.configureGPT(owner.session, { key: '' });
  await assert.rejects(apps.chat(owner.session, 'hello'), /Configure/);
});
