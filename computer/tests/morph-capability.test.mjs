import test from 'node:test';
import assert from 'node:assert/strict';
import { MorphCapability } from '../runtime/morph-capability.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('no local renderer reports unavailable, not a fake finished character', async () => {
  const c = await new ComputerRuntime().boot();
  assert.equal(c.capabilities.resolve('character-morph').available, false);
  assert.equal((await c.morph.prepare()).status, 'unavailable');
  assert.equal(c.services.get('character-morph').provider, c.characterMorph);
});
test('routing uses the real provider and never records image bytes', async () => {
  const c = await new ComputerRuntime().boot();
  const events = [];
  c.bus.on('*', e => events.push(e));
  c.morph.registerProvider('simlish-test', {
    async prepare() {
      return { status: 'ready', kind: 'portrait-2d',
        output: { mime: 'image/png', dataUrl: 'secret-photo-bytes' },
        receipt: { source: 'saved-morph', offline: true } };
    },
  }, { formats: ['portrait', 'animated'] });
  assert.equal(c.capabilities.resolve('character-morph').available, true);
  const done = await c.characterMorph.prepare({ intent: 'portrait', subjectId: 'player' });
  assert.equal(done.output.dataUrl, 'secret-photo-bytes');
  assert.equal(c.characterMorph.getReceipt('player').status, 'ready');
  assert.doesNotMatch(JSON.stringify({ state: c.state.snapshot(), events }), /secret-photo-bytes/);
});
test('app contract exposes a namespaced morph call, not privileged studio controls', async () => {
  const c = await new ComputerRuntime().boot();
  c.morph.registerProvider('simlish-test', {
    async prepare(request) {
      return { status: 'ready', kind: 'portrait-2d', output: { kind: 'image-2d' },
        receipt: { source: 'existing-body-art', offline: true } };
    },
  }, { formats: ['portrait'] });
  const a = await c.intake.ingest({ name: 'game.html', text: '<main>Game</main>' });
  const mounted = await c.mountApplication('game', { artifactId: a.id });
  assert.equal(typeof mounted.services.morphCharacter, 'function');
  const receipt = await mounted.services.morphCharacter({ subjectId: 'player', intent: 'portrait' });
  assert.equal(receipt.receipt.subjectId, 'game__player');
  assert.equal(mounted.services.getCharacterMorphReceipt('player').provider, 'simlish-test');
});
test('no 2D/3D capability conflation and no automatic private portrait read', async () => {
  const morph = new MorphCapability();
  morph.registerProvider('two-d', { async prepare() { return { status: 'needs_consent', question: 'Use your saved portrait?' }; } }, { formats: ['portrait', 'animated'] });
  assert.equal((await morph.prepare({ intent: 'rigged' })).status, 'unavailable');
  assert.equal((await morph.prepare({ intent: 'portrait' })).status, 'needs_consent');
  await assert.rejects(() => morph.prepare({ subjectId: '../unsafe' }), /subject ID/);
});
