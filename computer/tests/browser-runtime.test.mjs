import test from 'node:test';
import assert from 'node:assert/strict';

import { BrowserComputerRuntime } from '../BrowserComputerRuntime.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

test('browser host executes project + mount path and survives restart', async () => {
  const persistence = new MemoryPersistence();
  const namespace = 'browser-host-test';

  const first = await new BrowserComputerRuntime({ persistence, namespace }).boot();

  assert.equal(first.snapshot().environment, 'browser');
  assert.equal(first.capabilityRegistry.get('project-workspace').status, 'WIRED');
  assert.equal(first.capabilityRegistry.get('penta_ephemeris').status, 'PRESENT');

  const project = await first.projects.create({ name: 'GitHub Only App', description: 'runtime test' });
  await first.projects.writeFile(project.id, 'index.html', '<h1>alive</h1>', { type: 'text/html' });
  assert.equal(first.projects.readFile(project.id, 'index.html').content, '<h1>alive</h1>');

  const artifact = await first.intake.ingest({
    name: 'proof.txt',
    text: 'artifact runtime input',
    source: 'browser-host-test'
  });
  const contract = await first.mountApplication('proof-app', { artifactId: artifact.id });
  assert.equal(contract.services.readArtifact().content, 'artifact runtime input');
  assert.equal(first.shellManager.listMounted().length, 1);

  const second = await new BrowserComputerRuntime({ persistence, namespace }).boot();
  assert.equal(second.projects.get(project.id).name, 'GitHub Only App');
  assert.equal(second.projects.readFile(project.id, 'index.html').content, '<h1>alive</h1>');
  assert.equal(second.shellManager.listMounted().length, 1);
});
