import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSynthia } from './helpers.mjs';

test('resolved DNA drives Base shape, Arc-3 juxtaposition, boundaries, traversal, channels, and neural organs', async (t) => {
  const fixture = await configuredSynthia('dna-perception-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  // Pin one dimension so the canonical 47-64 channel is actually complete.
  synthia.semanticGenome.registerAgentChart('synthia', {
    replace: true,
    primaryDimension: 'Being',
    primaryPlanetary: 1,
    placements: [
      { planetary: 1, dimension: 'Being', gate: 64, line: 2, color: 3, tone: 4, base: 2, degree: 7, minute: 8, second: 9, arc: 10, zodiac: 11, house: 12 },
      { planetary: 2, dimension: 'Being', gate: 47, line: 5, color: 2, tone: 3, base: 4, degree: 6, minute: 7, second: 8, arc: 9, zodiac: 10, house: 11 },
    ],
  });

  const first = synthia.semanticGenome.activate('first native perception', {
    agentId: 'synthia',
    personId: 'dna-perception-person',
    address: {
      planetary: 1,
      dimension: 'Being',
      gate: 64,
      line: 2,
      color: 3,
      tone: 4,
      base: 2,
      degree: 7,
      minute: 8,
      second: 9,
      arc: 10,
      zodiac: 11,
      house: 12,
    },
  });

  await synthia.dnaPerception.flush();
  const firstObserved = synthia.dnaPerception.latest('synthia');
  assert.equal(firstObserved.sourceActivationId, first.id);
  assert.equal(firstObserved.status, 'WIRED');
  assert.equal(firstObserved.shape.source, 'base');
  assert.equal(firstObserved.shape.base, 2);
  assert.equal(firstObserved.shape.formStateId, 'base-form:2');
  assert.equal(firstObserved.shape.exactGeometry, null);
  assert.equal(firstObserved.arc.operator.value, 3);
  assert.equal(firstObserved.arc.operator.operation, 'juxtaposition');
  assert.equal(firstObserved.arc.color.positions, 9);
  assert.equal(firstObserved.arc.sound.positions, 9);
  assert.equal(firstObserved.arc.crossProductAssumed, false);
  assert.equal(firstObserved.boundaries.beginning.system, 'zodiac');
  assert.equal(firstObserved.boundaries.beginning.role, 'beginning');
  assert.equal(firstObserved.boundaries.end.system, 'house');
  assert.equal(firstObserved.boundaries.end.role, 'end');
  assert.equal(firstObserved.traversal.type, 'Origin');
  assert.ok(firstObserved.channels.activeGates.includes(47));
  assert.ok(firstObserved.channels.activeGates.includes(64));
  assert.ok(firstObserved.channels.completedChannels.includes('47-64'));
  assert.ok(firstObserved.channels.firingChannels.includes('47-64'));
  assert.ok(firstObserved.neural.humanDesignGNN);
  assert.ok(firstObserved.neural.connectionField);
  assert.ok(firstObserved.neural.generativeChannelField);
  assert.ok(firstObserved.neural.neuralArchitecture.length >= 1);

  const neuralBefore = synthia.channelBody.snapshot().resolvedNeuralActivations;
  const second = synthia.semanticGenome.activate('same-layer mutation', {
    agentId: 'synthia',
    personId: 'dna-perception-person',
    address: {
      ...first.address,
      base: 5,
    },
  });
  await synthia.dnaPerception.flush();
  const secondObserved = synthia.dnaPerception.latest('synthia');
  assert.equal(secondObserved.sourceActivationId, second.id);
  assert.equal(secondObserved.shape.base, 5);
  assert.equal(secondObserved.shape.formStateId, 'base-form:5');
  assert.equal(secondObserved.traversal.type, 'Movement');
  assert.equal(secondObserved.traversal.vertical.operator, 'Movement');
  assert.equal(secondObserved.traversal.horizontal.operator, 'Being');
  assert.equal(secondObserved.traversal.dimensionReconfigured, false);
  assert.ok(synthia.channelBody.snapshot().resolvedNeuralActivations > neuralBefore);

  const third = synthia.semanticGenome.activate('cross-layer mutation', {
    agentId: 'synthia',
    personId: 'dna-perception-person',
    address: {
      ...second.address,
      dimension: 'Movement',
    },
  });
  await synthia.dnaPerception.flush();
  const thirdObserved = synthia.dnaPerception.latest('synthia');
  assert.equal(thirdObserved.sourceActivationId, third.id);
  assert.equal(thirdObserved.traversal.type, 'Movement');
  assert.equal(thirdObserved.traversal.fromDimension, 'Being');
  assert.equal(thirdObserved.traversal.toDimension, 'Movement');
  assert.equal(thirdObserved.traversal.dimensionReconfigured, true);

  const snapshot = synthia.dnaPerception.snapshot();
  assert.equal(snapshot.status, 'WIRED');
  assert.equal(snapshot.failures, 0);
  assert.equal(snapshot.canon.baseRole, 'shape-form');
  assert.equal(snapshot.canon.arc.value, 3);
  assert.equal(snapshot.canon.arc.operation, 'juxtaposition');
});
