import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';
import { GitHubWorkspaceAdapter } from '../adapters/GitHubWorkspaceAdapter.mjs';

test('boot macros micros', async () => {
  const c = await new ComputerRuntime().boot();
  assert.equal(c.systems.get('synthai-computer').role, 'os');
  assert.equal(c.systems.get('synthai2').role, 'browser');
  assert.equal(c.systems.get('xynthai').audience, '18+');
  assert.equal(c.micros.get('venom').macro, null);
});

test('intake mutation mount persistence', async () => {
  const persistence = new MemoryPersistence();
  const c = await new ComputerRuntime({ persistence }).boot();
  const a = await c.intake.ingest({ name: 'demo.html', text: '<h1>demo</h1>' });
  const p = c.intake.proposeMount(a.id, { appId: 'demo-app' });
  const applied = await c.mutations.apply(p.id);
  assert.equal(applied.status, 'applied');
  assert.equal(c.shellManager.listMounted()[0].appId, 'demo-app');
  assert.match(c.vfs.read(a.path).content, /demo/);
  const restored = await new ComputerRuntime({ persistence }).boot();
  assert.equal(restored.state.get(`mutations.${p.id}`).status, 'applied');
});

test('mutation failure surfaces', async () => {
  const c = await new ComputerRuntime().boot();
  const p = c.mutations.propose({ actions: [{ type: 'nope' }] });
  await assert.rejects(() => c.mutations.apply(p.id), /unhandled mutation action/);
  assert.equal(c.state.get(`mutations.${p.id}`).status, 'failed');
});

test('automata and process use real inputs', async () => {
  const c = await new ComputerRuntime().boot();
  c.automata.register({ id: 'echo', execute: async ({ input, state }) => { await state.set('test.input', input, { source: 'echo' }); return input; } });
  assert.equal((await c.automata.run('echo', { message: 'runtime' })).message, 'runtime');
  c.processes.register({ id: 'normalize', run: async ({ input }) => String(input).trim().toLowerCase() });
  assert.equal(await c.processes.execute('normalize', ' HELLO '), 'hello');
});

test('cultivation persists', async () => {
  const c = await new ComputerRuntime().boot();
  const x = await c.cultivation.begin({ goal: 'learn' });
  await c.cultivation.observe(x.id, { noticed: 'gap' });
  await c.cultivation.act(x.id, { do: 'practice' });
  assert.equal((await c.cultivation.integrate(x.id, { result: 'learned' })).status, 'complete');
});

test('xynthai boundary', async () => {
  const c = await new ComputerRuntime().boot();
  await assert.rejects(() => c.policy.assert('xynthai:age-boundary', { ageConfirmed: false }), /18\+/);
  assert.equal((await c.policy.assert('xynthai:age-boundary', { ageConfirmed: true })).allow, true);
});

test('project workspace persists real files and publication result', async () => {
  const persistence = new MemoryPersistence();
  const c = await new ComputerRuntime({ persistence }).boot();
  const project = await c.projects.create({ name: 'Computer Test', description: 'runtime path' });
  await c.projects.writeFile(project.id, 'index.html', '<h1>Computer Test</h1>', { type: 'text/html' });
  c.backends.register('github', { request: async request => ({ ok: true, received: request.project.files[0].content, repo: { url: 'https://example.invalid/test' } }) });
  const published = await c.projects.publish(project.id);
  assert.match(published.received, /Computer Test/);
  assert.equal(c.projects.get(project.id).status, 'published');
  const restored = await new ComputerRuntime({ persistence }).boot();
  assert.match(restored.projects.readFile(project.id, 'index.html').content, /Computer Test/);
});

test('GitHub adapter sends project files and surfaces bridge failures', async () => {
  const calls = [];
  const okFetch = async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, status: 201, text: async () => JSON.stringify({ ok: true, repo: { url: 'https://github.com/example/app' } }) };
  };
  const adapter = new GitHubWorkspaceAdapter({ baseUrl: 'https://server.example', token: 'secret', fetchImpl: okFetch });
  const result = await adapter.request({ action: 'create-project', project: { name: 'App', description: 'x', files: [{ path: 'index.html', content: '<h1>x</h1>' }] } });
  assert.equal(result.ok, true);
  assert.equal(JSON.parse(calls[0].options.body).files[0].path, 'index.html');

  const failing = new GitHubWorkspaceAdapter({
    baseUrl: 'https://server.example',
    token: 'secret',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ error: 'denied' }) })
  });
  await assert.rejects(() => failing.request({ action: 'status' }), /denied/);
});
