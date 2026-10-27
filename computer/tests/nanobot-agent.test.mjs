import test from 'node:test';
import assert from 'node:assert/strict';
import { NanobotAgentAdapter } from '../adapters/NanobotAgentAdapter.mjs';
import { ComputerRuntime } from '../ComputerRuntime.mjs';

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
});

test('delegation is opt-in: no request reaches nanobot without explicit consent flag', async () => {
  let sent = 0;
  const bridge = new NanobotAgentAdapter({ fetchImpl: async () => { sent++; return response({}); } });
  await assert.rejects(bridge.request({ message: 'run this' }), /owner-approved/);
  assert.equal(sent, 0);
});

test('approved turn uses local API, single user message, and stable session', async () => {
  let observed;
  const bridge = new NanobotAgentAdapter({ fetchImpl: async (url, options) => {
    observed = { url, ...options };
    return response({ choices: [{ message: { role: 'assistant', content: 'Delegation acknowledged' } }], usage: { total_tokens: 9 } });
  }});
  const out = await bridge.request({ message: 'Check the world', sessionId: 'synthia:world/1', ownerApproved: true });
  assert.equal(out.text, 'Delegation acknowledged');
  assert.equal(out.provider, 'nanobot-agent');
  assert.equal(observed.url, 'http://127.0.0.1:8900/v1/chat/completions');
  assert.deepEqual(JSON.parse(observed.body), { messages: [{ role: 'user', content: 'Check the world' }], session_id: 'synthia:world/1' });
  assert.equal(observed.headers.Authorization, undefined);
});

test('remote endpoints, unsupported actions, and unsafe sessions are refused', async () => {
  for (const url of ['https://example.com', 'http://127.0.0.2:8900', 'http://127.0.0.1:8900/path', 'http://127.0.0.1:8900?x=1']) {
    assert.throws(() => new NanobotAgentAdapter({ baseUrl: url }), /loopback/);
  }
  const b = new NanobotAgentAdapter({ fetchImpl: async () => response({}) });
  await assert.rejects(b.request({ action: 'shell', message: 'x', ownerApproved: true }), /Unsupported/);
  await assert.rejects(b.request({ message: 'x', sessionId: '../../escape?token=x', ownerApproved: true }), /session identifier/);
});

test('failed or malformed upstream responses do not become successful receipts', async () => {
  const b = new NanobotAgentAdapter({ fetchImpl: async () => response({}, 503) });
  await assert.rejects(b.request({ message: 'x', ownerApproved: true }), /HTTP 503/);
  const c = new NanobotAgentAdapter({ fetchImpl: async () => response({ choices: [] }) });
  await assert.rejects(c.request({ message: 'x', ownerApproved: true }), /no valid/);
});

test('Computer registers optional nanobot backend without replacing its Synthia resident', async () => {
  const computer = await new ComputerRuntime({ nanobot: {
    fetchImpl: async () => response({ choices: [{ message: { role: 'assistant', content: 'agent executed' } }] })
  }}).boot();
  assert.equal(computer.services.get('synthia-resident').provider, computer.synthia);
  assert.equal(computer.backendsRegistry.has('nanobot-agent'), true);
  assert.equal(computer.capabilityRegistry.has('nanobot-agent-delegation'), true);
  await assert.rejects(computer.delegateToNanobot({ message: 'say hello' }), /owner-approved/);
  const reply = await computer.delegateToNanobot({ message: 'say hello', ownerApproved: true });
  assert.equal(reply.text, 'agent executed');
});
