import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { SynthiaLanguageModel } from '../services/synthia-language-model.mjs';
import { AdaptiveGoalLoop } from '../services/adaptive-goal-loop.mjs';
import { parseDiffusionRequest, produceDiffusionAnswer } from '../services/simulation-conversation-route.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';

function languageModel({ fail = false } = {}) {
  return new SynthiaLanguageModel({
    baseUrl: 'http://127.0.0.1:11434/v1', model: 'test-local-model',
    fetchImpl: async (url, options) => {
      assert.match(url, /\/v1\/chat\/completions$/);
      const payload = JSON.parse(options.body);
      assert.equal(payload.stream, false);
      assert.equal(payload.model, 'test-local-model');
      assert.equal(payload.messages.at(-1).role, 'user');
      if (fail) throw new Error('test endpoint missing');
      return { ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'Grounded model answer' } }],
          usage: { prompt_tokens: 20, completion_tokens: 5 } }) };
    },
  });
}

test('Bitterbot-inspired model adapter is explicit, local-first, and never pretends to ship weights', async () => {
  const disabled = new SynthiaLanguageModel({ baseUrl: '', model: '' });
  assert.equal(disabled.status().configured, false);
  assert.equal(disabled.status().verifiedLive, false);
  const provider = languageModel();
  assert.equal(provider.status().configured, true);
  assert.equal(provider.status().locality, 'loopback');
  const completion = await provider.generate({ text: 'Hello Synthia' });
  assert.equal(completion.text, 'Grounded model answer');
  assert.equal(completion.usage.completionTokens, 5);
  await assert.rejects(() => languageModel({fail:true}).generate({text:'hello'}), /unreachable or timed out/);
});

test('LLM blocks remote access unless explicitly opted in and does not disclose keys in status', () => {
  assert.throws(() => new SynthiaLanguageModel({
    baseUrl: 'https://example.com/v1', model: 'remote',
  }), /explicit opt-in/);
  assert.throws(() => new SynthiaLanguageModel({
    baseUrl: 'http://example.com/v1', model: 'remote', allowRemote: true, apiKey: 'hidden',
  }), /HTTPS/);
  assert.throws(() => new SynthiaLanguageModel({
    baseUrl: 'https://example.com/v1', model: 'remote', allowRemote: true,
  }), /SYNTHIA_LLM_API_KEY/);
  const remote = new SynthiaLanguageModel({
    baseUrl: 'https://example.com/v1', model: 'remote', allowRemote: true, apiKey: 'SECRET',
  });
  assert.equal(remote.status().locality, 'remote-opt-in');
  assert.ok(!JSON.stringify(remote.status()).includes('SECRET'));
  assert.throws(() => new SynthiaLanguageModel({
    baseUrl: 'http://127.0.0.1:11434/v1?token=leak', model: 'local',
  }), /credentials, query or fragment/);
});

test('adaptive donor pattern is proposal-only, constraint aware, and learns from explicit feedback', async () => {
  const persisted = new Map();
  const state = { get: (k, def) => persisted.has(k) ? persisted.get(k) : def,
    set: async (k, v) => persisted.set(k, structuredClone(v)) };
  const lab = new AdaptiveGoalLoop({ state });
  const request = {
    metrics: { memory: 97, cpu: 30 },
    goals: [{ metric: 'memory', direction: 'minimize', target: 60, weight: 1 }],
    constraints: [{ metric: 'memory', op: 'lte', limit: 95 }],
    actions: [
      { id: 'no-change', effects: { memory: 0 }, cost: 0, risk: 0, reversible: true },
      { id: 'release-cache', effects: { memory: -30 }, cost: 1, risk: 1, reversible: true },
      { id: 'high-risk', effects: { memory: -35 }, cost: 10, risk: 100, reversible: false },
    ],
  };
  const p = lab.propose(request);
  assert.equal(p.phase, 'proposal');
  assert.equal(p.executed, false);
  assert.equal(p.selected.id, 'release-cache');
  assert.equal(p.candidates.find(x => x.id === 'no-change').eligible, false);
  await assert.rejects(() => lab.recordFeedback({ actionId: 'release-cache', improvement: 2 }), /owner approval/);
  await lab.recordFeedback({ actionId: 'release-cache', improvement: 2, ownerApproved: true });
  assert.equal(new AdaptiveGoalLoop({ state }).status().feedbackExamples, 1);
});

test('deterministic parser only dispatches explicitly requested PP/HDPE simulation', async () => {
  assert.equal(parseDiffusionRequest('Hi Synthia'), null);
  assert.equal(parseDiffusionRequest('Simulate my computer workload'), null);
  assert.equal(parseDiffusionRequest('calculate PP diffusion').status, 'incomplete');
  assert.deepEqual(parseDiffusionRequest('simulate PP 100 g/mol at 23 C'), {
    status: 'ready', polymer: 'PP', massGMol: 100, temperatureC: 23 });
  const c = await new ComputerRuntime().boot();
  const reply = produceDiffusionAnswer(c, parseDiffusionRequest('simulate PP 100 g/mol at 23 C'));
  assert.equal(reply.provider, 'computer:generative-simulation-lab');
  assert.equal(reply.evidence.measured, false);
  assert.match(reply.text, /1\.000000e-9/);
});

test('Synthia conversation routes one user simulation through resident and numerical kernel', async () => {
  const c = await new ComputerRuntime().boot();
  const talk = new ConversationExecution(c);
  const result = await talk.talk('simulate PP 100 g/mol at 23 C');
  assert.equal(result.provider, 'computer:generative-simulation-lab');
  assert.equal(result.simulation?.evidence?.measured, false);
  assert.equal(result.resident.toolEvidence.autoling, 'executed');
  assert.ok(c.synthia.graph().semanticSpacetime.edges.some(e => e.type === 'responds-to'));
});

test('Synthia uses configured real model transport, then falls back visibly on failure', async () => {
  const c = await new ComputerRuntime().boot();
  c.languageModel = languageModel();
  const talk = new ConversationExecution(c);
  const ok = await talk.talk('What are the parts of the computer runtime?');
  assert.equal(ok.text, 'Grounded model answer');
  assert.equal(ok.provider, 'llm:openai-compatible');
  assert.equal(ok.model.used, true);
  c.languageModel = languageModel({ fail: true });
  const fallback = await talk.talk('Explain Synthia again');
  assert.equal(fallback.model.used, false);
  assert.match(fallback.model.fallbackReason, /unreachable/);
  assert.notEqual(fallback.provider, 'llm:openai-compatible');
  assert.ok(fallback.resident.id);
});
