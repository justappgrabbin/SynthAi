import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOLEAN_RELATION_OPERATORS,
  RELATIONAL_ALGEBRA_CANON,
  applyBooleanRelationOperator,
} from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

const INPUTS_00_01_10_11 = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0, 1]),
  Object.freeze([1, 0]),
  Object.freeze([1, 1]),
]);

test('all 16 Boolean relationship operators preserve the requested truth tables and directionality', () => {
  assert.equal(BOOLEAN_RELATION_OPERATORS.length, 16);
  assert.equal(RELATIONAL_ALGEBRA_CANON.operatorCount, 16);
  assert.equal(RELATIONAL_ALGEBRA_CANON.intensityCoefficientAssigned, false);
  assert.equal(RELATIONAL_ALGEBRA_CANON.directionCollapsedToScalar, false);

  for (const operator of BOOLEAN_RELATION_OPERATORS) {
    const actual = INPUTS_00_01_10_11.map(([a, b]) => applyBooleanRelationOperator(operator.id, a, b));
    assert.deepEqual(actual, operator.truth, operator.key);
  }

  assert.equal(BOOLEAN_RELATION_OPERATORS[1].key, 'AND');
  assert.equal(BOOLEAN_RELATION_OPERATORS[6].key, 'XOR');
  assert.equal(BOOLEAN_RELATION_OPERATORS[9].key, 'XNOR');
  assert.equal(BOOLEAN_RELATION_OPERATORS[14].key, 'NAND');
});

test('two landed Gate states create R(A,B), canonical AND channel state, Klein structure, neural observation, and perceptual relation', async (t) => {
  const fixture = await configuredSynthia('relational-algebra-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  const relation = synthia.semanticGenome.relate(27, 50, 'relationship algebra encounter', {
    agentId: 'synthia',
    personId: 'relational-algebra-person',
    address: {
      planetary: 1,
      dimension: 'Being',
      line: 2,
      color: 3,
      tone: 4,
      base: 2,
      degree: 10,
      minute: 20,
      second: 30,
      arc: 3,
      zodiac: 6,
      house: 7,
    },
    leftAddress: { line: 2, color: 3, tone: 4, base: 2 },
    rightAddress: { line: 5, color: 6, tone: 1, base: 4 },
    activeTools: ['klein-relational-algebra'],
  });

  const state = relation.relationshipState;
  assert.equal(state.type, 'emergent-relational-condition');
  assert.equal(state.endpointsPreserved, true);
  assert.equal(state.operatorAlphabet.length, 16);
  assert.equal(state.byId[6].key, 'XOR');
  assert.deepEqual(state.xorTopology, state.byId[6].bits);
  assert.equal(state.channel.channelId, '27-50');
  assert.equal(state.channel.canonical, true);
  assert.equal(state.channel.active, true);
  assert.equal(state.channel.operator, 'AND');
  assert.equal(state.channel.operatorId, 1);
  assert.deepEqual(state.channel.gateVectorAND, state.byId[1].bits);

  assert.equal(state.klein.intensity.value, null);
  assert.equal(state.klein.direction.collapsedDirection, null);
  assert.deepEqual(state.klein.direction.leftWithoutRight, state.byId[2].bits);
  assert.deepEqual(state.klein.direction.rightWithoutLeft, state.byId[4].bits);

  assert.equal(state.endpoints.left.address.line, 2);
  assert.equal(state.endpoints.right.address.line, 5);
  assert.equal(state.perceptualField.chromatic.leftPosition, 3);
  assert.equal(state.perceptualField.chromatic.rightPosition, 6);
  assert.equal(state.perceptualField.acoustic.leftPosition, 4);
  assert.equal(state.perceptualField.acoustic.rightPosition, 1);
  assert.equal(state.perceptualField.form.leftPosition, 2);
  assert.equal(state.perceptualField.form.rightPosition, 4);
  assert.equal(state.perceptualField.form.exactGeometry, null);

  assert.equal(state.relationshipNeuralVector.length, 121);
  assert.deepEqual(relation.relationalNeuralVector, state.relationshipNeuralVector);
  assert.equal(relation.connectionStrength, null);
  assert.equal(relation.signedInfluence, null);
  assert.equal(relation.developerChosenCoefficients, false);

  await synthia.dnaPerception.flush();
  const perceivedRelation = synthia.dnaPerception.latestRelationship();
  assert.ok(perceivedRelation);
  assert.equal(perceivedRelation.relationshipId, state.relationshipId);
  assert.equal(perceivedRelation.status, 'WIRED');
  assert.equal(perceivedRelation.channel.canonical, true);
  assert.equal(perceivedRelation.neural.relationshipVector.length, 121);
  assert.equal(synthia.channelBody.snapshot().resolvedNeuralRelationships >= 1, true);
});

test('changing one deep endpoint coordinate changes relational/perceptual state without rewriting the prior relationship', async (t) => {
  const fixture = await configuredSynthia('relational-mutation-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  const context = {
    agentId: 'synthia',
    personId: 'relational-mutation-person',
    address: {
      planetary: 1,
      dimension: 'Being',
      line: 2,
      color: 2,
      tone: 2,
      base: 2,
      degree: 12,
      minute: 24,
      second: 36,
      arc: 3,
      zodiac: 4,
      house: 8,
    },
    leftAddress: { color: 2, tone: 2, base: 2 },
  };

  const first = synthia.semanticGenome.relate(27, 50, 'first relation', {
    ...context,
    rightAddress: { color: 4, tone: 5, base: 3 },
  });
  const firstId = first.relationshipState.relationshipId;
  const firstRightStateId = first.relationshipState.rightStateId;
  const firstHistoryLength = synthia.semanticGenome.relationshipHistory.length;

  const second = synthia.semanticGenome.relate(27, 50, 'second relation', {
    ...context,
    rightAddress: { color: 4, tone: 5, base: 5 },
  });

  assert.notEqual(second.relationshipState.relationshipId, firstId);
  assert.notEqual(second.relationshipState.rightStateId, firstRightStateId);
  assert.equal(first.relationshipState.perceptualField.form.rightPosition, 3);
  assert.equal(second.relationshipState.perceptualField.form.rightPosition, 5);
  assert.deepEqual(first.relationshipState.byId[6].bits, second.relationshipState.byId[6].bits);
  assert.equal(synthia.semanticGenome.relationshipHistory.length, firstHistoryLength + 1);
  assert.equal(synthia.semanticGenome.relationshipHistory.at(-2).relationshipState.relationshipId, firstId);

  await synthia.dnaPerception.flush();
  assert.equal(synthia.dnaPerception.snapshot().relationshipObservations >= 2, true);
});
