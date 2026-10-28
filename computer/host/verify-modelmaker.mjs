/**
 * One-command, opt-in Linux acceptance of an actual Modelmaker-trained
 * checkpoint through Synthia's existing Computer and Klein paths.
 * No model download, training, destructive actions or weight replacement.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const MM = 'http://127.0.0.1:11734';
const COMPUTER = 'http://127.0.0.1:8765';

async function readJson(url, options, fetchImpl) {
  const response = await fetchImpl(url, options);
  if (!response?.ok) throw new Error('Endpoint ' + url + ' returned HTTP ' + response?.status);
  return response.json();
}

export async function verifyNativeModelmaker({
  fetchImpl = globalThis.fetch, modelmakerUrl = MM, computerUrl = COMPUTER,
} = {}) {
  const direct = new URL(modelmakerUrl);
  const comp = new URL(computerUrl);
  for (const url of [direct, comp]) {
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password
      || url.search || url.hash || url.pathname !== '/')
      throw new TypeError('Accept only direct loopback service origins.');
  }
  const health = await readJson(modelmakerUrl + '/health', {}, fetchImpl);
  if (health?.ready !== true || typeof health.model !== 'string' ||
      !/^[0-9a-f]{64}$/.test(health.checkpoint_sha256 ?? ''))
    throw new Error('Modelmaker did not verify a real local checkpoint.');
  const status = await readJson(computerUrl + '/api/synthia/status', {}, fetchImpl);
  if (status?.languageModel?.configured !== true || status.languageModel.model !== health.model)
    throw new Error('Synthia is not configured to use this exact Modelmaker checkpoint.');
  const turn = await readJson(computerUrl + '/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello Synthia. What does your local language model do?' }),
  }, fetchImpl);
  if (turn.model?.used !== true || turn.klein?.passedToModel !== true ||
      turn.provider !== 'llm:openai-compatible' ||
      turn.resident?.toolEvidence?.autoling !== 'executed' ||
      turn.resident?.toolEvidence?.diseminer !== 'executed' ||
      typeof turn.text !== 'string' || !turn.text.trim())
    throw new Error('Computer fallback or incomplete Klein-to-LLM route: model was NOT proven live.');
  return {
    ok: true, provider: turn.provider, model: health.model,
    checkpoint_sha256: health.checkpoint_sha256,
    klein: ['autoling', 'diseminer'],
    inputRecorded: Boolean(turn.resident.readingId),
    responseRecorded: Boolean(turn.resident.id),
    responseLength: turn.text.length,
    note: 'Transport and saved-weight execution verified; dialogue quality not evaluated.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyNativeModelmaker().then(result => {
    console.log(JSON.stringify(result, null, 2));
  }, error => {
    console.error('SYNTHIA_MODELMaker_CHECK_FAILED:', String(error?.message ?? error));
    process.exitCode = 1;
  });
}
