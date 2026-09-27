import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FederatedSynthia,
  SynthiaRoleResolver,
  SovereignStateSpaceRuntime,
  centersForGate,
} from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

test('Synthia selects package roles while every role remains cultivation', () => {
  const resolver = new SynthiaRoleResolver();
  assert.equal(resolver.forms().length, 4);
  assert.ok(resolver.forms().every((role) => role.identity === 'Synthia' && role.purpose === 'cultivation'));
  assert.equal(resolver.resolve('hello, let us talk').primary, 'relational-organism');
  assert.equal(resolver.resolve({ appId: 'gamegan', input: {} }).primary, 'execution-organ');
  assert.equal(resolver.resolve({ operation: 'water', text: 'learn this' }).primary, 'cultivation-learning');
  assert.equal(resolver.resolve({ operation: 'predict', gate: 25 }).primary, 'state-space-browser');
  const explicit = resolver.resolve('ordinary conversation', { synthiaRole: 'state-space' });
  assert.equal(explicit.primary, 'state-space-browser');
  assert.equal(explicit.explicit, true);
  const compound = resolver.resolve('execute this state-space prediction');
  assert.equal(compound.primary, 'execution-organ');
  assert.ok(compound.contributors.includes('state-space-browser'));
});

test('all supplied state-space source modules and knowledge files are live instruments', async () => {
  const runtime = new SovereignStateSpaceRuntime();
  assert.equal(runtime.manifest().executableSourceModules, 103);
  assert.equal(runtime.manifest().knowledgeSources, 30);
  assert.ok(runtime.manifest().knowledgeCharacters > 1_000_000);
  for (const instrument of runtime.moduleInstruments) {
    const inspection = await runtime.runInstrument(instrument.id, {});
    assert.ok(inspection.exports.length > 0, instrument.id);
  }
  const gateBits = await runtime.runInstrument('kimi-module:state-space:addressing', {
    member: 'gateBits', args: [1],
  });
  assert.deepEqual(gateBits, [1, 1, 1, 1, 1, 1]);
  assert.ok(runtime.searchKnowledge('state space', { limit: 3 }).length > 0);
  const chart = runtime.normalizeChart({
    placements: [
      { planet: 'A', gate: 12 },
      { planet: 'B', gate: 22 },
      { planet: 'C', gate: 39 },
      { planet: 'D', gate: 55 },
    ],
  });
  assert.equal(chart.placements.find((entry) => entry.gate === 22).center, 'Solar Plexus');
  assert.equal(chart.placements.find((entry) => entry.gate === 39).center, 'Root');
  assert.ok(chart.channels.includes('12-22'));
  assert.ok(chart.channels.includes('39-55'));
});

test('five levels, nine centers, living loop, chart, and registered state-space app execute in the organism', async (t) => {
  const fixture = await configuredSynthia('state-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;
  assert.deepEqual(centersForGate(16), ['Throat']);
  assert.deepEqual(centersForGate(48), ['Spleen']);
  assert.deepEqual(centersForGate(22), ['Solar']);
  assert.deepEqual(centersForGate(39), ['Root']);
  assert.deepEqual(centersForGate(29), ['Sacral']);

  const levels = await synthia.morph({ operation: 'five-levels', gate: 1 }, { personId: 'state-person' });
  assert.equal(levels.roleResolution.primary, 'state-space-browser');
  assert.deepEqual(levels.fiveLevelProjection.map((level) => level.level), ['Movement', 'Evolution', 'Being', 'Design', 'Space']);
  assert.equal(levels.federation.execution.receipt.consumed, true);
  assert.ok(levels.federation.channelFlow.every((entry) => entry.intake.receipt.consumed && entry.delivery.receipt.consumed));

  const prediction = await synthia.predict({ ben: 25, lines: [7, 7, 7, 9, 7, 7] }, {}, { personId: 'state-person' });
  assert.ok(prediction.output.output.successors.length > 0);
  assert.match(prediction.output.output.disclaimer, /mechanism, not oracle/i);

  const tick = await synthia.tick({ personId: 'state-person' });
  assert.equal(tick.output.operation, 'tick');

  const chart = await synthia.chart('1990-01-01', '12:00', 'New York', { personId: 'state-person' });
  assert.ok(chart.output.output.chart.placements.length > 0);
  assert.ok(Array.isArray(chart.output.output.activeChannels));
  assert.ok(chart.output.output.chart.placements.every((entry) => entry.center));
  assert.equal(chart.output.output.chart.gateCenterProvider, 'injected-human-design-provider');

  const application = await synthia.executeArtifact({
    appId: 'synthia-sovereign',
    input: { operation: 'predict', state: { ben: 25, lines: [7, 7, 7, 9, 7, 7] } },
  }, { personId: 'state-person' });
  assert.equal(application.ok, true);
  assert.equal(application.strategy, 'internal');
  assert.equal(application.bridgeUsed, false);
  assert.equal(application.backendUsed, false);
  assert.equal(application.appId, 'synthia-sovereign');
  assert.equal(application.result.returnValue.operation, 'predict');

  const audit = synthia.wiringAudit();
  assert.equal(audit.ok, true);
  assert.equal(audit.localMeshes, 51);
  assert.equal(audit.federation.links, 2550);
  assert.equal(audit.centerBody.centers, 9);
  assert.equal(audit.stateSpaceSourceModules, true);
  assert.equal(audit.stateSpaceKnowledgeLoaded, true);
  assert.equal(audit.synthiaRoleResolver, true);
  assert.equal(audit.allSynthiaIsCultivation, true);
  assert.equal(audit.liveProcessCount, 115);
});

test('36 channel meshes coordinate four neural organs through dimension-relative interactions', async () => {
  const synthia = await FederatedSynthia.create();
  const snapshot = synthia.channelBody.snapshot();
  assert.equal(snapshot.channelMeshes, 36);
  assert.equal(snapshot.canonicalChannels, 36);
  assert.equal(snapshot.gateNodes, 64);
  assert.equal(snapshot.graphSageLayers, 3);
  assert.equal(snapshot.neuralOrgans, 4);
  assert.deepEqual(snapshot.baseNeuralForms, ['mlp', 'conv1d-net', 'rnn-net', 'attention-net']);
  assert.equal(snapshot.neuralArchitectureFamilies, 36);
  assert.equal(snapshot.mappedNeuralAnalogues, 35);
  assert.deepEqual(snapshot.unresolvedNeuralAnalogues, ['19-49']);
  assert.equal(snapshot.channels.find((channel) => channel.id === '10-34').name, 'Exploration');
  assert.equal(snapshot.channels.find((channel) => channel.id === '10-57').name, 'Perfected Form');
  assert.equal(snapshot.channels.find((channel) => channel.id === '20-57').name, 'Brainwave');
  assert.equal(snapshot.dimensionalInteractionLevels, 5);
  assert.equal(snapshot.dimensionalInteractionStatus, 'PROJECT_HYPOTHESIS');
  assert.equal(snapshot.differentiationPointStatus, 'OPEN_QUESTION');
  assert.equal(snapshot.fixedDifferentiationBoundaries, false);
  assert.equal(snapshot.channelRelationModel.name, 'opposite-equivalent');
  assert.equal(snapshot.channelRelationModel.scope, 'higher-order-channel-composite');
  assert.equal(snapshot.channelRelationModel.emergesAfter, 'distinct-gate-primitives-compose');
  assert.equal(snapshot.channelRelationModel.gatePrimitiveEquivalence, false);
  assert.equal(snapshot.channelRelationModel.identicalState, false);
  assert.equal(snapshot.channelRelationModel.globalBinaryComplement, false);
  assert.equal(snapshot.channelRelationModel.canonicalArcAxis, false);
  assert.equal(snapshot.indexedChannelKnowledgeEntries, 360);
  const movementGate16 = synthia.stateSpaceRuntime.stateSpace.node('Movement', 16);
  assert.ok(movementGate16.content.words.some((word) => word.id === 'channel-knowledge:16-48:Movement:gate-16'));

  const wavelength = synthia.channelMeshes['16-48'];
  assert.ok(wavelength);
  for (const node of [
    'gate:16',
    'gate:48',
    'channel-field',
    'perspective-connection-field',
    'generative-channel-field',
    'human-design-gnn',
    'neural-architecture-generator',
  ]) assert.ok(wavelength.nodes.has(node), node);

  const movement = await wavelength.run('channel-field', { ok: true }, {
    address: { gate: 16, line: 3, dimension: 'Movement' },
    relationalContext: {
      observerFrame: {
        birthImprint: 'test-imprint-a',
        currentActivationPattern: 'test-axis-a',
        economicPosition: 'test-flow-a',
        dimensionWeights: { Movement: 1.25 },
      },
    },
  });
  const space = await wavelength.run('channel-field', { ok: true }, {
    address: { gate: 16, line: 3, dimension: 'Space' },
    relationalContext: {
      observerFrame: {
        birthImprint: 'test-imprint-b',
        currentActivationPattern: 'test-axis-b',
        economicPosition: 'test-flow-b',
        dimensionWeights: { Space: 0.75 },
      },
    },
  });
  assert.equal(movement.output.activeDimension, 'Movement');
  assert.equal(space.output.activeDimension, 'Space');
  assert.equal(movement.output.dimensionInteractions.length, 5);
  assert.deepEqual(movement.output.dimensionInteractions.map((entry) => entry.dimension), [
    'Movement', 'Evolution', 'Being', 'Design', 'Space',
  ]);
  assert.deepEqual(movement.output.activeInteraction.chain, ['wait', 'prepare', 'move', 'transition']);
  assert.deepEqual(space.output.activeInteraction.chain, ['witness', 'integrate', 'express', 'complete']);
  assert.notDeepEqual(movement.output.activeInteraction.result, space.output.activeInteraction.result);
  assert.equal(movement.output.neuralIdentityClaim, false);
  assert.equal(movement.output.relationModel.name, 'opposite-equivalent');
  assert.equal(movement.output.dimensionInteractionClaimStatus, 'PROJECT_HYPOTHESIS');
  assert.equal(movement.output.differentiation.status, 'OPEN_QUESTION');
  assert.equal(movement.output.differentiation.threshold, null);
  assert.equal(movement.output.differentiation.fixedBoundaries, false);
  assert.equal(movement.output.differentiation.dimensionPairs.length, 10);
  assert.equal(movement.output.differentiation.networkTransitions.length, 5);
  assert.equal(movement.output.differentiation.networkTransitions[0].transitions.length, 3);
  assert.ok(movement.output.differentiationQuestionId);
  assert.equal(space.output.differentiationQuestionId, movement.output.differentiationQuestionId);
  assert.equal(synthia.channelBody.snapshot().differentiationQuestions, 1);
  assert.ok(synthia.system.scientist.questions.has(movement.output.differentiationQuestionId));
});

test('validated synthesized tools rise into their addressed center mesh and roll back cleanly', async () => {
  const synthia = await FederatedSynthia.create();
  for (let index = 1; index <= 3; index++) {
    synthia.system.intent.gaps.push({
      id: `center-emergence-gap-${index}`,
      intentType: 'compute',
      gapType: 'missing_tool',
      missing: ['center-emergence-capability'],
      request: `cultivate center tool ${index}`,
    });
  }
  const result = await synthia.system.toolSynthesizer.checkTrigger({ intentType: 'compute' });
  assert.equal(result.validated, true);
  assert.deepEqual(result.mounted.bodyMount.centers, ['Throat']);
  assert.deepEqual(result.mounted.bodyMount.scalePath, ['bit', 'byte', 'structure', 'artifact', 'automaton']);
  assert.equal(result.mounted.bodyMount.fiveLevels.length, 5);
  assert.ok(synthia.centerMeshes.Throat.nodes.has(`grown:${result.mounted.automaton.id}`));
  assert.equal(synthia.centerBody.snapshot().emergentTools.length, 1);

  const rollback = synthia.system.proposals.rollback(result.outboxProposal.id);
  assert.equal(rollback.rolledBack, true);
  assert.equal(synthia.centerMeshes.Throat.nodes.has(`grown:${result.mounted.automaton.id}`), false);
  assert.equal(synthia.centerBody.snapshot().emergentTools.length, 0);
  assert.equal(synthia.centerBody.snapshot().emergenceHistory, 2);
});
