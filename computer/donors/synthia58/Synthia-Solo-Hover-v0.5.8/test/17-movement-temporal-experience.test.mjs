import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FederatedSynthia,
  MOVEMENT_TRANSPORT_CANON,
  movementPath,
  transportMovementValue,
  transportGateMovement,
  TEMPORAL_EXPERIENCE_CANON,
} from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

test('Movement transports one numeric identity through binary, decimal, and hex in both directions', () => {
  assert.deepEqual(MOVEMENT_TRANSPORT_CANON.order, ['binary', 'decimal', 'hex']);
  assert.equal(MOVEMENT_TRANSPORT_CANON.preservesNumericIdentity, true);
  assert.deepEqual(movementPath('binary', 'hex'), ['binary', 'decimal', 'hex']);
  assert.deepEqual(movementPath('hex', 'binary'), ['hex', 'decimal', 'binary']);

  const up = transportMovementValue({ value: '01000001', from: 'binary', to: 'hex', binaryWidth: 8, hexWidth: 2 });
  assert.equal(up.numericIdentity, 65);
  assert.equal(up.states[0].value, '01000001');
  assert.equal(up.states[1].value, 65);
  assert.equal(up.states[2].value, '41');
  assert.equal(up.identityPreserved, true);
  assert.equal(up.roundTripPreserved, true);

  const down = transportMovementValue({ value: '41', from: 'hex', to: 'binary', binaryWidth: 8, hexWidth: 2 });
  assert.equal(down.numericIdentity, 65);
  assert.equal(down.states[1].value, 65);
  assert.equal(down.states[2].value, '01000001');
  assert.equal(down.identityPreserved, true);

  const gate = transportGateMovement(27, { direction: 'up' });
  assert.equal(gate.path.join('>'), 'binary>decimal>hex');
  assert.equal(gate.gateIdentityPreserved, true);
  assert.equal(gate.output.numericIdentity, gate.topology.decimal);
});

test('first visit to an unlanded past coordinate fixes that historical state and later visits return it unchanged', async (t) => {
  const fixture = await configuredSynthia('temporal-person');
  t.after(fixture.cleanup);
  const { synthia, persistenceDir } = fixture;

  await synthia.chat('establish current experience before visiting the past', { personId: 'temporal-person' });

  const request = {
    personId: 'temporal-person',
    date: '1990-09-18',
    time: '21:34:00',
    place: {
      label: 'San Francisco, California',
      latitude: 37.7749,
      longitude: -122.4194,
      timeZone: 'America/Los_Angeles',
    },
    dimension: 'Being',
    planetary: 1,
  };

  const first = await synthia.visitPast(request);
  assert.equal(first.visit.firstVisit, true);
  assert.equal(first.visit.recalled, false);
  assert.equal(first.visit.state.landed, true);
  assert.ok(first.visit.state.firstVisitContext.experience.stateIds.length > 0);
  const historicalStateId = first.visit.state.historicalStateId;
  const firstVisitContext = structuredClone(first.visit.state.firstVisitContext);

  await synthia.chat('accumulate another present experience after the historical landing', { personId: 'temporal-person' });

  const second = await synthia.visitPast(request);
  assert.equal(second.visit.firstVisit, false);
  assert.equal(second.visit.recalled, true);
  assert.equal(second.visit.state.historicalStateId, historicalStateId);
  assert.deepEqual(second.visit.state.firstVisitContext, firstVisitContext);

  const sourceChart = synthia.semanticGenome.chartForAgent('synthia');
  synthia.semanticGenome.registerAgentChart('mesh-peer', {
    primaryDimension: sourceChart.primaryDimension,
    primaryPlanetary: sourceChart.primaryPlanetary,
    personalitySun: sourceChart.originAddress,
    filterIntersections: sourceChart.filterIntersections,
    replace: true,
    reset: true,
  });
  const peerVisit = synthia.semanticGenome.visitHistoricalMoment({
    agentId: 'mesh-peer',
    coordinate: first.coordinate,
    calculatedAddress: first.address,
    context: { source: 'mesh-peer-test' },
  });
  assert.equal(peerVisit.firstVisit, true);
  assert.equal(peerVisit.state.meshEvidence.exact.length, 1);
  assert.equal(peerVisit.state.meshEvidence.exact[0].historicalStateId, historicalStateId);

  const mesh = synthia.temporalMesh({ coordinate: first.coordinate, targetAddress: first.address });
  assert.equal(mesh.exact.length, 2);
  assert.equal(mesh.exactSharedQualities.traces, 2);
  assert.ok(mesh.exactSharedQualities.colors.length >= 1);
  assert.ok(mesh.exactSharedQualities.tones.length >= 1);
  assert.ok(mesh.exactSharedQualities.bases.length >= 1);

  const superposition = synthia.superimposePast({
    personId: 'temporal-person',
    coordinates: [first.coordinate],
    context: { surface: 'morph-input' },
  });
  assert.equal(superposition.componentsRemainDistinct, true);
  assert.equal(superposition.historical.length, 1);
  assert.equal(superposition.historical[0].historicalStateId, historicalStateId);
  assert.ok(superposition.perceptualField.colorPositions.length >= 2);
  assert.ok(superposition.perceptualField.tonePositions.length >= 2);
  assert.ok(superposition.perceptualField.basePositions.length >= 2);
  assert.equal(synthia.dnaPerception.latestTemporal().sourceSuperpositionId, superposition.id);

  await synthia.flushPersistence();
  const restored = await FederatedSynthia.create({ persistenceDir });
  assert.equal(restored.semanticGenome.temporalExperience.snapshot().landedHistoricalStates, 2);
  assert.equal(restored.semanticGenome.temporalExperience.snapshot().meshTraces, 2);
  const recalledAfterRestart = restored.semanticGenome.recallHistoricalMoment({
    agentId: 'synthia',
    coordinate: first.coordinate,
  });
  assert.equal(recalledAfterRestart.historicalStateId, historicalStateId);
});

test('experiential mesh accepts transferable structural traces without changing a personal landing', () => {
  assert.equal(TEMPORAL_EXPERIENCE_CANON.firstVisitLandsState, true);
  assert.equal(TEMPORAL_EXPERIENCE_CANON.landedPastStateIsStable, true);
  assert.equal(TEMPORAL_EXPERIENCE_CANON.meshDoesNotReplacePersonalLanding, true);
});
