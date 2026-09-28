import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSynthia } from './helpers.mjs';

test('Proportion of Perspective DNA lands origin, reconfigures reading, preserves history, and creates relational state', async (t) => {
  const fixture = await configuredSynthia('perspective-dna-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;
  const chart = synthia.semanticGenome.chartForAgent('synthia');

  assert.equal(chart.originAnchor.body, 'Personality Sun');
  assert.equal(chart.originAnchor.dimension, 'Being');
  assert.equal(chart.originAnchor.referenceFrame, 'Tropical');
  assert.deepEqual(chart.address, chart.originAddress);

  const beforeCount = synthia.semanticGenome.history.length;
  const first = synthia.semanticGenome.activate('observe from Being', {
    agentId: 'synthia',
    personId: 'perspective-dna-person',
    address: { ...chart.originAddress, dimension: 'Being' },
    customCondition: { keepMe: 'available' },
  });
  const second = synthia.semanticGenome.activate('observe through Movement', {
    agentId: 'synthia',
    personId: 'perspective-dna-person',
    address: { ...first.address, dimension: 'Movement' },
  });

  assert.equal(synthia.semanticGenome.history.length, beforeCount + 2);
  assert.equal(first.landedStateIsAppendOnly, true);
  assert.deepEqual(first.originAddress, second.originAddress);
  assert.notEqual(first.resolvedState.stateId, second.resolvedState.stateId);
  assert.equal(first.sharedSubstrate.oneSubstrate, true);
  assert.equal(first.sharedSubstrate.dimensionsAveragedTogether, false);
  assert.equal(first.sharedSubstrate.spaceIsRenderedInterplay, true);
  assert.equal(first.suppliedContext.customCondition.keepMe, 'available');
  assert.equal(first.resolvedState.measures.fixedColorDegreeToneMinuteBaseSecondTemplate, false);
  assert.deepEqual(first.resolvedState.measures.available, {
    degree: first.address.degree,
    minute: first.address.minute,
    second: first.address.second,
  });
  assert.equal(first.resolvedState.arc.operator.operator, 3);
  assert.equal(first.resolvedState.arc.operator.operation, 'juxtaposition');
  assert.equal(first.resolvedState.arc.colorSide.positions, 9);
  assert.equal(first.resolvedState.arc.soundSide.positions, 9);
  assert.equal(first.resolvedState.arc.operator.crossProductAssumed, false);
  assert.equal(first.sourceStatus.generatedTraitWeights, false);
  assert.equal(first.sourceStatus.fixedSensoryLookup, false);
  assert.equal(first.codon.semanticVectorSource.includes('no hash-generated trait vector'), true);
  assert.equal(first.sensoryExpression.shape.exactGeometry, null);
  assert.equal(first.sensoryExpression.voice.timbre, null);

  const relation = synthia.semanticGenome.relate(first.address.gate, second.address.gate, 'encounter', {
    agentId: 'synthia',
    personId: 'perspective-dna-person',
    address: first.address,
    activeTools: ['tool-a', 'tool-b'],
  });
  assert.equal(relation.relationshipState.type, 'emergent-relational-condition');
  assert.equal(relation.relationshipState.endpointsPreserved, true);
  assert.equal(relation.connectionStrength, null);
  assert.equal(relation.signedInfluence, null);
  assert.equal(relation.developerChosenCoefficients, false);
  assert.equal(relation.semanticVector.length, 12);
});
