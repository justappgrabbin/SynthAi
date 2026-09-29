import test from 'node:test';
import assert from 'node:assert/strict';
import { UniversalRuntime } from '../src/universal-runtime.mjs';
import { detectArtifactKind } from '../src/runtime-adapters.mjs';

test('artifact kind detection covers foreign code and projects', () => {
  assert.equal(detectArtifactKind({ name: 'main.py' }), 'python');
  assert.equal(detectArtifactKind({ name: 'tool.rb' }), 'ruby');
  assert.equal(detectArtifactKind({ name: 'module.wasm' }), 'wasm');
  assert.equal(detectArtifactKind({ name: 'bundle.zip' }), 'archive');
  assert.equal(detectArtifactKind({ name: 'Cargo.toml' }), 'rust-project');
  assert.equal(detectArtifactKind({ type: 'folder', entries: [] }), 'folder');
});

test('registered foreign runtime executes original artifact before fallback', async () => {
  const seen = [];
  const runtime = new UniversalRuntime({
    runtimeAdapters: [{
      id: 'python-test-runtime',
      kinds: ['python'],
      canRun: ({ kind }) => kind === 'python',
      prepare: ({ artifact }) => ({ source: artifact.content }),
      execute: ({ artifact, prepared }) => {
        seen.push({ artifact, prepared });
        return { ok: true, engine: 'python-test-runtime', stdout: ['42'], stderr: [], returnValue: 42 };
      },
    }],
  });

  const artifact = { name: 'program.py', content: 'print(42)' };
  const result = await runtime.executeArtifact(artifact, {
    fallbackRealization: { realizer: 'expression-ir', expression: 999 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.path, 'registered-runtime');
  assert.equal(result.kind, 'python');
  assert.equal(result.runtimeAdapter, 'python-test-runtime');
  assert.equal(result.result.engine, 'python-test-runtime');
  assert.equal(result.result.returnValue, 42);
  assert.equal(result.evidence.originalArtifactExecuted, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].artifact, artifact);
  assert.equal(seen[0].prepared.source, 'print(42)');
});

test('missing runtime is explicit and does not pretend translation is native', async () => {
  const runtime = new UniversalRuntime();
  const result = await runtime.executeArtifact({ name: 'program.py', content: 'print(42)' });
  assert.equal(result.ok, false);
  assert.equal(result.path, 'runtime-unavailable');
  assert.equal(result.kind, 'python');
  assert.equal(result.evidence.originalArtifactExecuted, false);
});

test('fallback realization is labeled fallback when no runtime exists', async () => {
  const runtime = new UniversalRuntime();
  const result = await runtime.executeArtifact(
    { name: 'program.py', content: 'print(42)' },
    { fallbackRealization: { realizer: 'expression-ir', expression: 7 } },
  );
  assert.equal(result.ok, true);
  assert.equal(result.path, 'fallback-realization');
  assert.equal(result.runtimeAdapter, null);
  assert.equal(result.result.value, 7);
  assert.equal(result.evidence.originalArtifactExecuted, false);
});
