import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { MemoryPersistence } from '../core/kernel.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

globalThis.crypto ??= webcrypto;

function androidHost() {
  const launches = [];
  return {
    id: 'fake-android-host',
    launches,
    async listApplications() {
      return [
        {
          packageName: 'com.openai.chatgpt',
          label: 'ChatGPT',
          activity: 'com.openai.chatgpt.MainActivity',
          category: 'social',
          launchable: true,
        },
        {
          packageName: 'com.picsart.studio',
          label: 'Picsart',
          activity: 'com.picsart.studio.MainActivity',
          category: 'image',
          launchable: true,
        },
        {
          packageName: 'com.example.utility',
          label: 'Utility',
          activity: 'com.example.utility.MainActivity',
          category: 'productivity',
          launchable: true,
        },
      ];
    },
    async launchApplication(packageName, context = {}) {
      launches.push({ packageName, context });
      return { launched: true, packageName, activity: context.activity ?? null };
    },
  };
}

async function rig(namespace) {
  const computer = await new MobileComputerRuntime({
    persistence: new MemoryPersistence(),
    namespace,
  }).boot();

  const observed = [];
  await computer.meshKernel.registerParticipant('synthia:world-port', {
    kind: 'synthia-organ',
    residency: 'active',
    capabilities: ['world.port.observe'],
  });
  computer.meshKernel.bindHandler('synthia:world-port', async envelope => {
    observed.push(envelope.payload.event);
    return { accepted: true };
  });

  const host = androidHost();
  const phone = await computer.bindPhoneHost(host);
  return { computer, host, phone, observed };
}

test('MOBILE PHONE WORLD: real host apps become canonical IndiVerse places', async () => {
  const { computer, phone } = await rig('mobile-phone-places');

  assert.equal(phone.apps.length, 3);
  assert.equal(computer.snapshot().phoneWorld.apps.length, 3);
  assert.equal(computer.indiverse.canonicalObject('app:com.openai.chatgpt').kind, 'conversation-house');
  assert.equal(computer.indiverse.canonicalObject('app:com.picsart.studio').kind, 'art-studio');
  assert.equal(computer.indiverse.canonicalObject('app:com.example.utility').kind, 'application-place');
});

test('MOBILE PHONE WORLD: app launch reaches native host and Synthia world port', async () => {
  const { computer, host, observed } = await rig('mobile-phone-launch');

  const launched = await computer.phoneRequest('app.launch', {
    packageName: 'com.openai.chatgpt',
    residentId: 'synthia',
  });

  assert.equal(launched.accepted, true);
  assert.equal(host.launches.length, 1);
  assert.equal(host.launches[0].packageName, 'com.openai.chatgpt');
  assert.equal(host.launches[0].context.activity, 'com.openai.chatgpt.MainActivity');
  assert.equal(observed.at(-1).type, 'phone:app-entered');
});

test('MOBILE PHONE WORLD: ChatGPT New chat observation becomes a canonical door', async () => {
  const { computer, observed } = await rig('mobile-phone-chat-door');

  const result = await computer.phoneRequest('app.observe', {
    residentId: 'synthia',
    observation: {
      packageName: 'com.openai.chatgpt',
      appLabel: 'ChatGPT',
      activity: 'com.openai.chatgpt.MainActivity',
      eventType: 'TYPE_VIEW_CLICKED',
      eventText: 'New chat',
      observedAt: 1000,
      source: 'android-accessibility',
      ui: [{ id: 'new-chat', text: 'New chat', clickable: true, sensitive: false }],
    },
  });

  assert.equal(result.accepted, true);
  assert.equal(result.experienceId, 'chat-space');
  assert.equal(result.route.object.kind, 'door');
  assert.equal(result.route.object.function, 'new-conversation');
  assert.equal(result.route.object.relations[0].target, 'app:com.openai.chatgpt');
  assert.ok(observed.some(event => event.type === 'phone:app-observed'));
  assert.ok(observed.some(event => event.type === 'phone:route-entered'));
});

test('MOBILE PHONE WORLD: active ChatGPT composer becomes a conversation room without duplicate room spam', async () => {
  const { computer } = await rig('mobile-phone-chat-room');

  const observation = {
    packageName: 'com.openai.chatgpt',
    appLabel: 'ChatGPT',
    eventType: 'TYPE_WINDOW_CONTENT_CHANGED',
    observedAt: 2000,
    source: 'android-accessibility',
    ui: [{ id: 'composer', text: 'Message ChatGPT', editable: true, sensitive: false }],
  };

  const first = await computer.observePhoneApplication(observation, { residentId: 'synthia' });
  const second = await computer.observePhoneApplication(
    { ...observation, observedAt: 2100 },
    { residentId: 'synthia' },
  );

  assert.equal(first.route.object.kind, 'room');
  assert.equal(first.route.object.function, 'conversation');
  assert.equal(second.route, null);
});

test('MOBILE PHONE WORLD: unknown app observations remain quiet instead of inventing routes', async () => {
  const { computer } = await rig('mobile-phone-generic');

  const result = await computer.phoneRequest('app.observe', {
    residentId: 'synthia',
    observation: {
      packageName: 'com.example.utility',
      appLabel: 'Utility',
      eventType: 'TYPE_WINDOW_STATE_CHANGED',
      observedAt: 3000,
      source: 'android-accessibility',
      ui: [],
    },
  });

  assert.equal(result.experienceId, 'application-place');
  assert.equal(result.route, null);
  assert.equal(result.event.payload.significance, 'quiet');
});
