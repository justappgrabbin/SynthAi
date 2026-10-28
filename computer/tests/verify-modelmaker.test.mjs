import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyNativeModelmaker } from '../host/verify-modelmaker.mjs';

const sha = 'a'.repeat(64);
function mock({ model = 'synthia-smoke', used = true, klein = true } = {}) {
  const requested = [];
  return { requested, fetchImpl: async (url, options = {}) => {
    requested.push({ url, options });
    let body;
    if (url.endsWith('/health')) body = { ready: true, model: 'synthia-smoke',
      checkpoint_sha256: sha };
    else if (url.endsWith('/api/synthia/status')) body = {
      languageModel: { configured: true, model } };
    else if (url.endsWith('/api/chat')) body = {
      model: { used }, klein: { passedToModel: klein },
      provider: used ? 'llm:openai-compatible' : 'local-morph',
      resident: { readingId: 'u-1', id: 'r-1',
        toolEvidence: { autoling: 'executed', diseminer: 'executed' } },
      text: 'Sample CPU model output.' };
    else throw new Error('Unexpected endpoint: ' + url);
    return { ok: true, json: async () => body };
  }};
}
test('probe rejects remote service origins without requesting anything', async () => {
  await assert.rejects(verifyNativeModelmaker({
    modelmakerUrl: 'https://example.com', fetchImpl: () => { throw new Error('network'); },
  }), /loopback/);
});
test('probe only accepts exact checkpoint identity and actual model-used provenance', async () => {
  const ok = mock();
  const result = await verifyNativeModelmaker({ fetchImpl: ok.fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.model, 'synthia-smoke');
  assert.equal(result.checkpoint_sha256, sha);
  assert.equal(ok.requested.length, 3);
  assert.equal(JSON.parse(ok.requested[2].options.body).text.startsWith('Hello Synthia.'), true);
  await assert.rejects(verifyNativeModelmaker({ fetchImpl: mock({ model: 'wrong' }).fetchImpl }), /exact Modelmaker/);
  await assert.rejects(verifyNativeModelmaker({ fetchImpl: mock({ used: false }).fetchImpl }), /NOT proven live/);
  await assert.rejects(verifyNativeModelmaker({ fetchImpl: mock({ klein: false }).fetchImpl }), /NOT proven live/);
});
