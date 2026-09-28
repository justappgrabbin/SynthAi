import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SoloHoverRuntime } from '../src/solo/solo-runtime.mjs';
import { SoloTaskStore } from '../src/solo/solo-task-store.mjs';

test('assigned queue waits for origin, runs once, persists results without claiming completion', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'hover-queue-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let configured = false, calls = 0;
  const organism = {
    identityStatus: () => ({ configured, personId: 'saved-person', agentId: 'synthia' }),
    chat: async (text, context) => { calls++; assert.equal(context.personId, 'saved-person'); return { ok: true, utterance: `Response to ${text}` }; },
    flushPersistence: async () => {},
  };
  const runtime = new SoloHoverRuntime({ organism, persistenceDir: dir });
  const task = await runtime.tasks.add({ text: 'Plan a build' });
  await runtime.queueTask(task.id);
  await runtime.workTasks();
  assert.equal(calls, 0);
  configured = true;
  await Promise.all([runtime.workTasks(), runtime.workTasks()]);
  assert.equal(calls, 1);
  const [saved] = await new SoloTaskStore({ persistenceDir: dir }).list();
  assert.equal(saved.status, 'review');
  assert.equal(saved.done, false);
  assert.match(saved.result, /Plan a build/);
  organism.chat = async () => { throw new Error('Test blockage'); };
  await runtime.queueTask(task.id);
  await runtime.workTasks();
  assert.equal((await runtime.tasks.list())[0].status, 'blocked');
  await runtime.tasks.update(task.id, { status: 'running' });
  await runtime.startTasks();
  runtime.stopTasks();
  assert.equal((await runtime.tasks.list())[0].status, 'interrupted');
});

test('concurrent task edits persist a complete valid JSON document', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'hover-store-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new SoloTaskStore({ persistenceDir: dir });
  await Promise.all(Array.from({ length: 12 }, (_, i) => store.add({ text: `Task ${i}` })));
  const tasks = await new SoloTaskStore({ persistenceDir: dir }).list();
  assert.equal(tasks.length, 12);
  assert.equal(new Set(tasks.map(task => task.id)).size, 12);
});
