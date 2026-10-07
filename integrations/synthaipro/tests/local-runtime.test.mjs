import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRuntime } from '../src/runtime/local-runtime.mjs';
import { MemoryPersistence } from '../src/runtime/vendor/kernel.mjs';

test('build, edit, and restore apps without a backend', async () => {
  const persistence = new MemoryPersistence();
  const runtime = await new LocalRuntime({ persistence }).boot();
  const app = await runtime.build('<script>bad</script>');
  assert.ok(app.source.includes('&lt;script&gt;'));
  await runtime.save({ ...app, source: '<h1>Changed</h1>' });
  const restored = await new LocalRuntime({ persistence }).boot();
  assert.equal(restored.list()[0].source, '<h1>Changed</h1>');
  assert.equal(Object.values(runtime.state.get('automata.runs'))[0].status, 'complete');
});
test('import executable files and reject unsupported formats honestly', async () => {
  const runtime = await new LocalRuntime({ persistence: new MemoryPersistence() }).boot();
  const app = await runtime.ingest({ name: 'hello.js', text: async () => "document.body.textContent='hello'" });
  assert.ok(app.source.includes('type="module"'));
  await assert.rejects(runtime.ingest({ name: 'app.zip' }), /additional adapters/);
});
