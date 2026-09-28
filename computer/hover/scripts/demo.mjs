import { FederatedSynthia } from '../src/index.mjs';

const synthia = await FederatedSynthia.create();
const chat = await synthia.chat('The player moves toward the goal.', { personId: 'demo-person' });
const data = await synthia.executeArtifact({ name: 'demo.json', content: '{"level":1}' }, { personId: 'demo-person' });
const stateSpace = await synthia.morph({ operation: 'five-levels', gate: 1 }, { personId: 'demo-person' });

const originalLog = console.log;
console.log = () => {};
let game;
try {
  game = await synthia.executeArtifact({
    appId: 'gamegan',
    input: { operation: 'generate-frame', action: 1, seed: 2 },
  }, { personId: 'demo-person' });
} finally {
  console.log = originalLog;
}

console.log(JSON.stringify({
  utterance: chat.utterance,
  chatPipeline: chat.pipelineTrace.map((entry) => entry.stage),
  jsonExecution: { strategy: data.strategy, bridgeUsed: data.bridgeUsed, ok: data.ok },
  morph: {
    role: stateSpace.roleResolution.primary,
    purpose: stateSpace.roleResolution.purpose,
    levels: stateSpace.fiveLevelProjection.map((level) => level.level),
    center: stateSpace.center,
  },
  registeredGameExecution: {
    appId: game.appId,
    strategy: game.strategy,
    bridgeUsed: game.bridgeUsed,
    backendUsed: game.backendUsed,
    note: game.result.returnValue.frame?.result?.note ?? null,
  },
  hands: {
    baseline: synthia.hands().originalProcessHandsPreserved,
    integrated: synthia.hands().integratedHands.length,
    stateSpaceInstruments: synthia.hands().stateSpaceInstruments.length,
    centers: synthia.hands().nineCenters.length,
  },
  agentGenome: {
    codons: synthia.semanticGenome.codons.size,
    traits: synthia.semanticGenome.aspects.size,
    chart: synthia.semanticGenome.chartForAgent('synthia'),
    currentExpression: chat.semanticGenome,
  },
  wiring: synthia.wiringAudit(),
}, null, 2));
