import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { RelayBuilder } from '../runtime/relay-builder.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

test('Klein builder creates executable task app, preserves evidence and survives restart', async () => {
  const persistence = new MemoryPersistence();
  const computer = await new ComputerRuntime({ persistence, namespace: 'relay-test' }).boot();
  const builder = new RelayBuilder(computer);
  const project = await builder.build({ name: 'Trip tasks' });
  const html = computer.projects.readFile(project.id, 'index.html').content;
  assert.match(html, /localStorage\.setItem/);
  const evidence = JSON.parse(computer.projects.readFile(project.id, 'build-evidence.json').content);
  assert.equal(evidence.language.matches[0].ruleId, 'relay.tasks');
  assert.deepEqual(evidence.composition.lineage, ['join-document-program']);
  assert.equal(builder.language.calls, 1);
  assert.equal(builder.composer.calls, 2);
  const restarted = await new ComputerRuntime({ persistence, namespace: 'relay-test' }).boot();
  assert.equal(restarted.projects.readFile(project.id, 'index.html').content, html);
  await assert.rejects(builder.build({ name: 'Unsupported', kind: 'arbitrary' }), /currently supports/);
  assert.equal(computer.projects.list().length, 1);
});

test('persisted build queue resumes in a fresh runtime without duplicating completed projects', async () => {
  const persistence = new MemoryPersistence();
  const first = await new ComputerRuntime({ persistence, namespace: 'relay-queue' }).boot();
  const queued = await new RelayBuilder(first).enqueue({ name: 'Trip notebook', kind: 'notes' });
  const second = await new ComputerRuntime({ persistence, namespace: 'relay-queue' }).boot();
  const builder = new RelayBuilder(second);
  const results = await builder.drain();
  assert.equal(results[queued.id].status, 'built');
  assert.match(second.projects.readFile(results[queued.id].projectId, 'index.html').content, /textarea/);
  await builder.drain();
  assert.equal(second.projects.list().length, 1);
});
