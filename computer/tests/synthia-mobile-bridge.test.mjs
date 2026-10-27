import test from 'node:test';
import assert from 'node:assert/strict';
import { computerOrigin, requestComputerChat, checkComputer }
  from '../mobile/synthia-expo/computer-protocol.mjs';

test('Computer address defaults to loopback; insecure external URLs are refused', () => {
  assert.equal(computerOrigin(), 'http://127.0.0.1:8765');
  assert.equal(computerOrigin('http://127.0.0.1:8765/api/chat'), 'http://127.0.0.1:8765');
  assert.throws(() => computerOrigin('http://192.168.1.2:8765'), /HTTPS/);
  assert.throws(() => computerOrigin('http://evil.test:8765'), /HTTPS/);
});

test('mobile request uses the existing Computer /api/chat shape and returns its real text', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({url, options});
    return {ok:true, json:async () => ({text:'Synthia donor reply',
      provider:'local-morph', eventId:'receipt:1'})};
  };
  const result = await requestComputerChat('Hello Synthia', {fetcher});
  assert.equal(result.text, 'Synthia donor reply');
  assert.equal(result.eventId, 'receipt:1');
  assert.equal(calls[0].url, 'http://127.0.0.1:8765/api/chat');
  assert.deepEqual(JSON.parse(calls[0].options.body), {text:'Hello Synthia'});
});

test('missing Computer and old fake {reply} response are explicit errors', async () => {
  await assert.rejects(
    requestComputerChat('hello', {fetcher: async () => {throw new Error('ECONNREFUSED');}}),
    /ECONNREFUSED/);
  await assert.rejects(
    requestComputerChat('hello', {fetcher: async () => ({
      ok:true, json:async () => ({reply:'local-mode fake reply'})
    })}), /no reply/);
});

test('Computer status reports only the actual backend status', async () => {
  const result = await checkComputer({fetcher:async () => ({
    ok:true, json:async () => ({ready:true,computer:'SynthAI Computer'})
  })});
  assert.deepEqual(result, {ready:true,computer:'SynthAI Computer'});
});
