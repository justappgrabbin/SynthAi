import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSynthiaFrontScreen } from '../src/ui/server.mjs';

test('preserved v1.7 organism processes work, grows ATO tools, runs programs, and restores business state', async () => {
  const persistenceDir = await mkdtemp(join(tmpdir(), 'synthia17-resident-'));
  let app;
  const post = async (path, body) => {
    const response = await fetch(`${app.url}/api/solo/organism/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data.result;
  };
  try {
    app = await startSynthiaFrontScreen({ port: 0, persistenceDir });
    const status = await (await fetch(`${app.url}/api/solo/organism/status`)).json();
    assert.equal(status.diagnostics.runtime, 'integrated-organism');
    assert.ok(status.diagnostics.stateToolField.registeredTools >= 20);

    const processed = await post('process', { input: 'learn a useful language pattern' });
    assert.ok(processed.response);
    const grown = await post('grow', { purpose: 'orchestrate a language workflow', dimension: 'Space', input: 'sense classify respond' });
    assert.ok(grown.id);
    await post('program', { operation: 'register', program: { id: 'language-work', steps: ['autoling'] } });
    const run = await post('program', { operation: 'run', id: 'language-work', input: { operation: 'recognize', text: 'hello' } });
    assert.equal(run.ok, true);
    const business = await post('business', { opportunities: [
      { id: 'ready', expectedRevenue: 100, upfrontCost: 0, timeHours: 2, timeToCashHours: 24, evidence: .8, readiness: .9, risk: .1 },
      { id: 'uncertain', expectedRevenue: 500, upfrontCost: 300, timeHours: 80, timeToCashHours: 720, evidence: .1, readiness: .1, risk: .8 },
    ], context: { cashAvailable: 20, deadlineHours: 48 } });
    assert.equal(business.decision.ranked[0].id, 'ready');
    assert.ok((await readFile(join(persistenceDir, 'synthia17-capsule.json'), 'utf8')).includes('language-work'));
    await new Promise(resolve => app.server.close(resolve));

    app = await startSynthiaFrontScreen({ port: 0, persistenceDir });
    const restored = await (await fetch(`${app.url}/api/solo/organism/status`)).json();
    assert.ok(restored.diagnostics.stateToolField.programs >= 1);
    assert.ok(restored.diagnostics.generatedTools >= 1);
    assert.equal(app.resident17.runtime.nervousSystem.business.decisions.length, 1);
  } finally {
    if (app?.server.listening) await new Promise(resolve => app.server.close(resolve));
    await rm(persistenceDir, { recursive: true, force: true });
  }
});
