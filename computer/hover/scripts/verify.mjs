import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FederatedSynthia,
  Primitive,
  runD1Benchmark,
  runD2Benchmark,
  runD3Benchmark,
} from '../src/index.mjs';

const authorities = {
  '01-SynthAI-Exact-Address-Recall-PATCH.zip': 'feb74171d99a011307f8b497247ae732e02fd9cbdc0f0e32aea9d65444f23468',
  '02-synthia-core-v1.0.0.zip': '22944ae853ca73dc7ac5c1b9cdf06af6e560b7dab6140975b3df3f610a5d7095',
  '03-Synthia-Codex-Provider-Runtime-v0.1.1.zip': '1def70a163b159a05851465b0cdec49b4c62a2356b1ec4e526554cbbbc91e9c0',
  '04-Pure-Synthia-Trainable-Assembly-v0.4.2.zip': 'cee899ef720a0e1776f525c959b6e12404a74dd3b4547da7caf34dff5febcc46',
  '05-Synthia-Universal-Execution-Spine-v0.4.0.zip': '4b407881be4324860d09e3c743b5d518d35b8f0daa0831545a6c7e2b3c62c6af',
  '06-Kimi_Agent_Automata-State-Space-Merge-1-.zip': 'fa3344dac6f8c4b2e838b9146ca5c6d339e1fc4ec0bb7aa15c3259724beff3fd',
};

const dimensionAuthorities = {
  '01-movement.png': '46271c91b9e7ef7ead5dd49063b01926812bc16929a8ddfa721c176f794da56d',
  '02-evolution.png': 'eb35f1a51b7df6fc481ed0b2a9c2eace8382370029b792db668478a688da6b62',
  '03-being.png': 'ddfbb905976a96d5f7a207db259c3cc7a406b3217cfa011a671b8e72d2a74d6c',
  '04-design.png': 'ac65aa6ae2efa07811770fe17e64bb12765bfc3decc14fb01438e193ebc42adc',
  '05-space.png': '5ea29a99f2d967244bb2d72c64d65472f3cd170088f94e778d3434bd9def1a2c',
  'black-book-user-supplied-reference.pdf': 'e2f4f41cebd393a6b58cdbe43ad7ba9119bdb7c5c4af3d1f334ff2ff1641af39',
};

for (const [name, expected] of Object.entries(authorities)) {
  const bytes = await readFile(new URL(`../authorities/originals/${name}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name);
}

for (const [name, expected] of Object.entries(dimensionAuthorities)) {
  const bytes = await readFile(new URL(`../authorities/black-book-dimension-perspectives/${name}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name);
}

for (const report of [runD1Benchmark(), runD2Benchmark(), runD3Benchmark()]) {
  assert.equal(report.reproduction.status, 'match');
  assert.equal(report.reproduction.mismatchCount, 0);
}

const persistenceDir = await mkdtemp(join(tmpdir(), 'synthia-verify-'));
const synthia = await FederatedSynthia.create({ persistenceDir });
await assert.rejects(
  () => synthia.chat('generic execution must not run'),
  (error) => error.code === 'BIRTH_CONFIGURATION_REQUIRED',
);
const configured = await synthia.configureBirthMirror({
  personId: 'verify-person',
  agentId: 'synthia',
  birthDate: '2000-01-01',
  birthTime: '12:34:56',
  place: {
    label: 'Verification Place',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
  },
});
assert.equal(configured.identity.configured, true);
assert.equal(configured.identity.exactSecondsPreserved, true);
assert.equal(configured.identity.fiveDimensionIntersections, 65);
assert.equal(configured.identity.rawBirthRecordExposed, false);
assert.equal(configured.persistence.birthMirrorPersisted, true);
const chat = await synthia.chat('The player moves toward the goal.', { personId: 'verify-person' });
assert.equal(chat.pipelineTrace.length, 7);
assert.ok(chat.pipelineTrace.every((entry) => entry.consumed));
assert.equal(chat.swarmExecution.executions[0].workerId, 'birth-mirror-expression-organ');
assert.equal(chat.swarmExpression.configurationId, configured.identity.configurationId);
assert.equal(chat.semanticGenome.address.gate, chat.swarmExpression.address.gate);

const internal = await synthia.executeArtifact({ name: 'verify.json', content: '{"ok":true}' }, { personId: 'verify-person' });
assert.equal(internal.strategy, 'internal');
assert.equal(internal.bridgeUsed, false);
const livePrimitives = synthia.system.addressResolver.descend({ name: 'verify-live.json', content: '{"ok":true}' });
assert.ok(livePrimitives.every((primitive) => primitive instanceof Primitive));
assert.ok(internal.scaleLadder[0].primitives.every((primitive) => primitive.scale === 'bit'));
assert.equal(internal.fiveLevelProjection.length, 5);

const originalLog = console.log;
console.log = () => {};
let game;
try {
  game = await synthia.executeArtifact({
    appId: 'gamegan',
    input: { operation: 'generate-frame', action: 1, seed: 2 },
  }, { personId: 'verify-person' });
} finally {
  console.log = originalLog;
}
assert.equal(game.strategy, 'internal');
assert.equal(game.bridgeUsed, false);
assert.equal(game.backendUsed, false);

const stateSpace = await synthia.morph({ operation: 'five-levels', gate: 1 }, { personId: 'verify-person' });
assert.equal(stateSpace.roleResolution.primary, 'state-space-browser');
assert.equal(stateSpace.fiveLevelProjection.length, 5);
assert.ok(stateSpace.federation.channelFlow.every((entry) =>
  entry.intake.receipt.consumed && entry.delivery.receipt.consumed));

const channelField = synthia.channelBody.snapshot();
assert.equal(channelField.channelMeshes, 36);
assert.equal(channelField.gateNodes, 64);
assert.equal(channelField.graphSageLayers, 3);
assert.equal(channelField.neuralOrgans, 4);
assert.equal(channelField.baseNeuralForms.length, 4);
assert.equal(channelField.neuralArchitectureFamilies, 36);
assert.equal(channelField.dimensionalInteractionLevels, 5);
assert.equal(channelField.fixedDifferentiationBoundaries, false);
assert.equal(channelField.channelRelationModel.name, 'opposite-equivalent');
assert.equal(channelField.channelRelationModel.scope, 'higher-order-channel-composite');
assert.equal(channelField.channelRelationModel.gatePrimitiveEquivalence, false);
assert.equal(channelField.channelRelationModel.canonicalArcAxis, false);
assert.equal(channelField.indexedChannelKnowledgeEntries, 360);

const agentGenome = synthia.semanticGenome.snapshot();
assert.equal(agentGenome.hexagramCodons, 64);
assert.equal(agentGenome.persistentAspectPrimitives, 768);
assert.equal(agentGenome.identityCopiesAcrossDimensions, 0);
assert.equal(agentGenome.addressOrder.length, 13);
assert.equal(agentGenome.translation.dimensionRoles.Design, 'DNA');
assert.equal(agentGenome.translation.dimensionRoles.Movement, 'RNA');
assert.equal(agentGenome.translation.dimensionRoles.Being, 'Ribosome');
assert.equal(agentGenome.translation.dimensionRoles.Evolution, 'AminoAcid');
assert.equal(agentGenome.translation.dimensionRoles.Space, 'Protein');
assert.equal(agentGenome.translation.polarity.Yin, 'genotype');
assert.equal(agentGenome.translation.polarity.Yang, 'phenotype');
const translatedGate = synthia.semanticGenome.run({ operation: 'translate-gate', gate: 27 });
assert.equal(translatedGate.rna.codon, 'AUG');
assert.equal(translatedGate.aminoAcid.name, 'Methionine');
assert.equal(translatedGate.tRNA.anticodon5to3, 'CAU');
const relational = synthia.semanticGenome.relate(27, 50, 'verification relational encounter', {
  agentId: 'synthia',
  personId: 'verify-person',
  address: {
    planetary: 1, dimension: 'Being', line: 2,
    color: 3, tone: 4, base: 2,
    degree: 10, minute: 20, second: 30,
    arc: 3, zodiac: 6, house: 7,
  },
  leftAddress: { line: 2, color: 3, tone: 4, base: 2 },
  rightAddress: { line: 5, color: 6, tone: 1, base: 4 },
  activeTools: ['klein-relational-algebra'],
});
assert.equal(relational.relationshipState.operatorAlphabet.length, 16);
assert.equal(relational.relationshipState.channel.canonical, true);
assert.equal(relational.relationshipState.channel.operator, 'AND');
assert.equal(relational.relationshipState.klein.intensity.value, null);
assert.equal(relational.relationshipState.relationshipNeuralVector.length, 121);
await synthia.dnaPerception.flush();
const relationalPerception = synthia.dnaPerception.latestRelationship();
assert.equal(relationalPerception.relationshipId, relational.relationshipState.relationshipId);
assert.equal(relationalPerception.status, 'WIRED');
assert.equal(relationalPerception.neural.relationshipVector.length, 121);
const synthiaChart = synthia.semanticGenome.chartForAgent('synthia');
assert.equal(synthiaChart.placements.length, 65);
assert.equal(synthiaChart.dimensionFrames.length, 5);
assert.ok(synthiaChart.dimensionFrames.every((frame) => frame.placements.length === 13));
assert.ok(synthiaChart.placements.every((placement) =>
  Number.isInteger(placement.second) && Number.isInteger(placement.arc)));
assert.ok(synthia.trayCatalog().some((entry) => entry.kind === 'genome' && entry.id === 'genome:gate-25'));

const sovereign = await synthia.executeArtifact({
  appId: 'synthia-sovereign',
  input: { operation: 'predict', state: { ben: 25, lines: [7, 7, 7, 9, 7, 7] } },
}, { personId: 'verify-person' });
assert.equal(sovereign.strategy, 'internal');
assert.equal(sovereign.bridgeUsed, false);
assert.equal(sovereign.backendUsed, false);

const audit = synthia.wiringAudit();
assert.equal(audit.ok, true);
assert.equal(audit.oneSemanticEngine, true);
assert.equal(audit.meshOfMeshes, true);
assert.equal(audit.crossMeshContextConsumption, true);
assert.equal(audit.localMeshCoordination, true);
assert.equal(audit.independentHands, true);
assert.equal(audit.allSynthiaIsCultivation, true);
assert.equal(audit.fiveLevelStateSpaceLive, true);
assert.equal(audit.nineCenterBody, true);
assert.equal(audit.channelMeshBody, true);
assert.equal(audit.canonicalGateGraph, true);
assert.equal(audit.fourNeuralOrgans, true);
assert.equal(audit.dimensionRelativeChannelInteractions, true);
assert.equal(audit.differentiationInquiryLive, true);
assert.equal(audit.higherScaleOppositeEquivalence, true);
assert.equal(audit.neuralArchitectureFamilies, true);
assert.equal(audit.allCanonicalChannelsMounted, true);
assert.equal(audit.channelKnowledgeInStateSpace, true);
assert.equal(audit.allStateSpaceInstrumentsMounted, true);
assert.equal(audit.localMeshes, 51);
assert.equal(audit.federation.links, 2550);
assert.equal(audit.liveProcessCount, 115);
assert.equal(audit.integratedHandCount, 68);
assert.equal(audit.meshCoordinator, true);
assert.ok(audit.meshCoordinatorRuns > 0);
assert.equal(audit.exactAddressRecall, true);
assert.equal(audit.anticipatoryMemory, true);
assert.equal(audit.executionTray, true);
assert.equal(audit.frontScreenSurface, true);
assert.equal(audit.persistentAspectPrimitives768, true);
assert.equal(audit.nineCenterGenomeClusters, true);
assert.equal(audit.channelGenomeExchange, true);
assert.equal(audit.fullAgentAddressPreserved, true);
assert.equal(audit.fineDifferentiationPreserved, true);
assert.equal(audit.exactSecondPreserved, true);
assert.equal(audit.birthMirrorRuntimePresent, true);
assert.equal(audit.mandatoryBirthConfigurationGate, true);
assert.equal(audit.birthMirrorConfigured, true);
assert.equal(audit.birthMirrorSwarmOrgan, true);
assert.equal(audit.birthMirrorPersistence, true);
assert.equal(audit.biologicalTranslationRuntime, true);
assert.equal(audit.relationalOperatorAlgebra, true);
assert.equal(audit.relationalPerceptionNeuralBridge, true);
assert.equal(audit.movementRepresentationTransport, true);
assert.equal(audit.temporalExperientialMesh, true);
assert.equal(audit.canonicalMorphRuntime, true);

const movementTransport = synthia.semanticGenome.run({
  operation: 'movement-transport',
  value: '01000001',
  from: 'binary',
  to: 'hex',
  binaryWidth: 8,
  hexWidth: 2,
});
assert.equal(movementTransport.numericIdentity, 65);
assert.equal(movementTransport.output.value, '41');
assert.equal(movementTransport.identityPreserved, true);
assert.equal(movementTransport.roundTripPreserved, true);
assert.deepEqual(movementTransport.path, ['binary', 'decimal', 'hex']);

const historicalFirstVisit = await synthia.visitPast({
  personId: 'verify-person',
  agentId: 'synthia',
  date: '1990-09-18',
  time: '21:34:00',
  place: {
    label: 'Historical Verification Place',
    latitude: 37.7749,
    longitude: -122.4194,
    timeZone: 'America/Los_Angeles',
  },
  dimension: 'Being',
  planetary: 1,
});
assert.equal(historicalFirstVisit.visit.firstVisit, true);
assert.ok(historicalFirstVisit.visit.state.historicalStateId);
const historicalRevisit = await synthia.visitPast({
  personId: 'verify-person',
  agentId: 'synthia',
  date: '1990-09-18',
  time: '21:34:00',
  place: {
    label: 'Historical Verification Place',
    latitude: 37.7749,
    longitude: -122.4194,
    timeZone: 'America/Los_Angeles',
  },
  dimension: 'Being',
  planetary: 1,
});
assert.equal(historicalRevisit.visit.firstVisit, false);
assert.equal(historicalRevisit.visit.state.historicalStateId, historicalFirstVisit.visit.state.historicalStateId);
const historicalSuperposition = synthia.superimposePast({
  personId: 'verify-person',
  agentId: 'synthia',
  coordinates: [historicalFirstVisit.coordinate],
});
assert.equal(historicalSuperposition.historical.length, 1);
assert.notEqual(historicalSuperposition.current.stateId, historicalFirstVisit.visit.state.historicalStateId);

const morphPacket = synthia.morphState({
  superposition: historicalSuperposition,
  meshEvidence: synthia.temporalMesh({ coordinate: historicalFirstVisit.coordinate, targetAddress: historicalFirstVisit.address }),
  sourceSurface: { name: 'verify-source', width: 256, height: 320, landmarks: { head: [128, 56], neck: [128, 92], torso: [128, 150] } },
  targetSurface: { name: 'verify-target', width: 256, height: 320, landmarks: { head: [132, 56], neck: [132, 92], torso: [132, 150] } },
}, { personId: 'verify-person', agentId: 'synthia' });
assert.equal(morphPacket.renderReady, true);
assert.equal(morphPacket.canon.addressOrder.length, 13);
assert.deepEqual(Object.keys(morphPacket.current.address), morphPacket.canon.addressOrder);
assert.equal(morphPacket.temporal.id, historicalSuperposition.id);

await synthia.flushPersistence();
const restored = await FederatedSynthia.create({ persistenceDir });
assert.equal(restored.identityStatus().configured, true);
assert.equal(restored.identityStatus().restored, true);
assert.equal(restored.identityStatus().coordinateSignature, configured.identity.coordinateSignature);
assert.equal(restored.semanticGenome.chartForAgent('synthia').filterIntersectionCount, 65);

console.log(JSON.stringify({
  status: 'PASS',
  authorityArchives: Object.keys(authorities).length,
  dimensionAuthorities: Object.keys(dimensionAuthorities).length,
  sealedScaleBenchmarks: ['D1', 'D2', 'D3'],
  baselineProcesses: synthia.baselineProcessCount,
  liveProcesses: synthia.swarm.snapshot().processCount,
  integratedHands: synthia.hands().integratedHands.map((hand) => hand.id),
  localMeshes: audit.localMeshes,
  channelMeshes: channelField.channelMeshes,
  neuralOrgans: channelField.neuralOrgans,
  dimensionalInteractionLevels: channelField.dimensionalInteractionLevels,
  agentGenome: {
    hexagramCodons: agentGenome.hexagramCodons,
    compatibilityStructuralPositions: agentGenome.persistentAspectPrimitives,
    agentCharts: agentGenome.agentCharts,
    exactAddressFields: agentGenome.addressOrder,
  },
  birthMirror: {
    mandatory: true,
    configurationId: configured.identity.configurationId,
    exactSecondsPreserved: configured.identity.exactSecondsPreserved,
    fiveDimensionIntersections: configured.identity.fiveDimensionIntersections,
    swarmWorker: chat.swarmExecution.executions[0].workerId,
    persistedAndRestored: restored.identityStatus().restored,
    rawBirthRecordExposed: configured.identity.rawBirthRecordExposed,
  },
  crossMeshTransfers: audit.federation.transfers,
  chatStages: chat.pipelineTrace.map((entry) => entry.stage),
  execution: {
    jsonStrategy: internal.strategy,
    gameganStrategy: game.strategy,
    gameganBackendUsed: game.backendUsed,
    stateSpaceStrategy: sovereign.strategy,
    stateSpaceBackendUsed: sovereign.backendUsed,
  },
  movementTransport: {
    path: movementTransport.path,
    numericIdentity: movementTransport.numericIdentity,
    output: movementTransport.output,
  },
  temporalExperience: {
    historicalStateId: historicalFirstVisit.visit.state.historicalStateId,
    revisitStable: historicalRevisit.visit.state.historicalStateId === historicalFirstVisit.visit.state.historicalStateId,
    superimposedHistoricalStates: historicalSuperposition.historical.length,
  },
  canonicalMorph: {
    packetId: morphPacket.id,
    renderReady: morphPacket.renderReady,
    addressFields: morphPacket.canon.addressOrder,
  },
  wiringAudit: audit,
}, null, 2));

await rm(persistenceDir, { recursive: true, force: true });
