import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

test('real Computer boot restores mounted application and exact dotted source bytes', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-recovery-1' }).boot();
  const first = await boot();
  const artifact = await first.intake.ingest({
    name: 'demo.bundle.js', text: 'export const value = 42;', type: 'text/javascript'
  });
  const contract = await first.mountApplication('demo-app', { artifactId: artifact.id });
  const restarted = await boot();
  assert.equal(restarted.artifacts.get(artifact.id)?.path, artifact.path);
  assert.equal(restarted.vfs.read(artifact.path)?.content, 'export const value = 42;');
  assert.ok(restarted.vfs.list('/artifacts/').some(file => file.path === artifact.path));
  assert.equal(restarted.apps.get('demo-app')?.artifactId, artifact.id);
  assert.ok(restarted.snapshot().mounted.some(m => m.mountId === contract.mountId));
  assert.equal(restarted.registryRecovery.mounts, 1);
});

test('legacy VFS-only source recovers its original bytes and mount after restart', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-recovery-2' }).boot();
  const first = await boot();
  const id = 'artifact-legacy';
  const path = '/artifacts/artifact-legacy/old.app.js';
  await first.state.set('vfs.' + encodeURIComponent(path), {
    path, content: 'legacy-exact-bytes', meta: { originalName: 'old.app.js', type: 'text/javascript' }
  });
  await first.state.set('mounts.mount-legacy', {
    mountId: 'mount-legacy', appId: 'legacy-app', shell: 'workspace', artifactId: id
  });
  const second = await boot();
  assert.equal(second.vfs.read(path)?.content, 'legacy-exact-bytes');
  assert.equal(second.registryRecovery.legacyArtifacts, 1);
  assert.equal(second.registryRecovery.mounts, 1);
  assert.ok(second.state.get('artifacts.items.artifact-legacy'));
  const third = await boot();
  assert.equal(third.registryRecovery.artifacts, 1);
  assert.equal(third.registryRecovery.legacyArtifacts, 0);
});

test('corrupt registration is reported but never removed from source state', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-recovery-3' }).boot();
  const first = await boot();
  await first.state.set('mounts.mount-broken', {
    mountId: 'mount-broken', appId: 'bad-app', shell: 'workspace', artifactId: 'artifact-missing'
  });
  const second = await boot();
  assert.equal(second.registryRecovery.mounts, 0);
  assert.ok(second.registryRecovery.skipped.some(x => x.id === 'mount-broken'));
  assert.ok(second.state.get('mounts.mount-broken'));
});

test('conflicting persisted artifact registration is preserved, never replaced by legacy recovery', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-recovery-conflict' }).boot();
  const first = await boot();
  const id = 'artifact-conflict';
  const original = { id, path: '/artifacts/artifact-conflict/missing.js', source: 'original', status: 'incomplete' };
  await first.state.set(`artifacts.items.${id}`, original);
  await first.vfs.write('/artifacts/artifact-conflict/present.js', 'EXACT', { originalName: 'present.js' });
  const second = await boot();
  assert.deepEqual(second.state.get(`artifacts.items.${id}`), original);
  assert.equal(second.artifacts.has(id), false);
  assert.ok(second.registryRecovery.skipped.some(x => x.id === id && x.kind === 'legacy-artifact'));
  assert.equal(second.vfs.read('/artifacts/artifact-conflict/present.js').content, 'EXACT');
});

test('ambiguous legacy VFS files are retained without arbitrary app registration', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-recovery-ambiguous' }).boot();
  const first = await boot();
  await first.vfs.write('/artifacts/artifact-ambiguous/one.js', 'ONE', { originalName: 'one.js' });
  await first.vfs.write('/artifacts/artifact-ambiguous/two.js', 'TWO', { originalName: 'two.js' });
  const second = await boot();
  assert.equal(second.artifacts.has('artifact-ambiguous'), false);
  assert.equal(second.vfs.list('/artifacts/').length, 2);
  assert.ok(second.registryRecovery.skipped.some(x => x.id === 'artifact-ambiguous'));
});
