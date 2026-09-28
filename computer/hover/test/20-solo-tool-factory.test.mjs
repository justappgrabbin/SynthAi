import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSynthiaFrontScreen } from '../src/ui/server.mjs';

test('Hover Build generates, mounts, and executes an actual donor tool', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hover-factory-'));
  const app = await startSynthiaFrontScreen({ port: 0, persistenceDir: dir });
  const post = async (path, body) => {
    const response = await fetch(app.url + path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const request = { operation: 'synthesize', purpose: 'AutoLing resident language architecture', dimension: 'Design', level: 7 };
    const blocked = await post('/api/solo/tool-factory', request);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.code, 'BIRTH_CONFIGURATION_REQUIRED');

    const identity = await post('/api/identity/configure', {
      personId: 'front-screen', agentId: 'synthia', birthDate: '2000-01-01', birthTime: '12:34:56',
      place: { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
    });
    assert.equal(identity.status, 200);
    const made = await post('/api/solo/tool-factory', request);
    assert.equal(made.status, 200);
    assert.equal(made.data.execution.workerId, 'synthia-tool-synthesis-worker');
    assert.equal(made.data.execution.output.status, 'mounted');
    const id = made.data.execution.output.tool.id;
    assert.match(id, /^tool-/);

    const ran = await post('/api/solo/tool-factory', { operation: 'run', id, input: 'quality-aware language system' });
    assert.equal(ran.status, 200);
    assert.equal(ran.data.execution.workerId, 'synthia-tool-synthesis-worker');
    assert.equal(ran.data.execution.output.id, id);
    assert.deepEqual(ran.data.execution.output.output.nodes, ['quality', 'aware', 'language', 'system']);
  } finally {
    await new Promise(resolve => app.server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
