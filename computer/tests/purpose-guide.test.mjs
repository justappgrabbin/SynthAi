import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryPersistence } from '../core/kernel.mjs';
import { MobileComputerRuntime } from '../mobile/MobileComputerRuntime.mjs';

test('Pathways-to-Purpose is a persistent Computer host service routed through the mobile mesh', async () => {
  const persistence = new MemoryPersistence();
  const namespace = `purpose-guide-${Date.now()}`;
  const runtime = await new MobileComputerRuntime({ persistence, namespace }).boot();

  const service = runtime.services.get('purpose-guide');
  assert.ok(service?.provider, 'purpose-guide service is registered by the running Computer');
  assert.equal(runtime.meshKernel.participant('system:purpose-guide')?.residency, 'active');

  const project = await runtime.projects.create({
    name: 'Purpose Route Test',
    description: 'real project state used by the purpose service',
  });

  const roadmap = await runtime.buildPurposeRoadmap({
    userId: 'user:purpose-test',
    goal: 'Publish the working project and learn from the result',
    profile: { strategy: 'Respond', authority: 'Emotional' },
    currentState: {
      projectId: project.id,
      strengths: ['building'],
      constraints: ['phone-first'],
      requiredCapabilities: ['project-workspace', 'pathways-to-purpose', 'opportunity-routing'],
      opportunities: [{ id: 'supplied-opportunity', source: 'test-runtime-input' }],
    },
  });

  assert.equal(roadmap.focusProject.id, project.id);
  assert.equal(roadmap.phases.length, 6);
  assert.ok(roadmap.capabilityContext.available.includes('project-workspace'));
  assert.ok(roadmap.capabilityContext.available.includes('pathways-to-purpose'));
  assert.ok(roadmap.capabilityContext.missing.includes('opportunity-routing'));

  const persisted = runtime.purposeGuide.getRoadmap('user:purpose-test');
  assert.equal(persisted.id, roadmap.id);

  await runtime.recordPurposeOutcome({
    userId: 'user:purpose-test',
    outcome: {
      action: 'publish-test',
      result: { reachable: true },
      observableEffect: 'test project route produced an observable result',
      evidence: { kind: 'test_run', ref: 'computer/tests/purpose-guide.test.mjs' },
    },
  });

  const restarted = await new MobileComputerRuntime({ persistence, namespace }).boot();
  const restored = restarted.purposeGuide.getRoadmap('user:purpose-test');
  assert.equal(restored.id, roadmap.id);
  assert.equal(restored.outcomes.length, 1, 'outcome survives Computer restart');
  assert.equal(restored.outcomes[0].result.reachable, true);

  const events = await restarted.events.forEntity('user:purpose-test');
  assert.ok(events.some(event => event.observable_effect?.includes('roadmap persisted')));
  assert.ok(events.some(event => event.observable_effect === 'test project route produced an observable result'));
});

test('Pathways-to-Purpose surfaces missing goal instead of fabricating one', async () => {
  const runtime = await new MobileComputerRuntime({ persistence: new MemoryPersistence(), namespace: `purpose-fail-${Date.now()}` }).boot();
  await assert.rejects(
    () => runtime.buildPurposeRoadmap({ userId: 'user:no-goal' }),
    /requires goal/,
  );
});
