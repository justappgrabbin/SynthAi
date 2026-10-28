import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { SynthiaLanguageModel } from '../services/synthia-language-model.mjs';

test('Synthia consumes Modelmaker-style local GPT-2 chat completions with actual Klein context', async () => {
  let saw = null;
  const c = await new ComputerRuntime().boot();
  const baseline = c.synthia.graph().neural.trainingExamples;
  c.languageModel = new SynthiaLanguageModel({
    baseUrl: 'http://127.0.0.1:11734/v1',
    model: 'synthia-seed',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:11734/v1/chat/completions');
      saw = JSON.parse(options.body);
      assert.equal(saw.model, 'synthia-seed');
      assert.equal(saw.stream, false);
      const klein = saw.messages.find(m => m.content.includes('synthia:klein-donor-tools'));
      assert.ok(klein, 'existing Klein donor evidence must reach trained model');
      assert.match(klein.content, /autoling/);
      assert.match(klein.content, /diseminer/);
      return { ok: true, status: 200,
        json: async () => ({ model: 'synthia-seed',
          choices: [{ message: { role: 'assistant',
            content: 'Generated from locally loaded Modelmaker weights.' } }],
          usage: { prompt_tokens: 24, completion_tokens: 9 } }) };
    }
  });
  const result = await new ConversationExecution(c).talk('Hello Synthia. What are the Klein tools?');
  assert.ok(saw);
  assert.equal(result.text, 'Generated from locally loaded Modelmaker weights.');
  assert.equal(result.provider, 'llm:openai-compatible');
  assert.equal(result.model.used, true);
  assert.equal(result.klein.passedToModel, true);
  assert.equal(result.resident.toolEvidence.autoling, 'executed');
  assert.equal(result.resident.toolEvidence.diseminer, 'executed');
  assert.equal(c.synthia.graph().neural.trainingExamples, baseline);
  assert.ok(c.synthia.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});

test('missing local Modelmaker server does not fake model use or reset resident weights', async () => {
  const c = await new ComputerRuntime().boot();
  c.languageModel = new SynthiaLanguageModel({
    baseUrl: 'http://127.0.0.1:11734/v1',
    model: 'synthia-seed',
    fetchImpl: async () => { throw new Error('Modelmaker not started'); }
  });
  const response = await new ConversationExecution(c).talk('Hello Synthia');
  assert.equal(response.model.used, false);
  assert.equal(response.klein.passedToModel, false);
  assert.match(response.model.fallbackReason, /unreachable/);
  assert.notEqual(response.provider, 'llm:openai-compatible');
  assert.equal(c.synthia.graph().neural.trainingExamples, 0);
});
