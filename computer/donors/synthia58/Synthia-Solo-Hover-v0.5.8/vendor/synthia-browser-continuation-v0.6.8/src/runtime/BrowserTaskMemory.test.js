import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BrowserTaskMemory } from './BrowserTaskMemory.js';

test('browser task memory persists learned navigation without form values', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synthia-browser-memory-test-'));
  const path = join(dir, 'memory.json');
  try {
    const first = new BrowserTaskMemory({ path });
    await first.recordNavigation({
      url: 'https://example.test/',
      route: { kind: 'browser', task: 'form-workflow', dimension: 'BEING' },
      trace: [
        { pageTitle: 'Home', actionText: 'Work With Us' },
        { pageTitle: 'Careers', actionText: 'Open Roles & Apply' }
      ],
      goalPage: { title: 'Application', url: 'https://example.test/' }
    });
    const task = await first.checkpointTask({
      url: 'https://example.test/',
      message: 'I need to fill out an application',
      route: { kind: 'browser', task: 'form-workflow', dimension: 'BEING', comprehension: { secret: 'do-not-store' } },
      status: 'awaiting-human',
      unresolved: ['signature'],
      navigation: { trace: [{ pageTitle: 'Home', actionText: 'Work With Us' }] }
    });

    const second = new BrowserTaskMemory({ path });
    await second.load();
    const hints = second.recommendActions({ url: 'https://example.test/', page: { title: 'Home' }, route: { task: 'form-workflow' } });
    assert.deepEqual(hints, ['Work With Us']);
    const restored = await second.getTask(task.id);
    assert.equal(restored.status, 'awaiting-human');
    assert.deepEqual(restored.unresolved, ['signature']);
    assert.equal(restored.route.comprehension, undefined);
    assert.equal(JSON.stringify(restored).includes('signature-value'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
