import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSynthia } from './helpers.mjs';

test('twenty-task sequence closes the autonomy and mesh-of-meshes audit loop', async (t) => {
  const fixture = await configuredSynthia('twenty-task-person', { successInterval: 10 });
  t.after(fixture.cleanup);
  const { synthia } = fixture;
  const routes = [
    ['hello there', 'communicate'],
    [{ name: 'one.json', content: '{"n":1}' }, 'compute'],
    ['compose these elements into a structure', 'compose_structure'],
    ['reframe this as an analogy', 'reframe'],
    ['modify this external grammar', 'modify'],
    ['recover from this error', 'resolve_error'],
  ];
  for (const [task, intentType] of routes) {
    await synthia.system.route(task, { personId: 'twenty-task-person', intentType });
  }

  for (let index = 0; index < 3; index++) {
    const failure = await synthia.system.executeArtifact(
      { name: `recurring-${index}.json`, content: '{broken json' },
      { personId: 'twenty-task-person' },
    );
    assert.equal(failure.ok, false);
  }
  const synthesis = await synthia.system.toolSynthesizer.checkTrigger({ intentType: 'compute' });
  assert.equal(synthesis.triggered, true);
  assert.equal(synthesis.validated, true);

  for (let index = 0; index < 10; index++) {
    const success = await synthia.system.executeArtifact(
      { name: `clean-${index}.json`, content: JSON.stringify({ index }) },
      { personId: 'twenty-task-person' },
    );
    assert.equal(success.ok, true);
  }
  const chat = await synthia.chat('Continue with the integrated organism.', { personId: 'twenty-task-person' });
  assert.equal(chat.ok, true);

  const audit = synthia.wiringAudit();
  const required = [
    'executionAddressResolver', 'chatPipeline', 'primitiveSystemPromoted',
    'intentOrchestrator', 'toolSynthesizer', 'successFeedback', 'autonomyLoop',
    'observationEngine', 'proposalLedger', 'chartTiming', 'deletionGuard',
    'rollbackGuarantee', 'meshOfMeshes', 'crossMeshContextConsumption',
    'localMeshCoordination', 'independentHands', 'oneSemanticEngine',
  ];
  assert.equal(audit.ok, true);
  for (const field of required) assert.equal(audit[field], true, field);
  assert.equal(synthia.system.scientist.dashboard().experiments >= 20, true);
});
