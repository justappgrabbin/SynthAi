import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

test('everything accepted by Synthia is automatically registered', async () => {
  const c = await new ComputerRuntime().boot();
  await c.autoRegistrar.flush();

  const artifact = await c.intake.ingest({
    name: 'touch-me.html',
    text: '<main>Synthia touched this</main>',
    type: 'text/html',
    source: 'test'
  });

  c.tools.register('native-tool', {
    description: 'tool accepted directly into the Computer',
    capabilities: ['inspect', 'transform']
  });

  const project = await c.projects.create({ name: 'Auto Registered Project' });
  await c.projects.writeFile(project.id, 'index.html', '<h1>registered</h1>', { type: 'text/html' });

  await c.autoRegistrar.flush();

  const artifactRegistration = c.autoRegistrar.get('artifact', artifact.id);
  assert.ok(artifactRegistration);
  assert.equal(artifactRegistration.identity, artifact.id);
  assert.equal(artifactRegistration.location, artifact.path);

  const toolRegistration = c.autoRegistrar.get('tool', 'native-tool');
  assert.ok(toolRegistration);
  assert.deepEqual(toolRegistration.capabilities, ['inspect', 'transform']);

  assert.ok(c.autoRegistrar.get('project', project.id));
  assert.ok(c.autoRegistrar.get('file', `${project.id}:index.html`));

  const persisted = c.state.get('registrations.entries', {});
  assert.ok(Object.keys(persisted).length >= 4);
});

test('direct accepted resources receive an identity immediately', async () => {
  const c = await new ComputerRuntime().boot();
  const registration = c.registerAccepted({
    kind: 'sandbox-output',
    identity: 'prototype-001',
    status: 'VERIFIED',
    origin: { source: 'synthia-sandbox' },
    capabilities: ['launchable'],
    location: '/sandbox/prototype-001'
  });
  await c.autoRegistrar.flush();

  assert.equal(registration.key, 'sandbox-output:prototype-001');
  assert.equal(c.autoRegistrar.get('sandbox-output', 'prototype-001').status, 'VERIFIED');
});
