import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence, StateStore, EventBus } from '../core/kernel.mjs';
import { ExperienceCompiler } from '../worlds/experience-compiler.mjs';
import { registerDefaultExperienceAdapters } from '../mobile/AppExperienceAdapters.mjs';
import { AppExperienceRuntime } from '../mobile/AppExperienceRuntime.mjs';

async function makeRuntime(namespace) {
  const bus = new EventBus();
  const state = new StateStore({ bus, persistence: new MemoryPersistence(), namespace });
  await state.restore();
  const compiler = registerDefaultExperienceAdapters(new ExperienceCompiler());
  return new AppExperienceRuntime({ state, bus, compiler });
}

test('APP EXPERIENCE: ChatGPT new conversation is rendered as a new door transition', async () => {
  const runtime = await makeRuntime('experience-chatgpt');
  const result = await runtime.observe({
    packageName: 'com.openai.chatgpt',
    appLabel: 'ChatGPT',
    activity: 'MainActivity',
    screenType: 'new_conversation',
    source: 'accessibility',
    ui: [{ id: 'new', text: 'New chat', role: 'button', clickable: true }],
  });

  assert.equal(result.adapterId, 'chatgpt-conversation-house');
  assert.equal(result.environment.type, 'conversation_house');
  assert.equal(result.scene.state, 'new-door-available');
  assert.deepEqual(result.transitions[0].worldAction, [
    'materialize-door', 'walk-to-door', 'open-door', 'enter-room', 'sit'
  ]);
  assert.equal(runtime.current().sequence, 1);
});

test('APP EXPERIENCE: Picsart editor is rendered as an active art studio', async () => {
  const runtime = await makeRuntime('experience-picsart');
  const result = await runtime.observe({
    packageName: 'com.picsart.studio',
    appLabel: 'Picsart',
    screenType: 'editor',
    source: 'accessibility',
    ui: [{ id: 'brush', text: 'Brush', role: 'button', clickable: true }],
  });

  assert.equal(result.adapterId, 'picsart-art-studio');
  assert.equal(result.environment.type, 'art_studio');
  assert.equal(result.scene.state, 'canvas-active');
  assert.ok(result.affordances.includes('use-tool'));
});

test('APP EXPERIENCE: unknown apps remain renderable without invented UI state', async () => {
  const runtime = await makeRuntime('experience-generic');
  const result = await runtime.observe({
    packageName: 'example.unknown',
    appLabel: 'Unknown Tool',
    source: 'native-launcher',
    ui: [],
  });

  assert.equal(result.adapterId, 'generic-application-place');
  assert.equal(result.environment.type, 'application_place');
  assert.equal(result.evidence.observedUiNodes, 0);
  assert.equal(result.observation.source, 'native-launcher');
  assert.equal(result.scene.state, 'observed');
});

test('APP EXPERIENCE: persisted observation history increments and preserves evidence', async () => {
  const runtime = await makeRuntime('experience-history');
  await runtime.observe({ packageName: 'com.openai.chatgpt', appLabel: 'ChatGPT', source: 'native-launcher' });
  await runtime.observe({ packageName: 'com.picsart.studio', appLabel: 'Picsart', source: 'native-launcher' });

  const history = runtime.history();
  assert.equal(history.length, 2);
  assert.equal(history[0].sequence, 1);
  assert.equal(history[1].sequence, 2);
  assert.equal(history[1].evidence.packageName, 'com.picsart.studio');
});
