import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthiaResident } from '../services/synthia-resident.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

function persistence() {
  const values = new Map();
  return { get: (key, fallback) => values.has(key) ? structuredClone(values.get(key)) : fallback,
    set: async (key, value) => { values.set(key, structuredClone(value)); } };
}

test('resident boots its real Klein donor tools, separately from its neural graph', async () => {
  const r = await new SynthiaResident({ state: persistence() }).boot();
  assert.deepEqual(r.status().tools, ['autoling', 'diseminer', 'autonovel']);
  assert.equal(r.status().llm, false);
  assert.equal(r.graph().neural.pretrained, false);
  const a = await r.runTool('autoling', { text: 'The dog walks slowly' });
  assert.ok(a.morphology.morphemes.length > 0);
  const d = await r.runTool('diseminer', { operation: 'observe', text: 'A small dog walks near a garden' });
  assert.ok(d.words > 0);
  assert.equal(r.inference.predict('build a project').trained, false);
});

test('AutoNovel runs the imported combinator automaton rather than returning a label', async () => {
  const r = await new SynthiaResident({ state: persistence() }).boot();
  const registration = await r.runTool('autonovel', { operation: 'register',
    domain: { id: 'planner', primitives: [{ id: 'fact' }, { id: 'goal' }],
      combinators: [{ id: 'combine', inputs: ['fact', 'goal'], output: 'plan' }] } });
  assert.equal(registration.ok, true);
  const structure = await r.runTool('autonovel', { operation: 'generate',
    spec: { domain: 'planner',
      seeds: [{ type: 'fact', value: 'file exists' }, { type: 'goal', value: 'make useful' }] } });
  assert.equal(structure.ok, true);
  assert.equal(structure.relations[0].combinator, 'combine');
});

test('reported human claims stay provisional and replies have provenance', async () => {
  const r = await new SynthiaResident({ state: persistence() }).boot();
  const reading = await r.observe('The computer needs a working terminal.', { actor: 'user:test' });
  assert.equal(reading.intent.trained, false);
  assert.equal(reading.toolEvidence.autoling, 'executed');
  assert.equal(reading.toolEvidence.diseminer, 'executed');
  assert.equal(r.graph().semanticSpacetime.edges.some(e => e.type === 'says'), true);
  assert.equal(r.graph().semanticSpacetime.edges.some(e => e.type === 'proposes' && e.verified === false), true);
  await r.recordReply(reading, { text: 'Terminal runtime status: not yet verified', provider: 'observed-test' });
  assert.ok(r.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});

test('neural weights actually train only on explicit examples and survive boot', async () => {
  const state = persistence();
  const first = await new SynthiaResident({ state }).boot();
  const t = 'repair the package build';
  const baseline = first.inference.predict(t);
  assert.equal(baseline.trained, false);
  const result = await first.teach({ text: t, capability: 'diagnose-build', accepted: true });
  assert.equal(result.trained, true);
  assert.ok(result.candidates.some(x => x.label === 'diagnose-build'));
  assert.equal(first.graph().shared.feedback, 1);
  const restarted = await new SynthiaResident({ state }).boot();
  assert.equal(restarted.graph().neural.trainingExamples, 1);
  assert.equal(restarted.inference.predict(t).trained, true);
  assert.equal(restarted.graph().shared.feedback, 1);
});

test('Computer mounts Synthia as a real resident service and agent', async () => {
  const computer = await new ComputerRuntime().boot();
  assert.equal(computer.services.get('synthia-resident').provider, computer.synthia);
  assert.equal(computer.agents.get('synthia-resident').role, 'local-reasoning-resident');
  assert.deepEqual(computer.snapshot().synthia.graphs, ['learned-inference', 'klein-semantic-spacetime']);
});

test('existing Morph Chat produces grounded text through the installed resident', async () => {
  const { ConversationExecution } = await import('../services/conversation-execution.mjs');
  const computer = await new ComputerRuntime().boot();
  const conversation = new ConversationExecution(computer);
  const response = await conversation.talk('Can you examine the computer runtime structure?');
  assert.equal(typeof response.text, 'string');
  assert.ok(response.text.length > 0);
  assert.equal(response.resident.toolEvidence.autoling, 'executed');
  assert.equal(response.resident.toolEvidence.diseminer, 'executed');
  assert.ok(computer.synthia.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});


test('Hello Synthia is received by the actual Computer resident and answered through the real donor', async () => {
  const { ConversationExecution } = await import('../services/conversation-execution.mjs');
  const computer = await new ComputerRuntime().boot();
  const conversation = new ConversationExecution(computer);
  const hello = 'Hello Synthia. I would like to talk with you.';
  const response = await conversation.talk(hello);
  assert.equal(response.input, hello);
  assert.equal(typeof response.text, 'string');
  assert.ok(response.text.trim().length > 0);
  assert.ok(response.resident?.readingId?.startsWith('utterance:'));
  assert.ok(response.resident?.id?.startsWith('response:'));
  console.log('SYNTHIA_VERIFIED_HELLO', JSON.stringify({
    input: response.input,
    reply: response.text,
    provider: response.provider,
    readingId: response.resident.readingId,
    replyReceipt: response.resident.id,
    evidence: response.resident.toolEvidence,
  }));
});
