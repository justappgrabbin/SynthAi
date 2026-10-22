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


test('restart refuses contradictory persisted mounts without changing their source records', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'registry-conflicting-mounts' }).boot();
  const first = await boot();
  const a = await first.intake.ingest({ name: 'a.js', text: 'A' });
  const b = await first.intake.ingest({ name: 'b.js', text: 'B' });
  const one = { mountId: 'mount-conflict-a', appId: 'same-app', shell: 'workspace', artifactId: a.id };
  const two = { mountId: 'mount-conflict-b', appId: 'same-app', shell: 'workspace', artifactId: b.id };
  await first.state.set('mounts.mount-conflict-a', one);
  await first.state.set('mounts.mount-conflict-b', two);
  const second = await boot();
  assert.equal(second.apps.get('same-app'), null);
  assert.equal(second.registryRecovery.mounts, 0);
  assert.deepEqual(second.state.get('mounts.mount-conflict-a'), one);
  assert.deepEqual(second.state.get('mounts.mount-conflict-b'), two);
  assert.equal(second.registryRecovery.skipped.filter(x => x.kind === 'mount').length, 2);
  assert.equal(second.vfs.read(a.path).content, 'A');
  assert.equal(second.vfs.read(b.path).content, 'B');
});

test('live mount refuses app ID reused for a different artifact, preserving prior mount', async () => {
  const computer = await new ComputerRuntime({ namespace: 'live-mount-conflict' }).boot();
  const a = await computer.intake.ingest({ name: 'first.js', text: 'FIRST' });
  const b = await computer.intake.ingest({ name: 'second.js', text: 'SECOND' });
  const first = await computer.mountApplication('shared-app', { artifactId: a.id });
  const saved = computer.state.get('mounts');
  await assert.rejects(computer.mountApplication('shared-app', { artifactId: b.id }), /mount identity conflict/);
  assert.equal(computer.apps.get('shared-app').artifactId, a.id);
  assert.deepEqual(computer.state.get('mounts'), saved);
  assert.equal(computer.snapshot().mounted.length, 1);
  assert.equal(computer.snapshot().mounted[0].mountId, first.mountId);
  assert.equal(computer.vfs.read(b.path).content, 'SECOND');
});

test('compatible multiple mounts survive restart and retain the same artifact identity', async () => {
  const persistence = new MemoryPersistence();
  const boot = () => new ComputerRuntime({ persistence, namespace: 'compatible-multiple-mounts' }).boot();
  const first = await boot();
  const artifact = await first.intake.ingest({ name: 'same.app.js', text: 'SAME' });
  const a = await first.mountApplication('compatible-app', { artifactId: artifact.id });
  const b = await first.mountApplication('compatible-app', { artifactId: artifact.id });
  assert.notEqual(a.mountId, b.mountId);
  const second = await boot();
  assert.equal(second.registryRecovery.mounts, 2);
  assert.equal(second.apps.get('compatible-app').artifactId, artifact.id);
  assert.equal(second.snapshot().mounted.filter(x => x.appId === 'compatible-app').length, 2);
  assert.equal(second.vfs.read(artifact.path).content, 'SAME');
});

test('live mount cannot replace an existing non-artifact application identity', async () => {
  const computer = await new ComputerRuntime({ namespace: 'non-artifact-app' }).boot();
  const artifact = await computer.intake.ingest({ name: 'intruder.js', text: 'NOPE' });
  computer.apps.register('reserved-app', { kind: 'system-app' });
  await assert.rejects(computer.mountApplication('reserved-app', { artifactId: artifact.id }), /mount identity conflict/);
  assert.equal(computer.apps.get('reserved-app').kind, 'system-app');
  assert.equal(computer.snapshot().mounted.length, 0);
  assert.deepEqual(computer.state.get('mounts', {}), {});
});
