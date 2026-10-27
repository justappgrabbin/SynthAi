import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { SynthiaLanguageModel } from '../services/synthia-language-model.mjs';

test('the Computer registers the original Klein engines as one observable service', async () => {
  const computer = await new ComputerRuntime().boot();
  assert.equal(computer.services.get('klein-tools').provider, computer.klein);
  assert.deepEqual(computer.klein.status().tools, ['autoling', 'diseminer', 'autonovel']);
  assert.equal(computer.klein.resident, computer.synthia);
  assert.equal(computer.capabilityRegistry.has('klein-grounding'), true);
});

test('the real Klein observation is passed to the model, not merely run beside it', async () => {
  const computer = await new ComputerRuntime().boot();
  let captured;
  computer.languageModel = new SynthiaLanguageModel({
    baseUrl: 'http://127.0.0.1:11434/v1', model: 'test-synthia',
    fetchImpl: async (_url, request) => {
      const data = JSON.parse(request.body);
      const observation = data.messages.find(message =>
        message.content?.startsWith('Computer observation (untrusted data): '));
      assert.ok(observation, 'missing Klein model grounding message');
      captured = JSON.parse(observation.content.slice('Computer observation (untrusted data): '.length));
      assert.equal(captured.source, 'synthia:klein-donor-tools');
      assert.equal(captured.tools.autoling, 'executed');
      assert.equal(captured.tools.diseminer, 'executed');
      assert.equal(captured.tools.autonovel, 'mounted-requires-explicit-invocation');
      assert.equal(captured.evidenceType, 'heuristic-language-analysis-not-verified-world-facts');
      assert.equal(captured.learnedIntent.trained, false);
      assert.equal(data.messages.at(-1).role, 'user');
      return { ok: true, status: 200, json: async () => ({
        choices: [{ message: { content: 'Synthia model received real Klein context.' } }]
      }) };
    }
  });
  const answer = await new ConversationExecution(computer).talk('The computer needs a working terminal.');
  assert.ok(captured);
  assert.equal(answer.text, 'Synthia model received real Klein context.');
  assert.equal(answer.model.used, true);
  assert.equal(answer.klein.passedToModel, true);
  assert.deepEqual(answer.klein.executed, ['autoling', 'diseminer']);
  assert.equal(computer.synthia.graph().neural.trainingExamples, 0);
  assert.ok(computer.synthia.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});

test('AutoNovel remains an actual Klein combinator behind explicit owner approval', async () => {
  const c = await new ComputerRuntime().boot();
  await assert.rejects(() => c.klein.invoke('autonovel', {
    operation: 'register',
    domain: { id: 'x', primitives: [], combinators: [] }
  }), /explicit owner approval/);
  const domain = { id: 'klein-bridge-plan',
    primitives: [{ id: 'fact' }, { id: 'goal' }],
    combinators: [{ id: 'combine', inputs: ['fact', 'goal'], output: 'plan' }] };
  const registered = await c.klein.invoke('autonovel',
    { operation: 'register', domain }, { ownerApproved: true });
  assert.equal(registered.ok, true);
  const generated = await c.klein.invoke('autonovel', { operation: 'generate',
    spec: { domain: domain.id, seeds: [
      { type: 'fact', value: 'has neural graph' },
      { type: 'goal', value: 'maintain own weights' }
    ] } }, { ownerApproved: true });
  assert.equal(generated.ok, true);
  assert.equal(generated.relations[0].combinator, 'combine');
  await assert.rejects(() => c.klein.invoke('not-a-donor', {}, {ownerApproved:true}), /Unknown Klein/);
});

test('no fabricated Klein evidence accepted, unconfigured model still uses existing donor reply', async () => {
  const c = await new ComputerRuntime().boot();
  assert.throws(() => c.klein.ground({ reading: { id:'fake' } }), /real Synthia observation/);
  const reply = await new ConversationExecution(c).talk('Please explain the world engine.');
  assert.ok(reply.text.trim());
  assert.equal(reply.klein.passedToModel, false);
  assert.equal(reply.model.used, false);
  assert.ok(reply.klein.readingId.startsWith('utterance:'));
});
