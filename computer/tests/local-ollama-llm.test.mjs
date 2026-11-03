import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalOllamaLlm } from '../services/local-ollama-llm.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';

test('disabled by default; no silent network call', async () => {
  const llm = new LocalOllamaLlm({ fetchImpl: () => { throw new Error('unexpected network'); } });
  assert.equal(llm.status().configured, false);
  await assert.rejects(llm.chat({ text: 'Hello' }), /not configured/);
});

test('an explicitly named local model gets real HTTP-compatible chat messages', async () => {
  let called = false;
  const llm = new LocalOllamaLlm({ model: 'deepseek-r1:1.5b',
    fetchImpl: async (url, options) => {
      called = true;
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'deepseek-r1:1.5b');
      assert.equal(body.messages.at(-1).content, 'Hello Synthia');
      assert.equal(body.messages[0].role, 'system');
      assert.equal(body.stream, false);
      return { ok: true, json: async () => ({ message: { content: 'Hello from a local model.' } }) };
    },
  });
  const result = await llm.chat({ text: 'Hello Synthia' });
  assert.equal(called, true);
  assert.equal(result.text, 'Hello from a local model.');
  assert.equal(result.provider, 'ollama-local');
});

test('missing model, invalid output, and URL-shaped model IDs fail safely', async () => {
  assert.throws(() => new LocalOllamaLlm({ model: 'http://evil' }), /model tag/);
  const missing = new LocalOllamaLlm({ model: 'some-model',
    fetchImpl: async () => ({ ok: false, status: 404 }) });
  await assert.rejects(missing.chat({ text: 'hello' }), /HTTP 404/);
  const invalid = new LocalOllamaLlm({ model: 'some-model',
    fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: '' } }) }) });
  await assert.rejects(invalid.chat({ text: 'hello' }), /no valid bounded text/);
});

test('Synthia chat uses a configured local generative model without losing donor grounding', async () => {
  const llm = new LocalOllamaLlm({ model: 'deepseek-r1:1.5b',
    fetchImpl: async () => ({
      ok: true, json: async () => ({ message: { content: 'Hello from local neural inference.' } }),
    }),
  });
  const computer = await new ComputerRuntime({ llm }).boot();
  assert.equal(computer.services.get('synthia-language-model').provider, llm);
  assert.equal(computer.snapshot().languageModel.configured, true);
  const conversation = new ConversationExecution(computer);
  const result = await conversation.talk('Hello Synthia, can we talk?');
  assert.equal(result.text, 'Hello from local neural inference.');
  assert.equal(result.provider, 'ollama-local:deepseek-r1:1.5b');
  assert.equal(result.resident.toolEvidence.autoling, 'executed');
  assert.equal(result.resident.toolEvidence.diseminer, 'executed');
  assert.ok(result.learningRecord);
  assert.ok(computer.synthia.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});

test('missing model leaves the original Morph Chat conversation path unchanged', async () => {
  const computer = await new ComputerRuntime().boot();
  assert.equal(computer.snapshot().languageModel.configured, false);
  const response = await new ConversationExecution(computer).talk('Hello Synthia.');
  assert.ok(response.text.trim());
  assert.notEqual(response.provider, 'ollama-local');
});
