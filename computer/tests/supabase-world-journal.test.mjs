import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { NativeSeedRuntime } from '../native/NativeSeedRuntime.mjs';
import { SupabaseWorldJournal, mapPhoneWorldEventToSupabase } from '../adapters/supabase-world-journal.mjs';

function fakePhoneHost() {
  return {
    async listApplications() {
      return [
        { packageName: 'com.openai.chatgpt', label: 'ChatGPT', category: 'communication', launchable: true },
      ];
    },
    async launchApplication(packageName) {
      return { ok: true, packageName };
    },
  };
}

test('WORLD JOURNAL: app travel maps to existing yni_world place/event contract', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true, status: 200, async json() { return { ok: true, event: { event_uuid: 'evt-1' } }; } };
  };

  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'world-journal-test',
  }).boot();

  await runtime.bindSupabaseWorldJournal({
    projectUrl: 'https://example.supabase.co',
    runtimeToken: 'runtime-token',
    workspaceId: 'workspace-1',
    fetchImpl,
  });
  await runtime.bindPhoneHost(fakePhoneHost());
  await runtime.phoneRequest('app.launch', { packageName: 'com.openai.chatgpt', residentId: 'synthia' });
  await runtime.worldJournal.drain();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.place.source_key, 'app:com.openai.chatgpt');
  assert.equal(calls[0].body.place.resource_type, 'chat-space');
  assert.equal(calls[0].body.event.action_kind, 'enter');
  assert.equal(calls[0].body.event.actor_ref, 'synthia');
  assert.equal(calls[0].init.headers['x-synthia-runtime-token'], 'runtime-token');
});

test('WORLD JOURNAL: ChatGPT route becomes a redacted door/room event', async () => {
  const rows = mapPhoneWorldEventToSupabase({
    id: 'route-1',
    type: 'phone:route-entered',
    actor: 'synthia',
    source: 'phone:world',
    at: '2026-09-23T19:00:00.000Z',
    payload: {
      packageName: 'com.openai.chatgpt',
      experienceId: 'chat-space',
      route: {
        id: 'app-route:chat:new:42',
        kind: 'door',
        presentation: { label: 'Private conversation title' },
        metadata: { packageName: 'com.openai.chatgpt', routeType: 'new-conversation' },
      },
    },
  }, { workspaceId: 'workspace-1' });

  assert.equal(rows.event.place_kind, 'door');
  assert.equal(rows.event.place_name, 'door', 'private route title must not leave the device by default');
  assert.equal(rows.event.payload.route.presentation.label, '[private]');
});

test('WORLD JOURNAL: notification bodies stay local unless explicitly enabled', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'world-journal-private-test',
  }).boot();
  const calls = [];
  await runtime.bindSupabaseWorldJournal({
    projectUrl: 'https://example.supabase.co',
    runtimeToken: 'runtime-token',
    workspaceId: 'workspace-1',
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, async json() { return { ok: true }; } };
    },
  });
  await runtime.bindPhoneHost(fakePhoneHost());
  await runtime.phoneRequest('notification.observe', {
    residentId: 'synthia',
    notification: {
      id: 'n-1',
      packageName: 'com.openai.chatgpt',
      title: 'Private title',
      text: 'Private message content',
      category: 'message',
    },
  });
  await runtime.worldJournal.drain();
  assert.equal(calls.length, 0);
  assert.equal(runtime.worldJournal.snapshot().counters.skipped, 1);
});

test('WORLD JOURNAL: configured notification export still redacts message text', () => {
  const rows = mapPhoneWorldEventToSupabase({
    id: 'n-2',
    type: 'phone:notification',
    actor: 'phone:app:com.example',
    payload: {
      packageName: 'com.example',
      title: 'Visible event title',
      text: 'secret conversation text',
      category: 'message',
      metadata: { accessToken: 'do-not-export' },
    },
  }, { workspaceId: 'workspace-1' });

  assert.equal(rows.event.payload.notification.text, '[private]');
  assert.equal(JSON.stringify(rows.event.payload).includes('do-not-export'), false);
});

test('WORLD JOURNAL: missing cloud credential keeps durable local outbox instead of pretending to sync', async () => {
  const runtime = await new NativeSeedRuntime({
    persistence: new MemoryPersistence(),
    namespace: 'world-journal-offline-test',
  }).boot();
  const journal = new SupabaseWorldJournal({
    state: runtime.state,
    bus: runtime.bus,
    projectUrl: 'https://example.supabase.co',
    workspaceId: 'workspace-1',
  });
  await journal.mount();
  const result = await journal.capture({
    id: 'local-1',
    type: 'phone:app-entered',
    actor: 'synthia',
    payload: { packageName: 'com.example', label: 'Example', experienceId: 'application-place' },
  });
  assert.equal(result.queued, true);
  assert.equal(result.reason, 'NOT_CONFIGURED');
  assert.equal(runtime.state.get('worldJournal.outbox.local-1').status, 'local-only');
});
