import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SoloHoverRuntime } from '../src/solo/solo-runtime.mjs';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'phone-contact-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const calls = [];
  const organism = {
    identityStatus: () => ({ configured: true, personId: 'person', agentId: 'synthia' }),
    chat: async (message, context) => { calls.push({ type: 'cognition', context }); return { ok: true, utterance: message }; },
    flushPersistence: async () => calls.push({ type: 'persist' }),
  };
  const runtime = new SoloHoverRuntime({ organism, persistenceDir: dir });
  let screens = 0;
  runtime.android = {
    status: async () => ({ available: true }),
    screen: async () => ({ page: ++screens }),
    command: async () => { calls.push({ type: 'action' }); return { ok: true, action: 'tap', accepted: true }; },
  };
  return { runtime, organism, calls };
}

test('phone contact resolves identity before acting, then returns post-action perception to cognition', async t => {
  const { runtime, calls } = await fixture(t);
  const result = await runtime.contact('tap 10 20', { personId: 'person' });
  assert.deepEqual(calls.map(item => item.type), ['cognition', 'action', 'cognition', 'persist']);
  assert.deepEqual(result.contact.perception, { before: { page: 1 }, after: { page: 2 } });
  assert.equal(calls[2].context.actionReceipt.accepted, true);
  assert.equal(calls[2].context.phonePerception.after.page, 2);
});

test('identity blockage and rejected native actions cannot be reported as successful work', async t => {
  const { runtime, organism, calls } = await fixture(t);
  organism.chat = async () => { throw new Error('Origin is required'); };
  await assert.rejects(runtime.contact('tap 10 20'), /Origin/);
  assert.equal(calls.some(item => item.type === 'action'), false);
  organism.chat = async () => ({ ok: true, utterance: 'ready' });
  runtime.android.command = async () => ({ action: 'tap', ok: false, error: 'Native gesture rejected' });
  await assert.rejects(runtime.contact('tap 10 20'), /Native gesture rejected/);
});

test('new assigned tasks run autonomously through the same perception/action path without a Run click', async t => {
  const { runtime, calls } = await fixture(t);
  const task = await runtime.tasks.add({ text: 'tap 10 20' });
  assert.equal(task.status, 'queued');
  await Promise.all([runtime.workTasks(), runtime.workTasks()]);
  assert.equal(calls.filter(item => item.type === 'action').length, 1);
  const [saved] = await runtime.tasks.list();
  assert.equal(saved.status, 'review');
  assert.equal(saved.evidence.action.accepted, true);
});
