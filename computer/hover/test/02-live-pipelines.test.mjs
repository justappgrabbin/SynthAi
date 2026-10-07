import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaAutomata } from '../vendor/execution-spine-v0.4.0/src/pure-synthia/engine/synthia.js';
import { IntegratedSynthiaSystem } from '../src/index.mjs';

const makeSystem = () => new IntegratedSynthiaSystem({ engine: new SynthiaAutomata() });

test('chat is a seven-entry sequential, consuming pipeline', async () => {
  const system = makeSystem();
  const response = await system.chat('The player moves toward the goal.', { personId: 'chat-test' });
  assert.deepEqual(response.pipelineTrace.map((entry) => entry.stage), [
    'autoling', 'diseminer', 'klein-analogy', 'success', 'language-contact', 'conversation', 'scientist-loop',
  ]);
  assert.ok(response.pipelineTrace.every((entry) => entry.consumed));
  assert.ok(response.pipelineTrace.slice(1, 6).every((entry) => entry.packetId && entry.delivered && entry.accepted));
  assert.equal(system.scientist.dashboard().experiments, 1);
  assert.ok(system.detector.emergenceLog.length >= 1);
});

test('visible chat never exposes runtime JSON or state packets', async () => {
  const system = makeSystem();
  const message = 'Hello Synthia';
  const response = await system.chat(message, { personId: 'chat-visible-test' });
  assert.equal(typeof response.utterance, 'string');
  assert.ok(response.utterance.trim().length > 0);
  assert.notEqual(response.utterance, message);
  assert.equal(response.utterance.includes('[weave:'), false);
  assert.equal(response.utterance.includes('conditionStateId'), false);
  assert.equal(response.utterance.includes('resolved-state'), false);
  assert.doesNotMatch(response.utterance, /^\s*[\[{]/);
});

test('analysis routes internal, hybrid, and external artifacts differently', async () => {
  const system = makeSystem();
  const internal = await system.executeArtifact({ name: 'data.json', content: '{"n":3}' }, { personId: 'exec-test' });
  const hybrid = await system.executeArtifact({ name: 'hello.js', content: 'console.log("hi")' }, { personId: 'exec-test' });
  const external = await system.executeArtifact({ name: 'calc.py', content: 'print(2 + 3)' }, { personId: 'exec-test' });
  assert.equal(internal.strategy, 'internal');
  assert.equal(internal.bridgeUsed, false);
  assert.equal(hybrid.strategy, 'hybrid');
  assert.equal(hybrid.bridgeUsed, true);
  assert.equal(external.strategy, 'external');
  assert.equal(external.bridgeUsed, true);
  assert.ok([internal, hybrid, external].every((result) => result.scaleLadder.at(-1).scale === 'automaton'));
});

test('pre-registered GameGAN single-player capability executes locally without a backend', async () => {
  const system = makeSystem();
  const prior = console.log;
  console.log = () => {};
  try {
    const response = await system.executeArtifact({
      appId: 'gamegan',
      name: 'GameGAN',
      input: { operation: 'generate-frame', action: 1, seed: 2 },
    }, { personId: 'game-test' });
    assert.equal(response.ok, true);
    assert.equal(response.strategy, 'internal');
    assert.equal(response.bridgeUsed, false);
    assert.equal(response.backendUsed, false);
    assert.equal(response.path, 'registered-local-app');
    assert.equal(response.appId, 'gamegan-single-player');
  } finally {
    console.log = prior;
  }
});

test('registered capability outranks a foreign-looking file extension and stays backendless', async () => {
  const system = makeSystem();
  system.appRegistry.register({
    id: 'local-single-player-demo',
    aliases: ['local-demo'],
    kind: 'game',
    singlePlayer: true,
    backendRequired: false,
    capabilities: ['execute', 'step'],
    execute: (artifact) => ({ stepped: true, state: artifact.input?.state ?? 0 }),
  });
  const response = await system.executeArtifact({
    appId: 'local-demo',
    name: 'looks-foreign.py',
    input: { state: 7 },
  });
  assert.equal(response.strategy, 'internal');
  assert.equal(response.bridgeUsed, false);
  assert.equal(response.backendUsed, false);
  assert.equal(response.result.returnValue.state, 7);
});

test('failed execution records a gap and applies a threshold proposal through the self outbox', async () => {
  const system = makeSystem();
  const response = await system.executeArtifact({ name: 'broken.json', content: '{not json' }, { personId: 'failure-test' });
  assert.equal(response.ok, false);
  assert.equal(response.gap.gapType, 'computation_failure');
  assert.equal(response.proposal.confidence, 0.7);
  assert.equal(response.proposalApplication.executed, true);
  assert.equal(response.proposalApplication.output.applied, true);
  assert.ok(system.intent.proposals.find((proposal) => proposal.id === response.proposal.id)?.applied);
  assert.equal(system.proposals.records.at(-1).status, 'executed');
  assert.ok(system.editor.edits.length > 0);
});
